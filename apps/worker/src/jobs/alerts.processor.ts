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
    
    // Constrói a busca
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

    if (totalFound > 0 && resp.items?.length) {
      const emailTo = alert.user.email;
      const userName = alert.user.nome ?? 'Assinante';
      const alertName = alert.name;

      Logger.info(`[Alerts] Enviando notificações para ${emailTo} - ${totalFound} novos matches no alerta "${alertName}"`);

      // ── 1. Enviar E-mail via Resend ──────────────────────────────────────────
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const EMAIL_FROM = process.env.EMAIL_FROM ?? 'LicitaAI <noreply@licitaai.com.br>';
      const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

      const itemsHtml = resp.items.slice(0, 5).map(item => {
        const valorFormatado = item.valorPrincipal 
          ? `R$ ${item.valorPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : 'Valor estimado não divulgado';
        
        return `
          <tr><td style="padding:16px;background:#1b2230;border-radius:10px;margin-bottom:12px;display:block;border:1px solid rgba(255,255,255,0.05)">
            <div style="font-weight:700;color:#f1f5f9;font-size:14px;margin-bottom:6px;line-height:1.4">${item.objeto && item.objeto.length > 130 ? item.objeto.substring(0, 130) + '...' : (item.objeto ?? 'Sem objeto')}</div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:10px">
              🏛️ ${item.orgaoRazaoSocial ?? 'Órgão não especificado'} | 📍 Estado: ${item.uf ?? 'N/A'}
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-weight:700;color:#10b981;font-size:14px">${valorFormatado}</td>
                <td align="right">
                  <a href="${FRONTEND_URL}/${item.tipo === 'contrato' ? 'contratos' : 'licitacoes'}/${item.id}" style="color:#3b82f6;text-decoration:none;font-weight:700;font-size:13px">Ver Detalhes →</a>
                </td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="height:8px"></td></tr>
        `;
      }).join('');

      const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1117;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
        <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
          <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-1px">🎯 LicitaAI</div>
          <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0">Novas Oportunidades Encontradas</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="color:#f1f5f9;font-size:20px;font-weight:800;margin:0 0 8px">Olá, ${userName}!</h1>
          <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px">
            Seu alerta de monitoramento <strong style="color:#818cf8">"${alertName}"</strong> encontrou 
            <strong style="color:#f1f5f9">${totalFound}</strong> novos resultados desde ${since.toLocaleDateString('pt-BR')}.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsHtml}
          </table>

          ${totalFound > 5 ? `
            <p style="color:#94a3b8;font-size:13px;text-align:center;margin:16px 0 24px">
              E mais ${totalFound - 5} outras licitações encontradas.
            </p>
          ` : ''}

          <div style="margin-top:24px;text-align:center">
            <a href="${FRONTEND_URL}/busca?q=${encodeURIComponent(query)}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px">Ver todos os resultados no painel →</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      if (RESEND_API_KEY) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: EMAIL_FROM,
              to: emailTo,
              subject: `[LicitaAI] ${totalFound} novas licitações para "${alertName}"`,
              html: emailHtml,
            }),
          });
          if (emailResponse.ok) {
            Logger.info(`[Alerts] E-mail enviado com sucesso para ${emailTo}`);
          } else {
            Logger.error(`[Alerts] Falha ao enviar e-mail via Resend: status ${emailResponse.status}`);
          }
        } catch (err: any) {
          Logger.error(`[Alerts] Erro ao enviar e-mail de alerta: ${err.message}`);
        }
      } else {
        Logger.info(`[Alerts MOCK EMAIL] Envio simulado para ${emailTo} - Match "${alertName}": ${totalFound} itens.`);
      }

      // ── 2. Enviar WhatsApp (Mock ou Integração) ──────────────────────────────
      // O número de telefone pode ser extraído do objeto de usuário caso o schema/cadastro o armazene.
      // Caso contrário, usamos o número cadastrado no perfil ou mock.
      const userPhone = (alert.user as any).telefone ?? '';
      const whatsappMsg = `*LicitaAI - Alerta Ativo* 🎯\n\nOlá, *${userName}*!\n\nSeu alerta de busca *"${alertName}"* encontrou *${totalFound}* novos resultados hoje!\n\n🔍 Palavras-chave: ${alert.keywords.join(', ')}\n\nClique no link abaixo para conferir a lista no seu painel:\n${FRONTEND_URL}/busca?q=${encodeURIComponent(query)}`;

      if (userPhone && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_KEY) {
        try {
          const waResponse = await fetch(process.env.WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: userPhone.replace(/\D/g, ''),
              message: whatsappMsg,
            }),
          });
          if (waResponse.ok) {
            Logger.info(`[Alerts] Mensagem de WhatsApp enviada para ${userPhone}`);
          } else {
            Logger.error(`[Alerts] Falha ao enviar WhatsApp: status ${waResponse.status}`);
          }
        } catch (err: any) {
          Logger.error(`[Alerts] Erro ao enviar WhatsApp de alerta: ${err.message}`);
        }
      } else {
        Logger.info(`[Alerts MOCK WHATSAPP] Destinatário: ${userPhone || 'Sem telefone'} | Mensagem:\n${whatsappMsg}`);
      }

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
