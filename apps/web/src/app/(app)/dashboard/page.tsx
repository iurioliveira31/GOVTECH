'use client';

import { useQuery } from '@tanstack/react-query';
import { pncpApi } from '@/lib/api/pncp';
import { formatCompact, formatCurrency } from '@/lib/utils/format';


// Dados mockados para desenvolvimento (substitua por chamada real)
const mockMetrics = {
  totalContratacoes: 842_391,
  totalContratos: 234_720,
  totalAtas: 51_887,
  valorTotalContratos: 48_900_000_000,
  sincronizacoes: { ok: 12, falhas: 1 },
};

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  color?: string;
  icon: string;
  loading?: boolean;
}

function MetricCard({ label, value, change, changePositive, color = '#3b82f6', icon, loading }: MetricCardProps) {
  return (
    <div className="metric-card" style={{ '--metric-color': color } as React.CSSProperties}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="metric-label">{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 36, width: '60%' }} />
      ) : (
        <div className="metric-value">{value}</div>
      )}
      {change && (
        <div className="metric-change" style={{ color: changePositive ? 'var(--color-success)' : 'var(--color-warning)' }}>
          <span>{changePositive ? '↑' : '↓'}</span>
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}

function SyncStatusCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => pncpApi.statusSync(),
    refetchInterval: 60_000,
  });

  const syncStatusColor = (status: string) => {
    const map: Record<string, string> = {
      CONCLUIDO: 'badge-success',
      EM_EXECUCAO: 'badge-info',
      FALHA: 'badge-danger',
      PENDENTE: 'badge-neutral',
    };
    return map[status] ?? 'badge-neutral';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Sincronização PNCP</h2>
        <span className={`badge ${isLoading ? 'badge-neutral' : data?.ultimosSyncs?.[0]?.status === 'CONCLUIDO' ? 'badge-success' : 'badge-warning'}`}>
          {isLoading ? 'Carregando...' : data?.ultimosSyncs?.[0]?.status ?? 'Aguardando'}
        </span>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : data?.ultimosSyncs?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {data.ultimosSyncs.slice(0, 5).map((item, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3)',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                gap: 'var(--space-3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
                  <span className={`badge ${syncStatusColor(item.status)}`} style={{ flexShrink: 0 }}>
                    {item.status}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.entityType}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Registros</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {item.registrosProcessados.toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Erros</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: item.erros > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {item.erros}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔄</div>
            <p className="empty-desc">Nenhuma sincronização registrada</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const metrics = mockMetrics;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral da plataforma e dados do PNCP</p>
      </div>

      {/* Metric Cards */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <MetricCard
          label="Licitações"
          value={formatCompact(metrics.totalContratacoes)}
          icon="🏛"
          color="#3b82f6"
          change="2.3% este mês"
          changePositive
        />
        <MetricCard
          label="Contratos Ativos"
          value={formatCompact(metrics.totalContratos)}
          icon="📋"
          color="#10b981"
          change="1.1% este mês"
          changePositive
        />
        <MetricCard
          label="Atas de Preço"
          value={formatCompact(metrics.totalAtas)}
          icon="📌"
          color="#f59e0b"
        />
        <MetricCard
          label="Valor Total Contratos"
          value={formatCurrency(metrics.valorTotalContratos)}
          icon="💰"
          color="#06b6d4"
        />
      </div>

      {/* Lower grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <SyncStatusCard />

        {/* Quick links */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Acesso Rápido</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { href: '/licitacoes?abertas=true', label: '🏛 Licitações em aberto', desc: 'Com propostas vigentes' },
              { href: '/contratos?vencendoEm30Dias=true', label: '⚠️ Contratos vencendo', desc: 'Próximos 30 dias' },
              { href: '/licitacoes?srp=true', label: '📌 Sistema de Registro de Preços', desc: 'Contratações SRP' },
              { href: '/sincronizacao', label: '🔄 Status do Sync', desc: 'Monitor de sincronização' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  transition: 'all var(--transition-base)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-overlay)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-elevated)';
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
