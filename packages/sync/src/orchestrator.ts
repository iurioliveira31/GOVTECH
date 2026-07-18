import { PrismaClient } from '@prisma/client';
import { PncpApiClient, getPncpClient, PNCP_MODALIDADES } from '@aplicativo/pncp';
import { formatPncpDate, gerarJanelasSync, mergeSyncStats, emptySyncStats, SyncStats } from './utils';
import { SyncStateManager } from './sync-state.manager';
import { OrgaoService } from './orgao.service';
import { FornecedorService } from './fornecedor.service';
import { ContratacaoSyncService } from './contratacao.service';
import { ContratoSyncService } from './contrato.service';
import { AtaSyncService } from './ata.service';
import { PcaSyncService } from './pca.service';
import { createLogger } from './logger';

const logger = createLogger('SyncOrchestrator');

export interface SyncOrchestratorOptions {
  /** Número de dias por janela de sync (padrão: 1) */
  windowDays?: number;
  /** Sincronizar itens e documentos de cada contratação (mais lento) */
  syncDetalhes?: boolean;
  /** Limite de contratações para sincronizar detalhes (0 = ilimitado) */
  maxDetalhes?: number;
}

export class SyncOrchestrator {
  private readonly stateManager: SyncStateManager;
  private readonly orgaoSvc: OrgaoService;
  private readonly fornecedorSvc: FornecedorService;
  private readonly contratacaoSvc: ContratacaoSyncService;
  private readonly contratoSvc: ContratoSyncService;
  private readonly ataSvc: AtaSyncService;
  private readonly pcaSvc: PcaSyncService;
  private readonly pncp: PncpApiClient;

  constructor(private readonly prisma: PrismaClient) {
    this.pncp = getPncpClient();
    this.stateManager = new SyncStateManager(prisma);
    this.orgaoSvc = new OrgaoService(prisma);
    this.fornecedorSvc = new FornecedorService(prisma);
    this.contratacaoSvc = new ContratacaoSyncService(prisma, this.pncp, this.orgaoSvc);
    this.contratoSvc = new ContratoSyncService(prisma, this.pncp, this.orgaoSvc, this.fornecedorSvc);
    this.ataSvc = new AtaSyncService(prisma, this.pncp, this.orgaoSvc);
    this.pcaSvc = new PcaSyncService(prisma, this.pncp, this.orgaoSvc);
  }

  // ----------------------------------------------------------------
  // Sync incremental de contratações (todas as modalidades)
  // ----------------------------------------------------------------
  async syncContratacoes(
    dataInicial: Date,
    dataFinal: Date,
    opts: SyncOrchestratorOptions = {},
  ): Promise<SyncStats> {
    const totalStats = emptySyncStats();
    const janelas = gerarJanelasSync(dataInicial, dataFinal, opts.windowDays ?? 1);
    const modalidades = Object.values(PNCP_MODALIDADES);

    logger.info(
      { janelas: janelas.length, modalidades: modalidades.length },
      'Iniciando sync de contratações',
    );

    for (const janela of janelas) {
      for (const modalidade of modalidades) {
        const syncState = await this.stateManager.getOrCreateSyncState(
          'CONTRATACAO',
          janela.inicio,
          janela.fim,
          String(modalidade),
        );

        if (syncState.status === 'COMPLETED') {
          totalStats.registrosDuplicados++;
          continue;
        }

        await this.stateManager.iniciarSync(syncState.id);
        const stats = emptySyncStats();
        let ultimoErro = '';

        try {
          let pagina = syncState.paginaAtual;
          let totalPaginas = 1;

          do {
            const resp = await this.pncp.consultarContratacoesPorPublicacao({
              dataInicial: formatPncpDate(janela.inicio),
              dataFinal: formatPncpDate(janela.fim),
              codigoModalidadeContratacao: modalidade,
              pagina,
              tamanhoPagina: 50,
            });

            if (resp.empty || !resp.data?.length) break;
            totalPaginas = resp.totalPaginas;

            if (pagina === syncState.paginaAtual) {
              await this.stateManager.iniciarSync(syncState.id, resp.totalRegistros, resp.totalPaginas);
            }

            const loteStats = await this.contratacaoSvc.upsertLote(resp.data);
            mergeSyncStatsInPlace(stats, loteStats);

            // Sincroniza itens + documentos se habilitado
            if (opts.syncDetalhes) {
              const limite = opts.maxDetalhes ?? 0;
              let count = 0;
              for (const c of resp.data) {
                if (limite > 0 && count >= limite) break;
                const rec = await this.prisma.pncpContratacao.findUnique({
                  where: { numeroControlePncp: c.numeroControlePNCP },
                  select: { id: true },
                });
                if (rec) {
                  const cnpj = c.orgaoEntidade?.cnpj?.replace(/\D/g, '') ?? '';
                  await this.contratacaoSvc.syncItens(rec.id, cnpj, c.anoCompra, c.sequencialCompra);
                  await this.contratacaoSvc.syncDocumentos(rec.id, cnpj, c.anoCompra, c.sequencialCompra);
                }
                count++;
              }
            }

            await this.stateManager.atualizarProgresso(syncState.id, pagina, loteStats);
            pagina++;
          } while (pagina <= totalPaginas);

          await this.stateManager.concluirSync(syncState.id, stats);
          await this.stateManager.updateCursor('CONTRATACAO', janela.fim);
        } catch (err: any) {
          ultimoErro = err.message;
          logger.error(
            { janela: formatPncpDate(janela.inicio), err: ultimoErro },
            'Erro ao sincronizar contratações',
          );
          await this.stateManager.falharSync(syncState.id, ultimoErro, stats);
          stats.erros++;
        }

        mergeSyncStatsInPlace(totalStats, stats);
      }
    }

    // Limpa caches de órgãos/fornecedores entre runs
    this.orgaoSvc.clearCache();
    return totalStats;
  }

  // ----------------------------------------------------------------
  // Sync incremental de contratos
  // ----------------------------------------------------------------
  async syncContratos(
    dataInicial: Date,
    dataFinal: Date,
    opts: SyncOrchestratorOptions = {},
  ): Promise<SyncStats> {
    const totalStats = emptySyncStats();
    const janelas = gerarJanelasSync(dataInicial, dataFinal, opts.windowDays ?? 1);

    logger.info({ janelas: janelas.length }, 'Iniciando sync de contratos');

    for (const janela of janelas) {
      const syncState = await this.stateManager.getOrCreateSyncState(
        'CONTRATO',
        janela.inicio,
        janela.fim,
      );

      if (syncState.status === 'COMPLETED') {
        totalStats.registrosDuplicados++;
        continue;
      }

      await this.stateManager.iniciarSync(syncState.id);
      const stats = emptySyncStats();

      try {
        let pagina = syncState.paginaAtual;
        let totalPaginas = 1;

        do {
          const resp = await this.pncp.consultarContratosPorPublicacao({
            dataInicial: formatPncpDate(janela.inicio),
            dataFinal: formatPncpDate(janela.fim),
            pagina,
            tamanhoPagina: 50,
          });

          if (resp.empty || !resp.data?.length) break;
          totalPaginas = resp.totalPaginas;

          if (pagina === syncState.paginaAtual) {
            await this.stateManager.iniciarSync(syncState.id, resp.totalRegistros, resp.totalPaginas);
          }

          const loteStats = await this.contratoSvc.upsertLote(resp.data);
          mergeSyncStatsInPlace(stats, loteStats);
          await this.stateManager.atualizarProgresso(syncState.id, pagina, loteStats);
          pagina++;
        } while (pagina <= totalPaginas);

        await this.stateManager.concluirSync(syncState.id, stats);
        await this.stateManager.updateCursor('CONTRATO', janela.fim);
      } catch (err: any) {
        logger.error(
          { janela: formatPncpDate(janela.inicio), err: err.message },
          'Erro ao sincronizar contratos',
        );
        await this.stateManager.falharSync(syncState.id, err.message, stats);
        stats.erros++;
      }

      mergeSyncStatsInPlace(totalStats, stats);
    }

    this.orgaoSvc.clearCache();
    this.fornecedorSvc.clearCache();
    return totalStats;
  }

  // ----------------------------------------------------------------
  // Sync incremental de atas de registro de preços
  // ----------------------------------------------------------------
  async syncAtas(
    dataInicial: Date,
    dataFinal: Date,
    opts: SyncOrchestratorOptions = {},
  ): Promise<SyncStats> {
    const totalStats = emptySyncStats();
    const janelas = gerarJanelasSync(dataInicial, dataFinal, opts.windowDays ?? 7); // janela maior p/ atas

    logger.info({ janelas: janelas.length }, 'Iniciando sync de atas');

    for (const janela of janelas) {
      const syncState = await this.stateManager.getOrCreateSyncState('ATA', janela.inicio, janela.fim);
      if (syncState.status === 'COMPLETED') continue;

      await this.stateManager.iniciarSync(syncState.id);
      const stats = emptySyncStats();

      try {
        let pagina = syncState.paginaAtual;
        let totalPaginas = 1;

        do {
          const resp = await this.pncp.consultarAtasPorVigencia({
            dataInicial: formatPncpDate(janela.inicio),
            dataFinal: formatPncpDate(janela.fim),
            pagina,
            tamanhoPagina: 50,
          });

          if (resp.empty || !resp.data?.length) break;
          totalPaginas = resp.totalPaginas;

          const loteStats = await this.ataSvc.upsertLote(resp.data);
          mergeSyncStatsInPlace(stats, loteStats);
          await this.stateManager.atualizarProgresso(syncState.id, pagina, loteStats);
          pagina++;
        } while (pagina <= totalPaginas);

        await this.stateManager.concluirSync(syncState.id, stats);
        await this.stateManager.updateCursor('ATA', janela.fim);
      } catch (err: any) {
        logger.error(
          { janela: formatPncpDate(janela.inicio), err: err.message },
          'Erro ao sincronizar atas',
        );
        await this.stateManager.falharSync(syncState.id, err.message, stats);
        stats.erros++;
      }

      mergeSyncStatsInPlace(totalStats, stats);
    }

    this.orgaoSvc.clearCache();
    return totalStats;
  }

  // ----------------------------------------------------------------
  // Sync de PCA (por ano — não usa janelas diárias)
  // ----------------------------------------------------------------
  async syncPca(ano: number): Promise<SyncStats> {
    const totalStats = emptySyncStats();
    const dataInicial = new Date(ano, 0, 1);
    const dataFinal = new Date(ano, 11, 31);

    const syncState = await this.stateManager.getOrCreateSyncState('PCA', dataInicial, dataFinal, String(ano));
    if (syncState.status === 'COMPLETED') return totalStats;

    await this.stateManager.iniciarSync(syncState.id);
    const stats = emptySyncStats();

    try {
      let pagina = syncState.paginaAtual;
      let totalPaginas = 1;

      do {
        const resp = await this.pncp.consultarItensPca({
          anoPca: ano,
          pagina,
          tamanhoPagina: 50,
        });

        if (resp.empty || !resp.data?.length) break;
        totalPaginas = resp.totalPaginas;

        const loteStats = await this.pcaSvc.upsertLote(resp.data);
        mergeSyncStatsInPlace(stats, loteStats);
        await this.stateManager.atualizarProgresso(syncState.id, pagina, loteStats);
        pagina++;
      } while (pagina <= totalPaginas);

      await this.stateManager.concluirSync(syncState.id, stats);
    } catch (err: any) {
      logger.error({ ano, err: err.message }, 'Erro ao sincronizar PCA');
      await this.stateManager.falharSync(syncState.id, err.message, stats);
      stats.erros++;
    }

    mergeSyncStatsInPlace(totalStats, stats);
    this.orgaoSvc.clearCache();
    return totalStats;
  }

  // ----------------------------------------------------------------
  // Reprocessa janelas com falha
  // ----------------------------------------------------------------
  async reprocessarFalhos(): Promise<void> {
    const entityTypes = ['CONTRATACAO', 'CONTRATO', 'ATA', 'PCA'] as const;
    for (const entityType of entityTypes) {
      const falhos = await this.stateManager.buscarSyncsFalhados(entityType);
      for (const falho of falhos) {
        logger.info({ syncKey: falho.syncKey, entityType }, 'Reativando sync falho');
        await this.stateManager.reativarParaSync(falho.id);
      }
    }
  }

  // ----------------------------------------------------------------
  // Sync incremental automático (a partir do último cursor)
  // ----------------------------------------------------------------
  async syncIncremental(opts: SyncOrchestratorOptions = {}): Promise<Record<string, SyncStats>> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const results: Record<string, SyncStats> = {};

    // Contratações
    const cursorContratacao = await this.stateManager.getCursor('CONTRATACAO');
    const inicioContratacao = cursorContratacao
      ? new Date(Math.max(cursorContratacao.getTime(), ontem.getTime() - 30 * 86400_000))
      : new Date(ontem.getTime() - 30 * 86400_000);

    results.contratacoes = await this.syncContratacoes(inicioContratacao, ontem, opts);

    // Contratos
    const cursorContrato = await this.stateManager.getCursor('CONTRATO');
    const inicioContrato = cursorContrato
      ? new Date(Math.max(cursorContrato.getTime(), ontem.getTime() - 30 * 86400_000))
      : new Date(ontem.getTime() - 30 * 86400_000);

    results.contratos = await this.syncContratos(inicioContrato, ontem, opts);

    // Atas (janelas semanais)
    const cursorAta = await this.stateManager.getCursor('ATA');
    const inicioAta = cursorAta
      ? new Date(Math.max(cursorAta.getTime(), ontem.getTime() - 60 * 86400_000))
      : new Date(ontem.getTime() - 60 * 86400_000);

    results.atas = await this.syncAtas(inicioAta, ontem, opts);

    // PCA do ano atual
    results.pca = await this.syncPca(hoje.getFullYear());

    return results;
  }

  // ----------------------------------------------------------------
  // API pública para sincronizar detalhes de uma contratação
  // (substitui o cast `as any` no PncpSyncProcessor)
  // ----------------------------------------------------------------
  async syncDetalhesContratacao(
    contratacaoId: string,
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
  ): Promise<void> {
    await this.contratacaoSvc.syncItens(contratacaoId, cnpj, anoCompra, sequencialCompra);
    await this.contratacaoSvc.syncDocumentos(contratacaoId, cnpj, anoCompra, sequencialCompra);
    logger.info({ contratacaoId }, 'Detalhes de contratação sincronizados');
  }
}

// Helper local para não criar dep circular com utils
function mergeSyncStatsInPlace(target: SyncStats, source: SyncStats): void {
  target.registrosProcessados += source.registrosProcessados;
  target.registrosInseridos += source.registrosInseridos;
  target.registrosAtualizados += source.registrosAtualizados;
  target.registrosDuplicados += source.registrosDuplicados;
  target.erros += source.erros;
}
