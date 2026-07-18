'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';


const navItems = [
  {
    section: 'Principal',
    links: [
      { href: '/dashboard',    label: 'Dashboard',    icon: '⊞' },
      { href: '/busca',        label: 'Busca PNCP',   icon: '🔍' },
      { href: '/favoritos',    label: 'Favoritos',    icon: '⭐' },
      { href: '/alertas',      label: 'Alertas',      icon: '🔔' },
      { href: '/inteligencia', label: 'Inteligência', icon: '🎯' },
      { href: '/resolucoes',   label: 'Resoluções SES', icon: '📄' },

    ],
  },

  {
    section: 'Licitações',
    links: [
      { href: '/licitacoes', label: 'Licitações', icon: '🏛' },
      { href: '/contratos', label: 'Contratos', icon: '📋' },
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
      { href: '/conta',         label: 'Minha Conta',     icon: '👤' },
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
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gavelGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="100%" stopColor="#8A2BE2" />
                </linearGradient>
              </defs>
              <path d="M14 13.9997L10 17.9997L4.5 12.4997L8.5 8.49974L14 13.9997Z" stroke="url(#gavelGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.5 8.49976L11 5.99976L16.5 11.4998L14 13.9998" stroke="url(#gavelGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 15L20 20" stroke="url(#gavelGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="19" cy="5" r="1.5" fill="#00F0FF" />
              <circle cx="21" cy="9" r="1" fill="#8A2BE2" />
              <path d="M17 7L18.5 5.5" stroke="#00F0FF" strokeWidth="1" strokeLinecap="round"/>
              <path d="M18.5 10.5L20 9.5" stroke="#8A2BE2" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, paddingLeft: 4 }}>
            <div className="sidebar-logo-text" style={{ 
              background: 'linear-gradient(90deg, #FFFFFF 0%, #d8b4fe 100%)', 
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', 
              fontWeight: 800, letterSpacing: '0.02em', fontSize: '1.25rem' 
            }}>LICITA AI</div>
            <div className="sidebar-logo-sub" style={{ 
              color: '#00F0FF', letterSpacing: '0.05em', fontSize: '0.55rem', 
              fontWeight: 700, textTransform: 'uppercase' 
            }}>Inteligência em Licitações</div>
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
              width: 34, height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-brand-700), var(--color-brand-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
              boxShadow: '0 0 12px rgba(59,130,246,0.3), 0 2px 6px rgba(0,0,0,0.3)',
              border: '1px solid rgba(59,130,246,0.3)',
            }}>
              {user?.nome?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{
                fontSize: 'var(--font-size-sm)', fontWeight: 600,
                color: 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
              }}>
                {user?.nome ?? 'Usuário'}
              </div>
              <div style={{
                fontSize: 'var(--font-size-xs)', color: 'rgba(148,163,184,0.6)',
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
              color: 'rgba(239,68,68,0.7)',
              gap: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-danger)'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.7)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span>↩</span>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
