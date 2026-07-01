import Link from 'next/link';

export const metadata = {
  title: 'Planos | LicitaAI',
  description: 'Conheça nossos planos e comece a automatizar suas licitações públicas.',
};

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-base">
      <header className="app-topbar justify-between">
        <Link href="/" className="sidebar-logo hover:opacity-80 transition-opacity">
          <div className="sidebar-logo-icon">L</div>
          <div>
            <div className="sidebar-logo-text">LicitaAI</div>
            <div className="sidebar-logo-sub">GovTech</div>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="btn btn-ghost">Entrar</Link>
          <Link href="/register" className="btn btn-primary">Começar Grátis</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <h1 className="text-3xl font-bold text-primary mb-2">Nossos Planos</h1>
        <p className="text-secondary max-w-xl mb-12">
          Escolha o melhor plano para a sua empresa. Comece grátis por 7 dias.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {/* STARTER */}
          <div className="glass-card flex flex-col items-center p-8 text-center border border-border">
            <h3 className="text-xl font-bold text-primary mb-2">Starter</h3>
            <p className="text-sm text-secondary mb-4">Para autônomos e MEIs</p>
            <div className="text-3xl font-bold text-brand mb-6">
              R$ 97 <span className="text-sm font-medium text-muted">/mês</span>
            </div>
            <ul className="flex flex-col gap-3 text-sm text-left w-full mb-8">
              <li className="flex items-center gap-2"><span className="text-success">✔</span> 5 Alertas no WhatsApp</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> 10 Análises de IA/mês</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Histórico PNCP (3 meses)</li>
              <li className="flex items-center gap-2 text-muted"><span className="text-muted">✖</span> Inteligência de Mercado</li>
            </ul>
            <Link href="/register?plan=STARTER" className="btn btn-secondary w-full mt-auto">Começar Trial</Link>
          </div>

          {/* PRO */}
          <div className="glass-card flex flex-col items-center p-8 text-center border-2 border-brand relative shadow-lg">
            <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/2 badge badge-brand shadow-glow">Mais Popular</div>
            <h3 className="text-xl font-bold text-primary mb-2">Pro</h3>
            <p className="text-sm text-secondary mb-4">Para pequenas e médias empresas</p>
            <div className="text-3xl font-bold text-brand mb-6">
              R$ 297 <span className="text-sm font-medium text-muted">/mês</span>
            </div>
            <ul className="flex flex-col gap-3 text-sm text-left w-full mb-8">
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Alertas Ilimitados</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> 100 Análises de IA/mês</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Histórico PNCP Completo</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Inteligência de Mercado Básica</li>
            </ul>
            <Link href="/register?plan=PRO" className="btn btn-primary w-full mt-auto">Assinar Pro</Link>
          </div>

          {/* ENTERPRISE */}
          <div className="glass-card flex flex-col items-center p-8 text-center border border-border">
            <h3 className="text-xl font-bold text-primary mb-2">Enterprise</h3>
            <p className="text-sm text-secondary mb-4">Para grandes empresas</p>
            <div className="text-3xl font-bold text-brand mb-6">
              Sob Consulta
            </div>
            <ul className="flex flex-col gap-3 text-sm text-left w-full mb-8">
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Tudo do plano Pro</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Análises de IA Ilimitadas</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> Inteligência de Mercado Completa</li>
              <li className="flex items-center gap-2"><span className="text-success">✔</span> API Dedicada e Suporte SLA</li>
            </ul>
            <Link href="/register?plan=ENTERPRISE" className="btn btn-secondary w-full mt-auto">Falar com Vendas</Link>
          </div>
        </div>
      </main>

      <footer className="p-6 border-t border-strong text-center mt-auto">
        <p className="text-xs text-muted">© {new Date().getFullYear()} LicitaAI GovTech. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
