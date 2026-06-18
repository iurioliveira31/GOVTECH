'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import {
  shouldShowTrialBanner,
  getTrialDaysRemaining,
} from '@/lib/subscription';

export function SubscriptionBanners() {
  const { subscription, dismissTrialBanner } = useAuthStore();

  if (!subscription) return null;

  const showTrial = shouldShowTrialBanner(subscription);
  const showPastDue = subscription.status === 'PAST_DUE';
  const trialDays = getTrialDaysRemaining(subscription);

  return (
    <>
      {/* ── Banner de Trial expirando ─────────────────────────────── */}
      {showTrial && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '12px 24px',
          background: 'linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))',
          borderBottom: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500 }}>
              {trialDays === 0
                ? 'Seu trial encerra hoje!'
                : `Seu trial encerra em ${trialDays} dia${trialDays !== 1 ? 's' : ''}.`}
            </span>
            <a
              href="/onboarding/plano"
              id="banner-trial-cta"
              style={{
                fontSize: 13, fontWeight: 700,
                color: 'white',
                background: 'rgba(245,158,11,0.5)',
                border: '1px solid rgba(245,158,11,0.4)',
                padding: '4px 14px', borderRadius: 20,
                textDecoration: 'none',
                transition: 'background 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.5)'; }}
            >
              Assinar agora →
            </a>
          </div>
          <button
            id="banner-trial-dismiss"
            type="button"
            onClick={dismissTrialBanner}
            aria-label="Fechar banner"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(245,158,11,0.6)', fontSize: 18,
              padding: '2px 6px', borderRadius: 6,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fbbf24'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(245,158,11,0.6)'; }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Banner de Pagamento Pendente ──────────────────────────── */}
      {showPastDue && (
        <div style={{
          position: 'sticky', top: showTrial ? 49 : 0, zIndex: 99,
          padding: '12px 24px',
          background: 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', gap: 12,
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>
            Há um problema com seu pagamento. Atualize sua forma de pagamento para evitar a suspensão do serviço.
          </span>
          <a
            href="/conta/pagamento"
            id="banner-pastdue-cta"
            style={{
              fontSize: 13, fontWeight: 700, color: 'white',
              background: 'rgba(239,68,68,0.4)',
              border: '1px solid rgba(239,68,68,0.4)',
              padding: '4px 14px', borderRadius: 20,
              textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 'auto',
            }}
          >
            Atualizar pagamento →
          </a>
        </div>
      )}
    </>
  );
}
