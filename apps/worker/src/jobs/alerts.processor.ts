import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../observability/logger';
import { SearchService } from '@aplicativo/search';

export const ALERTS_QUEUE_NAME = 'alerts-queue';

export interface AlertsJobData {
  type: 'process-all' | 'process-single';
  alertId?: string;
}

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisConnection = () => {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
};

export class AlertsProcessor {
  private worker!: Worker;
  private queue!: Queue;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly searchService: SearchService
  ) {}

  async start() {
    const connection = redisConnection();

    this.queue = new Queue(ALERTS_QUEUE_NAME, { connection });

    this.worker = new Worker(
      ALERTS_QUEUE_NAME,
      async (job: Job<AlertsJobData>) => {
        try {
          await this.processJob(job);
        } catch (error) {
          Logger.error(`Erro ao processar job de alertas: ${error}`);
          throw error;
        }
      },
      { connection, concurrency: 2 }
    );

    this.worker.on('failed', (job, err) => {
      Logger.error(`Job de alertas ${job?.id} falhou: ${err.message}`);
    });

    Logger.info('AlertsProcessor iniciado');
  }

  private async processJob(job: Job<AlertsJobData>) {
    if (job.data.type === 'process-all') {
      await this.processAllAlerts();
    } else if (job.data.type === 'process-single' && job.data.alertId) {
      await this.processSingleAlert(job.data.alertId);
    }
  }

  private async processAllAlerts() {
    Logger.info('Iniciando processamento de todos os alertas ativos');
    
    // Pega todos os alertas ativos
    const activeAlerts = await this.prisma.alert.findMany({
      where: { isActive: true },
      select: { id: true }
    });

    for (const alert of activeAlerts) {
      // Enfileira cada alerta individualmente para não travar o worker longo
      await this.queue.add(
        'process-single', 
        { type: 'process-single', alertId: alert.id },
        { removeOnComplete: true, removeOnFail: 100 }
      );
    }
    
    Logger.info(`Enfileirados ${activeAlerts.length} alertas para processamento.`);
  }

  private async processSingleAlert(alertId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
      include: { user: true }
    });

    if (!alert || !alert.isActive) return;

    // A data base é o último trigger ou há 7 dias atrás
    const since = alert.lastTriggeredAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Constrói a busca. Se alert.entidade == 'todos', busca em ambos.
    // Atualmente SearchService suporta `searchContratacoes` e `searchContratos`.
    let totalFound = 0;
    
    const query = alert.keywords.join(' ');
    
    const resp = await this.searchService.search({
      q: query || undefined,
      uf: alert.uf || undefined,
      modalidadeId: alert.modalidadeId || undefined,
      dataPublicacaoInicio: since.toISOString(),
      entidade: alert.entidade as 'todos' | 'contratacoes' | 'contratos'
    });
    totalFound = resp.total;

    if (totalFound > 0) {
      // Mock envio de email
      Logger.info(`[MOCK EMAIL] Para: ${alert.user.email} | Assunto: Alerta "${alert.name}" | Foram encontrados ${totalFound} novos resultados desde ${since.toISOString()}!`);
      
      // Atualiza lastTriggeredAt
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: { lastTriggeredAt: new Date() }
      });
    }
  }

  async registrarJobRecorrente() {
    if (!this.queue) return;
    // Remove job anterior para não duplicar, caso exista (na prática BullMQ lida com isso se a key for a mesma, mas é boa prática)
    await this.queue.removeRepeatable('process-all', { pattern: '0 * * * *' });
    
    // Executa a cada hora cheia
    await this.queue.add(
      'process-all', 
      { type: 'process-all' }, 
      { repeat: { pattern: '0 * * * *' } }
    );
    Logger.info('Job recorrente de alertas registrado (A cada hora).');
  }

  async close() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
