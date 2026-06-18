/**
 * expire-trials.processor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Job BullMQ que roda diariamente para:
 * 1. Expirar trials vencidos (status TRIALING → EXPIRED)
 * 2. Enviar e-mails de aviso 7 dias antes
 * 3. Enviar e-mails de aviso 1 dia antes
 *
 * Agendamento: diariamente às 02:00 UTC (via cron)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Queue, Worker, type Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../observability/logger';

const QUEUE_NAME = 'expire-trials';
const CRON_PATTERN = '0 2 * * *'; // Diariamente às 02:00 UTC

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'LicitaAI <noreply@licitaai.com.br>';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redisConnection = () => {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
  };
};

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    Logger.info(`[EMAIL MOCK] Para: ${to} | Assunto: ${subject}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) Logger.warn(`[EMAIL] Falha ao enviar para ${to}: ${res.status}`);
  } catch (e: any) {
    Logger.warn(`[EMAIL] Erro: ${e.message}`);
  }
}

export class ExpireTrialsProcessor {
  private worker!: Worker;
  private queue!: Queue;

  constructor(private readonly prisma: PrismaClient) {}

  async start(): Promise<void> {
    const connection = redisConnection();

    this.queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    });

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        try {
          Logger.info(`[ExpireTrials] Iniciando job: ${job.name}`);
          await this.processExpireTrials();
          Logger.info('[ExpireTrials] Job concluído');
        } catch (error) {
          Logger.error(`[ExpireTrials] Erro ao processar job: ${error}`);
          throw error;
        }
      },
      { connection, concurrency: 1 },
    );

    this.worker.on('failed', (job, err) => {
      Logger.error(`[ExpireTrials] Job ${job?.id} falhou: ${err.message}`);
    });

    Logger.info('[ExpireTrials] Worker iniciado');
  }

  async registrarJobRecorrente(): Promise<void> {
    if (!this.queue) return;

    // Remove jobs repetidos anteriores para evitar duplicatas
    await this.queue.removeRepeatable('expire-trials-daily', { pattern: CRON_PATTERN });

    await this.queue.add(
      'expire-trials-daily',
      {},
      { repeat: { pattern: CRON_PATTERN, tz: 'UTC' } },
    );

    Logger.info(`[ExpireTrials] Job recorrente registrado (${CRON_PATTERN})`);
  }

  async enqueueNow(): Promise<void> {
    await this.queue.add('expire-trials-manual', {}, { priority: 1 });
    Logger.info('[ExpireTrials] Job manual enfileirado');
  }

  private async processExpireTrials(): Promise<void> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in1Day  = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // ── 1. Expirar trials vencidos ──────────────────────────────────────────
    const expired = await this.prisma.subscription.findMany({
      where: {
        status: 'TRIALING',
        trialEndsAt: { lt: now },
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    for (const sub of expired) {
      try {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
        });

        await this.prisma.subscriptionAuditLog.create({
          data: {
            userId: sub.userId,
            action: 'ACCESS_BLOCKED',
            metadata: { reason: 'trial_expired', expiredAt: sub.trialEndsAt },
          },
        });

        await this.sendTrialExpiredEmail(sub.user.email, sub.user.name);
        Logger.info(`[ExpireTrials] Trial expirado: userId=${sub.userId} email=${sub.user.email}`);
      } catch (e: any) {
        Logger.error(`[ExpireTrials] Erro ao expirar userId=${sub.userId}: ${e.message}`);
      }
    }

    // ── 2. Aviso 7 dias antes ────────────────────────────────────────────────
    const expiring7 = await this.prisma.subscription.findMany({
      where: {
        status: 'TRIALING',
        trialEndsAt: {
          gte: new Date(in7Days.getTime() - 12 * 60 * 60 * 1000), // janela de ±12h
          lte: new Date(in7Days.getTime() + 12 * 60 * 60 * 1000),
        },
      },
      include: { user: { select: { email: true, name: true } } },
    });

    for (const sub of expiring7) {
      try {
        await this.sendTrialExpiring7DaysEmail(sub.user.email, sub.user.name);
        Logger.info(`[ExpireTrials] Aviso 7d enviado para: ${sub.user.email}`);
      } catch (e: any) {
        Logger.warn(`[ExpireTrials] Erro no aviso 7d: ${e.message}`);
      }
    }

    // ── 3. Aviso 1 dia antes ─────────────────────────────────────────────────
    const expiring1 = await this.prisma.subscription.findMany({
      where: {
        status: 'TRIALING',
        trialEndsAt: {
          gte: new Date(in1Day.getTime() - 12 * 60 * 60 * 1000),
          lte: new Date(in1Day.getTime() + 12 * 60 * 60 * 1000),
        },
      },
      include: { user: { select: { email: true, name: true } } },
    });

    for (const sub of expiring1) {
      try {
        await this.sendTrialExpiring1DayEmail(sub.user.email, sub.user.name);
        Logger.info(`[ExpireTrials] Aviso 1d enviado para: ${sub.user.email}`);
      } catch (e: any) {
        Logger.warn(`[ExpireTrials] Erro no aviso 1d: ${e.message}`);
      }
    }

    Logger.info(
      `[ExpireTrials] Resumo: ${expired.length} expirados, ${expiring7.length} avisos 7d, ${expiring1.length} avisos 1d`,
    );
  }

  // ── Templates de e-mail ──────────────────────────────────────────────────

  private async sendTrialExpiredEmail(to: string, name: string) {
    await sendEmail(
      to,
      'Seu trial encerrou — reative o acesso agora',
      `<!DOCTYPE html><html><body style="background:#0D1117;font-family:Inter,sans-serif;margin:0;padding:40px 20px">
<table width="100%"><tr><td align="center">
  <table width="560" style="background:#161B22;border-radius:16px;border:1px solid rgba(148,163,184,0.12);overflow:hidden">
    <tr><td style="background:#1a1a2e;padding:28px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:#94a3b8">🔒 Acesso encerrado</div>
    </td></tr>
    <tr><td style="padding:36px">
      <h2 style="color:#f1f5f9;margin:0 0 12px">Olá, ${name}!</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Seu período de trial de 30 dias encerrou. Reative agora e continue monitorando licitações, recebendo alertas e usando o score preditivo.</p>
      <div style="text-align:center">
        <a href="${FRONTEND_URL}/conta/renovar" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Reativar acesso →</a>
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`,
    );
  }

  private async sendTrialExpiring7DaysEmail(to: string, name: string) {
    await sendEmail(
      to,
      'Seu acesso ao LicitaAI encerra em 7 dias',
      `<!DOCTYPE html><html><body style="background:#0D1117;font-family:Inter,sans-serif;margin:0;padding:40px 20px">
<table width="100%"><tr><td align="center">
  <table width="560" style="background:#161B22;border-radius:16px;border:1px solid rgba(148,163,184,0.12);overflow:hidden">
    <tr><td style="background:#92400e;padding:28px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:white">⏰ 7 dias restantes</div>
    </td></tr>
    <tr><td style="padding:36px">
      <h2 style="color:#f1f5f9;margin:0 0 12px">Olá, ${name}!</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Seu trial encerra em 7 dias. Assine agora e garanta acesso contínuo ao LicitaAI com <strong style="color:#f59e0b">20% de desconto no primeiro mês</strong>.</p>
      <div style="text-align:center">
        <a href="${FRONTEND_URL}/onboarding/plano" style="display:inline-block;padding:14px 32px;background:#d97706;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Assinar com desconto →</a>
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`,
    );
  }

  private async sendTrialExpiring1DayEmail(to: string, name: string) {
    await sendEmail(
      to,
      '[URGENTE] Seu acesso encerra amanhã — garanta seu plano',
      `<!DOCTYPE html><html><body style="background:#0D1117;font-family:Inter,sans-serif;margin:0;padding:40px 20px">
<table width="100%"><tr><td align="center">
  <table width="560" style="background:#161B22;border-radius:16px;border:1px solid rgba(239,68,68,0.3);overflow:hidden">
    <tr><td style="background:#7f1d1d;padding:28px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:white">🚨 Último dia!</div>
    </td></tr>
    <tr><td style="padding:36px">
      <h2 style="color:#f1f5f9;margin:0 0 12px">Olá, ${name}!</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Seu trial encerra <strong style="color:#ef4444">amanhã</strong>. Não perca o acesso às suas licitações e alertas configurados.</p>
      <div style="text-align:center">
        <a href="${FRONTEND_URL}/onboarding/plano" style="display:inline-block;padding:14px 32px;background:#ef4444;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Garantir acesso agora →</a>
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`,
    );
  }

  async close(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
