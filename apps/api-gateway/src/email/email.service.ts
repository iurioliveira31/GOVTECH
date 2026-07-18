import { Injectable, Logger } from '@nestjs/common';

interface WelcomeTrialParams {
  to: string;
  name: string;
  trialEndsAt: Date;
}

interface EmailVerificationParams {
  to: string;
  name: string;
  token: string;
}

interface PaymentParams {
  userId: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'LicitaAI <noreply@licitaai.com.br>';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    Logger.log(`[EMAIL MOCK] Para: ${to} | Assunto: ${subject}`, 'EmailService');
    return;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!response.ok) {
      Logger.error(`[EmailService] Falha ao enviar para ${to}: ${response.status}`, 'EmailService');
    }
  } catch (err: any) {
    Logger.error(`[EmailService] Erro: ${err.message}`, 'EmailService');
  }
}

@Injectable()
export class EmailService {
  // ── 1. Confirmação de e-mail ──────────────────────────────────────────────
  async sendEmailVerification({ to, name, token }: EmailVerificationParams) {
    const url = `${FRONTEND_URL}/verificar-email?token=${token}`;
    await sendEmail(
      to,
      'Confirme seu e-mail para ativar o LicitaAI',
      `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1117;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
        <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#1d4ed8,#2563eb)">
          <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-1px">L LicitaAI</div>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0 0 16px">Olá, ${name}!</h1>
          <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 32px">Confirme seu e-mail para garantir o acesso completo à plataforma. O link expira em <strong style="color:#f1f5f9">24 horas</strong>.</p>
          <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">Confirmar e-mail →</a>
          <p style="color:#475569;font-size:12px;margin:24px 0 0">Se você não criou esta conta, ignore este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    );
  }

  // ── 2. Boas-vindas — trial iniciado ──────────────────────────────────────
  async sendWelcomeTrial({ to, name, trialEndsAt }: WelcomeTrialParams) {
    const date = trialEndsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    await sendEmail(
      to,
      'Seu trial de 30 dias começou! Veja o que fazer primeiro',
      `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1117;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
        <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#1d4ed8,#2563eb)">
          <div style="font-size:28px;font-weight:900;color:white">L LicitaAI</div>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0">Seu trial começou! 🎉</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0 0 8px">Bem-vindo, ${name}!</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">Seu acesso expira em <strong style="color:#f59e0b">${date}</strong>. Veja o que fazer primeiro:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${['Configure um alerta de edital no seu segmento', 'Salve um órgão público favorito', 'Analise uma licitação com IA'].map((step, i) =>
              `<tr><td style="padding:12px 16px;background:#0f1629;border-radius:10px;margin-bottom:8px;display:block">
                <span style="color:#2563eb;font-weight:700">${i + 1}.</span>
                <span style="color:#94a3b8;font-size:14px;margin-left:8px">${step}</span>
              </td></tr><tr><td style="height:8px"></td></tr>`
            ).join('')}
          </table>
          <div style="margin-top:32px;text-align:center">
            <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">Acessar o Dashboard →</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    );
  }

  // ── 3. Trial expirando — 7 dias ───────────────────────────────────────────
  async sendTrialExpiring7Days(to: string, name: string) {
    await sendEmail(
      to,
      'Seu acesso ao LicitaAI encerra em 7 dias',
      `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#0D1117;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
      <tr><td style="padding:32px;background:#92400e;text-align:center">
        <div style="font-size:24px;font-weight:900;color:white">⏰ 7 dias restantes</div>
      </td></tr>
      <tr><td style="padding:40px">
        <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Olá, ${name}!</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Seu trial encerra em 7 dias. Assine agora e continue acessando alertas de licitações, score preditivo e análise orçamentária.</p>
        <div style="text-align:center">
          <a href="${FRONTEND_URL}/onboarding/plano" style="display:inline-block;padding:14px 32px;background:#d97706;color:white;text-decoration:none;border-radius:10px;font-weight:700">Assinar agora →</a>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    );
  }

  // ── 4. Trial expirando — 1 dia ────────────────────────────────────────────
  async sendTrialExpiring1Day(to: string, name: string) {
    await sendEmail(
      to,
      '[URGENTE] Seu acesso encerra amanhã — garanta seu plano',
      `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#0D1117;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" style="background:#161B22;border:1px solid rgba(239,68,68,0.3);border-radius:16px;overflow:hidden">
      <tr><td style="padding:32px;background:#7f1d1d;text-align:center">
        <div style="font-size:24px;font-weight:900;color:white">🚨 Último dia!</div>
      </td></tr>
      <tr><td style="padding:40px">
        <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Olá, ${name}!</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Seu trial encerra <strong style="color:#ef4444">amanhã</strong>. Não perca o acesso às suas licitações monitoradas.</p>
        <div style="text-align:center">
          <a href="${FRONTEND_URL}/onboarding/plano" style="display:inline-block;padding:14px 32px;background:#ef4444;color:white;text-decoration:none;border-radius:10px;font-weight:700">Garantir acesso agora →</a>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    );
  }

  // ── 5. Trial expirado ─────────────────────────────────────────────────────
  async sendTrialExpired(to: string, name: string) {
    await sendEmail(
      to,
      'Seu trial encerrou — reative o acesso agora',
      `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#0D1117;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
      <tr><td style="padding:32px;background:#1a1a2e;text-align:center">
        <div style="font-size:24px;font-weight:900;color:#94a3b8">🔒 Acesso encerrado</div>
      </td></tr>
      <tr><td style="padding:40px">
        <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Olá, ${name}!</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Seu período de trial encerrou. Reative seu acesso agora para continuar monitorando licitações.</p>
        <div style="text-align:center">
          <a href="${FRONTEND_URL}/conta/renovar" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;border-radius:10px;font-weight:700">Reativar acesso →</a>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    );
  }

  // ── 6. Pagamento confirmado ───────────────────────────────────────────────
  async sendPaymentConfirmed({ userId }: PaymentParams) {
    Logger.log(`[EMAIL] Pagamento confirmado para userId: ${userId}`, 'EmailService');
    // Buscar e-mail do usuário e enviar template completo em produção
  }

  // ── 7. Falha no pagamento ─────────────────────────────────────────────────
  async sendPaymentFailed({ userId }: PaymentParams) {
    Logger.log(`[EMAIL] Falha no pagamento para userId: ${userId}`, 'EmailService');
    // Buscar e-mail do usuário e enviar template completo em produção
  }

  // ── 8. Recuperação de senha ───────────────────────────────────────────────
  async sendPasswordReset(to: string, name: string, token: string) {
    const url = `${FRONTEND_URL}/recuperar-senha?token=${token}`;
    await sendEmail(
      to,
      'Redefinir sua senha — LicitaAI',
      `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#0D1117;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="560" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
      <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#1d4ed8,#2563eb)">
        <div style="font-size:24px;font-weight:900;color:white">🔐 LicitaAI</div>
      </td></tr>
      <tr><td style="padding:40px">
        <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Olá, ${name}!</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Recebemos um pedido para redefinir sua senha. Clique no botão abaixo. O link expira em <strong style="color:#f1f5f9">1 hora</strong>.</p>
        <div style="text-align:center">
          <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;text-decoration:none;border-radius:10px;font-weight:700">Criar nova senha →</a>
        </div>
        <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center">Se você não solicitou isso, ignore este e-mail. Sua senha não foi alterada.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    );
  }

  // ── 9. Alerta de Resoluções SES/MG ────────────────────────────────────────
  async sendResolutionAlert(to: string, nomeAlerta: string, itens: any[]) {
    const tableRows = itens.map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #334155;color:#f1f5f9">${item.municipio}</td>
        <td style="padding:12px;border-bottom:1px solid #334155;color:#94a3b8">${item.item}</td>
        <td style="padding:12px;border-bottom:1px solid #334155;color:#10b981;font-weight:bold">R$ ${Number(item.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
      </tr>
    `).join('');

    await sendEmail(
      to,
      `🚨 Novo Alerta de Resolução SES/MG: ${nomeAlerta}`,
      `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#0D1117;font-family:Inter,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="600" style="background:#161B22;border:1px solid rgba(148,163,184,0.12);border-radius:16px;overflow:hidden">
      <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#059669,#10b981)">
        <div style="font-size:24px;font-weight:900;color:white">🚨 Novo Alerta Encontrado</div>
      </td></tr>
      <tr><td style="padding:40px">
        <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 16px">Seu alerta: "${nomeAlerta}"</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">O sistema encontrou novas resoluções que correspondem aos seus filtros.</p>
        
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;text-align:left;font-size:14px">
          <thead>
            <tr>
              <th style="padding:12px;border-bottom:2px solid #334155;color:#94a3b8">Município</th>
              <th style="padding:12px;border-bottom:2px solid #334155;color:#94a3b8">Item</th>
              <th style="padding:12px;border-bottom:2px solid #334155;color:#94a3b8">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="text-align:center">
          <a href="${FRONTEND_URL}/resolucoes" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#059669,#10b981);color:white;text-decoration:none;border-radius:10px;font-weight:700">Acessar Painel →</a>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
    );
  }
}
