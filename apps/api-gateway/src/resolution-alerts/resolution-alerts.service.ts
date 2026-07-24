import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ResolutionAlertsService {
  private readonly logger = new Logger(ResolutionAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async createAlert(userId: string, data: any) {
    const { nome, municipios, palavrasChave, valorMinimo, whatsapp, email } = data;

    // Buscar a assinatura (subscription) ativa do usuário
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const planName = sub?.plan ?? 'TRIAL';
    const subStatus = sub?.status ?? 'TRIALING';

    const now = new Date();
    const isActive =
      (subStatus === 'TRIALING' && sub?.trialEndsAt && sub.trialEndsAt > now) ||
      (subStatus === 'ACTIVE' && sub?.currentPeriodEnd && sub.currentPeriodEnd > now) ||
      subStatus === 'PAST_DUE';

    if (!isActive && sub) {
      throw new ForbiddenException('Sua assinatura expirou. Renove seu plano para cadastrar alertas.');
    }

    // Buscar configuração de limites do plano cadastrado no BD (com fallback de segurança)
    const planConfig = await this.prisma.planConfig.findUnique({
      where: { name: planName as any },
    });

    const maxAlerts = planConfig?.maxAlertsPerDay ?? 5;

    // Contar alertas cadastrados ativos do usuário
    const count = await this.prisma.resolutionAlert.count({
      where: { userId, isActive: true },
    });

    if (count >= maxAlerts) {
      throw new ForbiddenException(
        `Você atingiu o limite máximo de ${maxAlerts} alertas para o plano ${planName}. Faça upgrade da assinatura para cadastrar mais.`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const finalEmail = email || user?.email;

    const alert = await this.prisma.resolutionAlert.create({
      data: {
        userId,
        nome,
        municipios: municipios || [],
        palavrasChave: palavrasChave || [],
        valorMinimo: valorMinimo ? parseFloat(valorMinimo) : null,
        whatsapp,
        email: finalEmail,
      },
    });

    // Retroactive search in the last 5 days
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Build Prisma query based on filters
    const OR_conditions = [];
    if (alert.municipios && alert.municipios.length > 0) {
      const muniCondition = alert.municipios.map(m => ({ municipio: { contains: m, mode: 'insensitive' as const } }));
      OR_conditions.push({ OR: muniCondition });
    }
    if (alert.palavrasChave && alert.palavrasChave.length > 0) {
      const wordCondition = alert.palavrasChave.map(w => ({ item: { contains: w, mode: 'insensitive' as const } }));
      OR_conditions.push({ OR: wordCondition });
    }
    
    let whereCondition: any = { createdAt: { gte: fiveDaysAgo } };
    if (OR_conditions.length > 0) {
      whereCondition.AND = OR_conditions;
    }
    if (alert.valorMinimo) {
      whereCondition.valor = { gte: alert.valorMinimo };
    }

    const pastMatches = await this.prisma.resolutionItem.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' }
    });

    if (pastMatches.length > 0) {
      this.logger.log(`Alerta ${alert.id} gerou ${pastMatches.length} matches retroativos.`);
      
      // Fire and forget: don't await notification so the API responds quickly to the user
      this.sendNotification(alert, pastMatches).catch(e => {
        this.logger.error(`Erro ao processar notificação assíncrona para alerta ${alert.id}`, e);
      });
      
      await this.prisma.resolutionAlert.update({
        where: { id: alert.id },
        data: { lastTriggeredAt: new Date() }
      });
    }

    return alert;
  }

  async sendNotification(alert: any, items: any[]) {
    // Email Notification
    if (alert.email) {
      try {
        await this.emailService.sendResolutionAlert(alert.email, alert.nome, items);
      } catch (e) {
        this.logger.error(`Erro ao enviar email para ${alert.email}`, e);
      }
    }

    // WhatsApp Notification via Evolution API
    if (alert.whatsapp) {
      try {
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
        const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'licitaai';

        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
          const topItems = items.slice(0, 10);
          let text = `*🚨 LicitaAI Alerta: ${alert.nome}*\nEncontramos ${items.length} resoluções:\n\n`;
          topItems.forEach(i => {
            text += `- *${i.municipio}*: ${i.item} (R$ ${Number(i.valor).toLocaleString('pt-BR')})\n`;
          });
          
          if (items.length > 10) {
            text += `\n...e mais ${items.length - 10} itens.\n`;
          }
          text += `\nAcesse seu painel para ver os documentos completos.`;

          let formattedNumber = alert.whatsapp.replace(/\\D/g, '');
          if (formattedNumber.length === 10 || formattedNumber.length === 11) {
            formattedNumber = '55' + formattedNumber;
          }

          const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 
              'apikey': EVOLUTION_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              number: formattedNumber,
              options: { delay: 1200 },
              text: text
            })
          });
          const responseBody = await res.text();
          if (!res.ok) {
            this.logger.error(`Falha ao enviar WhatsApp via Evolution API: ${res.status} - ${responseBody}`);
          } else {
            this.logger.log(`WhatsApp enviado com sucesso para ${formattedNumber}`);
          }
        }
      } catch (e) {
        this.logger.error(`Erro ao enviar whatsapp para ${alert.whatsapp}`, e);
      }
    }
  }

  async listAlerts(userId: string) {
    return this.prisma.resolutionAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async toggleAlert(userId: string, id: string, isActive: boolean) {
    return this.prisma.resolutionAlert.updateMany({
      where: { id, userId },
      data: { isActive }
    });
  }

  async deleteAlert(userId: string, id: string) {
    return this.prisma.resolutionAlert.deleteMany({
      where: { id, userId }
    });
  }

  async evaluateNewResolution(resolutionId: string) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { id: resolutionId },
      include: { items: true }
    });
    if (!resolution || resolution.items.length === 0) return { matched: 0 };
    
    // Ignorar alertas para resoluções antigas (anteriores a 14/07/2026)
    const cutoffDate = new Date('2026-07-14T00:00:00.000Z');
    if (resolution.dataPublicacao && resolution.dataPublicacao < cutoffDate) {
      this.logger.log(`[Alerts] Resolução ${resolution.numero} é antiga (${resolution.dataPublicacao}), ignorando disparo.`);
      return { matched: 0 };
    }

    const items = resolution.items;

    const activeAlerts = await this.prisma.resolutionAlert.findMany({
      where: { isActive: true }
    });

    let notificationsSent = 0;

    for (const alert of activeAlerts) {
      const matches = items.filter(item => {
        let match = true;
        if (alert.municipios && alert.municipios.length > 0) {
          const muniMatch = alert.municipios.some(m => item.municipio?.toLowerCase().includes(m.toLowerCase()));
          if (!muniMatch) match = false;
        }
        if (match && alert.palavrasChave && alert.palavrasChave.length > 0) {
          const wordMatch = alert.palavrasChave.some(w => {
            const wLower = w.toLowerCase();
            const inItem = item.item?.toLowerCase().includes(wLower);
            const inResumo = (resolution as any).resumoIa?.toLowerCase().includes(wLower);
            const inTags = (resolution as any).tags?.some((t: string) => t.toLowerCase().includes(wLower));
            return inItem || inResumo || inTags;
          });
          if (!wordMatch) match = false;
        }
        if (match && alert.valorMinimo && item.valor) {
          if (Number(item.valor) < alert.valorMinimo) match = false;
        }
        return match;
      });

      if (matches.length > 0) {
        await this.sendNotification(alert, matches);
        await this.prisma.resolutionAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() }
        });
        notificationsSent++;
      }
    }

    return { matched: notificationsSent };
  }
}
