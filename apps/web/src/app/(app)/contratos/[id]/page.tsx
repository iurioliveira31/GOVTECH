'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { pncpApi } from '@/lib/api/pncp';
import { favoritesApi } from '@/lib/api/favorites';
import {
  formatCurrency,
  formatDate,
  formatCnpj,
  diasAte,
  truncate,
} from '@/lib/utils/format';

function VencimentoInfo({ dataFim }: { dataFim?: string | null }) {
  const dias = diasAte(dataFim);
  if (dias == null) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  if (dias < 0)
    return (
      <span className="badge badge-danger" style={{ fontSize: 'var(--font-size-sm)' }}>
        Vencido há {Math.abs(dias)} dias
      </span>
    );
  if (dias <= 30)
    return (
      <span className="badge badge-danger" style={{ fontSize: 'var(--font-size-sm)' }}>
        ⚠️ Vence em {dias} dias
      </span>
    );
  if (dias <= 90)
    return (
      <span className="badge badge-warning" style={{ fontSize: 'var(--font-size-sm)' }}>
        Vence em {dias} dias
      </span>
    );
  return (
    <span className="badge badge-success" style={{ fontSize: 'var(--font-size-sm)' }}>
      Vigente — {dias} dias restantes
    </span>
  );
}

export default function ContratoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['contrato', id],
    queryFn: () => pncpApi.detalharContrato(id),
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.list(),
  });

  const isFavorited = favorites?.some(f => f.entityType === 'contract' && f.entityId === id);

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await favoritesApi.removeByEntity('contract', id);
      } else {
        await favoritesApi.add('contract', id, item?.objetoContrato?.slice(0, 50));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  if (isLoading) {
    return (
      <>
        <div className="page-header">
          <div className="skeleton" style={{ height: 28, width: 400, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 260 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="skeleton" style={{ height: 100 }} />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error || !item) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <p className="empty-title">Contrato não encontrado</p>
        <p className="empty-desc">O registro pode ter sido removido ou o ID é inválido</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
            ← Voltar
          </button>
          <VencimentoInfo dataFim={item.dataVigenciaFim} />
          {item.tipoContratoNome && (
            <span className="badge badge-neutral">{item.tipoContratoNome}</span>
          )}
        </div>
        <h1 className="page-title" style={{ fontSize: 'var(--font-size-xl)' }}>
          {item.objetoContrato ?? 'Sem descrição'}
        </h1>
        <p className="page-subtitle">Nº {item.numeroControlePncp}</p>
      </div>

      <div className="detail-grid">
        {/* Coluna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Informações financeiras */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Valores</h2>
            </div>
            <div className="card-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 'var(--space-4)',
                }}
              >
                {[
                  { label: 'Valor Inicial', value: formatCurrency(item.valorInicial) },
                  { label: 'Valor Global', value: formatCurrency(item.valorGlobal) },
                  { label: 'Valor Acumulado', value: formatCurrency(item.valorAcumulado) },
                  {
                    label: 'Parcelas',
                    value: item.numeroParcelas ? `${item.numeroParcelas}x` : '—',
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    style={{
                      padding: 'var(--space-4)',
                      background: 'var(--color-bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="detail-field-label" style={{ marginBottom: 'var(--space-1)' }}>
                      {f.label}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Datas e vigência */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Vigência e Prazos</h2>
            </div>
            <div className="card-body">
              <div className="detail-field-grid">
                {[
                  { label: 'Data de Assinatura', value: formatDate(item.dataAssinatura) },
                  { label: 'Publicação PNCP', value: formatDate(item.dataPublicacaoPncp) },
                  { label: 'Início da Vigência', value: formatDate(item.dataVigenciaInicio) },
                  { label: 'Fim da Vigência', value: formatDate(item.dataVigenciaFim) },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="detail-field-label">{f.label}</div>
                    <div className="detail-field-value">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fornecedor */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Fornecedor</h2>
            </div>
            <div className="card-body">
              <div className="detail-field-grid">
                <div>
                  <div className="detail-field-label">Razão Social</div>
                  <div className="detail-field-value">
                    {item.nomeRazaoSocialFornecedor ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="detail-field-label">CNPJ / CPF</div>
                  <div
                    className="detail-field-value"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {item.niFornecedor ? formatCnpj(item.niFornecedor) : '—'}
                  </div>
                </div>
              </div>
              {item.niFornecedor && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Link
                    href={`/fornecedores/${item.niFornecedor}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Ver perfil do fornecedor →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Documentos */}
          {Array.isArray(item.documentos) && item.documentos.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Documentos</h2>
                <span className="badge badge-neutral">{item.documentos.length}</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {item.documentos.map((doc, i) => (
                  <a
                    key={doc.id ?? i}
                    href={doc.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-3)',
                      background: 'var(--color-bg-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-brand-400)',
                      transition: 'border-color var(--transition-base)',
                    }}
                  >
                    <span>📄</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.titulo ?? doc.nomeArquivo ?? `Documento ${i + 1}`}
                    </span>
                    <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Órgão comprador */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Órgão Comprador</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <div className="detail-field-label">Razão Social</div>
                <div className="detail-field-value" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {item.orgaoRazaoSocial ?? '—'}
                </div>
              </div>
              <div>
                <div className="detail-field-label">CNPJ</div>
                <div
                  className="detail-field-value"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)' }}
                >
                  {formatCnpj(item.orgaoCnpj)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {item.unidadeUfSigla && (
                  <span className="badge badge-brand">{item.unidadeUfSigla}</span>
                )}
                {item.unidadeMunicipioNome && (
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                    {truncate(item.unidadeMunicipioNome, 20)}
                  </span>
                )}
              </div>
              {item.orgaoCnpj && (
                <Link
                  href={`/orgaos/${item.orgaoCnpj.replace(/\D/g, '')}`}
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Ver órgão →
                </Link>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Ações</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <a
                href={`https://pncp.gov.br/app/contratos/${item.orgaoCnpj}/${new Date(item.dataPublicacaoPncp ?? Date.now()).getFullYear()}/${item.numeroControlePncp?.split('-').pop()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🔗 Ver no PNCP
              </a>
              <button
                className={`btn ${isFavorited ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => toggleFavorite.mutate()}
                disabled={toggleFavorite.isPending}
              >
                {isFavorited ? '⭐ Favoritado' : '☆ Favoritar Contrato'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
