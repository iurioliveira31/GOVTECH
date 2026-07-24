import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';
import { GoogleGenAI } from '@google/genai';
import { createHash } from 'crypto';

const QUEUE_NAME = 'dou-inlabs-sync';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// API do INLABS — acesso via credenciais cadastradas gratuitamente
// Documentação: https://inlabs.in.gov.br/acesso.php
const INLABS_EMAIL = process.env.INLABS_EMAIL ?? '';
const INLABS_PWD = process.env.INLABS_PWD ?? '';

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

/**
 * Coletor de Portarias do Diário Oficial da União (DOU) via INLABS.
 * Captura portarias do Ministério da Saúde (GM/MS) que habilitam
 * propostas de equipamentos de saúde e convênios fundo-a-fundo.
 *
 * Frequência: diária (1x por dia, às 07h — DOU é publicado de madrugada).
 * Fonte: https://inlabs.in.gov.br — XML gratuito, exige cadastro.
 *
 * Palavras-chave monitoradas (ajustar conforme portfólio do cliente):
 *  - habilitação de proposta
 *  - equipamento de saúde
 *  - repasse fundo a fundo
 *  - Minas Gerais / municípios MG
 */
export class DouInlabsProcessor {
  private worker!: Worker;
  private queue!: Queue;
  private ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaClient) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

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
      logger.info({ jobId: job.id, name: job.name }, '[DOU] Job concluído'),
    );
    this.worker.on('failed', (job, err) =>
      logger.error({ jobId: job?.id, err: err.message }, '[DOU] Job falhou'),
    );

    logger.info('[DOU] Worker DOU/INLABS iniciado');
  }

  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync:dou:hoje':
        await this.syncDouHoje();
        break;
      case 'sync:dou:data':
        await this.syncDouData(job.data.data);
        break;
      default:
        logger.warn({ name: job.name }, '[DOU] Job desconhecido');
    }
  }

  /**
   * Busca portarias do DOU publicadas hoje via API INLABS.
   * Filtra por termos relacionados a saúde e equipamentos.
   */
  async syncDouHoje(): Promise<void> {
    const hoje = new Date();
    const dataStr = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
    await this.syncDouData(dataStr);
  }

  async syncDouData(dataStr: string): Promise<void> {
    const runLog = await this.prisma.collectorRun.create({
      data: { fonte: 'DOU_INLABS', status: 'RUNNING', iniciadoEm: new Date() },
    });

    logger.info({ data: dataStr }, '[DOU] Iniciando coleta do DOU');

    try {
      // Termos de busca para portarias de saúde relevantes
      const termosMonitorados = [
        'habilitação de proposta',
        'equipamento de saúde',
        'fundo a fundo',
        'Minas Gerais',
        'ultrassom',
        'tomógrafo',
        'arco cirúrgico',
        'repasse',
      ];

      let itensNovos = 0;
      let itensLidos = 0;

      for (const termo of termosMonitorados) {
        try {
          const portarias = await this.buscarDouPorTermo(dataStr, termo);
          itensLidos += portarias.length;

          for (const portaria of portarias) {
            const processada = await this.processarPortaria(portaria);
            if (processada) itensNovos++;
          }

          // Rate limit — aguardar entre buscas
          await new Promise(r => setTimeout(r, 2000));
        } catch (err: any) {
          logger.error({ termo, err: err.message }, '[DOU] Erro na busca por termo');
        }
      }

      await this.prisma.collectorRun.update({
        where: { id: runLog.id },
        data: {
          status: 'COMPLETED',
          concluidoEm: new Date(),
          itensLidos,
          itensNovos,
        },
      });

      logger.info({ itensLidos, itensNovos }, '[DOU] Coleta concluída');
    } catch (err: any) {
      await this.prisma.collectorRun.update({
        where: { id: runLog.id },
        data: { status: 'FAILED', concluidoEm: new Date(), ultimoErro: err.message },
      });
      logger.error({ err: err.message }, '[DOU] Falha geral na coleta');
    }
  }

  /**
   * Busca portarias no DOU via INLABS API.
   * Retorna array de resultados filtrados.
   *
   * Nota: a autenticação do INLABS é via JWT.
   * O token expira e deve ser renovado.
   */
  private async buscarDouPorTermo(data: string, termo: string): Promise<any[]> {
    if (!INLABS_EMAIL || !INLABS_PWD) {
      logger.warn('[DOU] Credenciais INLABS não configuradas. Pulando coleta DOU.');
      return [];
    }

    try {
      // 1. Autenticar no INLABS para obter JWT
      const authResp = await fetch('https://inlabs.in.gov.br/logar.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: INLABS_EMAIL, password: INLABS_PWD }),
      });

      if (!authResp.ok) {
        logger.warn('[DOU] Falha na autenticação INLABS');
        return [];
      }

      const authData = await authResp.json() as any;
      const token = authData?.token;

      if (!token) {
        logger.warn('[DOU] Token INLABS não retornado');
        return [];
      }

      // 2. Buscar portarias por termo e data
      const searchUrl = new URL('https://inlabs.in.gov.br/consulta.php');
      searchUrl.searchParams.set('q', termo);
      searchUrl.searchParams.set('s', data); // data início
      searchUrl.searchParams.set('e', data); // data fim
      searchUrl.searchParams.set('secao', 'do1,do2'); // seções 1 e 2
      searchUrl.searchParams.set('tipoDocumento', 'Portaria');

      const searchResp = await fetch(searchUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!searchResp.ok) return [];

      const data_result = await searchResp.json() as any;
      return data_result?.results || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[DOU] Erro na chamada INLABS');
      return [];
    }
  }

  /**
   * Processa uma portaria encontrada: analisa com IA e salva no banco.
   * Retorna true se foi inserida como nova.
   */
  private async processarPortaria(portaria: any): Promise<boolean> {
    const numero = portaria.numeroPortaria || portaria.numero || portaria.identidade;
    if (!numero) return false;

    const hash = createHash('sha256')
      .update(JSON.stringify({ numero, dataPublicacao: portaria.dataPublicacao }))
      .digest('hex');

    // Verificar se já existe (deduplicação)
    const existente = await this.prisma.douPortaria.findFirst({
      where: { OR: [{ numeroPortaria: numero }, { hashConteudo: hash }] },
    });

    if (existente) {
      logger.debug({ numero }, '[DOU] Portaria já existe, ignorando');
      return false;
    }

    // Analisar com IA
    try {
      await new Promise(r => setTimeout(r, 3000)); // Rate limit Gemini

      const conteudo = portaria.conteudo || portaria.texto || portaria.excerto || '';

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `Analise esta portaria do Diário Oficial da União (Ministério da Saúde).

Conteúdo da portaria:
${conteudo.substring(0, 8000)}

EXTRAIA:
1. tipo: GM_MS (portaria ministerial), FUNDO_FUNDO (repasse fundo a fundo), HABILITACAO (habilitação de proposta), ou CONVENIO
2. orgaoEmissor: órgão que emitiu (ex: "Ministério da Saúde")
3. resumo: 1 parágrafo descrevendo o objetivo
4. valorTotal: valor total mencionado (0 se não houver)
5. ufAlvo: UF beneficiária principal (ex: "MG"), null se nacional
6. municipiosAlvo: array de objetos {ibge, nome, uf} dos municípios beneficiados (vazio se não houver)
7. categoriaEquipamento: TOMOGRAFO, ULTRASSOM, RAIO_X, MAMOGRAFO, RESSONANCIA, ARCO_CIRURGICO, MONITOR_MULTIPARAMETRICO, VENTILADOR_MECANICO, AMBULANCIA, OUTROS — use OUTROS se não identificar equipamento
8. relevante: true/false — esta portaria é relevante para venda de equipamentos médicos?

Responda em JSON.`,
          }],
        }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              tipo: { type: 'string' },
              orgaoEmissor: { type: 'string' },
              resumo: { type: 'string' },
              valorTotal: { type: 'number' },
              ufAlvo: { type: 'string' },
              municipiosAlvo: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ibge: { type: 'string' },
                    nome: { type: 'string' },
                    uf: { type: 'string' },
                  },
                },
              },
              categoriaEquipamento: { type: 'string' },
              relevante: { type: 'boolean' },
            },
          },
        },
      });

      const txt = result.text;
      if (!txt) return false;

      const extraido = JSON.parse(txt);

      // Só salvar se for relevante para equipamentos médicos
      if (!extraido.relevante) {
        logger.debug({ numero }, '[DOU] Portaria não relevante para equipamentos, ignorando');
        return false;
      }

      // Salvar portaria
      const novaPortaria = await this.prisma.douPortaria.create({
        data: {
          numeroPortaria: numero,
          tipo: extraido.tipo || 'GM_MS',
          secao: portaria.secao || portaria.artigo,
          dataPublicacao: portaria.dataPublicacao ? new Date(portaria.dataPublicacao) : new Date(),
          orgaoEmissor: extraido.orgaoEmissor,
          resumoIa: extraido.resumo,
          valorTotal: extraido.valorTotal || 0,
          ufAlvo: extraido.ufAlvo,
          categoriaEquipamento: extraido.categoriaEquipamento || 'OUTROS',
          urlOriginal: portaria.urlPdf || portaria.url,
          hashConteudo: hash,
          status: 'PROCESSED',
        },
      });

      // Criar relações com municípios (se IBGE válido e existente no banco)
      if (extraido.municipiosAlvo && extraido.municipiosAlvo.length > 0) {
        for (const mun of extraido.municipiosAlvo) {
          if (mun.ibge) {
            const municipioExiste = await this.prisma.municipio.findUnique({
              where: { ibge: mun.ibge },
            });
            if (municipioExiste) {
              await this.prisma.douPortariaMunicipio.create({
                data: { portariaId: novaPortaria.id, ibge: mun.ibge },
              }).catch(() => {}); // Ignorar duplicata
            }
          }
        }
      }

      logger.info({ numero, tipo: extraido.tipo }, '[DOU] Portaria salva com sucesso');
      return true;
    } catch (err: any) {
      logger.error({ numero, err: err.message }, '[DOU] Falha ao processar portaria');

      // Salvar como erro para tentar depois
      await this.prisma.douPortaria.create({
        data: {
          numeroPortaria: numero,
          tipo: 'GM_MS',
          dataPublicacao: portaria.dataPublicacao ? new Date(portaria.dataPublicacao) : new Date(),
          hashConteudo: hash,
          status: 'ERROR',
        },
      }).catch(() => {});

      return false;
    }
  }

  async registrarJobsRecorrentes(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'sync:dou:hoje') {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    // Roda todo dia às 07h (DOU é publicado de madrugada)
    await this.queue.add(
      'sync:dou:hoje',
      {},
      {
        repeat: { pattern: '0 7 * * *' },
        jobId: 'dou-diario-7h',
      },
    );

    logger.info('[DOU] Jobs recorrentes registrados (diário às 07h)');
  }

  async enqueueManualSync(data?: string): Promise<void> {
    await this.queue.add(
      data ? 'sync:dou:data' : 'sync:dou:hoje',
      data ? { data } : {},
      { jobId: `dou-manual-${Date.now()}` },
    );
    logger.info('[DOU] Sync manual enfileirado');
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
