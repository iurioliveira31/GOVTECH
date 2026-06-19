'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

// ── Métricas de prova social ──────────────────────────────────────────────────
const METRICS = [
  { value: 'R$ 2,3 bi', label: 'em contratos analisados' },
  { value: '4.800+', label: 'empresas ativas' },
  { value: '87%', label: 'de precisão preditiva' },
];

import { Suspense } from 'react';

function LoginContent() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [shake, setShake] = useState(false);

  // Limpar erro quando o usuário digita
  useEffect(() => { if (error) clearError(); }, [email, password]); // eslint-disable-line

  // Efeito shake no erro
  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.push(redirect);
    } catch {
      // erro exibido via store.error
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--color-bg-base)',
    }}
      className="login-split"
    >
      {/* ── LADO ESQUERDO — Prova Social ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1629 0%, #1a2545 50%, #0d1831 100%)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow decorativo */}
        <div style={{
          position: 'absolute', top: -100, left: -100,
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo mark */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: 'white',
            boxShadow: 'var(--shadow-glow)',
            marginBottom: 32,
          }}>L</div>

          <h1 style={{
            fontSize: 36, fontWeight: 800,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}>
            Vença mais licitações<br />
            <span style={{ color: 'var(--color-brand-400)' }}>com inteligência de dados</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Monitoramento em tempo real do PNCP, score preditivo de vitória e análise orçamentária automatizada.
          </p>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
          {METRICS.map((m) => (
            <div key={m.value} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{
                fontSize: 22, fontWeight: 800,
                color: 'var(--color-brand-400)',
                minWidth: 80,
              }}>{m.value}</span>
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{m.label}</span>
            </div>
          ))}
        </div>

        {/* Depoimento */}
        <div style={{
          padding: '20px 24px',
          background: 'rgba(37,99,235,0.08)',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: 14,
        }}>
          <p style={{
            fontSize: 14, color: 'var(--color-text-secondary)',
            lineHeight: 1.7, fontStyle: 'italic', marginBottom: 12,
          }}>
            &ldquo;Antes levávamos horas pesquisando editais. Com o LicitaAI, recebemos alertas certeiros e nossa taxa de vitória subiu <strong style={{ color: 'var(--color-success)' }}>34%</strong> em 3 meses.&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white',
            }}>C</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Carlos Mendes
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Diretor Comercial — Construtora Meridional
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LADO DIREITO — Formulário ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '64px 48px',
        background: 'var(--color-bg-surface)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
              borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 22, fontWeight: 900, color: 'white',
              boxShadow: 'var(--shadow-glow)',
            }}>L</div>
            <h2 style={{
              fontSize: 24, fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}>LicitaAI</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Inteligência em Licitações Públicas
            </p>
          </div>

          {/* Formulário */}
          <form
            id="login-form"
            onSubmit={handleSubmit}
            style={{
              display: 'flex', flexDirection: 'column', gap: 16,
              animation: shake ? 'shake 0.4s ease' : undefined,
            }}
          >
            {/* Email */}
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email corporativo</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="seu@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Senha */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" htmlFor="login-password">Senha</label>
                <a
                  href="/recuperar-senha"
                  style={{
                    fontSize: 12, color: 'var(--color-brand-400)',
                    textDecoration: 'none',
                  }}
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: 16,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Lembrar */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)',
            }}>
              <input
                id="remember-me"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--color-brand-500)', width: 15, height: 15 }}
              />
              Lembrar por 30 dias
            </label>

            {/* Erro */}
            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'var(--color-danger-bg)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--color-danger)',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Botão */}
            <button
              id="btn-login"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
              style={{ width: '100%', marginTop: 4, position: 'relative' }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ marginRight: 8 }} />
                  Entrando...
                </>
              ) : (
                'Entrar na plataforma'
              )}
            </button>
          </form>

          {/* Divisor */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '24px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* CTA Cadastro */}
          <a
            id="link-cadastro"
            href="/cadastro"
            style={{
              display: 'block', textAlign: 'center',
              padding: '12px 24px',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              fontSize: 14, color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-brand-500)';
              e.currentTarget.style.color = 'var(--color-brand-400)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            Não tem conta? <strong>Iniciar teste grátis →</strong>
          </a>

          {/* Footer */}
          <p style={{
            marginTop: 32, textAlign: 'center',
            fontSize: 11, color: 'var(--color-text-muted)',
          }}>
            🔒 Dados públicos do PNCP — Portal Nacional de Contratações Públicas
          </p>
        </div>
      </div>

      {/* Responsividade mobile */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @media (max-width: 768px) {
          .login-split {
            grid-template-columns: 1fr !important;
          }
          .login-split > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
