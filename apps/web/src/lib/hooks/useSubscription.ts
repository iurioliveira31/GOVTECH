'use client';

/**
 * useSubscription.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook centralizado para acessar e reagir ao estado de subscription.
 * Combina o Zustand store com os helpers de lib/subscription.ts
 * para evitar repetição de lógica nos componentes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import {
  hasActiveAccess,
  getAccessLevel,
  getTrialDaysRemaining,
  shouldShowTrialBanner,
  isPlanFeatureEnabled,
  getMaxAlerts,
  getMaxSavedSearches,
  type SubscriptionData,
  type PlanFeature,
  type AccessLevel,
} from '@/lib/subscription';

interface UseSubscriptionReturn {
  // Estado bruto
  subscription: SubscriptionData | null;

  // Status computado
  isActive: boolean;
  accessLevel: AccessLevel;
  isPastDue: boolean;
  isTrialing: boolean;
  isCanceled: boolean;
  isExpired: boolean;

  // Trial
  trialDaysRemaining: number | null;
  showTrialBanner: boolean;

  // Limites do plano
  maxAlerts: number;
  maxSavedSearches: number;

  // Feature flags
  canUse: (feature: PlanFeature) => boolean;

  // Loading state
  isLoading: boolean;

  // Ações
  refreshSubscription: () => Promise<void>;
  dismissTrialBanner: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
  const { subscription, isLoading, setSubscription, dismissTrialBanner } = useAuthStore();

  // Sincroniza subscription do servidor ao montar (caso o store esteja stale)
  useEffect(() => {
    let cancelled = false;
    const fetchSub = async () => {
      try {
        const sub = await authApi.getMySubscription();
        if (!cancelled && sub) {
          setSubscription(sub);
        }
      } catch {
        // Silencioso: usuário pode não estar logado ou sem subscription
      }
    };
    fetchSub();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSubscription = async () => {
    try {
      const sub = await authApi.getMySubscription();
      if (sub) setSubscription(sub);
    } catch { /* silencioso */ }
  };

  return {
    subscription,
    isActive: hasActiveAccess(subscription),
    accessLevel: getAccessLevel(subscription),
    isPastDue: subscription?.status === 'PAST_DUE',
    isTrialing: subscription?.status === 'TRIALING',
    isCanceled: subscription?.status === 'CANCELED',
    isExpired: subscription?.status === 'EXPIRED',
    trialDaysRemaining: getTrialDaysRemaining(subscription),
    showTrialBanner: shouldShowTrialBanner(subscription),
    maxAlerts: getMaxAlerts(subscription),
    maxSavedSearches: getMaxSavedSearches(subscription),
    canUse: (feature: PlanFeature) => isPlanFeatureEnabled(subscription, feature),
    isLoading,
    refreshSubscription,
    dismissTrialBanner,
  };
}
