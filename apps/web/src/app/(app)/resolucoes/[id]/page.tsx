import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Detalhes da Resolução | LicitaAL',
};

export const dynamic = 'force-dynamic';

async function getResolutionDetails(id: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  try {
    const res = await fetch(`${apiUrl}/resolutions/${id}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default async function ResolucaoDetalhesPage({ params }: { params: { id: string } }) {
  const resolution = await getResolutionDetails(params.id);

  if (!resolution) {
    return (
      <div className="animate-fadeIn">
        <div className="empty-state">
          <div className="empty-icon">🚫</div>
          <h3 className="empty-title">Resolução não encontrada</h3>
          <p className="empty-desc">Esta resolução não existe ou ainda não foi processada.</p>
          <Link href="/resolucoes" className="btn btn-primary mt-4">
            Voltar para a Lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn max-w-6xl mx-auto space-y-6">
      {/* HEADER BREADCRUMB E AÇÕES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-sm text-gray-500 mb-1 flex items-center gap-2">
            <Link href="/resolucoes" className="hover:text-primary transition-colors">Resoluções</Link>
            <span>/</span>
            <span>Detalhes</span>
          </div>
          <h1 className="page-title text-3xl">{resolution.numero}</h1>
          <p className="page-subtitle text-[var(--text-muted)] mt-1">
            Publicada em: {resolution.dataPublicacao ? new Date(resolution.dataPublicacao).toLocaleDateString('pt-BR') : 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={resolution.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Baixar PDF Original
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA - MAIOR - CONTEUDO E TABELA */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* RESUMO DA IA */}
          <div className="card border-l-4 border-l-primary relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            
            <div className="card-header pb-2 border-none">
              <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--text-main)]">
                <span className="bg-primary/10 text-primary p-1.5 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </span>
                Resumo por IA
              </h2>
            </div>
            <div className="p-5 pt-0">
              <p className="text-[var(--text-muted)] leading-relaxed text-sm md:text-base">
                {resolution.resumoIa || 'Nenhum resumo gerado ainda.'}
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {resolution.tags?.map((tag: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* TABELA DE MUNICIPIOS */}
          <div className="card">
            <div className="card-header border-b border-[var(--border-color)]">
              <h2 className="card-title text-[var(--text-main)]">Municípios Beneficiados</h2>
            </div>
            
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table w-full text-sm">
                <thead className="sticky top-0 bg-[var(--card-bg)] z-10 shadow-sm">
                  <tr>
                    <th className="py-3 text-left">Mesorregião</th>
                    <th className="py-3 text-left">Município</th>
                    <th className="py-3 text-left">Local / Instituição</th>
                    <th className="py-3 text-right">Valor Repassado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {resolution.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="py-3 text-[var(--text-muted)]">{item.mesoregiao}</td>
                      <td className="py-3 font-medium text-[var(--text-main)]">{item.municipio}</td>
                      <td className="py-3 text-[var(--text-muted)]">{item.local || item.item}</td>
                      <td className="py-3 text-right font-bold text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valor))}
                      </td>
                    </tr>
                  ))}
                  
                  {(!resolution.items || resolution.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                        Nenhum detalhe de repasse extraído para esta resolução.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA - MENOR - SIDEBAR COM META DADOS */}
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-[var(--card-bg)] to-[var(--bg-hover)] border border-[var(--border-color)]">
            <div className="p-6">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Valor Total Repassado</h3>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                {resolution.valorTotal 
                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(resolution.valorTotal))
                  : 'N/A'}
              </div>
              
              <div className="mt-6 pt-6 border-t border-[var(--border-color)] space-y-4">
                <div>
                  <h4 className="text-xs text-[var(--text-muted)] mb-1">Status do Processamento</h4>
                  <div className="flex items-center gap-2">
                    <span className="status-dot status-dot-success"></span>
                    <span className="text-sm font-medium text-[var(--text-main)]">{resolution.status}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs text-[var(--text-muted)] mb-1">Data de Captura</h4>
                  <p className="text-sm font-medium text-[var(--text-main)]">
                    {new Date(resolution.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs text-[var(--text-muted)] mb-1">Fonte Original</h4>
                  <a href={resolution.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand hover:underline flex items-center gap-1">
                    Diário Oficial / SES-MG
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="bg-primary/20 p-2 rounded-lg text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-1">Dica LicitaAL</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Utilize os dados extraídos acima para cruzar com seu sistema de licitações local e prever demandas de prefeituras.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
