'use client';

/**
 * FeatureGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente que exibe um "paywall" inline quando o usuário não tem acesso
 * à feature exigida. Envolve o conteúdo e o substitui por um CTA de upgrade.
 *
 * Uso:
 *   <FeatureGate feature="predictive_score">
 *     <ScorePreditivoChart />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="budget_analysis" requiredPlan="PRO">
 *     <AnaliseOrcamentaria />
 *   </FeatureGate>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useSubscription } from '@/lib/hooks/useSubscription';
import type { PlanFeature } from '@/lib/subscription';

const FEATURE_LABELS: Record<PlanFeature, { name: string; plan: string; icon: string }> = {
  predictive_score:  { name: 'Score Preditivo',       plan: 'Starter',    icon: '🎯' },
  budget_analysis:   { name: 'Análise Orçamentária',  plan: 'Pro',        icon: '📊' },
  api_access:        { name: 'Acesso à API',           plan: 'Enterprise', icon: '🔌' },
  alerts:            { name: 'Alertas de Licitações',  plan: 'Trial',      icon: '🔔' },
};

interface FeatureGateProps {
  feature: PlanFeature;
  children: React.ReactNode;
  /** Mostrar conteúdo com overlay em vez de ocultar totalmente */
  blur?: boolean;
  /** Custom CTA text */
  ctaText?: string;
}

export function FeatureGate({
  feature,
  children,
  blur = true,
  ctaText,
}: FeatureGateProps) {
  const { canUse, isTrialing } = useSubscription();

  if (canUse(feature)) {
    return <>{children}</>;
  }

  const info = FEATURE_LABELS[feature];
  const upgradeUrl = isTrialing ? '/onboarding/plano' : '/conta/renovar';

  // Modo blur: mostra conteúdo desfocado com overlay
  if (blur) {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
        {/* Conteúdo borrado */}
        <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
          {children}
        </div>

        {/* Overlay CTA */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,15,30,0.85)',
          backdropFilter: 'blur(2px)',
          gap: 12, padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32 }}>{info.icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {info.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Disponível no plano <strong style={{ color: 'var(--color-brand-400)' }}>{info.plan}</strong> ou superior
            </div>
          </div>
          <a
            href={upgradeUrl}
            id={`feature-gate-cta-${feature}`}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))',
              borderRadius: 10, color: 'white',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {ctaText ?? `Fazer upgrade para ${info.plan}`} →
          </a>
        </div>
      </div>
    );
  }

  // Modo substituição: mostra card de upgrade
  return (
    <div style={{
      padding: '32px 24px',
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>{info.icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {info.name}
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 320 }}>
        Esta funcionalidade está disponível a partir do plano{' '}
        <strong style={{ color: 'var(--color-brand-400)' }}>{info.plan}</strong>.
        Faça upgrade para desbloquear.
      </p>
      <a
        href={upgradeUrl}
        id={`feature-gate-inline-${feature}`}
        style={{
          padding: '10px 24px',
          background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))',
          borderRadius: 10, color: 'white',
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}
      >
        {ctaText ?? 'Ver planos'} →
      </a>
    </div>
  );
}
