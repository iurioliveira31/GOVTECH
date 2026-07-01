import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SyncOrchestrator } from '@aplicativo/sync';
import { ElasticsearchProcessor } from './elasticsearch.processor';
import {
  PNCP_QUEUE_NAME,
  PNCP_JOB_NAMES,
  SyncIncrementalJobData,
  SyncContratacoesPeriodoJobData,
  SyncContratosPeriodoJobData,
  SyncAtasPeriodoJobData,
  SyncPcaJobData,
  SyncDetalhesContratacaoJobData,
} from './pncp.queues';
import { logger } from '../observability/logger';
import {
  pncpJobsTotal,
  pncpJobDuration,
  pncpRegistrosInseridos,
  pncpRegistrosAtualizados,
} from '../observability/metrics';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

export class PncpSyncProcessor {
  private worker!: Worker;
  private queue!: Queue;
  private readonly prisma: PrismaClient;
  private readonly orchestrator: SyncOrchestrator;

  constructor(prisma: PrismaClient, private readonly esProcessor?: ElasticsearchProcessor) {
    this.prisma = prisma;
    this.orchestrator = new SyncOrchestrator(prisma);
  }

  async start(): Promise<void> {
    const connection = redisConnection();

    // Queue: para publicar jobs sob demanda
    this.queue = new Queue(PNCP_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });

    // Worker: processa jobs
    this.worker = new Worker(
      PNCP_QUEUE_NAME,
      async (job: Job) => this.process(job),
      {
        connection,
        concurrency: Number(process.env.PNCP_WORKER_CONCURRENCY ?? '1'),
        limiter: {
          max: Number(process.env.PNCP_WORKER_RATE_MAX ?? '2'),
          duration: Number(process.env.PNCP_WORKER_RATE_DURATION ?? '1000'),
        },
      },
    );

    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id, name: job.name }, '[PncpWorker] Job concluído');
      pncpJobsTotal.inc({ job: job.name, status: 'completed' });
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, name: job?.name, err: err.message }, '[PncpWorker] Job falhou');
      pncpJobsTotal.inc({ job: job?.name ?? 'unknown', status: 'failed' });
    });

    this.worker.on('error', (err) => {
      logger.error({ err: err.message }, '[PncpWorker] Erro interno do worker');
    });

    logger.info('[PncpWorker] Worker PNCP iniciado');
  }

  // ----------------------------------------------------------------
  // Dispatcher central de jobs
  // ----------------------------------------------------------------
  private async process(job: Job): Promise<void> {
    const end = pncpJobDuration.startTimer({ job: job.name });
    logger.info({ jobId: job.id, name: job.name, attempt: job.attemptsMade + 1 }, '[PncpWorker] Processando');

    try {
      switch (job.name) {
        case PNCP_JOB_NAMES.SYNC_INCREMENTAL:
          await this.handleSyncIncremental(job);
          break;

        case PNCP_JOB_NAMES.SYNC_CONTRATACOES:
          await this.handleSyncContratacoes(job);
          break;

        case PNCP_JOB_NAMES.SYNC_CONTRATOS:
          await this.handleSyncContratos(job);
          break;

        case PNCP_JOB_NAMES.SYNC_ATAS:
          await this.handleSyncAtas(job);
          break;

        case PNCP_JOB_NAMES.SYNC_PCA:
          await this.handleSyncPca(job);
          break;

        case PNCP_JOB_NAMES.SYNC_DETALHES_CONTRATACAO:
          await this.handleSyncDetalhesContratacao(job);
          break;

        case PNCP_JOB_NAMES.REPROCESSAR_FALHOS:
          await this.orchestrator.reprocessarFalhos();
          break;

        default:
          logger.warn({ name: job.name }, '[PncpWorker] Job desconhecido, ignorando');
      }
    } finally {
      end();
    }
  }

  // ----------------------------------------------------------------
  // Handlers individuais
  // ----------------------------------------------------------------
  private async handleSyncIncremental(job: Job<SyncIncrementalJobData>): Promise<void> {
    const startedAt = new Date();
    const results = await this.orchestrator.syncIncremental({
      syncDetalhes: job.data.syncDetalhes ?? false,
    });

    // Registra métricas agregadas
    for (const [entity, stats] of Object.entries(results)) {
      pncpRegistrosInseridos.inc({ entity }, stats.registrosInseridos);
      pncpRegistrosAtualizados.inc({ entity }, stats.registrosAtualizados);
    }

    if (this.esProcessor) {
      // Indexa tudo que foi atualizado desde o start date desse lote
      await this.esProcessor.enqueueIndexPeriod('contratacao', startedAt);
      await this.esProcessor.enqueueIndexPeriod('contrato', startedAt);
    }

    logger.info({ results }, '[PncpWorker] Sync incremental concluído');
    await job.updateProgress(100);
  }

  private async handleSyncContratacoes(job: Job<SyncContratacoesPeriodoJobData>): Promise<void> {
    const startedAt = new Date();
    const stats = await this.orchestrator.syncContratacoes(
      new Date(job.data.dataInicial),
      new Date(job.data.dataFinal),
      { syncDetalhes: job.data.syncDetalhes ?? false },
    );
    pncpRegistrosInseridos.inc({ entity: 'contratacoes' }, stats.registrosInseridos);
    pncpRegistrosAtualizados.inc({ entity: 'contratacoes' }, stats.registrosAtualizados);
    if (this.esProcessor) {
      await this.esProcessor.enqueueIndexPeriod('contratacao', startedAt);
    }
    logger.info({ stats }, '[PncpWorker] Sync contratações concluído');
  }

  private async handleSyncContratos(job: Job<SyncContratosPeriodoJobData>): Promise<void> {
    const startedAt = new Date();
    const stats = await this.orchestrator.syncContratos(
      new Date(job.data.dataInicial),
      new Date(job.data.dataFinal),
    );
    pncpRegistrosInseridos.inc({ entity: 'contratos' }, stats.registrosInseridos);
    pncpRegistrosAtualizados.inc({ entity: 'contratos' }, stats.registrosAtualizados);
    if (this.esProcessor) {
      await this.esProcessor.enqueueIndexPeriod('contrato', startedAt);
    }
    logger.info({ stats }, '[PncpWorker] Sync contratos concluído');
  }

  private async handleSyncAtas(job: Job<SyncAtasPeriodoJobData>): Promise<void> {
    const stats = await this.orchestrator.syncAtas(
      new Date(job.data.dataInicial),
      new Date(job.data.dataFinal),
    );
    pncpRegistrosInseridos.inc({ entity: 'atas' }, stats.registrosInseridos);
    pncpRegistrosAtualizados.inc({ entity: 'atas' }, stats.registrosAtualizados);
    logger.info({ stats }, '[PncpWorker] Sync atas concluído');
  }

  private async handleSyncPca(job: Job<SyncPcaJobData>): Promise<void> {
    const stats = await this.orchestrator.syncPca(job.data.ano);
    pncpRegistrosInseridos.inc({ entity: 'pca' }, stats.registrosInseridos);
    logger.info({ stats }, '[PncpWorker] Sync PCA concluído');
  }

  private async handleSyncDetalhesContratacao(
    job: Job<SyncDetalhesContratacaoJobData>,
  ): Promise<void> {
    const { contratacaoId, cnpj, anoCompra, sequencialCompra } = job.data;
    await this.orchestrator.syncDetalhesContratacao(contratacaoId, cnpj, anoCompra, sequencialCompra);
    logger.info({ contratacaoId }, '[PncpWorker] Detalhes de contratação sincronizados');
  }

  // ----------------------------------------------------------------
  // API pública para enfileirar jobs sob demanda
  // ----------------------------------------------------------------
  async enqueueIncremental(syncDetalhes = false): Promise<void> {
    await this.queue.add(
      PNCP_JOB_NAMES.SYNC_INCREMENTAL,
      { syncDetalhes },
      { jobId: `incremental-${Date.now()}` },
    );
  }

  async enqueueContratacoesPeriodo(
    dataInicial: Date,
    dataFinal: Date,
    syncDetalhes = false,
  ): Promise<void> {
    await this.queue.add(PNCP_JOB_NAMES.SYNC_CONTRATACOES, {
      dataInicial: dataInicial.toISOString(),
      dataFinal: dataFinal.toISOString(),
      syncDetalhes,
    });
  }

  async enqueueContratosPeriodo(dataInicial: Date, dataFinal: Date): Promise<void> {
    await this.queue.add(PNCP_JOB_NAMES.SYNC_CONTRATOS, {
      dataInicial: dataInicial.toISOString(),
      dataFinal: dataFinal.toISOString(),
    });
  }

  async enqueueAtasPeriodo(dataInicial: Date, dataFinal: Date): Promise<void> {
    await this.queue.add(PNCP_JOB_NAMES.SYNC_ATAS, {
      dataInicial: dataInicial.toISOString(),
      dataFinal: dataFinal.toISOString(),
    });
  }

  async enqueuePca(ano: number): Promise<void> {
    await this.queue.add(
      PNCP_JOB_NAMES.SYNC_PCA,
      { ano },
      { jobId: `pca-${ano}` },
    );
  }

  async enqueueReprocessarFalhos(): Promise<void> {
    await this.queue.add(
      PNCP_JOB_NAMES.REPROCESSAR_FALHOS,
      {},
      { jobId: `reprocess-${Date.now()}` },
    );
  }

  // ----------------------------------------------------------------
  // Agendamento de repeatable jobs (cron)
  // ----------------------------------------------------------------
  async registrarJobsRecorrentes(): Promise<void> {
    // Remove jobs recorrentes anteriores para evitar duplicatas
    const jobs = await this.queue.getRepeatableJobs();
    for (const job of jobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }

    // Sync incremental a cada 2 horas
    await this.queue.add(
      PNCP_JOB_NAMES.SYNC_INCREMENTAL,
      { syncDetalhes: false },
      {
        repeat: { pattern: process.env.PNCP_SYNC_CRON ?? '0 */2 * * *' },
        jobId: 'incremental-recorrente',
      },
    );

    // Sync com detalhes (itens + docs) uma vez por dia às 3h
    await this.queue.add(
      PNCP_JOB_NAMES.SYNC_INCREMENTAL,
      { syncDetalhes: true },
      {
        repeat: { pattern: '0 3 * * *' },
        jobId: 'incremental-detalhes-recorrente',
      },
    );

    // Reprocessa falhos todo dia às 6h
    await this.queue.add(
      PNCP_JOB_NAMES.REPROCESSAR_FALHOS,
      {},
      {
        repeat: { pattern: '0 6 * * *' },
        jobId: 'reprocessar-falhos-recorrente',
      },
    );

    // PCA do ano corrente toda segunda às 5h
    await this.queue.add(
      PNCP_JOB_NAMES.SYNC_PCA,
      { ano: new Date().getFullYear() },
      {
        repeat: { pattern: '0 5 * * 1' },
        jobId: 'pca-recorrente',
      },
    );

    logger.info('[PncpWorker] Jobs recorrentes registrados');
  }

  getQueue(): Queue {
    return this.queue;
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
