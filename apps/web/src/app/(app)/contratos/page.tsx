'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { pncpApi, type FiltroContrato } from '@/lib/api/pncp';
import { formatCurrency, formatDate, diasAte, truncate } from '@/lib/utils/format';


function vencimentoBadge(dataFim?: string | null) {
  const dias = diasAte(dataFim);
  if (dias == null) return null;
  if (dias < 0)  return <span className="badge badge-danger">Vencido</span>;
  if (dias <= 30) return <span className="badge badge-danger">Vence em {dias}d</span>;
  if (dias <= 90) return <span className="badge badge-warning">Vence em {dias}d</span>;
  return <span className="badge badge-success">Vigente</span>;
}

export default function ContratosPage() {
  const [filtros, setFiltros] = useState<FiltroContrato>({ pagina: 1, limite: 20 });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['contratos', filtros],
    queryFn: () => pncpApi.listarContratos(filtros),
    placeholderData: (prev) => prev,
  });

  const setFiltro = (key: keyof FiltroContrato, value: unknown) =>
    setFiltros((p) => ({ ...p, pagina: 1, [key]: value || undefined }));

  const totalPages = data?.totalPaginas ?? 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Contratos</h1>
        <p className="page-subtitle">
          {data ? `${data.total.toLocaleString('pt-BR')} contratos` : 'Carregando...'}
        </p>
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        <div className="input-icon-wrapper" style={{ flex: 1, minWidth: 180 }}>
          <span className="input-icon" style={{ fontSize: 13 }}>🔍</span>
          <input type="text" className="input" placeholder="Objeto ou fornecedor..." style={{ height: 36 }}
            onChange={(e) => setFiltro('q', e.target.value)} />
        </div>

        <select className="input" style={{ height: 36, width: 100, flexShrink: 0 }}
          onChange={(e) => setFiltro('uf', e.target.value)}>
          <option value="">UF</option>
          {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" onChange={(e) => setFiltro('vigentes', e.target.checked ? true : undefined)} />
          Vigentes
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-warning)', cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" onChange={(e) => setFiltro('vencendoEm30Dias', e.target.checked ? true : undefined)} />
          ⚠️ Vencendo em 30 dias
        </label>
      </div>

      {/* Tabela */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Objeto</th>
              <th>Fornecedor</th>
              <th>Órgão</th>
              <th>UF</th>
              <th style={{ textAlign: 'right' }}>Valor Global</th>
              <th>Início</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                ))}</tr>
              ))
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <p className="empty-title">Nenhum contrato encontrado</p>
                  <p className="empty-desc">Ajuste os filtros para ver resultados</p>
                </div>
              </td></tr>
            ) : (
              data?.data?.map((item, i) => (
                <tr key={item.id} style={{ opacity: isFetching ? 0.6 : 1 }}>
                  <td className="text-muted text-xs">{((filtros.pagina! - 1) * filtros.limite!) + i + 1}</td>
                  <td style={{ maxWidth: 280 }}>
                    <Link href={`/contratos/${item.id}`} style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                      {truncate(item.objetoContrato, 65)}
                    </Link>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {truncate(item.nomeRazaoSocialFornecedor, 30)}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {truncate(item.orgaoRazaoSocial, 30)}
                  </td>
                  <td>
                    {item.unidadeUfSigla ? <span className="badge badge-brand">{item.unidadeUfSigla}</span> : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(item.valorGlobal)}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDate(item.dataVigenciaInicio)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {vencimentoBadge(item.dataVigenciaFim)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="pagination">
          <span className="pagination-info">
            {data ? `Página ${filtros.pagina} de ${totalPages} — ${data.total.toLocaleString('pt-BR')} resultados` : ''}
          </span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros(p => ({ ...p, pagina: 1 }))}>«</button>
            <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros(p => ({ ...p, pagina: p.pagina! - 1 }))}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(filtros.pagina! - 2, totalPages - 4)) + i;
              return <button key={page} className={`page-btn ${page === filtros.pagina ? 'active' : ''}`} onClick={() => setFiltros(p => ({ ...p, pagina: page }))}>{page}</button>;
            })}
            <button className="page-btn" disabled={filtros.pagina === totalPages} onClick={() => setFiltros(p => ({ ...p, pagina: p.pagina! + 1 }))}>›</button>
            <button className="page-btn" disabled={filtros.pagina === totalPages} onClick={() => setFiltros(p => ({ ...p, pagina: totalPages }))}>»</button>
          </div>
        </div>
      </div>
    </>
  );
}
