import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'LicitaAI — Inteligência em Licitações',
    template: '%s | LicitaAI',
  },
  description:
    'Plataforma GovTech para monitoramento, análise e inteligência de licitações e contratos públicos brasileiros via PNCP.',
  keywords: ['licitações', 'contratos públicos', 'PNCP', 'GovTech', 'compras governamentais'],
  robots: 'noindex, nofollow', // SaaS privado
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
