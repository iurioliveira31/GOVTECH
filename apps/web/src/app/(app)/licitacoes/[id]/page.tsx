'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { pncpApi } from '@/lib/api/pncp';
import { favoritesApi } from '@/lib/api/favorites';
import { formatCurrency, formatDate, formatCnpj, situacaoBadgeClass } from '@/lib/utils/format';

export default function LicitacaoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['contratacao', id],
    queryFn: () => pncpApi.detalharContratacao(id),
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.list(),
  });

  const isFavorited = favorites?.some(f => f.entityType === 'procurement' && f.entityId === id);

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await favoritesApi.removeByEntity('procurement', id);
      } else {
        await favoritesApi.add('procurement', id, item?.objetoCompra?.slice(0, 50));
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
          <div className="skeleton" style={{ height: 16, width: 240 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1,2,3].map(i => <div key={i} className="card"><div className="card-body"><div className="skeleton" style={{ height: 120 }} /></div></div>)}
        </div>
      </>
    );
  }

  if (error || !item) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <p className="empty-title">Licitação não encontrada</p>
        <p className="empty-desc">O registro pode ter sido removido ou o ID é inválido</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Voltar</button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Voltar</button>
          <span className={`badge ${situacaoBadgeClass(item.situacao)}`}>{item.situacao ?? 'Indefinida'}</span>
          {item.srp && <span className="badge badge-info">SRP</span>}
        </div>
        <h1 className="page-title" style={{ fontSize: 'var(--font-size-xl)' }}>
          {item.objetoCompra ?? 'Sem descrição'}
        </h1>
        <p className="page-subtitle">{item.numeroControlePncp}</p>
      </div>

      <div className="detail-grid">
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Informações da compra */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Informações da Licitação</h2>
            </div>
            <div className="card-body">
              <div className="detail-field-grid">
                {[
                  { label: 'Modalidade', value: item.modalidadeNome },
                  { label: 'Publicação PNCP', value: formatDate(item.dataPublicacaoPncp) },
                  { label: 'Encerramento Propostas', value: formatDate(item.dataEncerramentoProposta) },
                  { label: 'UF', value: item.unidadeUfSigla },
                  { label: 'Município', value: item.unidadeMunicipioNome },
                  { label: 'Valor Estimado Total', value: formatCurrency(item.valorTotalEstimado) },
                ].map(f => (
                  <div key={f.label}>
                    <div className="detail-field-label">{f.label}</div>
                    <div className="detail-field-value">{f.value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Órgão */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Órgão Comprador</h2>
            </div>
            <div className="card-body">
              <div className="detail-field-grid">
                {[
                  { label: 'Razão Social', value: item.orgaoRazaoSocial },
                  { label: 'CNPJ', value: formatCnpj(item.orgaoCnpj) },
                ].map(f => (
                  <div key={f.label}>
                    <div className="detail-field-label">{f.label}</div>
                    <div className="detail-field-value">{f.value ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Itens */}
          {Array.isArray((item as { itens?: unknown[] }).itens) && (item as { itens?: unknown[] }).itens!.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Itens da Licitação</h2>
                <span className="badge badge-neutral">{(item as { itens?: unknown[] }).itens!.length} itens</span>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Descrição</th>
                      <th>Qtd</th>
                      <th style={{ textAlign: 'right' }}>Valor Unit.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((item as { itens?: Record<string, unknown>[] }).itens ?? []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="text-muted">{String(it.numeroItem ?? idx + 1)}</td>
                        <td style={{ maxWidth: 400 }}>{String(it.descricao ?? '—')}</td>
                        <td>{String(it.quantidade ?? '—')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {typeof it.valorUnitarioEstimado === 'number' ? formatCurrency(it.valorUnitarioEstimado) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Ações */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Ações</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <a
                href={`https://pncp.gov.br/app/editais/${item.orgaoCnpj}/${item.anoCompra}/${item.sequencialCompra}`}
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
                {isFavorited ? '⭐ Favoritado' : '☆ Favoritar Oportunidade'}
              </button>
            </div>
          </div>

          {/* Documentos */}
          {Array.isArray((item as { documentos?: unknown[] }).documentos) && (item as { documentos?: unknown[] }).documentos!.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Documentos</h2>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {((item as { documentos?: Record<string, unknown>[] }).documentos ?? []).map((doc, i) => (
                  <a
                    key={i}
                    href={String(doc.url ?? '#')}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      fontSize: 'var(--font-size-sm)', color: 'var(--color-brand-400)',
                      padding: 'var(--space-2) 0',
                    }}
                  >
                    <span>📄</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(doc.titulo ?? doc.nomeArquivo ?? `Documento ${i + 1}`)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
