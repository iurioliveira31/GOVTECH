import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import IORedis from 'ioredis';

const QUEUE_NAME = 'ses-resolutions-sync';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const SES_URL = 'https://www.saude.mg.gov.br/publicacoes/';
// TTL de 60 dias para números já processados/descartados (evita reprocessar)
const VISTO_TTL_SEGUNDOS = 60 * 24 * 60 * 60; // 60 dias

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
  private redis!: IORedis;

  constructor(private readonly prisma: PrismaClient) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  /** Chave Redis para marcar resolução como já vista (salva ou descartada) */
  private vistoKey(numero: string): string {
    return `ses:visto:${numero.replace(/\s+/g, '_')}`;
  }

  /** Verifica se o número já foi processado (Redis ou BD como fallback) */
  private async jaProcessado(numero: string): Promise<boolean> {
    // 1º) Cache Redis: é instantâneo e não gasta query no BD
    const cached = await this.redis.get(this.vistoKey(numero));
    if (cached) return true;

    // 2º) Fallback: verifica no BD (só para resoluções salvas antes do cache existir)
    const existe = await this.prisma.resolution.findUnique({ where: { numero } });
    if (existe) {
      // Aquece o cache para as próximas rodadas
      await this.redis.setex(this.vistoKey(numero), VISTO_TTL_SEGUNDOS, '1');
      return true;
    }

    return false;
  }

  /** Marca o número como visto no Redis (salvo ou descartado) */
  private async marcarComoVisto(numero: string): Promise<void> {
    await this.redis.setex(this.vistoKey(numero), VISTO_TTL_SEGUNDOS, '1');
  }

  async start(): Promise<void> {
    const connection = redisConnection();

    // Cliente Redis dedicado para cache de "já visto"
    this.redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
    await this.redis.connect().catch(() => {
      logger.warn('[SES] Redis indisponível para cache — usará apenas o BD como fallback');
    });

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
      // Verifica cache Redis + BD (evita reprocessar salvas E descartadas)
      if (await this.jaProcessado(res.numero)) {
        logger.debug({ numero: res.numero }, '[SES] Já processada, pulando');
        continue;
      }

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

            // Categorias controladas de equipamentos para guiar a IA
            const categoriasEquipamento = [
              'TOMOGRAFO', 'ULTRASSOM', 'RAIO_X', 'MAMOGRAFO', 'RESSONANCIA',
              'DENSITOMETRO', 'ENDOSCOPIA', 'ARCO_CIRURGICO', 'MESA_CIRURGICA',
              'BISTURI_ELETRICO', 'FOCO_CIRURGICO', 'MONITOR_MULTIPARAMETRICO',
              'VENTILADOR_MECANICO', 'DESFIBRILADOR', 'OXIMETRO', 'ELETROCARDIOGRAFO',
              'ANALISADOR_BIOQUIMICO', 'HEMATOLOGIA', 'AUTOCLAVE',
              'FISIOTERAPIA', 'AMBULANCIA', 'EQUIPAMENTO_ODONTO', 'OUTROS',
            ];

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
                      text: `Analise esta resolução/deliberação/portaria da SES/MG com máxima atenção.

## CLASSIFICAÇÃO OBRIGATÓRIA (faça isso PRIMEIRO)

Determine o tipo deste documento e preencha o campo "tipoClassificacao" com EXATAMENTE um dos valores abaixo:

- "REPASSE_NOVO": Ato que CRIA um novo repasse financeiro para municípios com valores definidos. Inclui: resolução de investimento com R$ explícito por município, emenda parlamentar com lista de beneficiários, resolução de custeio com valor por item.

- "CONVALIDACAO": Ato que CONVALIDA, PRORROGA, RATIFICA ou REABILITA resoluções anteriores (cita números de resoluções antigas). NÃO cria valores novos — apenas autoriza repasse de saldo remanescente ou prorroga prazo de resoluções já publicadas.

- "ALTERACAO_ADMINISTRATIVA": Ato que ALTERA, REVOGA parcialmente, RETIFICA ou modifica outra resolução sem criar novo repasse (ajuste de regra, critério, estrutura).

- "NORMA_SEM_REPASSE": Ato normativo que define REGRAS, DIRETRIZES, HABILITACAO de serviços, POLITICAS ou PROGRAMAS sem repasse financeiro direto por município. Inclui deliberações CIB sem valor explícito.

- "OUTROS": Qualquer outro tipo.

## REGRA CRÍTICA
Se tipoClassificacao NÃO for "REPASSE_NOVO", preencha municipios como [] e valorTotal como 0. O restante ainda deve ser preenchido para registro.

## EXTRAIA:
1. tipoClassificacao: (veja acima)
2. Tipo do ato: RESOLUCAO, DELIBERACAO, PORTARIA, NOTA_TECNICA, ou OUTROS
3. Número da portaria federal de origem, se citada (ex: GM/MS 1234/2026)
4. Programa de saúde federal (ex: Rede de Urgência e Emergência, Atenção Básica, etc.)
5. Valor total do repasse (soma dos itens se explícito, 0 se não houver ou se for CONVALIDACAO/NORMA)
6. Data de publicação (YYYY-MM-DD)
7. Prazo de adesão: se houver prazo para o município assinar Termo de Adesão, data exata YYYY-MM-DD. Null se não houver.
8. Resumo em 1 parágrafo claro e direto do objetivo da resolução
9. Tags relevantes (array de strings)
10. Para cada município/beneficiário listado (SOMENTE se tipoClassificacao = "REPASSE_NOVO"):
    - mesoregiao e microrregiao (se mencionadas)
    - nome do município
    - local específico (hospital, UBS, etc.) se citado
    - item/equipamento descrito textualmente
    - categoriaEquipamento: classifique usando APENAS um dos códigos: ${categoriasEquipamento.join(', ')}
    - quantidadeEquipamento: número inteiro se citado explicitamente
    - valor do repasse para este município/item (obrigatório)
    - tipoVerba: "Custeio", "Investimento", "Emenda Parlamentar", ou "Outros"

EXEMPLOS para calibrar:
- Resolução 11.511/2026 (Convalida resoluções de 2014-2018 para pagar dívida AMM) → tipoClassificacao: "CONVALIDACAO"
- Resolução que lista tomógrafo para município X com R$ 400.000 → tipoClassificacao: "REPASSE_NOVO"
- Deliberação CIB que aprova Teto MAC de Ponte Nova → tipoClassificacao: "NORMA_SEM_REPASSE"
- Resolução que altera critérios da Resolução 10.899 → tipoClassificacao: "ALTERACAO_ADMINISTRATIVA"
`
                    }
                  ]
                }
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'object',
                  properties: {
                    tipoClassificacao: {
                      type: 'string',
                      description: 'REPASSE_NOVO | CONVALIDACAO | ALTERACAO_ADMINISTRATIVA | NORMA_SEM_REPASSE | OUTROS',
                    },
                    resumoIa: { type: 'string', description: 'Resumo de 1 parágrafo do objetivo' },
                    tipoAto: { type: 'string', description: 'RESOLUCAO, DELIBERACAO, PORTARIA, NOTA_TECNICA, ou OUTROS' },
                    numeroPortaria: { type: 'string', description: 'Número da portaria federal de origem' },
                    programaFederal: { type: 'string', description: 'Programa de saúde federal' },
                    valorTotal: { type: 'number', description: 'Valor total do repasse (0 se não for REPASSE_NOVO)' },
                    dataPublicacao: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                    prazoAdesao: { type: 'string', description: 'Data limite para adesão YYYY-MM-DD, ou null' },
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
                          categoriaEquipamento: { type: 'string', description: 'Código da categoria controlada' },
                          quantidadeEquipamento: { type: 'number', description: 'Quantidade se citada' },
                          valor: { type: 'number' },
                          tipoVerba: { type: 'string', description: 'Custeio, Investimento, Emenda Parlamentar, ou Outros' },
                        },
                      },
                    },
                  },
                },
              }
            });
            
            const txt = result.text;
            if (txt) {
              const extraido = JSON.parse(txt);

              const tipoClassificacao: string = extraido.tipoClassificacao || 'OUTROS';

              // ── FILTRO DE RELEVÂNCIA ──────────────────────────────────────────
              // Resoluções que NÃO são repasses novos são salvas como DESCARTADA
              // e nunca aparecem na UI da ferramenta de Resoluções.
              const TIPOS_DESCARTAVEIS = [
                'CONVALIDACAO',
                'ALTERACAO_ADMINISTRATIVA',
                'NORMA_SEM_REPASSE',
              ];

              const isDescartada = TIPOS_DESCARTAVEIS.includes(tipoClassificacao);

              if (isDescartada) {
                // ✂️ Não salva nada no banco — descarta completamente para não encher o BD.
                // Marca no Redis com TTL de 60 dias para não reprocessar nas próximas rodadas.
                await this.marcarComoVisto(res.numero);
                logger.info(
                  { numero: res.numero, tipoClassificacao },
                  '[SES] 🗑️  Resolução descartada (administrativa/convalidação) — nada salvo no BD',
                );
                continue;
              }
              // ─────────────────────────────────────────────────────────────────
              // Calcular score e banda (apenas para REPASSE_NOVO)
              const score = this.calcularScore(extraido);
              const banda = score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';

              const novaRes = await this.prisma.resolution.create({
                data: {
                  numero: res.numero,
                  url: res.url,
                  pdfUrl: res.pdfUrl,
                  resumoIa: extraido.resumoIa,
                  status: 'PROCESSED',
                  dataPublicacao: extraido.dataPublicacao ? new Date(extraido.dataPublicacao) : new Date(),
                  tags: extraido.tags || [],
                  tipoAto: extraido.tipoAto || 'RESOLUCAO',
                  numeroPortaria: extraido.numeroPortaria || null,
                  programaFederal: extraido.programaFederal || null,
                  valorTotal: extraido.valorTotal || 0,
                  prazoAdesao: extraido.prazoAdesao ? new Date(extraido.prazoAdesao) : null,
                  statusAdesao: extraido.prazoAdesao ? 'PENDENTE' : 'NAO_APLICAVEL',
                  score,
                  banda,
                  fonte: 'SESLEGIS',
                  items: {
                    create:
                      extraido.municipios?.map((m: any) => ({
                        mesoregiao: m.mesoregiao,
                        microrregiao: m.microrregiao,
                        municipio: m.municipio,
                        local: m.local,
                        item: m.item,
                        categoriaEquipamento: m.categoriaEquipamento || null,
                        quantidadeEquipamento: m.quantidadeEquipamento
                          ? Math.round(m.quantidadeEquipamento)
                          : null,
                        valor: m.valor,
                        tipoVerba: m.tipoVerba,
                      })) || [],
                  },
                },
              });

              // Marca como visto no Redis
              await this.marcarComoVisto(res.numero);

              logger.info(
                { numero: res.numero, tipoClassificacao, banda, score },
                '[SES] ✅ Resolução de repasse salva com sucesso',
              );

              // Disparar alertas apenas para resoluções após o corte
              if (
                novaRes.dataPublicacao &&
                novaRes.dataPublicacao.getTime() >= new Date('2026-07-10T00:00:00Z').getTime()
              ) {
                try {
                  await fetch(
                    'http://api-gateway:4000/api/v1/resolution-alerts/trigger-evaluation',
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
                      },
                      body: JSON.stringify({ resolutionId: novaRes.id }),
                    },
                  );
                  logger.info({ resolutionId: novaRes.id }, '[SES] Alerta disparado');
                } catch (alertErr: any) {
                  logger.error({ err: alertErr.message }, '[SES] Erro ao disparar alerta');
                }
              }
            }
          } catch (iaError: any) {
            logger.error({ numero: res.numero, err: iaError.message }, '[SES] Falha na IA');
            await this.prisma.resolution.create({
              data: {
                numero: res.numero,
                url: res.url,
                pdfUrl: res.pdfUrl,
                status: 'ERROR',
              },
            });
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

  /**
   * Calcula o score (0-100) de uma resolução com base nos dados extraídos pela IA.
   * Critérios:
   *  - Dinheiro/Investimento (40 pts): valor > 0 e tipo Investimento/Emenda
   *  - Equipamento identificado (25 pts): tem categoriaEquipamento != OUTROS
   *  - Prazo de adesão presente (20 pts): urgência identificada
   *  - Múltiplos municípios = maior alcance (15 pts)
   */
  private calcularScore(extraido: any): number {
    let score = 0;

    // Dinheiro (40 pts)
    const valorTotal = extraido.valorTotal || 0;
    if (valorTotal > 0) score += 20;
    if (valorTotal > 100000) score += 10;
    if (valorTotal > 1000000) score += 10;

    // Tipo de verba (bonus)
    const municipios = extraido.municipios || [];
    const temInvestimento = municipios.some(
      (m: any) => m.tipoVerba === 'Investimento' || m.tipoVerba === 'Emenda Parlamentar'
    );
    if (temInvestimento) score += 5;

    // Equipamento identificado (25 pts)
    const temEquipamento = municipios.some(
      (m: any) => m.categoriaEquipamento && m.categoriaEquipamento !== 'OUTROS'
    );
    if (temEquipamento) score += 25;

    // Prazo de adesão presente (20 pts — urgência)
    if (extraido.prazoAdesao) score += 20;

    // Alcance por municípios (15 pts)
    if (municipios.length === 1) score += 5;
    else if (municipios.length >= 2 && municipios.length <= 5) score += 10;
    else if (municipios.length > 5) score += 15;

    return Math.min(score, 100);
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.redis?.quit();
  }
}
