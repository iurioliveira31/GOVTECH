'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pncpApi, type FiltroAta } from '@/lib/api/pncp';
import { formatDate, truncate, formatCnpj } from '@/lib/utils/format';

export default function AtasPage() {
  const [filtros, setFiltros] = useState<FiltroAta>({ pagina: 1, limite: 20 });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['atas', filtros],
    queryFn: () => pncpApi.listarAtas(filtros),
    placeholderData: (prev) => prev,
  });

  const setFiltro = (key: keyof FiltroAta, value: unknown) =>
    setFiltros((p) => ({ ...p, pagina: 1, [key]: value || undefined }));

  const totalPages = data?.totalPaginas ?? 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Atas de Registro de Preços</h1>
        <p className="page-subtitle">
          {data ? `${data.total.toLocaleString('pt-BR')} atas` : 'Carregando...'}
        </p>
      </div>

      <div className="filter-bar">
        <div className="input-icon-wrapper" style={{ flex: 1, minWidth: 180 }}>
          <span className="input-icon" style={{ fontSize: 13 }}>🔍</span>
          <input type="text" className="input" placeholder="Objeto..." style={{ height: 36 }}
            onChange={(e) => setFiltro('q', e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" onChange={(e) => setFiltro('vigentes', e.target.checked ? true : undefined)} />
          Vigentes
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', cursor: 'pointer' }}>
          <input type="checkbox" onChange={(e) => setFiltro('canceladas', e.target.checked ? true : undefined)} />
          Canceladas
        </label>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Número da Ata</th>
              <th>Objeto</th>
              <th>Órgão</th>
              <th>CNPJ</th>
              <th>Vigência Início</th>
              <th>Vigência Fim</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                ))}</tr>
              ))
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="empty-icon">📌</div>
                  <p className="empty-title">Nenhuma ata encontrada</p>
                </div>
              </td></tr>
            ) : (
              data?.data?.map((item, i) => (
                <tr key={item.id} style={{ opacity: isFetching ? 0.6 : 1 }}>
                  <td className="text-muted text-xs">{((filtros.pagina! - 1) * filtros.limite!) + i + 1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                    {item.numeroAtaRegistroPreco ?? item.numeroControlePncpAta}
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                      {truncate(item.objetoContratacao, 65)}
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {truncate(item.nomeOrgao, 30)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
                    {formatCnpj(item.cnpjOrgao)}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>{formatDate(item.vigenciaInicio)}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>{formatDate(item.vigenciaFim)}</td>
                  <td>
                    {item.cancelado
                      ? <span className="badge badge-danger">Cancelada</span>
                      : <span className="badge badge-success">Vigente</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="pagination">
          <span className="pagination-info">{data ? `Página ${filtros.pagina} de ${totalPages}` : ''}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros(p => ({ ...p, pagina: 1 }))}>«</button>
            <button className="page-btn" disabled={filtros.pagina === 1} onClick={() => setFiltros(p => ({ ...p, pagina: p.pagina! - 1 }))}>‹</button>
            <button className="page-btn" disabled={filtros.pagina === totalPages} onClick={() => setFiltros(p => ({ ...p, pagina: p.pagina! + 1 }))}>›</button>
            <button className="page-btn" disabled={filtros.pagina === totalPages} onClick={() => setFiltros(p => ({ ...p, pagina: totalPages }))}>»</button>
          </div>
        </div>
      </div>
    </>
  );
}
