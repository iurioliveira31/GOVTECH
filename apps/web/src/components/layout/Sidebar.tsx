'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';


const navItems = [
  {
    section: 'Principal',
    links: [
      { href: '/dashboard',    label: 'Dashboard',    icon: '⊞' },
      { href: '/busca',        label: 'Busca',        icon: '🔍' },
      { href: '/favoritos',    label: 'Favoritos',    icon: '⭐' },
      { href: '/alertas',      label: 'Alertas',      icon: '🔔' },
      { href: '/inteligencia', label: 'Inteligência', icon: '🎯' },
    ],
  },

  {
    section: 'Licitações',
    links: [
      { href: '/licitacoes', label: 'Licitações', icon: '🏛' },
      { href: '/contratos', label: 'Contratos', icon: '📋' },
      { href: '/atas', label: 'Atas de Preço', icon: '📌' },
    ],
  },
  {
    section: 'Entidades',
    links: [
      { href: '/orgaos', label: 'Órgãos', icon: '🏢' },
      { href: '/fornecedores', label: 'Fornecedores', icon: '🏭' },
    ],
  },
  {
    section: 'Sistema',
    links: [
      { href: '/analise',       label: 'Análise IA',      icon: '🤖' },
      { href: '/sincronizacao', label: 'Sincronização',   icon: '🔄' },
    ],
  },

];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside
        className="app-sidebar"
        style={{
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">L</div>
          <div style={{ flex: 1 }}>
            <div className="sidebar-logo-text">LicitaAI</div>
            <div className="sidebar-logo-sub">GovTech Platform</div>
          </div>
          {/* Fechar no mobile */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="btn btn-ghost"
              style={{ padding: '4px 6px', fontSize: 18, color: 'var(--color-text-muted)' }}
              aria-label="Fechar menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${isActive(link.href) ? 'active' : ''}`}
                  onClick={onMobileClose}
                >
                  <span className="sidebar-link-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {user?.nome?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{
                fontSize: 'var(--font-size-sm)', fontWeight: 600,
                color: 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.nome ?? 'Usuário'}
              </div>
              <div style={{
                fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email ?? ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="btn btn-ghost"
            style={{
              width: '100%', justifyContent: 'flex-start',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-danger)',
              gap: 'var(--space-2)',
            }}
          >
            <span>↩</span>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
