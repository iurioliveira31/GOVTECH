'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { pncpApi } from '@/lib/api/pncp';
import { formatCnpj, formatCurrency, formatDate, truncate, situacaoBadgeClass } from '@/lib/utils/format';

export default function OrgaoDetailPage() {
  const { cnpj } = useParams<{ cnpj: string }>();
  const router = useRouter();

  const { data: orgao, isLoading, error } = useQuery({
    queryKey: ['orgao', cnpj],
    queryFn: () => pncpApi.detalharOrgao(cnpj),
    enabled: !!cnpj,
  });

  if (isLoading) {
    return (
      <>
        <div className="page-header">
          <div className="skeleton" style={{ height: 28, width: 400, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 200 }} />
        </div>
        <div className="skeleton" style={{ height: 200 }} />
      </>
    );
  }

  if (error || !orgao) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏢</div>
        <p className="empty-title">Órgão não encontrado</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Voltar</button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Voltar</button>
          {orgao.esferaId && <span className="badge badge-info">{orgao.esferaId}</span>}
          {orgao.ufSigla && <span className="badge badge-brand">{orgao.ufSigla}</span>}
        </div>
        <h1 className="page-title" style={{ fontSize: 'var(--font-size-xl)' }}>
          {orgao.razaoSocial}
        </h1>
        <p className="page-subtitle" style={{ fontFamily: 'var(--font-mono)' }}>
          {formatCnpj(orgao.cnpj)}
        </p>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Últimas contratações */}
          {Array.isArray(orgao.contratacoes) && orgao.contratacoes.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Últimas Licitações</h2>
                <Link href={`/licitacoes?orgaoCnpj=${orgao.cnpj}`} className="btn btn-ghost btn-sm">
                  Ver todas →
                </Link>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Objeto</th>
                      <th>Modalidade</th>
                      <th>Situação</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgao.contratacoes.slice(0, 8).map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link href={`/licitacoes/${c.id}`} style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                            {truncate(c.objetoCompra, 55)}
                          </Link>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                            {truncate(c.modalidadeNome, 20)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${situacaoBadgeClass(c.situacao)}`}>
                            {c.situacao ?? '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                          {formatCurrency(c.valorTotalEstimado)}
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(c.dataPublicacaoPncp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Últimos contratos */}
          {Array.isArray(orgao.contratos) && orgao.contratos.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Contratos Recentes</h2>
                <Link href={`/contratos?orgaoCnpj=${orgao.cnpj}`} className="btn btn-ghost btn-sm">
                  Ver todos →
                </Link>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Objeto</th>
                      <th>Fornecedor</th>
                      <th style={{ textAlign: 'right' }}>Valor Global</th>
                      <th>Vigência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgao.contratos.slice(0, 8).map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link href={`/contratos/${c.id}`} style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                            {truncate(c.objetoContrato, 55)}
                          </Link>
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {truncate(c.nomeRazaoSocialFornecedor, 30)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                          {formatCurrency(c.valorGlobal)}
                        </td>
                        <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(c.dataVigenciaFim)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sem dados */}
          {(!orgao.contratacoes?.length && !orgao.contratos?.length) && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p className="empty-title">Nenhum dado encontrado</p>
              <p className="empty-desc">Este órgão ainda não possui licitações ou contratos sincronizados</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Informações</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { label: 'CNPJ', value: formatCnpj(orgao.cnpj), mono: true },
                { label: 'UF', value: orgao.ufSigla ?? '—' },
                { label: 'Município', value: orgao.municipioNome ?? '—' },
                { label: 'Esfera', value: orgao.esferaId ?? '—' },
                { label: 'Poder', value: orgao.poderId ?? '—' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="detail-field-label">{f.label}</div>
                  <div className="detail-field-value" style={f.mono ? { fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)' } : {}}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {orgao._count && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">Totais</h2></div>
              <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Licitações', value: orgao._count.contratacoes, icon: '🏛' },
                  { label: 'Contratos', value: orgao._count.contratos, icon: '📋' },
                  { label: 'Atas', value: orgao._count.atas, icon: '📌' },
                ].map((m) => (
                  <div key={m.label} style={{
                    padding: 'var(--space-3)',
                    background: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {m.value.toLocaleString('pt-BR')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
