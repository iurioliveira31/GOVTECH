'use client';

import { useState, type FormEvent } from 'react';
import { authApi } from '@/lib/api/auth';

type Stage = 'request' | 'sent' | 'reset' | 'success';

function useSearchToken(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export default function RecuperarSenhaPage() {
  const token = useSearchToken();
  const [stage, setStage] = useState<Stage>(token ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setStage('sent');
    } catch {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('As senhas não coincidem.');
    if (password.length < 8) return setError('A senha deve ter ao menos 8 caracteres.');
    setIsLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token!, password);
      setStage('success');
    } catch {
      setError('Link inválido ou expirado. Solicite um novo e-mail.');
    } finally {
      setIsLoading(false);
    }
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
      <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, textDecoration: 'none' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 900, color: 'white', boxShadow: 'var(--shadow-glow)',
        }}>L</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>LicitaAI</span>
      </a>

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        padding: '40px 36px',
      }}>
        {/* ── Passo 1: Solicitar e-mail ── */}
        {stage === 'request' && (
          <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Recuperar senha
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="recover-email">E-mail cadastrado</label>
              <input
                id="recover-email"
                type="email"
                className="input"
                placeholder="seu@empresa.com.br"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                autoFocus
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)' }}>
                ⚠️ {error}
              </div>
            )}

            <button id="btn-recover" type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', marginTop: 4 }}>
              {isLoading ? '⏳ Enviando...' : 'Enviar link de recuperação'}
            </button>

            <a href="/login" style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-brand-400)', textDecoration: 'none' }}>
              ← Voltar ao login
            </a>
          </form>
        )}

        {/* ── Passo 2: E-mail enviado ── */}
        {stage === 'sent' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>✉️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              E-mail enviado!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Se <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong> estiver cadastrado, você receberá um link em breve.
            </p>
            <div style={{ padding: '12px 16px', background: 'var(--color-info-bg)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--color-info)', width: '100%' }}>
              💡 Verifique também a pasta de spam.
            </div>
            <a href="/login" className="btn btn-primary btn-lg" id="btn-back-login" style={{ width: '100%', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Voltar ao login
            </a>
          </div>
        )}

        {/* ── Passo 3: Nova senha ── */}
        {stage === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Criar nova senha
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Digite e confirme sua nova senha abaixo.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="new-password">Nova senha</label>
              <input id="new-password" type="password" className="input" placeholder="Mínimo 8 caracteres"
                value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required minLength={8} autoFocus />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirm-password">Confirmar nova senha</label>
              <input id="confirm-password" type="password" className="input" placeholder="Repita a senha"
                value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                required />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)' }}>
                ⚠️ {error}
              </div>
            )}

            <button id="btn-reset" type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', marginTop: 4 }}>
              {isLoading ? '⏳ Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {/* ── Passo 4: Sucesso ── */}
        {stage === 'success' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Senha atualizada!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Sua senha foi redefinida com sucesso. Faça login para continuar.
            </p>
            <a href="/login" id="btn-go-login" className="btn btn-primary btn-lg"
              style={{ width: '100%', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Entrar na plataforma →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
