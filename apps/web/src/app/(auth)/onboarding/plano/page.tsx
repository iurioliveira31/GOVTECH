'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth';

const PLANS_INFO = [
  {
    key: 'TRIAL',
    name: 'Teste Grátis',
    badge: 'Sem cartão',
    price: 'R$ 0',
    period: '30 dias',
    features: ['Até 5 alertas/dia', '3 buscas salvas', 'Acesso ao PNCP'],
    cta: 'Iniciar trial',
    highlight: false,
    color: 'rgba(37,99,235,0.3)',
  },
  {
    key: 'STARTER_MONTHLY',
    name: 'Starter',
    badge: '🔥 Mais Popular',
    price: 'R$ 197',
    period: '/mês',
    features: ['20 alertas/dia', '10 buscas salvas', 'Score preditivo'],
    cta: 'Assinar Starter',
    highlight: true,
    color: 'var(--color-brand-600)',
  },
  {
    key: 'PRO_MONTHLY',
    name: 'Pro',
    badge: 'Completo',
    price: 'R$ 397',
    period: '/mês',
    features: ['Alertas ilimitados', 'Score completo', 'Análise orçamentária'],
    cta: 'Assinar Pro',
    highlight: false,
    color: 'rgba(99,102,241,0.4)',
  },
];

export default function OnboardingPlanoPage() {
  const { subscription, setSubscription } = useAuthStore();
  const hasUsedTrial = subscription?.hasUsedTrial ?? false;
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePlanSelect = async (key: string) => {
    setIsLoading(key);
    setError('');
    try {
      if (key === 'TRIAL') {
        const sub = await authApi.startTrial();
        setSubscription(sub);
        window.location.href = '/dashboard';
      } else {
        const { checkoutUrl } = await authApi.createCheckout(key);
        window.location.href = checkoutUrl;
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(null);
    }
  };

  const plansToShow = hasUsedTrial
    ? PLANS_INFO.filter((p) => p.key !== 'TRIAL')
    : PLANS_INFO;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 900, color: 'white', boxShadow: 'var(--shadow-glow)',
        }}>L</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>LicitaAI</span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 12 }}>
          Escolha seu plano para continuar
        </h1>
        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
          {hasUsedTrial
            ? 'Seu trial expirou. Escolha um plano para continuar acessando o LicitaAI.'
            : 'Comece grátis por 30 dias ou assine agora para acesso imediato.'}
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center',
        width: '100%', maxWidth: 900,
      }}>
        {plansToShow.map((plan) => (
          <div key={plan.key} style={{
            flex: '1 1 240px', maxWidth: 280,
            padding: '28px 24px',
            background: plan.highlight ? 'rgba(37,99,235,0.06)' : 'var(--color-bg-surface)',
            border: `2px solid ${plan.color}`,
            borderRadius: 16,
            display: 'flex', flexDirection: 'column', gap: 16,
            transition: 'transform 0.2s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              display: 'inline-block', padding: '3px 10px', borderRadius: 20,
              fontSize: 10, fontWeight: 700, alignSelf: 'flex-start',
              background: plan.highlight ? 'var(--color-brand-600)' : 'rgba(255,255,255,0.06)',
              color: plan.highlight ? 'white' : 'var(--color-text-secondary)',
            }}>{plan.badge}</div>

            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: plan.highlight ? 'var(--color-brand-400)' : 'var(--color-text-primary)' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{plan.period}</span>
              </div>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#10b981' }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <button
              id={`btn-onboarding-${plan.key}`}
              type="button"
              onClick={() => handlePlanSelect(plan.key)}
              disabled={isLoading !== null}
              style={{
                padding: '12px', borderRadius: 10, border: plan.highlight ? 'none' : '1px solid var(--color-border)',
                background: plan.highlight ? 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))' : 'transparent',
                color: plan.highlight ? 'white' : 'var(--color-text-primary)',
                fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {isLoading === plan.key ? '⏳ Aguarde...' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 20, padding: '12px 20px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--color-danger)' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
