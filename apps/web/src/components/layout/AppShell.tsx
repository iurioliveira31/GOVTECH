'use client';

import { useState } from 'react';
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
        <Topbar onMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="app-content animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
