import Link from 'next/link';

export const metadata = {
  title: 'LicitaAI | Inteligência em Licitações',
  description: 'A plataforma definitiva para automatizar buscas no PNCP, gerar análises de risco de contratos públicos e monitorar fornecedores concorrentes.',
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-base">
      <header className="app-topbar justify-between">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">L</div>
          <div>
            <div className="sidebar-logo-text">LicitaAI</div>
            <div className="sidebar-logo-sub">GovTech</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="btn btn-ghost">Planos</Link>
          <Link href="/login" className="btn btn-ghost">Entrar</Link>
          <Link href="/register" className="btn btn-primary">Começar Grátis</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6 animate-fadeIn">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 mt-16 mb-16">
          <div className="badge badge-brand mb-4">🚀 A revolução nas licitações públicas</div>
          <h1 className="text-3xl font-bold text-primary mb-4" style={{ fontSize: '3rem', lineHeight: 1.1 }}>
            Inteligência Artificial para Vencer <span className="text-brand">Licitações</span>
          </h1>
          <p className="text-lg text-secondary max-w-2xl">
            Acompanhe o PNCP em tempo real, receba alertas no WhatsApp, analise riscos de editais e monitore a concorrência com o poder da IA.
          </p>
          <div className="flex items-center gap-4 mt-8">
            <Link href="/register" className="btn btn-primary btn-lg">Criar Conta Grátis</Link>
            <Link href="/dashboard" className="btn btn-secondary btn-lg">Acessar Sistema</Link>
          </div>
        </div>

        <section className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass-card p-6 flex flex-col gap-3">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="text-lg font-bold text-primary">Alertas em Tempo Real</h3>
            <p className="text-sm text-secondary">Seja o primeiro a saber quando um edital do seu segmento for publicado no PNCP.</p>
          </div>
          <div className="glass-card p-6 flex flex-col gap-3">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="text-lg font-bold text-primary">Análise de IA</h3>
            <p className="text-sm text-secondary">A IA lê o edital, avalia os riscos e faz um resumo dos requisitos essenciais em segundos.</p>
          </div>
          <div className="glass-card p-6 flex flex-col gap-3">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="text-lg font-bold text-primary">Inteligência de Mercado</h3>
            <p className="text-sm text-secondary">Saiba quem são os fornecedores que mais ganham e qual a média de preços praticada no mercado.</p>
          </div>
        </section>
      </main>

      <footer className="p-6 border-t border-strong text-center mt-auto">
        <p className="text-xs text-muted">© {new Date().getFullYear()} LicitaAI GovTech. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
