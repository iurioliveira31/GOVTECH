import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';

const QUEUE_NAME = 'iof-resolutions-sync';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

export class IofResolutionsProcessor {
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
      { connection, concurrency: 1 },
    );

    this.worker.on('completed', (job) =>
      logger.info({ jobId: job.id, name: job.name }, '[IOF-MG] Job concluído'),
    );

    this.worker.on('failed', (job, err) =>
      logger.error({ jobId: job?.id, err: err.message }, '[IOF-MG] Job falhou'),
    );

    logger.info('[IOF-MG] Worker iniciado');
  }

  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync:iof':
        await this.syncIof();
        break;
      default:
        logger.warn({ name: job.name }, '[IOF-MG] Job desconhecido');
    }
  }

  async syncIof(): Promise<void> {
    logger.info('[IOF-MG] Iniciando sincronização diária do Diário Oficial de MG...');
    // TODO: Implementar lógica de web scraping para o IOF-MG, baixar o PDF e fragmentar páginas.
    // Como os PDFs do Diário Oficial têm centenas de páginas, devemos extrair o texto de cada página
    // e enviar apenas as páginas que contêm "Secretaria de Estado de Saúde" para o Gemini.
    logger.info('[IOF-MG] Lógica de processamento pendente (PDF scraping).');
  }

  async registrarJobsRecorrentes(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'sync:iof') {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    // Roda todo dia às 08:00 (cron string)
    await this.queue.add(
      'sync:iof',
      {},
      {
        repeat: { pattern: '0 8 * * *' },
        jobId: 'iof-resolutions-daily',
      },
    );

    logger.info('[IOF-MG] Jobs recorrentes registrados (diário às 08:00)');
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
