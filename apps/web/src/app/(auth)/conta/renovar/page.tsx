'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import { useState } from 'react';

export default function RenovarPage() {
  const { subscription } = useAuthStore();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const expiredAt = subscription?.currentPeriodEnd ?? subscription?.trialEndsAt;
  const formattedDate = expiredAt
    ? new Date(expiredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const handleCheckout = async (priceId: string) => {
    setIsLoading(priceId);
    setError('');
    try {
      const { checkoutUrl } = await authApi.createCheckout(priceId);
      window.location.href = checkoutUrl;
    } catch {
      setError('Erro ao processar. Tente novamente.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Ícone de aviso */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--color-danger-bg)',
        border: '2px solid rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, marginBottom: 24,
      }}>🔒</div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 12, textAlign: 'center' }}>
        Seu acesso foi encerrado
      </h1>

      {formattedDate && (
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Seu plano expirou em <strong style={{ color: 'var(--color-danger)' }}>{formattedDate}</strong>.
        </p>
      )}

      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 40, textAlign: 'center', maxWidth: 440 }}>
        Reative sua assinatura para continuar monitorando licitações, recebendo alertas e acessando o painel de inteligência.
      </p>

      {/* Cards de planos */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 700 }}>
        {[
          { key: 'STARTER_MONTHLY', name: 'Starter', price: 'R$ 197/mês', features: ['20 alertas/dia', '10 buscas salvas', 'Score preditivo'], highlight: false },
          { key: 'PRO_MONTHLY', name: 'Pro', price: 'R$ 397/mês', features: ['Alertas ilimitados', 'Score completo', 'Análise orçamentária'], highlight: true },
        ].map((plan) => (
          <div key={plan.key} style={{
            flex: '1 1 260px', maxWidth: 300,
            padding: '28px 24px',
            background: plan.highlight ? 'rgba(37,99,235,0.06)' : 'var(--color-bg-surface)',
            border: `2px solid ${plan.highlight ? 'var(--color-brand-600)' : 'var(--color-border)'}`,
            borderRadius: 16,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>{plan.name}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: plan.highlight ? 'var(--color-brand-400)' : 'var(--color-text-primary)' }}>
              {plan.price}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', gap: 8 }}>
                  <span style={{ color: '#10b981' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              id={`btn-renovar-${plan.key}`}
              type="button"
              onClick={() => handleCheckout(plan.key)}
              disabled={isLoading !== null}
              style={{
                padding: '12px', borderRadius: 10, border: 'none',
                background: plan.highlight ? 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))' : 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
              }}
            >
              {isLoading === plan.key ? '⏳ Aguarde...' : 'Reativar minha assinatura'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 20, padding: '12px 20px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--color-danger)' }}>
          ⚠️ {error}
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--color-text-muted)' }}>
        Precisa de ajuda?{' '}
        <a href="mailto:suporte@licitaai.com.br" style={{ color: 'var(--color-brand-400)', textDecoration: 'none' }}>
          suporte@licitaai.com.br
        </a>
      </p>
    </div>
  );
}
