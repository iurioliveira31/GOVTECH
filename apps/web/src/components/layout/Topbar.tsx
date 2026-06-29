'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent } from 'react';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSearch = searchParams.get('q') || '';

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = formData.get('q');
    if (q) {
      router.push(`/busca?q=${encodeURIComponent(q.toString())}`);
    }
  };

  return (
    <header className="app-topbar">
      {/* Hamburguer - visível apenas mobile */}
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="btn btn-ghost"
          aria-label="Abrir menu"
          style={{
            width: 36, height: 36, padding: 0,
            borderRadius: 'var(--radius-md)',
            display: 'none', // escondido por padrão, CSS mostra em mobile
            flexShrink: 0,
          }}
          id="mobile-menu-btn"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="4" x2="16" y2="4" />
            <line x1="2" y1="9" x2="16" y2="9" />
            <line x1="2" y1="14" x2="16" y2="14" />
          </svg>
        </button>
      )}

      {/* Search */}
      <form 
        className="input-icon-wrapper" 
        style={{ flex: 1, maxWidth: 480 }}
        onSubmit={handleSearch}
      >
        <span className="input-icon" style={{ fontSize: 14 }}>🔍</span>
        <input
          name="q"
          type="search"
          className="input"
          placeholder="Buscar licitações, contratos, fornecedores..."
          style={{ height: 36 }}
          defaultValue={defaultSearch}
        />
      </form>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Notifications */}
        <button
          className="btn btn-ghost"
          style={{ width: 36, height: 36, padding: 0, position: 'relative', borderRadius: 'var(--radius-md)' }}
          aria-label="Notificações"
        >
          <span style={{ fontSize: 16 }}>🔔</span>
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--color-danger)',
            border: '1.5px solid var(--color-bg-surface)',
          }} />
        </button>

        {/* Status badge — escondido em telas pequenas */}
        <div className="badge badge-success" style={{ gap: 6 }} id="api-status-badge">
          <span className="status-dot status-dot-success" />
          API Online
        </div>
      </div>
    </header>
  );
}
