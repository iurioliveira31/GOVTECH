'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pncpApi } from '@/lib/api/pncp';
import { formatDateTime } from '@/lib/utils/format';

function statusColor(status: string) {
  const map: Record<string, string> = {
    CONCLUIDO: 'badge-success',
    EM_EXECUCAO: 'badge-info',
    FALHA: 'badge-danger',
    PENDENTE: 'badge-neutral',
  };
  return map[status] ?? 'badge-neutral';
}

export default function SincronizacaoPage() {
  const queryClient = useQueryClient();
  const [triggering, setTriggering] = useState(false);
  const [triggeringComprasGov, setTriggeringComprasGov] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sync-status-detail'],
    queryFn: () => pncpApi.statusSync(),
    refetchInterval: 15_000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => pncpApi.triggerIncremental(),
    onSuccess: () => {
      setTriggering(false);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['sync-status-detail'] }), 2000);
    },
    onError: () => setTriggering(false),
  });

  const triggerComprasGovMutation = useMutation({
    mutationFn: () => pncpApi.triggerComprasGov(),
    onSuccess: () => {
      setTriggeringComprasGov(false);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['sync-status-detail'] }), 2000);
    },
    onError: () => setTriggeringComprasGov(false),
  });

  const handleTrigger = () => {
    setTriggering(true);
    triggerMutation.mutate();
  };

  const handleTriggerComprasGov = () => {
    setTriggeringComprasGov(true);
    triggerComprasGovMutation.mutate();
  };


  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Sincronização PNCP</h1>
          <p className="page-subtitle">Monitor de ingestão de dados do Portal Nacional de Contratações Públicas</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <span className="spinner" /> : '↻'} Atualizar
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleTriggerComprasGov}
            disabled={triggeringComprasGov || triggerComprasGovMutation.isPending}
            title="Importar licitações históricas do ComprasNet (pré-PNCP)"
          >
            {triggeringComprasGov || triggerComprasGovMutation.isPending ? (
              <><span className="spinner" /> Importando...</>
            ) : '🏛 Sync ComprasGov'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleTrigger}
            disabled={triggering || triggerMutation.isPending}
          >
            {triggering || triggerMutation.isPending ? (
              <><span className="spinner" /> Iniciando...</>
            ) : '▶ Sync Incremental'}
          </button>
        </div>
      </div>

      {/* Totais por entidade */}
      {data?.totais && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[
            { label: 'Contratações', value: data.totais.contratacoes, icon: '🏛', color: '#3b82f6' },
            { label: 'Contratos', value: data.totais.contratos, icon: '📋', color: '#10b981' },
            { label: 'Atas', value: data.totais.atas, icon: '📌', color: '#f59e0b' },
            { label: 'PCAs', value: data.totais.pcas, icon: '📊', color: '#06b6d4' },
            { label: 'Órgãos', value: data.totais.orgaos, icon: '🏢', color: '#8b5cf6' },
            { label: 'Fornecedores', value: data.totais.fornecedores, icon: '🏭', color: '#ec4899' },
          ].map(m => (
            <div key={m.label} className="metric-card" style={{ '--metric-color': m.color } as React.CSSProperties}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="metric-label">{m.label}</span>
                <span>{m.icon}</span>
              </div>
              <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)' }}>
                {m.value.toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico de execuções */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Execuções Recentes</h2>
          {isFetching && <span className="spinner" />}
        </div>
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Entidade</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Processados</th>
                <th style={{ textAlign: 'right' }}>Erros</th>
                <th>Iniciado em</th>
                <th>Concluído em</th>
                <th>Último Erro</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                  ))}</tr>
                ))
              ) : data?.ultimosSyncs?.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon">🔄</div>
                    <p className="empty-title">Nenhuma execução registrada</p>
                    <p className="empty-desc">Inicie uma sincronização para ver o histórico</p>
                  </div>
                </td></tr>
              ) : (
                (data?.ultimosSyncs ?? []).map((item, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {item.entityType}
                      </span>
                    </td>
                    <td><span className={`badge ${statusColor(item.status)}`}>{item.status}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                      {item.registrosProcessados.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.erros > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>
                      {item.erros}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(item.iniciadoEm)}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(item.concluidoEm)}
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      {item.ultimoErro ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {item.ultimoErro}
                        </span>
                      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
