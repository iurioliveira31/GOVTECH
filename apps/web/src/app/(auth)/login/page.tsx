'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      // erro exibido via store.error
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-4)',
            fontSize: 22, fontWeight: 900, color: 'white',
            boxShadow: 'var(--shadow-glow)',
          }}>
            L
          </div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            LicitaAI
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Inteligência em Licitações Públicas
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" htmlFor="password">Senha</label>
              <button
                type="button"
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-400)', background: 'none', cursor: 'pointer' }}
              >
                Esqueceu a senha?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: 14,
                }}
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-danger-bg)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Entrando...
              </>
            ) : (
              'Entrar na plataforma'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-muted)',
        }}>
          Dados públicos do PNCP — Portal Nacional de Contratações Públicas
        </div>
      </div>
    </div>
  );
}
