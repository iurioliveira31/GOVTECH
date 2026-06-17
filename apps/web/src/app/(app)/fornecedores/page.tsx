'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { pncpApi, type FiltroFornecedor } from '@/lib/api/pncp';
import { formatCnpj, formatCurrency } from '@/lib/utils/format';

export default function FornecedoresPage() {
  const [filtros, setFiltros] = useState<FiltroFornecedor>({ pagina: 1, limite: 20 });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['fornecedores', filtros],
    queryFn: () => pncpApi.listarFornecedores(filtros),
    placeholderData: (prev) => prev,
  });

  const handleSearch = () => {
    setFiltros((p) => ({ ...p, pagina: 1, q: searchInput || undefined }));
  };

  const totalPages = data?.totalPaginas ?? 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Fornecedores</h1>
        <p className="page-subtitle">
          {data ? `${data.total.toLocaleString('pt-BR')} fornecedores com contratos no PNCP` : 'Carregando...'}
        </p>
      </div>

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
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleSearch}>
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
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                  ))}
                </tr>
              ))
            ) : data?.data?.length === 0 ? (
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
              data?.data?.map((item, i) => (
                <tr key={item.ni} style={{ opacity: isFetching ? 0.6 : 1 }}>
                  <td className="text-muted text-xs">
                    {((filtros.pagina! - 1) * filtros.limite!) + i + 1}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                    {item.razaoSocial ?? '—'}
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
                    {item.valorTotalContratos != null ? formatCurrency(item.valorTotalContratos) : '—'}
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
            {data ? `Página ${filtros.pagina} de ${totalPages} — ${data.total.toLocaleString('pt-BR')} fornecedores` : ''}
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros((p) => ({ ...p, pagina: 1 }))}>«</button>
            <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros((p) => ({ ...p, pagina: p.pagina! - 1 }))}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(filtros.pagina! - 2, totalPages - 4)) + i;
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
            <button className="page-btn" disabled={filtros.pagina === totalPages} onClick={() => setFiltros((p) => ({ ...p, pagina: p.pagina! + 1 }))}>›</button>
            <button className="page-btn" disabled={filtros.pagina === totalPages} onClick={() => setFiltros((p) => ({ ...p, pagina: totalPages }))}>»</button>
          </div>
        </div>
      </div>
    </>
  );
}
