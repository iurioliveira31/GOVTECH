import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, StartTrialDto, CreateCheckoutDto } from './dto/subscription.dto';
import { AuthService } from '../auth/auth.service';

// ── Planos e Price IDs (configuráveis por env) ─────────────────────────────
const PRICE_IDS: Record<string, string> = {
  STARTER_MONTHLY:  process.env.STRIPE_PRICE_STARTER_MONTHLY  ?? 'price_starter_monthly_placeholder',
  STARTER_ANNUAL:   process.env.STRIPE_PRICE_STARTER_ANNUAL   ?? 'price_starter_annual_placeholder',
  PRO_MONTHLY:      process.env.STRIPE_PRICE_PRO_MONTHLY       ?? 'price_pro_monthly_placeholder',
  PRO_ANNUAL:       process.env.STRIPE_PRICE_PRO_ANNUAL        ?? 'price_pro_annual_placeholder',
};

import Stripe from 'stripe';

// ── Stub do Stripe (substitua por import real quando tiver as chaves) ────────
const stripeMock = {
  customers: {
    create: async (data: { email: string; name?: string }): Promise<{ id: string }> => {
      console.log('[STRIPE MOCK] customers.create', data);
      return { id: `cus_mock_${crypto.randomUUID().slice(0, 8)}` };
    },
    list: async (params: { email: string }): Promise<{ data: Array<{ id: string }> }> => {
      return { data: [] };
    },
  },
  checkout: {
    sessions: {
      create: async (data: Record<string, unknown>): Promise<{ url: string }> => {
        console.log('[STRIPE MOCK] checkout.sessions.create', data);
        // Quando Stripe estiver configurado, a URL real será retornada
        return { url: `https://checkout.stripe.com/mock?session=sess_${crypto.randomUUID().slice(0, 8)}` };
      },
    },
  },
  billingPortal: {
    sessions: {
      create: async (data: Record<string, unknown>): Promise<{ url: string }> => {
        return { url: `https://billing.stripe.com/mock?session=sess_${crypto.randomUUID().slice(0, 8)}` };
      },
    },
  },
  webhooks: {
    constructEvent: (payload: Buffer, sig: string, secret: string) => {
      // Em produção: stripe.webhooks.constructEvent(payload, sig, secret)
      // Aqui retorna o body parseado diretamente
      return JSON.parse(payload.toString());
    },
  },
};

const getStripeClient = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (isProduction && !secretKey) {
    throw new Error('FATAL: STRIPE_SECRET_KEY é obrigatória em ambiente de produção!');
  }

  if (secretKey) {
    return new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    } as any) as any;
  }

  return stripeMock;
};

const getFrontendUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL;
  if (isProduction && !frontendUrl) {
    throw new Error('FATAL: FRONTEND_URL é obrigatória em ambiente de produção!');
  }
  return frontendUrl ?? 'http://localhost:3000';
};


@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly authService: AuthService,
  ) {}

  // ── 1. Registrar novo usuário ────────────────────────────────────────────
  async register(dto: RegisterDto) {
    // 1.1 Verificar se e-mail já existe
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Este e-mail já está cadastrado.');

    // 1.2 Verificar unicidade do CNPJ no trial
    if (dto.cnpj && dto.planChoice === 'TRIAL') {
      const cnpjUsed = await this.prisma.subscription.findFirst({
        where: { cnpjAtTrial: dto.cnpj, hasUsedTrial: true },
      });
      if (cnpjUsed) throw new ConflictException('Este CNPJ já utilizou o período de trial.');
    }

    // 1.3 Verificar se e-mail já usou trial (mesmo deletado)
    if (dto.planChoice === 'TRIAL') {
      const trialUsed = await this.prisma.subscription.findFirst({
        where: { user: { email: dto.email }, hasUsedTrial: true },
      });
      if (trialUsed) throw new ConflictException('Este e-mail já utilizou o período de trial. Escolha um plano pago.');
    }

    // 1.4 Buscar o tenant padrão (LicitaAI Demo para MVP)
    let tenant = await this.prisma.tenant.findFirst({ where: { slug: 'licitaai-demo' } });
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'LicitaAI',
          slug: 'licitaai-demo',
          status: 'ACTIVE',
        },
      });
    }

    // 1.5 Criar hash da senha
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 1.6 Criar usuário
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        email: dto.email,
        password: passwordHash,
        cnpj: dto.cnpj?.replace(/\D/g, '') || null,
        role: 'USER',
        isActive: true,
      },
    });

    // 1.7 Criar subscription
    let subscription: any;
    let checkoutUrl: string | undefined;

    if (dto.planChoice === 'TRIAL') {
      subscription = await this.createTrialSubscription(user.id, dto.cnpj);

      // Enviar e-mails de boas-vindas
      await this.email.sendWelcomeTrial({
        to: user.email,
        name: user.name,
        trialEndsAt: subscription.trialEndsAt!,
      });
      const verificationToken = await this.authService.generateEmailVerificationToken(user.id, user.email);
      await this.email.sendEmailVerification({
        to: user.email,
        name: user.name,
        token: verificationToken,
      });
    } else if (dto.planChoice === 'ENTERPRISE') {
      // Enterprise: sem subscription automática, contact vendas
      subscription = { plan: 'ENTERPRISE', status: 'TRIALING', hasUsedTrial: false };
    } else {
      // Plano pago: criar Stripe Checkout
      const priceId = PRICE_IDS[dto.planChoice];
      if (!priceId) throw new BadRequestException('Plano inválido.');

      const stripeClient = getStripeClient();
      const customers = await stripeClient.customers.list({ email: user.email });
      let customerId = customers.data[0]?.id;
      if (!customerId) {
        const customer = await stripeClient.customers.create({ email: user.email, name: dto.name });
        customerId = customer.id;
      }

      const frontendUrl = getFrontendUrl();
      const session = await stripeClient.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/dashboard?payment=success`,
        cancel_url: `${frontendUrl}/onboarding/plano?canceled=true`,
        metadata: { userId: user.id },
      });

      // Criar subscription pendente no banco
      subscription = await this.prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'STARTER',  // será atualizado pelo webhook
          status: 'TRIALING',
          stripeCustomerId: customerId,
        },
      });

      checkoutUrl = session.url;
    }

    // Registrar audit log
    await this.prisma.subscriptionAuditLog.create({
      data: {
        userId: user.id,
        action: 'TRIAL_STARTED',
        metadata: { planChoice: dto.planChoice, cnpj: dto.cnpj },
      },
    });

    // Gerar tokens para autologin
    const { accessToken, refreshToken, refreshTokenHash } = await this.authService.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
      subscription: this.formatSubscription(subscription),
      checkoutUrl,
      requireEmailVerification: true,
    };
  }

  // ── 2. Iniciar Trial ─────────────────────────────────────────────────────
  async startTrial(userId: string, dto: StartTrialDto) {
    const existingSub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existingSub?.hasUsedTrial) {
      throw new BadRequestException('Você já utilizou o período de trial.');
    }

    if (dto.cnpj) {
      const cnpj = dto.cnpj.replace(/\D/g, '');
      const cnpjUsed = await this.prisma.subscription.findFirst({
        where: { cnpjAtTrial: cnpj, hasUsedTrial: true },
      });
      if (cnpjUsed) throw new BadRequestException('Este CNPJ já utilizou o trial.');
    }

    if (existingSub) {
      return this.prisma.subscription.update({
        where: { userId },
        data: {
          plan: 'TRIAL',
          status: 'TRIALING',
          trialStartsAt: new Date(),
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          hasUsedTrial: true,
          cnpjAtTrial: dto.cnpj?.replace(/\D/g, '') || null,
        },
      });
    }

    return this.createTrialSubscription(userId, dto.cnpj);
  }

  // ── 3. Criar Checkout Stripe ─────────────────────────────────────────────
  async createCheckout(userId: string, dto: CreateCheckoutDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { subscription: true },
    });

    const priceId = PRICE_IDS[dto.priceId] ?? dto.priceId;

    // Buscar ou criar customer no Stripe
    let customerId = user.subscription?.stripeCustomerId;
    const stripeClient = getStripeClient();
    if (!customerId) {
      const customers = await stripeClient.customers.list({ email: user.email });
      customerId = customers.data[0]?.id;
      if (!customerId) {
        const customer = await stripeClient.customers.create({ email: user.email, name: user.name });
        customerId = customer.id;
      }
    }

    const frontendUrl = getFrontendUrl();
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/dashboard?payment=success`,
      cancel_url: `${frontendUrl}/onboarding/plano?canceled=true`,
      metadata: { userId },
    });

    return { checkoutUrl: session.url };
  }

  // ── 4. Criar Customer Portal ─────────────────────────────────────────────
  async createPortal(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub?.stripeCustomerId) throw new NotFoundException('Nenhuma assinatura Stripe encontrada.');

    const stripeClient = getStripeClient();
    const session = await stripeClient.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/conta`,
    });

    return { portalUrl: session.url };
  }

  // ── 5. Webhook Stripe ────────────────────────────────────────────────────
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    const stripeClient = getStripeClient();

    let event: any;
    try {
      event = stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Assinatura do webhook inválida.');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const stripeSub = session.subscription;
        const plan = this.mapStripePriceToPlan(session.line_items?.data?.[0]?.price?.id);

        await this.prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: 'ACTIVE',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: stripeSub,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            plan,
            status: 'ACTIVE',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: stripeSub,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        await this.prisma.subscriptionAuditLog.create({
          data: { userId, action: 'SUBSCRIPTION_CREATED', metadata: { stripeEvent: event.type } },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer },
        });
        if (!sub) break;

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: new Date(invoice.period_start * 1000),
            currentPeriodEnd: new Date(invoice.period_end * 1000),
          },
        });

        await this.prisma.subscriptionAuditLog.create({
          data: { userId: sub.userId, action: 'PAYMENT_SUCCEEDED', metadata: { invoice: invoice.id } },
        });

        await this.email.sendPaymentConfirmed({ userId: sub.userId });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer },
        });
        if (!sub) break;

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'PAST_DUE' },
        });

        await this.prisma.subscriptionAuditLog.create({
          data: { userId: sub.userId, action: 'PAYMENT_FAILED', metadata: { invoice: invoice.id } },
        });

        await this.email.sendPaymentFailed({ userId: sub.userId });
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!sub) break;

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'CANCELED', canceledAt: new Date(), cancelAtPeriodEnd: false },
        });

        await this.prisma.subscriptionAuditLog.create({
          data: { userId: sub.userId, action: 'SUBSCRIPTION_CANCELED' },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!sub) break;

        const newPlan = this.mapStripePriceToPlan(stripeSub.items?.data?.[0]?.price?.id);
        const newStatus = this.mapStripeStatus(stripeSub.status);

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan: newPlan,
            status: newStatus,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          },
        });
        break;
      }
    }

    return { received: true };
  }

  // ── 6. Minha subscription ────────────────────────────────────────────────
  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return null;
    return this.formatSubscription(sub);
  }

  // ── Helpers internos ─────────────────────────────────────────────────────

  private async createTrialSubscription(userId: string, cnpj?: string) {
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: 'TRIAL',
        status: 'TRIALING',
        trialStartsAt: new Date(),
        trialEndsAt,
        hasUsedTrial: true,
        cnpjAtTrial: cnpj?.replace(/\D/g, '') || null,
      },
      update: {
        plan: 'TRIAL',
        status: 'TRIALING',
        trialStartsAt: new Date(),
        trialEndsAt,
        hasUsedTrial: true,
        cnpjAtTrial: cnpj?.replace(/\D/g, '') || null,
      },
    });
  }

  private formatSubscription(sub: any) {
    return {
      plan: sub.plan,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      hasUsedTrial: sub.hasUsedTrial ?? false,
    };
  }

  private mapStripePriceToPlan(priceId?: string): 'STARTER' | 'PRO' | 'ENTERPRISE' | 'TRIAL' {
    if (!priceId) return 'STARTER';
    const map: Record<string, 'STARTER' | 'PRO' | 'ENTERPRISE'> = {
      [PRICE_IDS.STARTER_MONTHLY]: 'STARTER',
      [PRICE_IDS.STARTER_ANNUAL]: 'STARTER',
      [PRICE_IDS.PRO_MONTHLY]: 'PRO',
      [PRICE_IDS.PRO_ANNUAL]: 'PRO',
    };
    return map[priceId] ?? 'STARTER';
  }

  private mapStripeStatus(status: string): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'TRIALING' {
    const map: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      trialing: 'TRIALING',
    };
    return map[status] ?? 'ACTIVE';
  }
}
