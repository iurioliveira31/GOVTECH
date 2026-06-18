/**
 * subscription.guard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard NestJS que verifica se o usuário autenticado tem uma subscription
 * ativa antes de acessar endpoints protegidos por plano.
 *
 * Uso:
 *   @UseGuards(JwtAuthGuard, SubscriptionGuard)
 *   @RequiredPlan('PRO') // opcional — sem decorator permite qualquer plano ativo
 *   async meuEndpoint() { ... }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';

// Decorator para exigir plano mínimo
export const RequiredPlan = (plan: SubscriptionPlan) =>
  SetMetadata('required_plan', plan);

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  TRIAL: 0,
  STARTER: 1,
  PRO: 2,
  ENTERPRISE: 3,
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
    });

    if (!sub) {
      throw new ForbiddenException('Nenhuma assinatura encontrada. Escolha um plano para continuar.');
    }

    // Verificar se o acesso está ativo
    const now = new Date();
    const isActive =
      (sub.status === 'TRIALING' && sub.trialEndsAt && sub.trialEndsAt > now) ||
      (sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd > now) ||
      sub.status === 'PAST_DUE';

    if (!isActive) {
      throw new ForbiddenException(
        sub.status === 'CANCELED'
          ? 'Sua assinatura foi cancelada. Reative para continuar.'
          : 'Seu período de acesso expirou. Renove sua assinatura.',
      );
    }

    // Verificar plano mínimo exigido pelo decorator @RequiredPlan
    const requiredPlan = this.reflector.get<SubscriptionPlan>(
      'required_plan',
      context.getHandler(),
    );

    if (requiredPlan) {
      const userRank = PLAN_RANK[sub.plan as SubscriptionPlan] ?? -1;
      const requiredRank = PLAN_RANK[requiredPlan];

      if (userRank < requiredRank) {
        throw new ForbiddenException(
          `Esta funcionalidade requer o plano ${requiredPlan} ou superior. Seu plano atual: ${sub.plan}.`,
        );
      }
    }

    // Injetar subscription na request para uso nos handlers
    req.subscription = sub;
    return true;
  }
}
