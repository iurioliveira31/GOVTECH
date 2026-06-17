import { PrismaClient } from '@prisma/client';
import { Logger } from './observability/logger';
import { startMetricsServer } from './observability/metrics-server';
import { PncpSyncProcessor } from './jobs/pncp.processor';
import { ElasticsearchProcessor } from './jobs/elasticsearch.processor';
import { AlertsProcessor } from './jobs/alerts.processor';
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

  try {
    const mockConfig = { get: (key: string, def: string) => process.env[key] || def };
    const esClient = new ElasticsearchClientService(mockConfig as any);
    const searchService = new SearchService(esClient);

    esProcessor = new ElasticsearchProcessor(prisma);
    await esProcessor.start();

    pncpProcessor = new PncpSyncProcessor(prisma, esProcessor);
    await pncpProcessor.start();
    await pncpProcessor.registrarJobsRecorrentes();

    alertsProcessor = new AlertsProcessor(prisma, searchService);
    await alertsProcessor.start();
    await alertsProcessor.registrarJobRecorrente();

    // Se variável de ambiente indicar, dispara sync imediato na inicialização
    if (process.env.PNCP_SYNC_ON_START === 'true') {
      Logger.info('PNCP_SYNC_ON_START=true — enfileirando sync incremental inicial');
      await pncpProcessor.enqueueIncremental(false);
    }

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
    await pncpProcessor?.close();
    await esProcessor?.close();
    await alertsProcessor?.close();
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
