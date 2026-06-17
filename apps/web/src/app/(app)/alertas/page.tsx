'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, type Alert } from '@/lib/api/favorites';

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

function AlertCard({ alert, onToggle, onRemove }: {
  alert: Alert;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        opacity: alert.isActive ? 1 : 0.55,
        borderColor: alert.isActive ? 'rgba(59,130,246,0.2)' : 'var(--color-border)',
        transition: 'all 0.2s',
      }}
    >
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                🔔 {alert.name}
              </span>
              <span className={`badge ${alert.isActive ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                {alert.isActive ? 'Ativo' : 'Pausado'}
              </span>
              {alert.uf && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{alert.uf}</span>}
              {alert.entidade !== 'todos' && (
                <span className="badge badge-info" style={{ fontSize: 10 }}>
                  {alert.entidade === 'contratacoes' ? 'Licitações' : 'Contratos'}
                </span>
              )}
            </div>

            {/* Keywords */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
              {alert.keywords.map((kw, i) => (
                <span key={i} style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  fontSize: 11, color: 'var(--color-text-muted)',
                }}>
                  {kw}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Criado em {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
              {alert.lastTriggeredAt && (
                <> · Último disparo: {new Date(alert.lastTriggeredAt).toLocaleString('pt-BR')}</>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button
              onClick={onToggle}
              className="btn btn-ghost btn-sm"
              title={alert.isActive ? 'Pausar alerta' : 'Ativar alerta'}
              style={{ color: alert.isActive ? 'var(--color-warning)' : 'var(--color-success)' }}
            >
              {alert.isActive ? '⏸' : '▶'}
            </button>
            <button
              onClick={onRemove}
              className="btn btn-ghost btn-sm"
              title="Remover alerta"
              style={{ color: 'var(--color-danger)' }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertasPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [keywords, setKeywords] = useState('');
  const [uf, setUf]             = useState('');
  const [entidade, setEntidade] = useState<'todos' | 'contratacoes' | 'contratos'>('todos');

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn:  () => alertsApi.list(),
  });

  const create = useMutation({
    mutationFn: () => alertsApi.create({
      name,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      uf: uf || undefined,
      entidade,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setShowForm(false);
      setName(''); setKeywords(''); setUf(''); setEntidade('todos');
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      alertsApi.toggle(id, !isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const ativos   = alerts.filter((a) => a.isActive);
  const pausados = alerts.filter((a) => !a.isActive);

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="page-title">🔔 Alertas</h1>
            <p className="page-subtitle">
              Monitore palavras-chave e receba notificações de novas licitações e contratos
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Novo Alerta'}
          </button>
        </div>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-5)', animation: 'fadeIn 0.2s ease' }}>
          <div className="card-header"><h2 className="card-title">Novo Alerta de Busca</h2></div>
          <div className="card-body">
            <div className="detail-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="input-group">
                <label className="input-label">Nome do Alerta *</label>
                <input className="input" placeholder="Ex: Pregão TI São Paulo" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Palavras-chave * <span style={{ opacity: 0.5 }}>(separadas por vírgula)</span></label>
                <input className="input" placeholder="Ex: cloud computing, AWS, Azure" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Estado (UF)</label>
                <select className="input" value={uf} onChange={(e) => setUf(e.target.value)}>
                  <option value="">Todos</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Tipo</label>
                <select className="input" value={entidade} onChange={(e) => setEntidade(e.target.value as typeof entidade)}>
                  <option value="todos">Licitações e Contratos</option>
                  <option value="contratacoes">Somente Licitações</option>
                  <option value="contratos">Somente Contratos</option>
                </select>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => create.mutate()}
              disabled={!name.trim() || !keywords.trim() || create.isPending}
            >
              {create.isPending ? <><span className="spinner" /> Criando...</> : '🔔 Criar Alerta'}
            </button>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { label: 'Alertas Ativos',   value: ativos.length,   icon: '🔔', cls: 'badge-success' },
          { label: 'Alertas Pausados', value: pausados.length, icon: '⏸', cls: 'badge-neutral' },
          { label: 'Total',            value: alerts.length,   icon: '📊', cls: 'badge-brand' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ flex: '1 1 160px' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
            <span className="spinner spinner-lg" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && alerts.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-body" style={{ padding: 'var(--space-12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
            <span style={{ fontSize: 64, opacity: 0.4 }}>🔔</span>
            <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>Nenhum alerta configurado</h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', maxWidth: 360 }}>
              Crie um alerta para monitorar palavras-chave e ser notificado de novas licitações.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              + Criar primeiro alerta
            </button>
          </div>
        </div>
      )}

      {/* Lista de alertas */}
      {ativos.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            Alertas Ativos ({ativos.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {ativos.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onToggle={() => toggle.mutate({ id: a.id, isActive: a.isActive })}
                onRemove={() => remove.mutate(a.id)}
              />
            ))}
          </div>
        </div>
      )}

      {pausados.length > 0 && (
        <div>
          <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Pausados ({pausados.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {pausados.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onToggle={() => toggle.mutate({ id: a.id, isActive: a.isActive })}
                onRemove={() => remove.mutate(a.id)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
