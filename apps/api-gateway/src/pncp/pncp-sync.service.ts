import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { TriggerSyncDto } from './dto/pncp-query.dto';

// Constantes de fila definidas localmente para evitar dependência cross-app.
// Devem permanecer sincronizadas com packages/sync ou packages/shared (Fase 1).
const PNCP_QUEUE_NAME = 'pncp-sync';
const PNCP_JOB_NAMES = {
  SYNC_INCREMENTAL: 'pncp:sync:incremental',
  SYNC_CONTRATACOES: 'pncp:sync:contratacoes',
  SYNC_CONTRATOS: 'pncp:sync:contratos',
  SYNC_ATAS: 'pncp:sync:atas',
  SYNC_PCA: 'pncp:sync:pca',
  REPROCESSAR_FALHOS: 'pncp:sync:reprocessar-falhos',
} as const;

const COMPRASGOV_QUEUE_NAME = 'comprasgov-sync';


@Injectable()
export class PncpSyncService {
  private readonly logger = new Logger(PncpSyncService.name);
  private queue: Queue | null = null;
  private comprasGovQueue: Queue | null = null;

  constructor() {
    this.initQueue();
  }

  private initQueue() {
    try {
      const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
      const connection = {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      };
      const jobOptions = {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 } as const,
      };

      this.queue = new Queue(PNCP_QUEUE_NAME, {
        connection,
        defaultJobOptions: jobOptions,
      });

      this.comprasGovQueue = new Queue(COMPRASGOV_QUEUE_NAME, {
        connection,
        defaultJobOptions: jobOptions,
      });

      this.logger.log('Queues PNCP e ComprasGov conectadas');
    } catch (err: any) {
      this.logger.warn(`Queues não inicializadas: ${err.message}`);
    }
  }

  private async enqueue(name: string, data: unknown): Promise<{ enqueued: boolean; job?: string }> {
    if (!this.queue) {
      this.logger.warn('Queue PNCP indisponível — job não enfileirado');
      return { enqueued: false };
    }
    const job = await this.queue.add(name, data, { jobId: `${name}-${Date.now()}` });
    this.logger.log(`Job enfileirado: ${name} (id: ${job.id})`);
    return { enqueued: true, job: job.id };
  }

  async triggerIncremental(dto: TriggerSyncDto) {
    const result = await this.enqueue(PNCP_JOB_NAMES.SYNC_INCREMENTAL, {
      syncDetalhes: dto.syncDetalhes ?? false,
    });
    return { message: 'Sync incremental enfileirado', ...result };
  }

  async triggerContratacoes(dto: TriggerSyncDto) {
    const dataInicial = dto.dataInicial
      ? new Date(dto.dataInicial)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
    const dataFinal = dto.dataFinal ? new Date(dto.dataFinal) : new Date();

    const result = await this.enqueue(PNCP_JOB_NAMES.SYNC_CONTRATACOES, {
      dataInicial: dataInicial.toISOString(),
      dataFinal: dataFinal.toISOString(),
      syncDetalhes: dto.syncDetalhes ?? false,
    });

    return {
      message: 'Sync de contratações enfileirado',
      periodo: {
        dataInicial: dataInicial.toISOString().split('T')[0],
        dataFinal: dataFinal.toISOString().split('T')[0],
      },
      ...result,
    };
  }

  async triggerContratos(dto: TriggerSyncDto) {
    const dataInicial = dto.dataInicial
      ? new Date(dto.dataInicial)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
    const dataFinal = dto.dataFinal ? new Date(dto.dataFinal) : new Date();

    const result = await this.enqueue(PNCP_JOB_NAMES.SYNC_CONTRATOS, {
      dataInicial: dataInicial.toISOString(),
      dataFinal: dataFinal.toISOString(),
    });

    return { message: 'Sync de contratos enfileirado', ...result };
  }

  async triggerAtas(dto: TriggerSyncDto) {
    const dataInicial = dto.dataInicial
      ? new Date(dto.dataInicial)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
    const dataFinal = dto.dataFinal ? new Date(dto.dataFinal) : new Date();

    const result = await this.enqueue(PNCP_JOB_NAMES.SYNC_ATAS, {
      dataInicial: dataInicial.toISOString(),
      dataFinal: dataFinal.toISOString(),
    });

    return { message: 'Sync de atas enfileirado', ...result };
  }

  async triggerPca(dto: TriggerSyncDto) {
    const ano = dto.anoPca ?? new Date().getFullYear();
    const result = await this.enqueue(PNCP_JOB_NAMES.SYNC_PCA, { ano });
    return { message: `Sync do PCA ${ano} enfileirado`, ano, ...result };
  }

  async triggerReprocessar() {
    const result = await this.enqueue(PNCP_JOB_NAMES.REPROCESSAR_FALHOS, {});
    return { message: 'Reprocessamento de falhos enfileirado', ...result };
  }

  async triggerComprasGovHistorico() {
    if (!this.comprasGovQueue) {
      this.logger.warn('Queue ComprasGov indisponível');
      return { enqueued: false, message: 'Redis indisponível' };
    }
    const job = await this.comprasGovQueue.add(
      'sync:historico:trigger',
      {},
      { jobId: `comprasgov-manual-${Date.now()}` },
    );
    this.logger.log(`Job ComprasGov enfileirado: ${job.id}`);
    return { enqueued: true, job: job.id, message: 'Sync histórico do ComprasNet enfileirado' };
  }
}
