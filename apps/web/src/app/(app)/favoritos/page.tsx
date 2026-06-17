'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { favoritesApi, type Favorite } from '@/lib/api/favorites';
import { formatCurrency } from '@/lib/utils/format';

const PIPELINE_STAGES = [
  { id: 'ANALISE', label: 'Análise', color: 'var(--color-bg-elevated)', headerColor: 'var(--color-brand-500)' },
  { id: 'PREPARACAO', label: 'Preparação', color: 'var(--color-bg-elevated)', headerColor: 'var(--color-warning)' },
  { id: 'PROPOSTA', label: 'Proposta', color: 'var(--color-bg-elevated)', headerColor: 'var(--color-info)' },
  { id: 'GANHA', label: 'Ganha', color: 'var(--color-bg-elevated)', headerColor: 'var(--color-success)' },
  { id: 'PERDIDA', label: 'Perdida', color: 'var(--color-bg-elevated)', headerColor: 'var(--color-danger)' },
];

function FavoriteCard({ fav, onRemove, onStatusChange }: { fav: Favorite; onRemove: () => void, onStatusChange: (status: string, valor?: number) => void }) {
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [valorProposta, setValorProposta] = useState(fav.valorProposta?.toString() ?? '');

  const href = fav.entityType === 'procurement'
    ? `/licitacoes/${fav.entityId}`
    : `/contratos/${fav.entityId}`;

  const icon = fav.entityType === 'procurement' ? '🏛' : '📋';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', transition: 'all 0.2s', padding: 'var(--space-3)', cursor: 'grab' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <Link href={href} style={{ textDecoration: 'none', flex: 1 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span className="badge badge-neutral" style={{ fontSize: 'var(--font-size-xs)' }}>{icon} {fav.entityType === 'procurement' ? 'Licitação' : 'Contrato'}</span>
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
            {fav.entityId}
          </div>
          {fav.label && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', marginTop: 'var(--space-1)', fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {fav.label}
            </div>
          )}
        </Link>
        <button
          onClick={onRemove}
          className="btn btn-ghost btn-sm"
          title="Remover favorito"
          style={{ color: 'var(--color-danger)', padding: 'var(--space-1)', height: 'auto', flexShrink: 0 }}
        >
          🗑
        </button>
      </div>

      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Adicionado em {new Date(fav.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>

        <div style={{ marginTop: 'var(--space-2)' }}>
          {isEditingValue ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="number"
                className="input input-sm"
                placeholder="Valor (R$)"
                value={valorProposta}
                onChange={(e) => setValorProposta(e.target.value)}
                style={{ width: '100%' }}
              />
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => {
                  onStatusChange(fav.status, valorProposta ? Number(valorProposta) : undefined);
                  setIsEditingValue(false);
                }}
              >✓</button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-default)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontWeight: 600, color: fav.valorProposta ? 'var(--color-success)' : 'inherit' }}>
                {fav.valorProposta ? formatCurrency(fav.valorProposta) : 'Sem valor estimado'}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={() => setIsEditingValue(true)}>✎</button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {PIPELINE_STAGES.map(stage => (
            <button
              key={stage.id}
              onClick={() => onStatusChange(stage.id, fav.valorProposta)}
              className={`btn btn-sm ${fav.status === stage.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '2px 6px', fontSize: '10px', flex: 1, minWidth: '30%' }}
              disabled={fav.status === stage.id}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FavoritosPage() {
  const qc = useQueryClient();

  const { data: favorites = [], isLoading, isError } = useQuery({
    queryKey: ['favorites'],
    queryFn:  () => favoritesApi.list(),
  });

  const remove = useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) =>
      favoritesApi.removeByEntity(entityType, entityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, valor }: { id: string; status: string; valor?: number }) =>
      favoritesApi.updateStatus(id, status, valor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">🎯 Pipeline de Oportunidades</h1>
            <p className="page-subtitle">
              Acompanhe suas licitações e contratos salvos em formato Kanban
            </p>
          </div>
          <div>
            <span className="badge badge-brand" style={{ fontSize: 'var(--font-size-md)', padding: 'var(--space-2) var(--space-4)' }}>
              Total: {favorites.length} oportunidades
            </span>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="card" style={{ flexShrink: 0 }}>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
            <span className="spinner spinner-lg" />
          </div>
        </div>
      )}

      {isError && (
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0 }}>
          <div className="card-body" style={{ color: 'var(--color-danger)' }}>
            ❌ Erro ao carregar pipeline.
          </div>
        </div>
      )}

      {!isLoading && favorites.length === 0 && (
        <div className="card" style={{ textAlign: 'center', flexShrink: 0 }}>
          <div className="card-body" style={{ padding: 'var(--space-12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 64, opacity: 0.4 }}>🎯</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>O funil está vazio</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', maxWidth: 360 }}>
              Abra uma licitação ou contrato e clique em &ldquo;Favoritar Oportunidade&rdquo; para adicioná-la ao seu pipeline.
            </p>
            <Link href="/busca" className="btn btn-primary btn-sm">
              Buscar Oportunidades
            </Link>
          </div>
        </div>
      )}

      {!isLoading && favorites.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-4)', 
          flex: 1, 
          overflowX: 'auto', 
          paddingBottom: 'var(--space-4)' 
        }}>
          {PIPELINE_STAGES.map(stage => {
            const items = favorites.filter(f => f.status === stage.id || (!f.status && stage.id === 'ANALISE'));
            const totalValue = items.reduce((acc, curr) => acc + (curr.valorProposta || 0), 0);
            
            return (
              <div key={stage.id} style={{ 
                minWidth: 320, 
                maxWidth: 320, 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'var(--color-bg-secondary)', 
                borderRadius: 'var(--radius-lg)',
                borderTop: `4px solid ${stage.headerColor}`
              }}>
                <div style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                  <h3 style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>{stage.label}</h3>
                  <span className="badge badge-neutral">{items.length}</span>
                </div>
                {totalValue > 0 && (
                  <div style={{ padding: '0 var(--space-3)', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                    {formatCurrency(totalValue)}
                  </div>
                )}
                <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', overflowY: 'auto', flex: 1 }}>
                  {items.map(fav => (
                    <FavoriteCard
                      key={fav.id}
                      fav={fav}
                      onRemove={() => remove.mutate({ entityType: fav.entityType, entityId: fav.entityId })}
                      onStatusChange={(status, valor) => updateStatus.mutate({ id: fav.id, status, valor })}
                    />
                  ))}
                  {items.length === 0 && (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                      Nenhuma oportunidade
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
