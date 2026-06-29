'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { pncpApi, type FiltroFornecedor } from '@/lib/api/pncp';
import { intelligenceApi } from '@/lib/api/intelligence';
import { formatCnpj, formatCurrency } from '@/lib/utils/format';

type ViewMode = 'todos' | 'vencedores';
type SubTab = 'players' | 'market';

const SEGMENTOS = [
  { id: 'saude', label: 'Saúde 🩺' },
  { id: 'educacao', label: 'Educação 🎓' },
  { id: 'tecnologia', label: 'Tecnologia 💻' },
  { id: 'construcao', label: 'Construção 🏗️' },
];

const PERIODOS = [
  { label: '2025 - 2026', anoInicio: 2025, anoFim: 2026 },
  { label: '2024', anoInicio: 2024, anoFim: 2024 },
  { label: '2023', anoInicio: 2023, anoFim: 2023 },
];

export default function FornecedoresPage() {
  const [mode, setMode] = useState<ViewMode>('vencedores'); // inicia na tela solicitada
  const [subTab, setSubTab] = useState<SubTab>('players');
  
  // Estados para aba "Todos os Fornecedores"
  const [filtros, setFiltros] = useState<FiltroFornecedor>({ pagina: 1, limite: 20 });
  const [searchInput, setSearchInput] = useState('');

  // Estados para aba "Vencedores"
  const [segmento, setSegmento] = useState('saude');
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const [cnpjConcorrenteInput, setCnpjConcorrenteInput] = useState('');
  const [cnpjConcorrenteBusca, setCnpjConcorrenteBusca] = useState('');

  // Query 1: Todos os fornecedores
  const { data: todosData, isLoading: loadingTodos, isFetching: fetchingTodos } = useQuery({
    queryKey: ['fornecedores', filtros],
    queryFn: () => pncpApi.listarFornecedores(filtros),
    placeholderData: (prev) => prev,
    enabled: mode === 'todos',
  });

  // Query 2: Fornecedores Vencedores
  const selectedPeriodo = PERIODOS[periodoIdx];
  const { data: vencedoresData, isLoading: loadingVencedores } = useQuery({
    queryKey: ['fornecedores-vencedores', segmento, selectedPeriodo.anoInicio, selectedPeriodo.anoFim, cnpjConcorrenteBusca],
    queryFn: () => intelligenceApi.getFornecedoresVencedores({
      segmento,
      anoInicio: selectedPeriodo.anoInicio,
      anoFim: selectedPeriodo.anoFim,
      cnpjConcorrente: cnpjConcorrenteBusca || undefined
    }),
    enabled: mode === 'vencedores',
  });

  const handleSearchTodos = () => {
    setFiltros((p) => ({ ...p, pagina: 1, q: searchInput || undefined }));
  };

  const handleSearchConcorrente = (e: React.FormEvent) => {
    e.preventDefault();
    setCnpjConcorrenteBusca(cnpjConcorrenteInput);
  };

  const totalPagesTodos = todosData?.totalPaginas ?? 1;
  const maxValor = Math.max(...(vencedoresData?.fornecedores.map(f => f.valorTotal) ?? [1]));

  return (
    <>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Análise de Fornecedores</h1>
          <p className="page-subtitle">
            Consulte fornecedores cadastrados ou analise o market share e concorrência por segmento de mercado
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`btn ${mode === 'vencedores' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('vencedores')}
          >
            🥇 Vencedores & Concorrência
          </button>
          <button
            className={`btn ${mode === 'todos' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('todos')}
          >
            🏭 Lista Geral
          </button>
        </div>
      </div>

      {/* ─── ABA: VENCEDORES E MARKET SHARE (ESTILO I-VERBAS) ────────────────── */}
      {mode === 'vencedores' && (
        <>
          {/* Barra de Filtros do Segmento */}
          <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, flexWrap: 'wrap' }}>
              <select
                className="input"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                style={{ minWidth: 160 }}
                id="select-segmento"
              >
                {SEGMENTOS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              <select
                className="input"
                value={periodoIdx}
                onChange={(e) => setPeriodoIdx(Number(e.target.value))}
                style={{ minWidth: 140 }}
                id="select-periodo"
              >
                {PERIODOS.map((p, idx) => (
                  <option key={p.label} value={idx}>{p.label}</option>
                ))}
              </select>
            </div>
            
            <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center' }}>
              Dados de contratos públicos federais
            </div>
          </div>

          {/* Encontre seus concorrentes */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                🔍 Encontre seus concorrentes
              </h3>
              <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                Informe seu CNPJ para se comparar com os maiores concorrentes do segmento {segmento.toUpperCase()}
              </p>
              
              <form onSubmit={handleSearchConcorrente} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Digite o CNPJ da sua empresa..."
                  value={cnpjConcorrenteInput}
                  onChange={(e) => setCnpjConcorrenteInput(e.target.value)}
                  style={{ flex: 1 }}
                  id="cnpj-concorrente"
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
                  Buscar Concorrente
                </button>
              </form>
            </div>
          </div>

          {/* Título da Seção Dinâmico */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                🏆 Fornecedores Vencedores - {segmento.charAt(0).toUpperCase() + segmento.slice(1)}
              </h2>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Top {vencedoresData?.fornecedores.length ?? 0} fornecedores no segmento
              </p>
            </div>
            
            {/* Sub-abas: Top Players / Market Share */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 2 }}>
              <button
                className={`btn btn-sm ${subTab === 'players' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setSubTab('players')}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                👥 Top Players
              </button>
              <button
                className={`btn btn-sm ${subTab === 'market' ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setSubTab('market')}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                📊 Market Share
              </button>
            </div>
          </div>

          {/* Lista de Vencedores */}
          {loadingVencedores ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : !vencedoresData?.fornecedores.length ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p className="text-muted">Nenhum contrato encontrado para este segmento neste período.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 40 }}>
              {/* Gráficos de Market Share se selecionado */}
              {subTab === 'market' && (
                <div className="card animate-fade-in" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
                    Fatia de Mercado (Market Share)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {vencedoresData.fornecedores.map((f, i) => (
                      <div key={f.cnpj} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 60px', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <span className="text-xs text-secondary text-ellipsis" style={{ fontWeight: 600 }}>{f.razaoSocial}</span>
                        <div style={{ height: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${f.marketShare}%`,
                            background: f.isConcorrente 
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                              : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            borderRadius: 4
                          }} />
                        </div>
                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: f.isConcorrente ? '#f59e0b' : '#818cf8', textAlign: 'right' }}>
                          {f.marketShare}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista dos Cards de Fornecedores */}
              {vencedoresData.fornecedores.map((forn, index) => {
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;
                const pct = maxValor > 0 ? (forn.valorTotal / maxValor) * 100 : 0;

                const medal = isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : '🏅';
                const rankColor = isTop1 ? '#f59e0b' : isTop2 ? '#94a3b8' : isTop3 ? '#b45309' : 'var(--color-text-secondary)';

                return (
                  <div
                    key={forn.cnpj}
                    style={{
                      border: forn.isConcorrente 
                        ? '2px solid #f59e0b' 
                        : '1px solid var(--color-border)',
                      borderRadius: 12,
                      padding: 'var(--space-4) var(--space-5)',
                      background: forn.isConcorrente 
                        ? 'rgba(245, 158, 11, 0.05)' 
                        : 'rgba(255,255,255,0.015)',
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr auto',
                      gap: 'var(--space-4)',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Rank */}
                    <div style={{ fontSize: 24, display: 'flex', justifyContent: 'center' }}>
                      {medal}
                    </div>

                    {/* Dados */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
                          {forn.razaoSocial}
                        </span>
                        {forn.isConcorrente && (
                          <span className="badge badge-warning" style={{ fontSize: 9, padding: '2px 6px' }}>
                            SUA EMPRESA (CONCORRENTE)
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', margin: '4px 0 8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          CNPJ: {formatCnpj(forn.cnpj)}
                        </span>
                        <span className="text-xs text-muted">•</span>
                        <span className="text-xs" style={{ fontWeight: 600, color: 'var(--color-brand-400)' }}>
                          {forn.totalContratos} contratos
                        </span>
                      </div>
                      
                      {/* Estados de atuação */}
                      {forn.estados && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: 'var(--color-text-muted)' }}>
                          <span>📍 Operação:</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>{forn.estados}</span>
                        </div>
                      )}

                      {/* Barra de Progresso do Valor */}
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, marginTop: 10, width: '100%', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: forn.isConcorrente ? '#f59e0b' : '#3b82f6',
                          borderRadius: 3
                        }} />
                      </div>
                    </div>

                    {/* Valores e Share */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
                        {formatCurrency(forn.valorTotal)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                        <span className="badge" style={{
                          background: forn.isConcorrente ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: forn.isConcorrente ? '#f59e0b' : '#10b981',
                          fontWeight: 700, fontSize: 11
                        }}>
                          {forn.marketShare}%
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Market Share</span>
                      </div>
                      <Link
                        href={`/fornecedores/${forn.cnpj.replace(/\D/g, '')}`}
                        className="btn btn-ghost btn-sm"
                        style={{ alignSelf: 'flex-end', marginTop: 4 }}
                      >
                        Análise de Portfólio →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── ABA: LISTA GERAL DE FORNECEDORES (TELA ANTERIOR) ────────────────── */}
      {mode === 'todos' && (
        <>
          {/* Filtros */}
          <div className="filter-bar">
            <div className="input-icon-wrapper" style={{ flex: 1, minWidth: 200 }}>
              <span className="input-icon" style={{ fontSize: 13 }}>🔍</span>
              <input
                type="text"
                className="input"
                placeholder="Razão social ou CNPJ/CPF..."
                style={{ height: 36 }}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTodos()}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleSearchTodos}>
              Buscar
            </button>
          </div>

          {/* Tabela */}
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fornecedor</th>
                  <th>CNPJ / CPF</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Contratos</th>
                  <th style={{ textAlign: 'right' }}>Valor Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loadingTodos ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                      ))}
                    </tr>
                  ))
                ) : todosData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-icon">🏭</div>
                        <p className="empty-title">Nenhum fornecedor encontrado</p>
                        <p className="empty-desc">Tente buscar por razão social ou CNPJ</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  todosData?.data?.map((item, i) => (
                    <tr key={item.ni} style={{ opacity: fetchingTodos ? 0.6 : 1 }}>
                      <td className="text-muted text-xs">
                        {((filtros.pagina! - 1) * filtros.limite!) + i + 1}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                        {item.nome ?? '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {formatCnpj(item.ni)}
                      </td>
                      <td>
                        <span className={`badge ${item.tipoPessoa === 'J' ? 'badge-brand' : 'badge-neutral'}`}>
                          {item.tipoPessoa === 'J' ? 'PJ' : item.tipoPessoa === 'F' ? 'PF' : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                        {item._count?.contratos?.toLocaleString('pt-BR') ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 'var(--font-size-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {item.contratos?.[0]?.valorGlobal != null 
                          ? formatCurrency(Number(item.contratos[0].valorGlobal)) 
                          : '—'}
                      </td>
                      <td>
                        <Link
                          href={`/fornecedores/${item.ni.replace(/\D/g, '')}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="pagination">
              <span className="pagination-info">
                {todosData ? `Página ${filtros.pagina} de ${totalPagesTodos} — ${todosData.total.toLocaleString('pt-BR')} fornecedores` : ''}
              </span>
              <div className="pagination-controls">
                <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros((p) => ({ ...p, pagina: 1 }))}>«</button>
                <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros((p) => ({ ...p, pagina: p.pagina! - 1 }))}>‹</button>
                {Array.from({ length: Math.min(5, totalPagesTodos) }, (_, i) => {
                  const page = Math.max(1, Math.min(filtros.pagina! - 2, totalPagesTodos - 4)) + i;
                  return (
                    <button
                      key={page}
                      className={`page-btn ${page === filtros.pagina ? 'active' : ''}`}
                      onClick={() => setFiltros((p) => ({ ...p, pagina: page }))}
                    >
                      {page}
                    </button>
                  );
                })}
                <button className="page-btn" disabled={filtros.pagina === totalPagesTodos} onClick={() => setFiltros((p) => ({ ...p, pagina: p.pagina! + 1 }))}>›</button>
                <button className="page-btn" disabled={filtros.pagina === totalPagesTodos} onClick={() => setFiltros((p) => ({ ...p, pagina: totalPagesTodos }))}>»</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
