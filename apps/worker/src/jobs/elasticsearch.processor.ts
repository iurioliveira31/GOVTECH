import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SearchService, ElasticsearchClientService } from '@aplicativo/search';
import { Logger } from '../observability/logger';
import { pncpJobDuration } from '../observability/metrics';

export const ES_INDEXING_QUEUE_NAME = 'es-indexing-queue';

export interface EsIndexingJobData {
  type: 'single' | 'period';
  entityType: 'contratacao' | 'contrato';
  id?: string;
  since?: string; // ISO Date
}

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

export class ElasticsearchProcessor {
  private worker!: Worker;
  private queue!: Queue;
  private readonly searchService: SearchService;

  constructor(private readonly prisma: PrismaClient) {
    const mockConfig = { get: (key: string, def: string) => process.env[key] || def };
    const esClient = new ElasticsearchClientService(mockConfig as any);
    this.searchService = new SearchService(esClient);
  }

  async start() {
    this.queue = new Queue(ES_INDEXING_QUEUE_NAME, {
      connection: redisConnection(),
    });

    this.worker = new Worker(
      ES_INDEXING_QUEUE_NAME,
      async (job: Job<EsIndexingJobData>) => {
        const timer = pncpJobDuration.startTimer({ jobName: 'es_indexing' });
        try {
          await this.processJob(job);
        } catch (err: any) {
          Logger.error(`Erro ao indexar ${job.data.entityType} ${job.data.id}: ${err.message}`);
          throw err;
        } finally {
          timer();
        }
      },
      {
        connection: redisConnection(),
        concurrency: 5, // processar em paralelo
      }
    );

    this.worker.on('failed', (job, err) => {
      Logger.error(`Job ES ${job?.id} falhou: ${err.message}`);
    });

    Logger.info(`Worker Elasticsearch iniciado ouvindo a fila ${ES_INDEXING_QUEUE_NAME}`);
  }

  private async processJob(job: Job<EsIndexingJobData>) {
    const { type, entityType, id, since } = job.data;

    if (type === 'period' && since) {
      Logger.info(`Indexando ${entityType} atualizados desde ${since}`);
      const sinceDate = new Date(since);
      
      if (entityType === 'contratacao') {
        const items = await this.prisma.pncpContratacao.findMany({
          where: { updatedAt: { gte: sinceDate } },
          select: { id: true }
        });
        for (const item of items) {
          await this.enqueueIndex('contratacao', item.id);
        }
        Logger.info(`Enfileirados ${items.length} contratos para indexação.`);
      } else if (entityType === 'contrato') {
        const items = await this.prisma.pncpContrato.findMany({
          where: { updatedAt: { gte: sinceDate } },
          select: { id: true }
        });
        for (const item of items) {
          await this.enqueueIndex('contrato', item.id);
        }
        Logger.info(`Enfileirados ${items.length} contratos para indexação.`);
      }
      return;
    }

    if (!id) return;

    if (entityType === 'contratacao') {
      const dbDoc = await this.prisma.pncpContratacao.findUnique({
        where: { id },
        include: {
          orgao: true,
        },
      });

      if (!dbDoc) {
        Logger.warn(`Contratação ${id} não encontrada no banco para indexar.`);
        return;
      }

      await this.searchService.indexContratacao({
        id: dbDoc.id,
        numeroControlePncp: dbDoc.numeroControlePncp,
        objetoCompra: dbDoc.objetoCompra ?? undefined,
        modalidadeNome: dbDoc.modalidadeNome ?? undefined,
        modalidadeId: dbDoc.modalidadeId ?? undefined,
        situacao: dbDoc.situacaoNome ?? undefined,
        srp: dbDoc.srp,
        valorTotalEstimado: dbDoc.valorTotalEstimado ? Number(dbDoc.valorTotalEstimado) : undefined,
        valorTotalHomologado: dbDoc.valorTotalHomologado ? Number(dbDoc.valorTotalHomologado) : undefined,
        dataPublicacaoPncp: dbDoc.dataPublicacaoPncp?.toISOString(),
        dataEncerramentoProposta: dbDoc.dataEncerramentoProposta?.toISOString(),
        orgaoCnpj: dbDoc.orgao?.cnpj ?? undefined,
        orgaoRazaoSocial: dbDoc.orgao?.razaoSocial ?? undefined,
        unidadeUfSigla: dbDoc.unidadeUfSigla ?? undefined,
        unidadeMunicipioNome: dbDoc.unidadeMunicipioNome ?? undefined,
      });

      Logger.info(`Contratação ${id} indexada no Elasticsearch.`);
    } else if (entityType === 'contrato') {
      const dbDoc = await this.prisma.pncpContrato.findUnique({
        where: { id },
        include: {
          orgao: true,
        },
      });

      if (!dbDoc) {
        Logger.warn(`Contrato ${id} não encontrado no banco para indexar.`);
        return;
      }

      await this.searchService.indexContrato({
        id: dbDoc.id,
        numeroControlePncp: dbDoc.numeroControlePncp,
        objetoContrato: dbDoc.objetoContrato ?? undefined,
        tipoContratoNome: dbDoc.tipoContratoNome ?? undefined,
        valorGlobal: dbDoc.valorGlobal ? Number(dbDoc.valorGlobal) : undefined,
        valorInicial: dbDoc.valorInicial ? Number(dbDoc.valorInicial) : undefined,
        dataVigenciaInicio: dbDoc.dataVigenciaInicio?.toISOString(),
        dataVigenciaFim: dbDoc.dataVigenciaFim?.toISOString(),
        dataPublicacaoPncp: dbDoc.dataPublicacaoPncp?.toISOString(),
        niFornecedor: dbDoc.niFornecedor ?? undefined,
        nomeRazaoSocialFornecedor: dbDoc.nomeRazaoSocialFornecedor ?? undefined,
        orgaoCnpj: dbDoc.orgao?.cnpj ?? undefined,
        orgaoRazaoSocial: dbDoc.orgao?.razaoSocial ?? undefined,
        unidadeUfSigla: dbDoc.unidadeUfSigla ?? undefined,
      });

      Logger.info(`Contrato ${id} indexado no Elasticsearch.`);
    }
  }

  async enqueueIndex(entityType: 'contratacao' | 'contrato', id: string) {
    if (!this.queue) return;
    await this.queue.add('index', { type: 'single', entityType, id }, { removeOnComplete: true, removeOnFail: 1000 });
  }

  async enqueueIndexPeriod(entityType: 'contratacao' | 'contrato', since: Date) {
    if (!this.queue) return;
    await this.queue.add('index-period', { type: 'period', entityType, since: since.toISOString() }, { removeOnComplete: true, removeOnFail: 100 });
  }

  async close() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
