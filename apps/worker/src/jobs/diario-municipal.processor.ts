import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';
import { GoogleGenAI } from '@google/genai';
import IORedis from 'ioredis';

const QUEUE_NAME = 'diario-municipal-sync';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const VISTO_TTL_SEGUNDOS = 60 * 24 * 60 * 60; // 60 dias

function redisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
}

export class DiarioMunicipalProcessor {
  private worker!: Worker;
  private queue!: Queue;
  private ai: GoogleGenAI;
  private redis!: IORedis;

  constructor(private readonly prisma: PrismaClient) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  private vistoKey(fileUrl: string): string {
    // Hasheia a URL do arquivo para gerar uma chave Redis limpa e única
    const hash = require('crypto').createHash('sha256').update(fileUrl).digest('hex');
    return `qd:visto:${hash}`;
  }

  private async jaProcessado(fileUrl: string): Promise<boolean> {
    const cached = await this.redis.get(this.vistoKey(fileUrl));
    if (cached) return true;

    // Busca no banco se existe alguma resolução com a mesma URL de origem
    const existe = await this.prisma.resolution.findFirst({
      where: { url: fileUrl },
    });

    if (existe) {
      await this.redis.setex(this.vistoKey(fileUrl), VISTO_TTL_SEGUNDOS, '1');
      return true;
    }

    return false;
  }

  private async marcarComoVisto(fileUrl: string): Promise<void> {
    await this.redis.setex(this.vistoKey(fileUrl), VISTO_TTL_SEGUNDOS, '1');
  }

  async start(): Promise<void> {
    const connection = redisConnection();

    this.redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
    await this.redis.connect().catch(() => {
      logger.warn('[QD-MUNICIPAL] Redis indisponível para cache de idempotência');
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
      logger.info({ jobId: job.id, name: job.name }, '[QD-MUNICIPAL] Job concluído'),
    );

    this.worker.on('failed', (job, err) =>
      logger.error({ jobId: job?.id, err: err.message }, '[QD-MUNICIPAL] Job falhou'),
    );

    logger.info('[QD-MUNICIPAL] Worker iniciado');
  }

  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync:diarios':
        await this.syncDiarios();
        break;
      default:
        logger.warn({ name: job.name }, '[QD-MUNICIPAL] Job desconhecido');
    }
  }

  async syncDiarios(): Promise<void> {
    logger.info('[QD-MUNICIPAL] Buscando publicações recentes na API do Querido Diário...');

    // Busca dados de ontem e hoje
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    const sinceStr = ontem.toISOString().split('T')[0];
    
    // Termos de busca focados em repasses da saúde pública
    const termos = ['Fundo Municipal de Saúde', 'Secretaria de Saúde', 'repasse financeiro'];
    const gazettesProcessadas = new Set<string>();

    for (const termo of termos) {
      try {
        const queryUrl = `https://queridodiario.ok.org.br/api/v1/gazettes?since=${sinceStr}&query=${encodeURIComponent(termo)}&limit=50`;
        const resp = await fetch(queryUrl, {
          headers: { 'User-Agent': 'LicitaAI/1.0' },
        });

        if (!resp.ok) {
          logger.warn(`[QD-MUNICIPAL] Falha ao acessar API Querido Diário (HTTP ${resp.status}) para termo "${termo}"`);
          continue;
        }

        const body = (await resp.json()) as any;
        if (body && Array.isArray(body.gazettes)) {
          for (const gazette of body.gazettes) {
            const fileUrl = gazette.url || gazette.txt_url;
            if (!fileUrl || gazettesProcessadas.has(fileUrl)) continue;
            gazettesProcessadas.add(fileUrl);

            // Evita reprocessar
            if (await this.jaProcessado(fileUrl)) {
              continue;
            }

            logger.info(
              { municipio: gazette.territory_name, data: gazette.date },
              `[QD-MUNICIPAL] Nova gazette encontrada. Termo: "${termo}"`,
            );

            // Tenta baixar texto puro (txt_url) para economizar tokens/tamanho
            let textoDiario = '';
            if (gazette.txt_url) {
              try {
                const txtResp = await fetch(gazette.txt_url, { headers: { 'User-Agent': 'LicitaAI/1.0' } });
                if (txtResp.ok) {
                  textoDiario = await txtResp.text();
                }
              } catch (txtErr: any) {
                logger.warn({ err: txtErr.message }, '[QD-MUNICIPAL] Falha ao baixar TXT, usando excerpts');
              }
            }

            // Se o texto puro estiver vazio, usa os trechos (excerpts) fornecidos
            if (!textoDiario && Array.isArray(gazette.excerpts)) {
              textoDiario = gazette.excerpts.join('\n\n[...]\n\n');
            }

            if (!textoDiario) {
              logger.warn(`[QD-MUNICIPAL] Gazette vazia para ${gazette.territory_name}, pulando.`);
              continue;
            }

            // Limita o tamanho do texto para evitar estouro de tokens do Gemini
            if (textoDiario.length > 200_000) {
              textoDiario = textoDiario.slice(0, 200_000) + '\n\n[TEXTO TRUNCADO...]';
            }

            // Atraso de 4.5 segundos para evitar Rate Limit (15 RPM)
            await new Promise((r) => setTimeout(r, 4500));

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
                      text: `Analise esta publicação do Diário Oficial do Município de ${gazette.territory_name} (${gazette.state_code}):
                      
Conteúdo:
${textoDiario}

## CLASSIFICAÇÃO OBRIGATÓRIA (faça isso PRIMEIRO)
Determine se esta publicação relata a CRIAÇÃO de um novo repasse financeiro, aquisição ou convênio para o município, preenchendo "tipoClassificacao" com um dos seguintes valores:
- "REPASSE_NOVO": Publicação de repasse de verbas de saúde pública, créditos adicionais ou autorização de compras de saúde com valores definidos.
- "OUTROS": Portarias de nomeação, convalidações, prorrogações ou normativos sem repasse financeiro de saúde novo.

## REGRA DE CORTE
Se tipoClassificacao NÃO for "REPASSE_NOVO", preencha municipios como [] e valorTotal como 0.

## EXTRAIA:
1. tipoClassificacao (REPASSE_NOVO | OUTROS)
2. Tipo do ato (RESOLUCAO, DELIBERACAO, PORTARIA, DECRETO ou OUTROS)
3. Valor total do repasse/compra (0 se não for REPASSE_NOVO)
4. Data do documento (use a data do diário: ${gazette.date})
5. Prazo de adesão/vencimento se houver (formato YYYY-MM-DD)
6. Resumo direto do objetivo em 1 parágrafo
7. Tags relevantes (array de strings)
8. Lista de itens e beneficiários (SOMENTE para REPASSE_NOVO):
   - municipio (nome do município)
   - local (ex: Hospital Municipal, UPA)
   - item (descrição textual do equipamento/verba)
   - categoriaEquipamento: classifique usando APENAS um dos códigos: ${categoriasEquipamento.join(', ')}
   - quantidadeEquipamento: número inteiro se citado
   - valor: valor financeiro associado
   - tipoVerba: "Custeio", "Investimento", "Emenda Parlamentar" ou "Outros"`,
                    },
                  ],
                },
              ],
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: 'object',
                  properties: {
                    tipoClassificacao: { type: 'string' },
                    resumoIa: { type: 'string' },
                    tipoAto: { type: 'string' },
                    valorTotal: { type: 'number' },
                    dataPublicacao: { type: 'string' },
                    prazoAdesao: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    municipios: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          municipio: { type: 'string' },
                          local: { type: 'string' },
                          item: { type: 'string' },
                          categoriaEquipamento: { type: 'string' },
                          quantidadeEquipamento: { type: 'number' },
                          valor: { type: 'number' },
                          tipoVerba: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            });

            const txt = result.text;
            if (txt) {
              const extraido = JSON.parse(txt);
              const tipoClassificacao = extraido.tipoClassificacao || 'OUTROS';

              if (tipoClassificacao !== 'REPASSE_NOVO') {
                await this.marcarComoVisto(fileUrl);
                logger.info(
                  { municipio: gazette.territory_name, date: gazette.date },
                  '[QD-MUNICIPAL] 🗑️ Publicação administrativa descartada — nada salvo no BD',
                );
                continue;
              }

              // Calcular score simplificado
              let score = 50; // Base municipal
              if (extraido.valorTotal > 50000) score += 20;
              if (extraido.prazoAdesao) score += 20;
              const banda = score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';

              const dataPub = extraido.dataPublicacao ? new Date(extraido.dataPublicacao) : new Date(gazette.date);

              // Número amigável do diário oficial
              const numeroDocumento = `Diário Oficial - ${gazette.territory_name} (${gazette.state_code}) - ${gazette.date}`;

              const novaRes = await this.prisma.resolution.create({
                data: {
                  numero: numeroDocumento,
                  url: fileUrl,
                  pdfUrl: gazette.url || fileUrl,
                  resumoIa: extraido.resumoIa,
                  status: 'PROCESSED',
                  dataPublicacao: dataPub,
                  tags: extraido.tags || [],
                  tipoAto: extraido.tipoAto || 'DECRETO',
                  valorTotal: extraido.valorTotal || 0,
                  prazoAdesao: extraido.prazoAdesao ? new Date(extraido.prazoAdesao) : null,
                  statusAdesao: extraido.prazoAdesao ? 'PENDENTE' : 'NAO_APLICAVEL',
                  score,
                  banda,
                  fonte: 'QUERIDO_DIARIO',
                  items: {
                    create:
                      extraido.municipios?.map((m: any) => ({
                        mesoregiao: gazette.state_code,
                        microrregiao: gazette.territory_name,
                        municipio: m.municipio || gazette.territory_name,
                        local: m.local,
                        item: m.item,
                        categoriaEquipamento: m.categoriaEquipamento || null,
                        quantidadeEquipamento: m.quantidadeEquipamento
                          ? Math.round(m.quantidadeEquipamento)
                          : null,
                        valor: m.valor || extraido.valorTotal,
                        tipoVerba: m.tipoVerba || 'Investimento',
                      })) || [],
                  },
                },
              });

              await this.marcarComoVisto(fileUrl);
              logger.info(
                { numero: numeroDocumento, score, banda },
                '[QD-MUNICIPAL] ✅ Nova resolução municipal de saúde cadastrada com sucesso',
              );

              // Dispara alertas
              try {
                await fetch('http://api-gateway:4000/api/v1/resolution-alerts/trigger-evaluation', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
                  },
                  body: JSON.stringify({ resolutionId: novaRes.id }),
                });
              } catch (alertErr: any) {
                logger.error({ err: alertErr.message }, '[QD-MUNICIPAL] Falha ao disparar alerta');
              }
            }
          }
        }
      } catch (err: any) {
        logger.error({ termo, err: err.message }, '[QD-MUNICIPAL] Erro ao buscar no Querido Diário');
      }
    }
  }

  async registrarJobsRecorrentes(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'sync:diarios') {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }

    // Executa de hora em hora
    await this.queue.add(
      'sync:diarios',
      {},
      {
        repeat: { pattern: '0 * * * *' },
        jobId: 'qd-diarios-hourly',
      },
    );

    logger.info('[QD-MUNICIPAL] Jobs recorrentes registrados (a cada 1 hora)');
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.redis?.quit();
  }
}
