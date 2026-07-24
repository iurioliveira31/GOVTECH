'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth.store';

// ─── Tipos ──────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;
type BillingCycle = 'MONTHLY' | 'ANNUAL';
type PlanChoice = 'TRIAL' | 'STARTER_MONTHLY' | 'STARTER_ANNUAL' | 'PRO_MONTHLY' | 'PRO_ANNUAL' | 'ENTERPRISE';

interface FormData {
  // Passo 1
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  // Passo 2
  companyName: string;
  cnpj: string;
  segment: string;
  jobRole: string;
  // Passo 3
  planChoice: PlanChoice;
  billingCycle: BillingCycle;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function maskCNPJ(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function passwordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Fraca', color: '#ef4444' };
  if (score === 2) return { level: 2, label: 'Média', color: '#f59e0b' };
  return { level: 3, label: 'Forte', color: '#10b981' };
}

// ─── Dados dos planos ─────────────────────────────────────────────────────────
const PLANS = {
  TRIAL: {
    key: 'TRIAL' as const,
    name: 'Teste Grátis',
    badge: 'Sem cartão necessário',
    price: { MONTHLY: 'R$ 0', ANNUAL: 'R$ 0' },
    period: '30 dias',
    description: 'Acesso ao plano Starter por 30 dias, sem compromisso.',
    features: ['Até 5 alertas por dia', '3 buscas salvas', 'Busca no PNCP', 'Suporte por e-mail'],
    limitations: ['Sem score preditivo', 'Sem análise orçamentária'],
    cta: 'Começar teste grátis',
    highlight: false,
    borderColor: 'rgba(37,99,235,0.3)',
  },
  STARTER: {
    key: 'STARTER_MONTHLY' as PlanChoice,
    name: 'Starter',
    badge: '🔥 Mais Popular',
    price: { MONTHLY: 'R$ 197', ANNUAL: 'R$ 164' },
    period: '/mês',
    annualNote: 'R$ 1.970/ano (2 meses grátis)',
    description: 'Para empresas que já participam de licitações com frequência.',
    features: ['Até 20 alertas por dia', '10 buscas salvas', 'Score preditivo básico', 'Histórico de contratos', 'Suporte prioritário'],
    limitations: ['Sem análise orçamentária'],
    cta: 'Assinar Starter',
    highlight: true,
    borderColor: 'var(--color-brand-600)',
  },
  PRO: {
    key: 'PRO_MONTHLY' as PlanChoice,
    name: 'Pro',
    badge: 'Mais Completo',
    price: { MONTHLY: 'R$ 397', ANNUAL: 'R$ 331' },
    period: '/mês',
    annualNote: 'R$ 3.970/ano',
    description: 'Para times que precisam de inteligência preditiva completa.',
    features: ['Alertas ilimitados', 'Buscas ilimitadas', 'Score preditivo completo', 'Análise orçamentária', 'Relatórios avançados', 'Suporte VIP'],
    limitations: [],
    cta: 'Assinar Pro',
    highlight: false,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  ENTERPRISE: {
    key: 'ENTERPRISE' as const,
    name: 'Enterprise',
    badge: 'Sob Consulta',
    price: { MONTHLY: 'Sob consulta', ANNUAL: 'Sob consulta' },
    period: '',
    description: 'Para grandes empresas com times especializados.',
    features: ['Tudo do Pro', 'Acesso à API', 'Suporte dedicado 24/7', 'Onboarding personalizado', 'SLA garantido'],
    limitations: [],
    cta: 'Falar com vendas',
    highlight: false,
    borderColor: 'rgba(245,158,11,0.3)',
  },
};

// ─── Indicador de progresso ───────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Conta' },
    { n: 2, label: 'Empresa' },
    { n: 3, label: 'Plano' },
    { n: 4, label: 'Confirmar' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: current >= s.n
                ? 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))'
                : 'var(--color-bg-elevated)',
              border: current === s.n
                ? '2px solid var(--color-brand-400)'
                : current > s.n
                  ? 'none'
                  : '2px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              color: current >= s.n ? 'white' : 'var(--color-text-muted)',
              transition: 'all 0.3s ease',
              boxShadow: current === s.n ? 'var(--shadow-glow)' : 'none',
            }}>
              {current > s.n ? '✓' : s.n}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500,
              color: current >= s.n ? 'var(--color-brand-400)' : 'var(--color-text-muted)',
            }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              width: 60, height: 2, margin: '0 4px',
              marginBottom: 22,
              background: current > s.n ? 'var(--color-brand-600)' : 'var(--color-border)',
              transition: 'background 0.3s ease',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CadastroPage() {
  const { setSubscription } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [form, setForm] = useState<FormData>({
    name: '', email: '', password: '', confirmPassword: '', acceptTerms: false,
    companyName: '', cnpj: '', segment: '', jobRole: '',
    planChoice: 'TRIAL', billingCycle: 'MONTHLY',
  });

  const set = useCallback((field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const strength = passwordStrength(form.password);

  // ── Passo 1 ────────────────────────────────────────────────────────────────
  const submitStep1 = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('As senhas não coincidem.');
    if (form.password.length < 8) return setError('A senha deve ter ao menos 8 caracteres.');
    if (!form.acceptTerms) return setError('Aceite os termos para continuar.');
    setStep(2);
  };

  // ── Passo 2 ────────────────────────────────────────────────────────────────
  const submitStep2 = (skip = false) => {
    if (!skip && form.cnpj && form.cnpj.replace(/\D/g, '').length !== 14) {
      return setError('CNPJ inválido. Verifique os dígitos.');
    }
    setError('');
    setStep(3);
  };

  // ── Passo 3 — Submissão final ──────────────────────────────────────────────
  const submitStep3 = async (planKey: PlanChoice) => {
    setIsLoading(true);
    setError('');
    const finalPlan = planKey;
    set('planChoice', finalPlan);

    try {
      const res = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        cnpj: form.cnpj.replace(/\D/g, '') || undefined,
        companyName: form.companyName || undefined,
        segment: form.segment || undefined,
        role: form.jobRole || undefined,
        planChoice: finalPlan,
      });

      // Login automático
      useAuthStore.getState().setUserAndTokens(
        { ...res.user, nome: res.user.name },
        res.accessToken,
        res.refreshToken
      );
      // Atualizar store com a subscription criada
      if (res.subscription) {
        setSubscription({
          plan: res.subscription.plan,
          status: res.subscription.status,
          trialEndsAt: res.subscription.trialEndsAt,
          currentPeriodEnd: res.subscription.currentPeriodEnd,
          hasUsedTrial: res.subscription.hasUsedTrial,
        });
      }

      if (finalPlan === 'ENTERPRISE') {
        // Redirecionar para contato com vendas
        window.location.href = 'mailto:vendas@licitaai.com.br?subject=Interesse Enterprise';
        return;
      }

      // Plano pago → redirecionar para Stripe
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      // Trial → ir para confirmação de e-mail
      setStep(4);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Ocorreu um erro. Tente novamente.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar e-mail de verificação
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendVerification();
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch { /* silencioso */ }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 900, color: 'white',
          boxShadow: 'var(--shadow-glow)',
        }}>L</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>LicitaAI</span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: step === 3 ? 900 : 480,
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '40px 40px',
        transition: 'max-width 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <StepIndicator current={step} />

        {/* ── PASSO 1 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={submitStep1} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              Crie sua conta
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              Preencha seus dados para começar. Leva menos de 2 minutos.
            </p>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-name">Nome completo</label>
              <input id="reg-name" type="text" className="input" placeholder="Seu nome"
                value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-email">E-mail corporativo</label>
              <input id="reg-email" type="email" className="input" placeholder="seu@empresa.com.br"
                value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-password">Senha</label>
              <div style={{ position: 'relative' }}>
                <input id="reg-password" type={showPass ? 'text' : 'password'} className="input"
                  placeholder="Mínimo 8 caracteres" value={form.password}
                  onChange={(e) => set('password', e.target.value)} required
                  style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Medidor de força */}
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3].map((bar) => (
                      <div key={bar} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: strength.level >= bar ? strength.color : 'var(--color-bg-elevated)',
                        transition: 'background 0.3s ease',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-confirm">Confirmar senha</label>
              <input id="reg-confirm" type="password" className="input" placeholder="••••••••"
                value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <input id="accept-terms" type="checkbox" checked={form.acceptTerms}
                onChange={(e) => set('acceptTerms', e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--color-brand-500)', flexShrink: 0 }} />
              <span>
                Eu aceito os{' '}
                <a href="/termos" style={{ color: 'var(--color-brand-400)' }}>Termos de Uso</a>
                {' '}e a{' '}
                <a href="/privacidade" style={{ color: 'var(--color-brand-400)' }}>Política de Privacidade</a>
              </span>
            </label>

            {error && <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)' }}>⚠️ {error}</div>}

            <button id="btn-step1" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
              Continuar →
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Já tem conta?{' '}
              <a href="/login" style={{ color: 'var(--color-brand-400)', textDecoration: 'none' }}>Entrar</a>
            </p>
          </form>
        )}

        {/* ── PASSO 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                Dados da empresa
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Opcional, mas nos ajuda a personalizar sua experiência.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-company">Nome da empresa</label>
              <input id="reg-company" type="text" className="input" placeholder="Empresa Ltda."
                value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-cnpj">CNPJ</label>
              <input id="reg-cnpj" type="text" className="input" placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => set('cnpj', maskCNPJ(e.target.value))}
                maxLength={18} />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-segment">Segmento</label>
              <select id="reg-segment" className="input"
                value={form.segment} onChange={(e) => set('segment', e.target.value)}>
                <option value="">Selecione...</option>
                <option value="TI">Tecnologia da Informação</option>
                <option value="Construção">Construção Civil</option>
                <option value="Saúde">Saúde</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Serviços">Serviços Gerais</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="reg-role">Seu cargo</label>
              <select id="reg-role" className="input"
                value={form.jobRole} onChange={(e) => set('jobRole', e.target.value)}>
                <option value="">Selecione...</option>
                <option value="CEO">Dono / CEO</option>
                <option value="Diretor Comercial">Diretor Comercial</option>
                <option value="Analista">Analista de Licitações</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {error && <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)' }}>⚠️ {error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <button id="btn-step2" type="button" className="btn btn-primary btn-lg"
                onClick={() => submitStep2(false)} style={{ width: '100%' }}>
                Continuar →
              </button>
              <button id="btn-step2-skip" type="button"
                onClick={() => submitStep2(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 0' }}>
                Pular por agora
              </button>
            </div>
          </div>
        )}

        {/* ── PASSO 3 — ESCOLHA DO PLANO ──────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Escolha seu plano
              </h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                Comece grátis ou assine agora e acesse tudo desde o primeiro dia.
              </p>

              {/* Toggle mensal/anual */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 20, padding: '6px', background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <button id="toggle-monthly" type="button"
                  onClick={() => set('billingCycle', 'MONTHLY')}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: form.billingCycle === 'MONTHLY' ? 'var(--color-brand-600)' : 'transparent',
                    color: form.billingCycle === 'MONTHLY' ? 'white' : 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease',
                  }}>
                  Mensal
                </button>
                <button id="toggle-annual" type="button"
                  onClick={() => set('billingCycle', 'ANNUAL')}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: form.billingCycle === 'ANNUAL' ? 'var(--color-brand-600)' : 'transparent',
                    color: form.billingCycle === 'ANNUAL' ? 'white' : 'var(--color-text-secondary)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}>
                  Anual
                  <span style={{
                    position: 'absolute', top: -8, right: -8,
                    background: '#10b981', color: 'white',
                    fontSize: 9, fontWeight: 700, padding: '2px 5px',
                    borderRadius: 6,
                  }}>-17%</span>
                </button>
              </div>
            </div>

            {/* Cards de plano */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {Object.values(PLANS).map((plan) => {
                const planKey: PlanChoice = plan.key === 'STARTER_MONTHLY'
                  ? (form.billingCycle === 'MONTHLY' ? 'STARTER_MONTHLY' : 'STARTER_ANNUAL')
                  : plan.key === 'PRO_MONTHLY'
                    ? (form.billingCycle === 'MONTHLY' ? 'PRO_MONTHLY' : 'PRO_ANNUAL')
                    : plan.key as PlanChoice;

                const isPopular = plan.name === 'Starter';

                return (
                  <div key={plan.name} style={{
                    position: 'relative',
                    padding: '24px 20px',
                    background: isPopular ? 'rgba(37,99,235,0.06)' : 'var(--color-bg-elevated)',
                    border: `2px solid ${plan.borderColor}`,
                    borderRadius: 16,
                    display: 'flex', flexDirection: 'column', gap: 16,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 12px 40px ${plan.borderColor}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Badge */}
                    <div style={{
                      display: 'inline-block', padding: '3px 10px',
                      borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: isPopular ? 'var(--color-brand-600)' : 'rgba(255,255,255,0.06)',
                      color: isPopular ? 'white' : 'var(--color-text-secondary)',
                      alignSelf: 'flex-start',
                    }}>
                      {plan.badge}
                    </div>

                    {/* Nome e preço */}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                        {plan.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: isPopular ? 'var(--color-brand-400)' : 'var(--color-text-primary)' }}>
                          {plan.price[form.billingCycle]}
                        </span>
                        {plan.period && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{plan.period}</span>
                        )}
                      </div>
                      {'annualNote' in plan && form.billingCycle === 'ANNUAL' && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {(plan as typeof PLANS.STARTER).annualNote}
                        </div>
                      )}
                      {plan.name === 'Teste Grátis' && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>30 dias grátis</div>
                      )}
                    </div>

                    {/* Descrição */}
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {plan.description}
                    </p>

                    {/* Features */}
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      {plan.features.map((f) => (
                        <li key={f} style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span> {f}
                        </li>
                      ))}
                      {plan.limitations.map((f) => (
                        <li key={f} style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: '#6b7280', flexShrink: 0 }}>✕</span> {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      id={`btn-plan-${plan.key}`}
                      type="button"
                      disabled={isLoading}
                      onClick={() => submitStep3(planKey)}
                      style={{
                        padding: '12px 16px', borderRadius: 10,
                        border: isPopular ? 'none' : '1px solid var(--color-border)',
                        background: isPopular
                          ? 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))'
                          : 'transparent',
                        color: isPopular ? 'white' : 'var(--color-text-primary)',
                        fontSize: 13, fontWeight: 700,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%',
                      }}
                    >
                      {isLoading && form.planChoice === planKey ? '⏳ Aguarde...' : plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--color-danger)' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Responsividade: cards em coluna no mobile */}
            <style>{`
              @media (max-width: 768px) {
                .plan-grid { grid-template-columns: 1fr 1fr !important; }
              }
              @media (max-width: 480px) {
                .plan-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>
        )}

        {/* ── PASSO 4 — CONFIRMAR E-MAIL ──────────────────────────────────── */}
        {step === 4 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {/* Ícone animado */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(99,102,241,0.2))',
              border: '2px solid rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
              animation: 'pulse 2s infinite',
            }}>
              ✉️
            </div>

            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Confirme seu E-mail
              </h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 360 }}>
                Enviamos um link de ativação segura para o e-mail <strong style={{ color: 'var(--color-text-primary)' }}>{form.email}</strong>.
              </p>
            </div>

            <div style={{
              padding: '14px 20px',
              background: 'rgba(37,99,235,0.06)',
              border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 12,
              fontSize: 13, color: 'var(--color-text-secondary)',
              maxWidth: 360,
            }}>
              ✉️ Por favor, acesse sua caixa de entrada e clique no link para ativar sua conta e liberar o acesso completo ao dashboard. O link expira em 24 horas.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
              <button id="btn-goto-login" type="button" className="btn btn-primary btn-lg"
                onClick={() => { window.location.href = '/login'; }}
                style={{ width: '100%' }}>
                Voltar para o Login →
              </button>

              <button id="btn-resend" type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                style={{
                  background: 'none', border: '1px solid var(--color-border)', borderRadius: 10,
                  padding: '10px 16px', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: 13, color: resendCooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-brand-400)',
                }}>
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar e-mail de confirmação'}
              </button>
            </div>

            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0.2); }
                50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(37,99,235,0); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 11, color: 'var(--color-text-muted)' }}>
        🔒 Seus dados são protegidos com criptografia de ponta a ponta
      </p>
    </div>
  );
}
