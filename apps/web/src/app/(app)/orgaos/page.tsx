'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { pncpApi, type FiltroOrgao } from '@/lib/api/pncp';
import { formatCnpj, truncate } from '@/lib/utils/format';

const ESFERAS = [
  { value: 'FEDERAL', label: 'Federal' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'DISTRITAL', label: 'Distrital' },
];

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

export default function OrgaosPage() {
  const [filtros, setFiltros] = useState<FiltroOrgao>({ pagina: 1, limite: 20 });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['orgaos', filtros],
    queryFn: () => pncpApi.listarOrgaos(filtros),
    placeholderData: (prev) => prev,
  });

  const setFiltro = (key: keyof FiltroOrgao, value: unknown) =>
    setFiltros((p) => ({ ...p, pagina: 1, [key]: value || undefined }));

  const totalPages = data?.totalPaginas ?? 1;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Órgãos Compradores</h1>
        <p className="page-subtitle">
          {data ? `${data.total.toLocaleString('pt-BR')} órgãos cadastrados no PNCP` : 'Carregando...'}
        </p>
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        <div className="input-icon-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <span className="input-icon" style={{ fontSize: 13 }}>🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Razão social ou CNPJ..."
            style={{ height: 36 }}
            onChange={(e) => setFiltro('q', e.target.value)}
          />
        </div>

        <select
          className="input"
          style={{ height: 36, width: 100, flexShrink: 0 }}
          onChange={(e) => setFiltro('uf', e.target.value)}
        >
          <option value="">UF</option>
          {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>

        <select
          className="input"
          style={{ height: 36, minWidth: 140, flexShrink: 0 }}
          onChange={(e) => setFiltro('esfera', e.target.value)}
        >
          <option value="">Esfera</option>
          {ESFERAS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </div>

      {/* Grid de cards */}
      {isLoading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <p className="empty-title">Nenhum órgão encontrado</p>
          <p className="empty-desc">Ajuste os filtros para ver resultados</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
          opacity: isFetching ? 0.7 : 1,
          transition: 'opacity var(--transition-base)',
        }}>
          {data?.data?.map((orgao) => (
            <Link
              key={orgao.id}
              href={`/orgaos/${orgao.cnpj.replace(/\D/g, '')}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div className="card-body">
                  {/* Header do card */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-brand-800), var(--color-brand-600))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18,
                    }}>
                      🏢
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 'var(--font-size-sm)', fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                      }}>
                        {orgao.razaoSocial}
                      </div>
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-mono)',
                        marginTop: 2,
                      }}>
                        {formatCnpj(orgao.cnpj)}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    {orgao.ufSigla && (
                      <span className="badge badge-brand">{orgao.ufSigla}</span>
                    )}
                    {orgao.esferaId && (
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                        {orgao.esferaId}
                      </span>
                    )}
                    {orgao.municipioNome && (
                      <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                        {truncate(orgao.municipioNome, 18)}
                      </span>
                    )}
                  </div>

                  {/* Contagens */}
                  {orgao._count && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 'var(--space-2)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--color-border)',
                    }}>
                      {[
                        { label: 'Licitações', value: orgao._count.contratacoes || 0 },
                        { label: 'Contratos', value: orgao._count.contratos || 0 },
                        { label: 'Atas', value: orgao._count.atas || 0 },
                      ].map((m) => (
                        <div key={m.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {m.value.toLocaleString('pt-BR')}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {data && totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 'var(--space-6)' }}>
          <span className="pagination-info">
            Página {filtros.pagina} de {totalPages} — {data.total.toLocaleString('pt-BR')} órgãos
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
      )}
    </>
  );
}
