'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-main">
        <Suspense fallback={
          <header className="app-topbar">
            <div className="input-icon-wrapper" style={{ flex: 1, maxWidth: 480 }}>
              <span className="input-icon" style={{ fontSize: 14 }}>🔍</span>
              <input
                type="search"
                className="input"
                placeholder="Buscar licitações, contratos, fornecedores..."
                style={{ height: 36 }}
                disabled
              />
            </div>
          </header>
        }>
          <Topbar onMenuToggle={() => setMobileOpen((o) => !o)} />
        </Suspense>
        <main className="app-content animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
