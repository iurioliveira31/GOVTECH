import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

const QUEUE_NAME = 'ses-resolutions-sync';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const SES_URL = 'https://www.saude.mg.gov.br/publicacoes/';

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

export class SesResolutionsProcessor {
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
      logger.info({ jobId: job.id, name: job.name }, '[SES] Job concluído'),
    );

    this.worker.on('failed', (job, err) =>
      logger.error({ jobId: job?.id, err: err.message }, '[SES] Job falhou'),
    );

    logger.info('[SES] Worker iniciado');
  }

  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync:resolutions':
        await this.syncResolutions();
        break;
      default:
        logger.warn({ name: job.name }, '[SES] Job desconhecido');
    }
  }

  async syncResolutions(): Promise<void> {
    const resolucoesEncontradas: { numero: string; url: string; pdfUrl: string }[] = [];

    // 1. Buscar no novo portal SesLegis via API REST (muito mais robusto e performático)
    logger.info('[SES] Buscando resoluções no novo portal SesLegis via API...');
    try {
      const searchUrl = 'https://seslegis.saude.mg.gov.br/api/v1/normatives/public/search?page=1&size=50&sortField=normative_date&sortOrder=desc';
      const resp = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      });

      if (resp.ok) {
        const body = await resp.json() as any;
        if (body && Array.isArray(body.data)) {
          for (const item of body.data) {
            const normativeDate = item.normative_date ? new Date(item.normative_date) : null;
            if (normativeDate && normativeDate.getTime() < new Date('2026-07-10T00:00:00Z').getTime()) {
              continue;
            }
            const title = item.title || '';
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('resolução') || lowerTitle.includes('resolucao')) {
              const match = title.match(/(?:resolu[çc][ãa]o|res\.?)\s*(?:(?:ses|ces|cib-sus)(?:[\/\-A-Z]+)?\s*)?(?:n[oº°]?\s*\.?)?\s*([0-9]+(?:\.[0-9]+)*)/i);
              if (match && match[1]) {
                const numero = `Resolução ${match[1]}`;
                
                // Buscar URL assinada de download do PDF
                const downloadResp = await fetch(`https://seslegis.saude.mg.gov.br/api/v1/normatives/public/${item.id}/download`, {
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                });

                if (downloadResp.ok) {
                  const downloadBody = await downloadResp.json() as any;
                  if (downloadBody && downloadBody.url) {
                    if (!resolucoesEncontradas.some(r => r.numero === numero)) {
                      resolucoesEncontradas.push({
                        numero,
                        url: `https://seslegis.saude.mg.gov.br/normativa/${item.id}`,
                        pdfUrl: downloadBody.url
                      });
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        logger.warn(`[SES] Falha ao acessar API SesLegis (HTTP ${resp.status})`);
      }
    } catch (err: any) {
      logger.error({ err: err.message }, '[SES] Erro ao buscar na API do SesLegis');
    }

    // 2. Buscar no portal antigo (Legado / Cheerio)
    logger.info('[SES] Buscando no portal antigo (resoluções e deliberações)...');
    const urlsAntigas = [
      'https://www.saude.mg.gov.br/publicacoes/',
      'https://portal-antigo.saude.mg.gov.br/deliberacoes/documents?by_year=0&by_month=&by_format=&category_id=&ordering=&q='
    ];

    for (const targetUrl of urlsAntigas) {
      try {
        const resp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        });

        if (resp.ok) {
          const html = await resp.text();
          const $ = cheerio.load(html);
          
          $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            
            if (href) {
              const isPdf = href.toLowerCase().endsWith('.pdf') || href.includes('&task=download');
              const lowerText = text.toLowerCase();
              const hasResolucaoText = lowerText.includes('resolução') || lowerText.includes('resolucao') || lowerText.includes('res.') || lowerText.includes('res ');
              
              if (isPdf || hasResolucaoText) {
                // Capturar apenas "Resolução X"
                const match = text.match(/(?:resolu[çc][ãa]o|res\.?)\s*(?:(?:ses|ces|cib-sus)(?:[\/\-A-Z]+)?\s*)?(?:n[oº°]?\s*\.?)?\s*([0-9]+(?:\.[0-9]+)*)/i);
                if (match && match[1]) {
                  const numero = `Resolução ${match[1]}`;
                  
                  let pdfUrl = href;
                  if (!href.startsWith('http')) {
                    const baseUrl = new URL(targetUrl).origin;
                    pdfUrl = `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
                  }
                  
                  if (!resolucoesEncontradas.some(r => r.numero === numero)) {
                    resolucoesEncontradas.push({
                      numero,
                      url: targetUrl,
                      pdfUrl
                    });
                  }
                }
              }
            }
          });
        }
      } catch (err: any) {
        logger.error({ targetUrl, err: err.message }, '[SES] Erro ao buscar no portal antigo');
      }
    }


      
    logger.info({ count: resolucoesEncontradas.length }, '[SES] Resoluções extraídas do HTML');
      
      for (const res of resolucoesEncontradas) {
        const existe = await this.prisma.resolution.findUnique({ where: { numero: res.numero } });
        if (!existe) {
          logger.info({ numero: res.numero }, '[SES] Nova resolução encontrada, enviando para IA...');
          
          // Baixar o PDF
          const pdfResp = await fetch(res.pdfUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
          });
          if (!pdfResp.ok) {
            logger.warn({ url: res.pdfUrl }, '[SES] Falha ao baixar PDF');
            continue;
          }
          
          const buffer = await pdfResp.arrayBuffer();
          // Converter buffer para base64
          const base64Pdf = Buffer.from(buffer).toString('base64');
          
          try {
            // Atraso de 4.5 segundos para evitar Rate Limit (15 RPM) do Gemini Free Tier
            await new Promise(r => setTimeout(r, 4500));
            // Analisar com Gemini
            const result = await this.ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      inlineData: {
                        data: base64Pdf,
                        mimeType: 'application/pdf'
                      }
                    },
                    {
                      text: `Analise esta resolução/deliberação da SES/MG.
                      Identifique se a verba principal é "Custeio", "Investimento", "Emenda Parlamentar", ou "Outros".
                      Preencha os municípios conforme estruturado. Se não houver municípios, envie um array vazio.
                      Se não houver valor total explícito, some o valor dos itens ou retorne 0.`
                    }
                  ]
                }
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'object',
                  properties: {
                    resumoIa: { type: 'string', description: 'Resumo de 1 parágrafo do objetivo' },
                    valorTotal: { type: 'number', description: 'Valor total do repasse' },
                    dataPublicacao: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                    tags: { type: 'array', items: { type: 'string' } },
                    municipios: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          mesoregiao: { type: 'string' },
                          microrregiao: { type: 'string' },
                          municipio: { type: 'string' },
                          local: { type: 'string' },
                          item: { type: 'string' },
                          valor: { type: 'number' },
                          tipoVerba: { type: 'string', description: 'Custeio, Investimento, Emenda Parlamentar, ou Outros' }
                        }
                      }
                    }
                  }
                }
              }
            });
            
            const txt = result.text;
            if (txt) {
              const extraido = JSON.parse(txt);
              
              const novaRes = await this.prisma.resolution.create({
                data: {
                  numero: res.numero,
                  url: res.url,
                  pdfUrl: res.pdfUrl,
                  resumoIa: extraido.resumoIa,
                  status: 'PROCESSED',
                  dataPublicacao: extraido.dataPublicacao ? new Date(extraido.dataPublicacao) : new Date(),
                  tags: extraido.tags || [],
                  items: {
                    create: extraido.municipios?.map((m: any) => ({
                      mesoregiao: m.mesoregiao,
                      microrregiao: m.microrregiao,
                      municipio: m.municipio,
                      local: m.local,
                      item: m.item,
                      valor: m.valor,
                      tipoVerba: m.tipoVerba
                    })) || []
                  }
                }
              });
              
              // Only trigger alerts and display logic if the resolution is from June 14th onwards
              if (novaRes.dataPublicacao && novaRes.dataPublicacao.getTime() >= new Date('2026-07-10T00:00:00Z').getTime()) {
                logger.info({ numero: res.numero }, '[SES] Resolução salva com sucesso no BD');

              
              // Chamar API Gateway para avaliar alertas
              try {
                await fetch('http://api-gateway:4000/api/v1/resolution-alerts/trigger-evaluation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ resolutionId: novaRes.id })
                });
                logger.info({ resolutionId: novaRes.id }, '[SES] Disparado alerta de resolução');
              } catch (alertErr: any) {
                logger.error({ err: alertErr.message }, '[SES] Erro ao disparar alerta');
              }
             } else {
                logger.info({ numero: res.numero, date: novaRes.dataPublicacao }, '[SES] Resolução ignorada por ser anterior a 10 de Julho');
             }
              
            }
          } catch (iaError: any) {
            logger.error({ numero: res.numero, err: iaError.message }, '[SES] Falha na IA');
            // Salvar no BD com erro para tentar depois
            await this.prisma.resolution.create({
              data: {
                numero: res.numero,
                url: res.url,
                pdfUrl: res.pdfUrl,
                status: 'ERROR',
              }
            });
          }
        }
      }

  }

  async registrarJobsRecorrentes(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'sync:resolutions') {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    // Roda a cada 5 minutos
    await this.queue.add(
      'sync:resolutions',
      {},
      {
        repeat: { pattern: '*/5 * * * *' },
        jobId: 'ses-resolutions-5m',
      },
    );

    logger.info('[SES] Jobs recorrentes registrados (a cada 1 hora)');
  }

  async enqueueManualSync(): Promise<void> {
    await this.queue.add(
      'sync:resolutions',
      {},
      { jobId: `ses-manual-${Date.now()}` },
    );
    logger.info('[SES] Sync manual enfileirado');
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
