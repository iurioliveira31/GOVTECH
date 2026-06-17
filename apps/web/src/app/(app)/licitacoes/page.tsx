'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { pncpApi, type FiltroContratacao } from '@/lib/api/pncp';
import { formatCurrency, formatDate, situacaoBadgeClass, truncate } from '@/lib/utils/format';

const MODALIDADES = [
  { id: 6, label: 'Pregão Eletrônico' },
  { id: 8, label: 'Concorrência' },
  { id: 9, label: 'Leilão' },
  { id: 11, label: 'Concurso' },
  { id: 12, label: 'Dispensa de Licitação' },
  { id: 13, label: 'Inexigibilidade' },
];

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

export default function LicitacoesPage() {
  const [filtros, setFiltros] = useState<FiltroContratacao>({
    pagina: 1,
    limite: 20,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['contratacoes', filtros],
    queryFn: () => pncpApi.listarContratacoes(filtros),
    placeholderData: (prev) => prev,
  });

  const setFiltro = (key: keyof FiltroContratacao, value: unknown) => {
    setFiltros((prev) => ({ ...prev, pagina: 1, [key]: value || undefined }));
  };

  const totalPages = data?.totalPaginas ?? 1;

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Licitações</h1>
          <p className="page-subtitle">
            {data ? `${data.total.toLocaleString('pt-BR')} licitações encontradas` : 'Carregando...'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {/* Search */}
        <div className="input-icon-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <span className="input-icon" style={{ fontSize: 13 }}>🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Objeto da compra..."
            style={{ height: 36 }}
            onChange={(e) => setFiltro('q', e.target.value)}
          />
        </div>

        {/* UF */}
        <select
          className="input"
          style={{ height: 36, width: 100, flexShrink: 0 }}
          onChange={(e) => setFiltro('uf', e.target.value)}
        >
          <option value="">UF</option>
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>

        {/* Modalidade */}
        <select
          className="input"
          style={{ height: 36, minWidth: 180, flexShrink: 0 }}
          onChange={(e) => setFiltro('modalidadeId', e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Modalidade</option>
          {MODALIDADES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        {/* Abertas */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="checkbox"
            onChange={(e) => setFiltro('abertas', e.target.checked ? true : undefined)}
          />
          Apenas abertas
        </label>

        {/* SRP */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="checkbox"
            onChange={(e) => setFiltro('srp', e.target.checked ? true : undefined)}
          />
          SRP
        </label>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Objeto</th>
              <th>Modalidade</th>
              <th>UF</th>
              <th>Situação</th>
              <th style={{ textAlign: 'right' }}>Valor Estimado</th>
              <th>Publicação</th>
              <th>Encerramento</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                  ))}
                </tr>
              ))
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <p className="empty-title">Nenhuma licitação encontrada</p>
                    <p className="empty-desc">Tente ajustar os filtros de busca</p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.data?.map((item, i) => (
                <tr key={item.id} style={{ opacity: isFetching ? 0.6 : 1 }}>
                  <td className="text-muted text-xs">
                    {((filtros.pagina! - 1) * filtros.limite!) + i + 1}
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    <Link
                      href={`/licitacoes/${item.id}`}
                      style={{
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                        fontSize: 'var(--font-size-sm)',
                        display: 'block',
                      }}
                      className="truncate"
                      title={item.objetoCompra}
                    >
                      {truncate(item.objetoCompra, 70)}
                    </Link>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {truncate(item.orgaoRazaoSocial, 45)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                      {truncate(item.modalidadeNome, 22)}
                    </span>
                  </td>
                  <td>
                    {item.unidadeUfSigla ? (
                      <span className="badge badge-brand">{item.unidadeUfSigla}</span>
                    ) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${situacaoBadgeClass(item.situacao)}`}>
                      {item.situacao ?? '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(item.valorTotalEstimado)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    {formatDate(item.dataPublicacaoPncp)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    {formatDate(item.dataEncerramentoProposta)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">
            {data ? `Página ${filtros.pagina} de ${totalPages} — ${data.total.toLocaleString('pt-BR')} resultados` : ''}
          </span>
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={filtros.pagina === 1}
              onClick={() => setFiltros(p => ({ ...p, pagina: 1 }))}
            >«</button>
            <button
              className="page-btn"
              disabled={filtros.pagina === 1}
              onClick={() => setFiltros(p => ({ ...p, pagina: (p.pagina ?? 1) - 1 }))}
            >‹</button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min((filtros.pagina ?? 1) - 2, totalPages - 4)) + i;
              return (
                <button
                  key={page}
                  className={`page-btn ${page === filtros.pagina ? 'active' : ''}`}
                  onClick={() => setFiltros(p => ({ ...p, pagina: page }))}
                >
                  {page}
                </button>
              );
            })}

            <button
              className="page-btn"
              disabled={filtros.pagina === totalPages}
              onClick={() => setFiltros(p => ({ ...p, pagina: (p.pagina ?? 1) + 1 }))}
            >›</button>
            <button
              className="page-btn"
              disabled={filtros.pagina === totalPages}
              onClick={() => setFiltros(p => ({ ...p, pagina: totalPages }))}
            >»</button>
          </div>
        </div>
      </div>
    </>
  );
}
