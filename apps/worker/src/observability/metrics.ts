import * as client from 'prom-client';

const Counter = (client as any).Counter;
const Histogram = (client as any).Histogram;
export const register = (client as any).register;

export const scrapeCounter = new Counter({
  name: 'scraper_jobs_total',
  help: 'Total de jobs de scraping processados',
  labelNames: ['target', 'status']
});

export const scrapeDuration = new Histogram({
  name: 'scraper_job_duration_seconds',
  help: 'Tempo de execução de jobs de scraping',
  labelNames: ['target'],
  buckets: [0.5, 1, 2, 5, 10, 20]
});

// ── PNCP Sync metrics ────────────────────────────────────────────

export const pncpJobsTotal = new Counter({
  name: 'pncp_sync_jobs_total',
  help: 'Total de jobs de sync PNCP processados',
  labelNames: ['job', 'status'],
});

export const pncpJobDuration = new Histogram({
  name: 'pncp_sync_job_duration_seconds',
  help: 'Duração dos jobs de sync PNCP',
  labelNames: ['job'],
  buckets: [5, 15, 30, 60, 120, 300, 600, 1800],
});

export const pncpRegistrosInseridos = new Counter({
  name: 'pncp_sync_registros_inseridos_total',
  help: 'Total de registros inseridos no banco pelo sync PNCP',
  labelNames: ['entity'],
});

export const pncpRegistrosAtualizados = new Counter({
  name: 'pncp_sync_registros_atualizados_total',
  help: 'Total de registros atualizados no banco pelo sync PNCP',
  labelNames: ['entity'],
});
