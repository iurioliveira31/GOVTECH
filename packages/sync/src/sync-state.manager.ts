import { PrismaClient, SyncEntityType, SyncStatus } from '@prisma/client';
import { formatPncpDate, buildSyncKey, SyncStats } from './utils';

export class SyncStateManager {
  constructor(private readonly prisma: PrismaClient) {}

  // ------------------------------------------------------------------
  // Cursor: registra até qual data cada entidade foi sincronizada
  // ------------------------------------------------------------------
  async getCursor(entityType: SyncEntityType): Promise<Date | null> {
    const cursor = await this.prisma.pncpSyncCursor.findUnique({
      where: { entityType },
    });
    return cursor?.ultimaDataSync ?? null;
  }

  async updateCursor(entityType: SyncEntityType, data: Date): Promise<void> {
    await this.prisma.pncpSyncCursor.upsert({
      where: { entityType },
      create: { entityType, ultimaDataSync: data },
      update: { ultimaDataSync: data },
    });
  }

  // ------------------------------------------------------------------
  // SyncState por janela temporal
  // ------------------------------------------------------------------
  async getOrCreateSyncState(
    entityType: SyncEntityType,
    dataInicial: Date,
    dataFinal: Date,
    extraKey?: string,
  ) {
    const syncKey = buildSyncKey(
      entityType,
      formatPncpDate(dataInicial),
      formatPncpDate(dataFinal),
      extraKey,
    );

    return this.prisma.pncpSyncState.upsert({
      where: { entityType_syncKey: { entityType, syncKey } },
      create: {
        entityType,
        syncKey,
        dataInicial,
        dataFinal,
        status: 'PENDING',
      },
      update: {},
    });
  }

  async iniciarSync(id: string, totalRegistros?: number, totalPaginas?: number) {
    return this.prisma.pncpSyncState.update({
      where: { id },
      data: {
        status: 'RUNNING',
        iniciadoEm: new Date(),
        ...(totalRegistros !== undefined && { totalRegistros }),
        ...(totalPaginas !== undefined && { totalPaginas }),
      },
    });
  }

  async atualizarProgresso(
    id: string,
    paginaAtual: number,
    stats: Partial<SyncStats>,
  ) {
    return this.prisma.pncpSyncState.update({
      where: { id },
      data: {
        paginaAtual,
        ...(stats.registrosProcessados !== undefined && {
          registrosProcessados: { increment: stats.registrosProcessados },
        }),
        ...(stats.registrosInseridos !== undefined && {
          registrosInseridos: { increment: stats.registrosInseridos },
        }),
        ...(stats.registrosAtualizados !== undefined && {
          registrosAtualizados: { increment: stats.registrosAtualizados },
        }),
        ...(stats.registrosDuplicados !== undefined && {
          registrosDuplicados: { increment: stats.registrosDuplicados },
        }),
        ...(stats.erros !== undefined && {
          erros: { increment: stats.erros },
        }),
      },
    });
  }

  async concluirSync(id: string, stats: SyncStats) {
    return this.prisma.pncpSyncState.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        concluidoEm: new Date(),
        registrosProcessados: stats.registrosProcessados,
        registrosInseridos: stats.registrosInseridos,
        registrosAtualizados: stats.registrosAtualizados,
        registrosDuplicados: stats.registrosDuplicados,
        erros: stats.erros,
      },
    });
  }

  async falharSync(id: string, erro: string, stats?: Partial<SyncStats>) {
    return this.prisma.pncpSyncState.update({
      where: { id },
      data: {
        status: 'FAILED',
        concluidoEm: new Date(),
        ultimoErro: erro.substring(0, 2000),
        ...(stats && {
          registrosProcessados: stats.registrosProcessados ?? 0,
          registrosInseridos: stats.registrosInseridos ?? 0,
          registrosAtualizados: stats.registrosAtualizados ?? 0,
          registrosDuplicados: stats.registrosDuplicados ?? 0,
          erros: stats.erros ?? 1,
        }),
      },
    });
  }

  async marcarPararcial(id: string, stats: SyncStats, ultimoErro: string) {
    return this.prisma.pncpSyncState.update({
      where: { id },
      data: {
        status: 'PARTIAL',
        concluidoEm: new Date(),
        ultimoErro: ultimoErro.substring(0, 2000),
        registrosProcessados: stats.registrosProcessados,
        registrosInseridos: stats.registrosInseridos,
        registrosAtualizados: stats.registrosAtualizados,
        registrosDuplicados: stats.registrosDuplicados,
        erros: stats.erros,
      },
    });
  }

  // ------------------------------------------------------------------
  // Janelas com falha pendentes de reprocessamento
  // ------------------------------------------------------------------
  async buscarSyncsFalhados(entityType: SyncEntityType, limite = 10) {
    return this.prisma.pncpSyncState.findMany({
      where: {
        entityType,
        status: { in: ['FAILED', 'PARTIAL'] },
      },
      orderBy: { dataInicial: 'asc' },
      take: limite,
    });
  }

  // ------------------------------------------------------------------
  // Reprocessar falhos
  // ------------------------------------------------------------------
  async reativarParaSync(id: string) {
    return this.prisma.pncpSyncState.update({
      where: { id },
      data: {
        status: 'PENDING',
        paginaAtual: 1,
        registrosProcessados: 0,
        registrosInseridos: 0,
        registrosAtualizados: 0,
        registrosDuplicados: 0,
        erros: 0,
        ultimoErro: null,
        iniciadoEm: null,
        concluidoEm: null,
      },
    });
  }
}
