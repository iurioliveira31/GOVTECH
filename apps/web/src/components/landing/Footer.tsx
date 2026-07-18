'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#050811] border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Col */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gavelGradientFooter" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00F0FF" />
                    <stop offset="100%" stopColor="#8A2BE2" />
                  </linearGradient>
                </defs>
                <path d="M14 13.9997L10 17.9997L4.5 12.4997L8.5 8.49974L14 13.9997Z" stroke="url(#gavelGradientFooter)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 8.49976L11 5.99976L16.5 11.4998L14 13.9998" stroke="url(#gavelGradientFooter)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 15L20 20" stroke="url(#gavelGradientFooter)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="19" cy="5" r="1.5" fill="#00F0FF" />
                <circle cx="21" cy="9" r="1" fill="#8A2BE2" />
              </svg>
              <span className="font-extrabold text-lg tracking-tight text-white">
                LICITA AI
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              Inteligência em Licitações Públicas. A plataforma definitiva para quem deseja escalar vendas para o governo com previsibilidade e segurança.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">
                <span className="sr-only">LinkedIn</span>
                {/* Ícone Genérico in */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Plataforma</h4>
            <ul className="flex flex-col gap-2">
              <li><Link href="#solucao" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Recursos</Link></li>
              <li><Link href="#planos" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Preços</Link></li>
              <li><Link href="/cadastro" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Teste Grátis</Link></li>
              <li><Link href="/login" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Login</Link></li>
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="text-white font-bold mb-4">Empresa</h4>
            <ul className="flex flex-col gap-2">
              <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Sobre nós</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Contato</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">Política de Privacidade</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} LicitaAI GovTech. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Desenvolvido no Brasil</span> 🇧🇷
          </div>
        </div>
      </div>
    </footer>
  );
}
