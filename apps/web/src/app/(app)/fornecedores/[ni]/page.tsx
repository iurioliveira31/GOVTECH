'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { pncpApi } from '@/lib/api/pncp';
import { formatCnpj, formatCurrency, formatDate, diasAte, truncate } from '@/lib/utils/format';

export default function FornecedorDetailPage() {
  const { ni } = useParams<{ ni: string }>();
  const router = useRouter();

  const { data: fornecedor, isLoading, error } = useQuery({
    queryKey: ['fornecedor', ni],
    queryFn: () => pncpApi.detalharFornecedor(ni),
    enabled: !!ni,
  });

  if (isLoading) {
    return (
      <>
        <div className="page-header">
          <div className="skeleton" style={{ height: 28, width: 400, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 180 }} />
        </div>
        <div className="skeleton" style={{ height: 200 }} />
      </>
    );
  }

  if (error || !fornecedor) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏭</div>
        <p className="empty-title">Fornecedor não encontrado</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Voltar</button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Voltar</button>
          <span className={`badge ${fornecedor.tipoPessoa === 'J' ? 'badge-brand' : 'badge-neutral'}`}>
            {fornecedor.tipoPessoa === 'J' ? 'Pessoa Jurídica' : fornecedor.tipoPessoa === 'F' ? 'Pessoa Física' : 'Tipo desconhecido'}
          </span>
        </div>
        <h1 className="page-title" style={{ fontSize: 'var(--font-size-xl)' }}>
          {fornecedor.razaoSocial ?? 'Fornecedor'}
        </h1>
        <p className="page-subtitle" style={{ fontFamily: 'var(--font-mono)' }}>
          {formatCnpj(fornecedor.ni)}
        </p>
      </div>

      <div className="detail-grid">
        {/* Contratos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {Array.isArray(fornecedor.contratos) && fornecedor.contratos.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Contratos Firmados</h2>
                <span className="badge badge-neutral">{fornecedor.contratos.length}</span>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Objeto</th>
                      <th>Órgão</th>
                      <th>UF</th>
                      <th style={{ textAlign: 'right' }}>Valor Global</th>
                      <th>Vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedor.contratos.map((c) => {
                      const dias = diasAte(c.dataVigenciaFim);
                      return (
                        <tr key={c.id}>
                          <td>
                            <Link
                              href={`/contratos/${c.id}`}
                              style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}
                            >
                              {truncate(c.objetoContrato, 55)}
                            </Link>
                          </td>
                          <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                            {truncate(c.orgaoRazaoSocial, 28)}
                          </td>
                          <td>
                            {c.unidadeUfSigla ? <span className="badge badge-brand">{c.unidadeUfSigla}</span> : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                            {formatCurrency(c.valorGlobal)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {dias == null ? (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            ) : dias < 0 ? (
                              <span className="badge badge-danger">Vencido</span>
                            ) : dias <= 30 ? (
                              <span className="badge badge-danger">{dias}d</span>
                            ) : dias <= 90 ? (
                              <span className="badge badge-warning">{dias}d</span>
                            ) : (
                              <span className="badge badge-success">{formatDate(c.dataVigenciaFim)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p className="empty-title">Nenhum contrato encontrado</p>
              <p className="empty-desc">Este fornecedor ainda não possui contratos sincronizados</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="card-header"><h2 className="card-title">Perfil</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { label: 'CNPJ / CPF', value: formatCnpj(fornecedor.ni), mono: true },
                { label: 'Tipo', value: fornecedor.tipoPessoa === 'J' ? 'Pessoa Jurídica' : fornecedor.tipoPessoa === 'F' ? 'Pessoa Física' : '—' },
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

          {fornecedor._count && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">Totais</h2></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Contratos', value: fornecedor._count.contratos, icon: '📋' },
                  { label: 'Itens ganhos', value: fornecedor._count.resultados, icon: '🏆' },
                ].map((m) => (
                  <div key={m.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    background: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: 16 }}>{m.icon}</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{m.label}</span>
                    </div>
                    <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {m.value.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
                {fornecedor.valorTotalContratos != null && (
                  <div style={{
                    padding: 'var(--space-3)',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Valor Total Contratado
                    </div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: 'var(--color-brand-400)' }}>
                      {formatCurrency(fornecedor.valorTotalContratos)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
