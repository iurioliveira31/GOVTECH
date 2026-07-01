'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth';
import {
  getTrialDaysRemaining,
  hasActiveAccess,
  getMaxAlerts,
  getMaxSavedSearches,
} from '@/lib/subscription';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  TRIALING:  { label: 'Trial ativo',       color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  icon: '🔵' },
  ACTIVE:    { label: 'Ativo',             color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '✅' },
  PAST_DUE:  { label: 'Pagamento pendente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⚠️' },
  CANCELED:  { label: 'Cancelado',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
  EXPIRED:   { label: 'Expirado',          color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '🔒' },
};

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Teste Grátis',
  STARTER: 'Starter',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export default function ContaPage() {
  const { user, subscription, logout } = useAuthStore();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingLogout, setIsLoadingLogout] = useState(false);
  const [portalError, setPortalError] = useState('');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', telefone: '' });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const { updateUser } = useAuthStore.getState();
      const updatedData = await authApi.updateMe(editForm);
      updateUser(updatedData);
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Erro ao atualizar perfil', err);
      alert('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const sub = subscription;
  const statusInfo = STATUS_LABELS[sub?.status ?? ''] ?? STATUS_LABELS.EXPIRED;
  const trialDays = getTrialDaysRemaining(sub);
  const isActive = hasActiveAccess(sub);

  const maxAlerts = getMaxAlerts(sub);
  const maxSearches = getMaxSavedSearches(sub);

  const periodEnd = sub?.currentPeriodEnd ?? sub?.trialEndsAt;
  const formattedPeriodEnd = periodEnd
    ? new Date(periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const handlePortal = async () => {
    setIsLoadingPortal(true);
    setPortalError('');
    try {
      const { portalUrl } = await authApi.createCheckout('portal') as unknown as { portalUrl: string };
      window.location.href = portalUrl;
    } catch {
      try {
        // fallback: usar a rota de portal diretamente
        const res = await fetch('/api/subscriptions/portal', { method: 'POST' });
        const data = await res.json();
        if (data.portalUrl) { window.location.href = data.portalUrl; return; }
      } catch { /* silent */ }
      setPortalError('Erro ao abrir o portal. Contate suporte@licitaai.com.br');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleLogout = async () => {
    setIsLoadingLogout(true);
    await logout();
  };

  return (
    <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
          Minha Conta
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Gerencie sua assinatura, plano e informações pessoais.
        </p>
      </div>

      {/* ── Seção: Perfil ──────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            👤 Informações pessoais
          </h2>
          {!isEditingProfile && (
            <button onClick={() => {
              setEditForm({ nome: user?.nome || '', telefone: user?.telefone || '' });
              setIsEditingProfile(true);
            }} style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Editar
            </button>
          )}
        </div>
        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Nome</label>
              <input type="text" value={editForm.nome} onChange={(e) => setEditForm(s => ({ ...s, nome: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Telefone (WhatsApp) com DDD</label>
              <input type="text" value={editForm.telefone} onChange={(e) => setEditForm(s => ({ ...s, telefone: e.target.value }))} placeholder="Ex: (11) 99999-9999"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button type="submit" disabled={isSavingProfile}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--color-brand-600)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                {isSavingProfile ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setIsEditingProfile(false)}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Nome', value: user?.nome },
              { label: 'Telefone', value: user?.telefone || 'Não cadastrado' },
              { label: 'E-mail', value: user?.email },
              { label: 'Função', value: user?.role },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{value ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Seção: Assinatura ───────────────────────────────────────────── */}
      <section style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '24px',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            💳 Assinatura
          </h2>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: statusInfo.bg, color: statusInfo.color,
          }}>
            {statusInfo.icon} {statusInfo.label}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Plano */}
          <div style={{ padding: 16, background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plano</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {PLAN_LABELS[sub?.plan ?? ''] ?? sub?.plan ?? '—'}
            </div>
          </div>

          {/* Renovação / Expiração */}
          <div style={{ padding: 16, background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {sub?.status === 'TRIALING' ? 'Trial expira em' : 'Próxima cobrança'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: sub?.status === 'PAST_DUE' ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
              {trialDays !== null
                ? `${trialDays} dia${trialDays !== 1 ? 's' : ''}`
                : formattedPeriodEnd ?? '—'}
            </div>
          </div>

          {/* Alertas */}
          <div style={{ padding: 16, background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alertas/dia</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {maxAlerts === Infinity ? '∞' : maxAlerts === 0 ? '—' : maxAlerts}
            </div>
          </div>

          {/* Buscas salvas */}
          <div style={{ padding: 16, background: 'var(--color-bg-elevated)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buscas salvas</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {maxSearches === Infinity ? '∞' : maxSearches === 0 ? '—' : maxSearches}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isActive && sub?.status !== 'TRIALING' && (
            <button id="btn-manage-billing" type="button"
              onClick={handlePortal}
              disabled={isLoadingPortal}
              style={{
                padding: '12px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))',
                border: 'none', color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: isLoadingPortal ? 0.7 : 1,
              }}>
              {isLoadingPortal ? '⏳ Abrindo portal...' : '💳 Gerenciar assinatura e faturas'}
            </button>
          )}

          {(sub?.status === 'TRIALING' || sub?.status === 'EXPIRED' || sub?.status === 'CANCELED') && (
            <a id="btn-upgrade" href="/onboarding/plano"
              style={{
                display: 'block', textAlign: 'center',
                padding: '12px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))',
                color: 'white', textDecoration: 'none',
                fontSize: 14, fontWeight: 700,
              }}>
              🚀 {sub?.status === 'TRIALING' ? 'Fazer upgrade de plano' : 'Reativar assinatura'}
            </a>
          )}

          {sub?.status === 'PAST_DUE' && (
            <button id="btn-fix-payment" type="button"
              onClick={handlePortal}
              disabled={isLoadingPortal}
              style={{
                padding: '12px 20px', borderRadius: 10,
                background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.3)',
                color: 'var(--color-danger)', fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
              }}>
              ⚠️ Atualizar forma de pagamento
            </button>
          )}

          {portalError && (
            <p style={{ fontSize: 12, color: 'var(--color-danger)', textAlign: 'center' }}>
              {portalError}
            </p>
          )}
        </div>
      </section>

      {/* ── Seção: Segurança ───────────────────────────────────────────── */}
      <section style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '24px',
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 20 }}>
          🔐 Segurança
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Senha</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Altere sua senha a qualquer momento</div>
          </div>
          <a id="btn-change-password" href="/recuperar-senha"
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: 13, textDecoration: 'none',
            }}>
            Alterar senha
          </a>
        </div>
      </section>

      {/* ── Logout ────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: 8 }}>
        <button id="btn-logout" type="button"
          onClick={handleLogout}
          disabled={isLoadingLogout}
          style={{
            background: 'none', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 20px',
            color: 'var(--color-danger)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', width: '100%',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          {isLoadingLogout ? 'Saindo...' : '← Sair da conta'}
        </button>
      </div>
    </div>
  );
}
