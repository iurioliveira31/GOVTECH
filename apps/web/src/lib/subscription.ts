/**
 * lib/subscription.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers de acesso por plano para o LicitaAI.
 * Todos os helpers são pure functions — sem I/O, sem efeitos colaterais.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Tipos espelhando o schema Prisma (sem importar o pacote pesado no frontend)
export type SubscriptionPlan = 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
export type AccessLevel = 'none' | 'trial' | 'starter' | 'pro' | 'enterprise';
export type PlanFeature =
  | 'predictive_score'
  | 'budget_analysis'
  | 'api_access'
  | 'alerts';

export interface SubscriptionData {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  hasUsedTrial?: boolean;
  trialDismissedAt?: Date | string | null;
}

// ─── Matriz de features por plano ──────────────────────────────────────────

const PLAN_FEATURES: Record<SubscriptionPlan, Record<PlanFeature, boolean>> = {
  TRIAL: {
    predictive_score: false,   // trial = acesso Starter, sem score preditivo
    budget_analysis: false,
    api_access: false,
    alerts: true,              // até 5 alertas/dia no trial
  },
  STARTER: {
    predictive_score: true,    // score básico
    budget_analysis: false,
    api_access: false,
    alerts: true,
  },
  PRO: {
    predictive_score: true,
    budget_analysis: true,
    api_access: false,
    alerts: true,
  },
  ENTERPRISE: {
    predictive_score: true,
    budget_analysis: true,
    api_access: true,
    alerts: true,
  },
};

// ─── Utilitário interno ─────────────────────────────────────────────────────

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

// ─── hasActiveAccess ────────────────────────────────────────────────────────

/**
 * Retorna `true` se o usuário tem acesso ativo à plataforma.
 *
 * Regras:
 * - TRIALING + trial_ends_at no futuro → true
 * - ACTIVE + current_period_end no futuro → true
 * - PAST_DUE → true (acesso mantido, mas com banner de aviso)
 * - Qualquer outra combinação → false
 */
export function hasActiveAccess(sub: SubscriptionData | null | undefined): boolean {
  if (!sub) return false;
  const now = new Date();

  switch (sub.status) {
    case 'TRIALING': {
      const end = toDate(sub.trialEndsAt);
      return end !== null && end > now;
    }
    case 'ACTIVE': {
      const end = toDate(sub.currentPeriodEnd);
      return end !== null && end > now;
    }
    case 'PAST_DUE':
      // Acesso mantido, mas cobranças pendentes — app mostra banner
      return true;
    case 'CANCELED':
    case 'EXPIRED':
    default:
      return false;
  }
}

// ─── getAccessLevel ─────────────────────────────────────────────────────────

/**
 * Retorna o nível de acesso atual do usuário.
 * Usa `hasActiveAccess` para garantir que planos expirados retornem 'none'.
 */
export function getAccessLevel(sub: SubscriptionData | null | undefined): AccessLevel {
  if (!sub || !hasActiveAccess(sub)) return 'none';

  const planMap: Record<SubscriptionPlan, AccessLevel> = {
    TRIAL: 'trial',
    STARTER: 'starter',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
  };

  return planMap[sub.plan] ?? 'none';
}

// ─── isPlanFeatureEnabled ───────────────────────────────────────────────────

/**
 * Verifica se uma feature específica está disponível para o plano atual.
 * Retorna `false` se o acesso não for ativo.
 */
export function isPlanFeatureEnabled(
  sub: SubscriptionData | null | undefined,
  feature: PlanFeature,
): boolean {
  if (!sub || !hasActiveAccess(sub)) return false;
  return PLAN_FEATURES[sub.plan]?.[feature] ?? false;
}

// ─── getTrialDaysRemaining ──────────────────────────────────────────────────

/**
 * Retorna quantos dias restam do trial.
 * Retorna `null` se não estiver em trial ou já tiver expirado.
 */
export function getTrialDaysRemaining(sub: SubscriptionData | null | undefined): number | null {
  if (!sub || sub.status !== 'TRIALING') return null;

  const end = toDate(sub.trialEndsAt);
  if (!end) return null;

  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ─── shouldShowTrialBanner ──────────────────────────────────────────────────

/**
 * Retorna `true` se o banner de aviso do trial deve ser exibido.
 * Critério: TRIALING, 7 dias ou menos, e usuário não dispensou hoje.
 */
export function shouldShowTrialBanner(sub: SubscriptionData | null | undefined): boolean {
  const days = getTrialDaysRemaining(sub);
  if (days === null || days > 7) return false;

  // Se o usuário dispensou o banner, reaparece no próximo dia
  if (sub?.trialDismissedAt) {
    const dismissed = toDate(sub.trialDismissedAt)!;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (dismissed >= startOfToday) return false;
  }

  return true;
}

// ─── getMaxAlerts ───────────────────────────────────────────────────────────

/**
 * Retorna o limite de alertas por dia para o plano atual.
 */
export function getMaxAlerts(sub: SubscriptionData | null | undefined): number {
  if (!sub || !hasActiveAccess(sub)) return 0;
  const limits: Record<SubscriptionPlan, number> = {
    TRIAL: 5,
    STARTER: 20,
    PRO: Infinity,
    ENTERPRISE: Infinity,
  };
  return limits[sub.plan] ?? 0;
}

// ─── getMaxSavedSearches ────────────────────────────────────────────────────

/**
 * Retorna o limite de buscas salvas para o plano atual.
 */
export function getMaxSavedSearches(sub: SubscriptionData | null | undefined): number {
  if (!sub || !hasActiveAccess(sub)) return 0;
  const limits: Record<SubscriptionPlan, number> = {
    TRIAL: 3,
    STARTER: 10,
    PRO: Infinity,
    ENTERPRISE: Infinity,
  };
  return limits[sub.plan] ?? 0;
}
