import { PrismaClient } from '@prisma/client';
import { Logger } from './observability/logger';
import { startMetricsServer } from './observability/metrics-server';
import { PncpSyncProcessor } from './jobs/pncp.processor';
import { ElasticsearchProcessor } from './jobs/elasticsearch.processor';
import { AlertsProcessor } from './jobs/alerts.processor';
import { ExpireTrialsProcessor } from './jobs/expire-trials.processor';
import { ComprasGovSyncProcessor } from './jobs/comprasgov-sync.processor';
import { SesResolutionsProcessor } from './jobs/ses-resolutions.processor';
import { IofResolutionsProcessor } from './jobs/iof-resolutions.processor';
import { SearchService, ElasticsearchClientService } from '@aplicativo/search';

// ──────────────────────────────────────────────────────────────────────────────
// NOTA: O sistema de filas legado (RabbitMQ + Playwright/Puppeteer consumers)
// foi removido pois os arquivos de consumers não existiam e causavam falhas
// em runtime. Todo o scraping de dados governamentais agora usa BullMQ + Redis
// via PncpSyncProcessor, que é mais robusto e observável.
// ──────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }]
    : [],
});

async function bootstrap() {
  // ── PNCP Sync (BullMQ + Redis) ───────────────────────────────
  let pncpProcessor: PncpSyncProcessor | null = null;
  let esProcessor: ElasticsearchProcessor | null = null;
  let alertsProcessor: AlertsProcessor | null = null;
  let expireTrialsProcessor: ExpireTrialsProcessor | null = null;
  let comprasGovProcessor: ComprasGovSyncProcessor | null = null;
  let iofProcessor: IofResolutionsProcessor | null = null;

  try {
    const mockConfig = { get: (key: string, def: string) => process.env[key] || def };
    const esClient = new ElasticsearchClientService(mockConfig as any);
    const searchService = new SearchService(esClient);

    esProcessor = new ElasticsearchProcessor(prisma);
    await esProcessor.start();

    // PNCP e ComprasGov pausados para priorizar Resoluções
    // pncpProcessor = new PncpSyncProcessor(prisma, esProcessor);
    // await pncpProcessor.start();
    // await pncpProcessor.registrarJobsRecorrentes();

    alertsProcessor = new AlertsProcessor(prisma, searchService);
    await alertsProcessor.start();
    await alertsProcessor.registrarJobRecorrente();

    expireTrialsProcessor = new ExpireTrialsProcessor(prisma);
    await expireTrialsProcessor.start();
    await expireTrialsProcessor.registrarJobRecorrente();

    // comprasGovProcessor = new ComprasGovSyncProcessor(prisma);
    // await comprasGovProcessor.start();
    // await comprasGovProcessor.registrarJobsRecorrentes();

    // Se variável de ambiente indicar, dispara sync imediato na inicialização
    // if (process.env.PNCP_SYNC_ON_START === 'true') {
    //   Logger.info('PNCP_SYNC_ON_START=true — enfileirando sync incremental inicial');
    //   await pncpProcessor.enqueueIncremental(false);
    // }

    const sesProcessor = new SesResolutionsProcessor(prisma);
    await sesProcessor.start();
    await sesProcessor.registrarJobsRecorrentes();
    // Para testar na hora que liga o worker, vamos forçar um sync manual
    // await sesProcessor.enqueueManualSync();

    iofProcessor = new IofResolutionsProcessor(prisma);
    await iofProcessor.start();
    await iofProcessor.registrarJobsRecorrentes();

    Logger.info('PNCP Sync Processor inicializado com jobs recorrentes');
  } catch (err: any) {
    Logger.warn(`PNCP Processor não iniciado (Redis indisponível?): ${err.message}`);
  }

  // ── Métricas Prometheus ──────────────────────────────────────
  await startMetricsServer().catch((error) => {
    Logger.error('Falha ao iniciar o servidor de métricas', error);
  });

  Logger.info('Worker inicializado — PNCP Sync ativo');

  // ── Graceful shutdown ─────────────────────────────────────────
  const shutdown = async (signal: string) => {
    Logger.info(`Recebido ${signal} — encerrando worker graciosamente`);
    // await pncpProcessor?.close();
    await esProcessor?.close();
    await alertsProcessor?.close();
    await expireTrialsProcessor?.close();
    // await comprasGovProcessor?.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  Logger.error('Falha ao iniciar worker', error);
  process.exit(1);
});
