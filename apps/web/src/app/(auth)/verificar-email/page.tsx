'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [errorMessage, setErrorMessage] = useState('');
  const hasRequested = useRef(false);

  useEffect(() => {
    if (hasRequested.current) return;
    hasRequested.current = true;

    if (!token) {
      setStatus('ERROR');
      setErrorMessage('Token de verificação não encontrado na URL.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('SUCCESS');
      })
      .catch((err: any) => {
        setStatus('ERROR');
        const msg =
          err.response?.data?.error?.message ??
          err.response?.data?.message ??
          'Falha na validação do token.';
        setErrorMessage(msg);
      });
  }, [token]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 24,
        padding: 40,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-400))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 900,
            color: 'white',
          }}
        >
          L
        </div>
        <span style={{ fontSize: 18, fontWeight: 800 }}>LicitaAI</span>
      </div>

      {/* LOADING STATE */}
      {status === 'LOADING' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div className="spinner" />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Validando seu e-mail</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Aguarde alguns segundos enquanto processamos sua ativação segura.
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS STATE */}
      {status === 'SUCCESS' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: '#10b981',
              animation: 'scaleUp 0.3s ease-out',
            }}
          >
            ✓
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#10b981' }}>E-mail Confirmado!</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Sua e-mail corporativo foi confirmado com sucesso. Agora você possui acesso total e irrestrito ao painel de inteligência de verbas.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 20px', borderRadius: 12, marginTop: 8 }}
          >
            Ir para o Dashboard →
          </button>
        </div>
      )}

      {/* ERROR STATE */}
      {status === 'ERROR' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: '#ef4444',
            }}
          >
            ✕
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#ef4444' }}>
              Erro de Validação
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              {errorMessage}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            <button
              onClick={() => router.push('/login')}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px 20px', borderRadius: 12 }}
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        color: 'var(--color-text-primary)',
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 24,
              padding: 40,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div className="spinner" />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Carregando...</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Preparando verificação segura de e-mail.
              </p>
            </div>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>

      <style>{`
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-border);
          border-top-color: var(--color-brand-500);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scaleUp {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
