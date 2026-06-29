/**
 * ComprasGovSyncProcessor
 *
 * Sincroniza licitações do portal ComprasNet (Compras.gov.br) que NÃO estão
 * no PNCP (normalmente, licitações anteriores a 2024 ou de modalidades antigas
 * como Pregão Eletrônico no SIASGnet).
 *
 * Fontes utilizadas:
 *  - https://contratos.comprasnet.gov.br/api/contrato (contratos por UASG)
 *  - API pública de Licitações do SIASGnet (BLL)
 *
 * Os dados são salvos na tabela PncpContratacao para unificação de busca,
 * porém com um marcador no campo `linkSistemaOrigem` indicando a fonte.
 */
import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';
import { createHash } from 'crypto';

// ──────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────
const QUEUE_NAME = 'comprasgov-sync';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// UASGs (Unidades Administrativas de Serviços Gerais) prioritárias para sync histórico.
// Cada UASG representa um grande órgão comprador. Lista inclui ministérios chave.
const PRIORIDADE_UASGS = [
  '153115', // Ministério da Saúde - SCTIE
  '250005', // Ministério da Saúde - DAF
  '393002', // Ministério da Educação
  '110404', // Exército Brasileiro
  '120004', // Aeronáutica
  '130005', // Marinha do Brasil
  '260001', // Ministério da Justiça
  '320015', // Ministério do Desenvolvimento Agrário
  '340028', // Ministério da Infraestrutura
];

// Mapeamento dos tipos de licitação do ComprasNet para o enum do PNCP
const MODALIDADE_COMPRASNET: Record<number, string> = {
  1:  'CONCORRENCIA_PRESENCIAL',
  2:  'TOMADA_PRECOS', // não existe no PNCP, usaremos o mais próximo
  3:  'CONVITE',
  4:  'CONCURSO',
  5:  'LEILAO_PRESENCIAL',
  6:  'DISPENSA',
  7:  'INEXIGIBILIDADE',
  8:  'PREGAO_ELETRONICO',
  9:  'PREGAO_PRESENCIAL',
  10: 'CREDENCIAMENTO',
  11: 'CONCORRENCIA_ELETRONICA',
  12: 'DIALOGO_COMPETITIVO',
};

const MODALIDADE_PARA_ENUM: Record<string, string> = {
  'CONCORRENCIA_PRESENCIAL':  'CONCORRENCIA_PRESENCIAL',
  'CONCORRENCIA_ELETRONICA':  'CONCORRENCIA_ELETRONICA',
  'PREGAO_ELETRONICO':        'PREGAO_ELETRONICO',
  'PREGAO_PRESENCIAL':        'PREGAO_PRESENCIAL',
  'DIALOGO_COMPETITIVO':      'DIALOGO_COMPETITIVO',
  'DISPENSA':                 'DISPENSA',
  'INEXIGIBILIDADE':          'INEXIGIBILIDADE',
  'CREDENCIAMENTO':           'CREDENCIAMENTO',
  'CONCURSO':                 'CONCURSO',
  'LEILAO_PRESENCIAL':        'LEILAO_PRESENCIAL',
};

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

function hashContent(obj: unknown): string {
  const json = JSON.stringify(obj);
  return createHash('sha256').update(json).digest('hex').substring(0, 16);
}

// ──────────────────────────────────────────────────────────────
// Tipos da API ComprasNet (contratos.comprasnet.gov.br)
// ──────────────────────────────────────────────────────────────
interface ComprasNetContrato {
  id: number;
  numero: string;
  processo: string;
  objeto: string;
  tipo: { id: number; descricao: string };
  fundamento_legal: string;
  modalidade_licitacao: { id: number; descricao: string } | null;
  situacao: { id: number; descricao: string } | null;
  data_assinatura: string | null;
  data_vigencia_ini: string | null;
  data_vigencia_fim: string | null;
  data_publicacao: string | null;
  valor_global: number | null;
  valor_inicial: number | null;
  cnpj_cpf: string | null;
  nome_razao_social: string | null;
  fornecedor: { cnpj_cpf: string; nome: string } | null;
  orgao_sub_rogado: null | { unidade_gestora: { codigo: string; nome: string; uf: string; municipio: string } };
  unidade_gestora: {
    codigo: string;
    nome: string;
    uf: string;
    municipio: string | null;
    orgao: { cnpj: string; nome: string };
  } | null;
  licitacao: null | {
    numero: string;
    modalidade: { id: number; descricao: string } | null;
  };
}

interface ComprasNetResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ComprasNetContrato[];
}

// ──────────────────────────────────────────────────────────────
// Classe principal
// ──────────────────────────────────────────────────────────────
export class ComprasGovSyncProcessor {
  private worker!: Worker;
  private queue!: Queue;

  constructor(private readonly prisma: PrismaClient) {}

  async start(): Promise<void> {
    const connection = redisConnection();

    this.queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => this.process(job),
      { connection, concurrency: 1 }, // 1 worker para não sobrecarregar a API do governo
    );

    this.worker.on('completed', (job) =>
      logger.info({ jobId: job.id, name: job.name }, '[ComprasGov] Job concluído'),
    );

    this.worker.on('failed', (job, err) =>
      logger.error({ jobId: job?.id, err: err.message }, '[ComprasGov] Job falhou'),
    );

    logger.info('[ComprasGov] Worker iniciado');
  }

  // ──────────────────────────────────────────────────────────────
  // Dispatcher de jobs
  // ──────────────────────────────────────────────────────────────
  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync:uasg':
        await this.syncContratosUasg(job.data.uasg, job.data.pagina ?? 1);
        break;
      case 'sync:historico:trigger':
        await this.dispararSyncHistorico();
        break;
      default:
        logger.warn({ name: job.name }, '[ComprasGov] Job desconhecido');
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Dispara jobs para cada UASG prioritária
  // ──────────────────────────────────────────────────────────────
  async dispararSyncHistorico(): Promise<void> {
    for (const uasg of PRIORIDADE_UASGS) {
      await this.queue.add(
        'sync:uasg',
        { uasg, pagina: 1 },
        { jobId: `comprasgov-uasg-${uasg}-p1-${Date.now()}` },
      );
    }
    logger.info({ total: PRIORIDADE_UASGS.length }, '[ComprasGov] Jobs de sync histórico disparados');
  }

  // ──────────────────────────────────────────────────────────────
  // Busca e persiste contratos de uma UASG específica
  // ──────────────────────────────────────────────────────────────
  private async syncContratosUasg(uasg: string, pagina: number): Promise<void> {
    const url = `https://contratos.comprasnet.gov.br/api/contrato/?coUasg=${uasg}&page=${pagina}`;

    logger.info({ uasg, pagina, url }, '[ComprasGov] Buscando contratos');

    let response: ComprasNetResponse;
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'LicitaAI-Sync/1.0' },
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        if (resp.status === 404) {
          logger.warn({ uasg, pagina }, '[ComprasGov] UASG não encontrada ou sem contratos');
          return;
        }
        throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
      }

      response = await resp.json() as ComprasNetResponse;
    } catch (err: any) {
      logger.error({ uasg, pagina, err: err.message }, '[ComprasGov] Falha na requisição');
      throw err; // BullMQ vai retentar
    }

    const { results, next } = response;
    logger.info({ uasg, pagina, registros: results.length, total: response.count }, '[ComprasGov] Registros recebidos');

    let inseridos = 0;
    let atualizados = 0;
    let erros = 0;

    for (const contrato of results) {
      try {
        await this.upsertContrato(contrato);
        inseridos++; // simplificado
      } catch (err: any) {
        erros++;
        logger.error({ contratoId: contrato.id, err: err.message }, '[ComprasGov] Erro ao salvar contrato');
      }
    }

    logger.info({ uasg, pagina, inseridos, erros }, '[ComprasGov] Lote processado');

    // Se há próxima página, enfileira
    if (next) {
      await this.queue.add(
        'sync:uasg',
        { uasg, pagina: pagina + 1 },
        { delay: 2_000 }, // aguarda 2s entre páginas para não sobrecarregar
      );
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Persiste (upsert) um contrato do ComprasNet na tabela PncpContratacao
  // ──────────────────────────────────────────────────────────────
  private async upsertContrato(c: ComprasNetContrato): Promise<void> {
    // Monta um identificador único no formato compatível com o PNCP
    // para evitar colisões: "COMPRASNET-{uasg}-{numero_contrato}"
    const orgaoCnpj = c.unidade_gestora?.orgao?.cnpj?.replace(/\D/g, '') ?? '00000000000000';
    const numeroControlePncp = `COMPRASNET-${c.unidade_gestora?.codigo ?? 'XX'}-${c.numero}`;
    const hash = hashContent(c);

    // Determina modalidade
    const modalidadeId = c.licitacao?.modalidade?.id ?? c.modalidade_licitacao?.id ?? 0;
    const modalidadeNomeRaw = MODALIDADE_COMPRASNET[modalidadeId] ?? 'OUTROS';
    const modalidadeEnum = MODALIDADE_PARA_ENUM[modalidadeNomeRaw] ?? null;

    // Garante que o órgão existe (upsert simplificado)
    if (orgaoCnpj !== '00000000000000' && c.unidade_gestora?.orgao?.nome) {
      await this.prisma.pncpOrgao.upsert({
        where: { cnpj: orgaoCnpj },
        create: {
          cnpj: orgaoCnpj,
          razaoSocial: c.unidade_gestora.orgao.nome,
          ufSigla: c.unidade_gestora.uf ?? null,
          municipioNome: c.unidade_gestora.municipio ?? null,
        },
        update: {
          razaoSocial: c.unidade_gestora.orgao.nome,
        },
      });
    }

    const existing = await this.prisma.pncpContratacao.findUnique({
      where: { numeroControlePncp },
      select: { id: true, hashConteudo: true },
    });

    if (existing?.hashConteudo === hash) return; // Sem mudança

    const data = {
      anoCompra: c.data_publicacao ? new Date(c.data_publicacao).getFullYear() : new Date().getFullYear(),
      sequencialCompra: c.id,
      numeroCompra: c.numero,
      processo: c.processo ?? null,
      modalidadeId: modalidadeId,
      modalidadeNome: c.licitacao?.modalidade?.descricao ?? c.modalidade_licitacao?.descricao ?? 'Não informado',
      modalidade: modalidadeEnum as any,
      situacaoId: c.situacao?.id ?? 1,
      situacaoNome: c.situacao?.descricao ?? 'Ativa',
      situacao: 'DIVULGADA' as any,
      objetoCompra: c.objeto ?? 'Objeto não informado',
      srp: false,
      orcamentoSigiloso: false,
      valorTotalEstimado: c.valor_global ?? c.valor_inicial ?? null,
      valorTotalHomologado: c.valor_global ?? null,
      dataAberturaProposta: c.data_assinatura ? new Date(c.data_assinatura) : null,
      dataEncerramentoProposta: c.data_vigencia_fim ? new Date(c.data_vigencia_fim) : null,
      dataPublicacaoPncp: c.data_publicacao ? new Date(c.data_publicacao) : null,
      dataInclusao: c.data_publicacao ? new Date(c.data_publicacao) : null,
      dataAtualizacao: new Date(),
      amparoLegalNome: c.fundamento_legal ?? null,
      orgaoCnpj,
      orgaoRazaoSocial: c.unidade_gestora?.orgao?.nome ?? null,
      unidadeCodigo: c.unidade_gestora?.codigo ?? null,
      unidadeNome: c.unidade_gestora?.nome ?? null,
      unidadeUfSigla: c.unidade_gestora?.uf ?? null,
      unidadeMunicipioNome: c.unidade_gestora?.municipio ?? null,
      // Marca o sistema de origem para rastreabilidade
      linkSistemaOrigem: `https://contratos.comprasnet.gov.br/api/contrato/${c.id}/`,
      hashConteudo: hash,
      sincronizadoEm: new Date(),
    };

    if (existing) {
      await this.prisma.pncpContratacao.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.pncpContratacao.create({
        data: { ...data, numeroControlePncp },
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Registra jobs recorrentes (cron)
  // ──────────────────────────────────────────────────────────────
  async registrarJobsRecorrentes(): Promise<void> {
    // Limpa jobs recorrentes anteriores
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    // Sync semanal às 02:00 de segunda-feira (domingo à noite)
    await this.queue.add(
      'sync:historico:trigger',
      {},
      {
        repeat: { pattern: '0 2 * * 1' },
        jobId: 'comprasgov-historico-semanal',
      },
    );

    logger.info('[ComprasGov] Jobs recorrentes registrados (semanal às segunda 02h)');
  }

  // ──────────────────────────────────────────────────────────────
  // API pública para acionar sync manual
  // ──────────────────────────────────────────────────────────────
  async enqueueHistoricoSync(): Promise<void> {
    await this.queue.add(
      'sync:historico:trigger',
      {},
      { jobId: `comprasgov-manual-${Date.now()}` },
    );
    logger.info('[ComprasGov] Sync histórico manual enfileirado');
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
