'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  intelligenceApi,
  OrgaoRadarItem,
  OportunidadeRanking,
} from '@/lib/api/intelligence';
import { formatCurrency, formatDate } from '@/lib/utils/format';

// ── Helpers ──────────────────────────────────────────────────────────────────

const UFS = [
  '', 'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function scoreColor(score: number) {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

function tendenciaIcon(t: OrgaoRadarItem['tendencia']) {
  if (t === 'ALTA') return { icon: '↑', color: '#10b981' };
  if (t === 'QUEDA') return { icon: '↓', color: '#ef4444' };
  return { icon: '→', color: '#94a3b8' };
}

function ScoreCircle({ score }: { score: number }) {
  const color = scoreColor(score);
  const circ = 2 * Math.PI * 20;
  const dash = (score / 100) * circ;

  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx={26} cy={26} r={20} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
        <circle
          cx={26} cy={26} r={20} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'all 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color,
      }}>
        {score}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: color,
        borderRadius: 2, transition: 'width 0.8s ease',
      }} />
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'radar' | 'oportunidades';

// ── Página Principal ─────────────────────────────────────────────────────────

export default function InteligenciaPage() {
  const [tab, setTab] = useState<Tab>('radar');
  const [uf, setUf] = useState('');
  const [paginaOpor, setPaginaOpor] = useState(1);

  const { data: radarData, isLoading: loadingRadar } = useQuery({
    queryKey: ['intelligence-radar', uf],
    queryFn: () => intelligenceApi.getRadar({ uf: uf || undefined, limite: 30 }),
    staleTime: 5 * 60_000,
  });

  const { data: opData, isLoading: loadingOp } = useQuery({
    queryKey: ['intelligence-oportunidades', uf, paginaOpor],
    queryFn: () => intelligenceApi.getOportunidades({ uf: uf || undefined, pagina: paginaOpor, limite: 20 }),
    staleTime: 3 * 60_000,
    enabled: tab === 'oportunidades',
  });

  const resumo = radarData?.resumo;
  const maxLic = Math.max(...(radarData?.radar.map(r => r.totalLicitacoes) ?? [1]));

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 10, width: 36, height: 36,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🎯</span>
            Inteligência Preditiva
          </h1>
          <p className="page-subtitle">
            Raio-X do mercado de licitações — identifique oportunidades antes da concorrência
          </p>
        </div>

        {/* Filtro UF */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <select
            className="input"
            value={uf}
            onChange={e => { setUf(e.target.value); setPaginaOpor(1); }}
            style={{ minWidth: 120 }}
            id="filtro-uf"
          >
            <option value="">🇧🇷 Todo Brasil</option>
            {UFS.filter(Boolean).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Métricas de resumo */}
      {resumo && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
        }}>
          {[
            { label: 'Órgãos Ativos (30d)', value: resumo.totalOrgaosAtivos.toLocaleString('pt-BR'), icon: '🏢', color: '#6366f1' },
            { label: 'Volume de Mercado (30d)', value: formatCurrency(resumo.valorTotalMercado), icon: '💰', color: '#10b981' },
            { label: 'Licitações Abertas', value: resumo.licitacoesAbertasHoje.toLocaleString('pt-BR'), icon: '📋', color: '#3b82f6' },
            { label: 'Encerrando em 7 dias', value: resumo.encerrando7dias.toLocaleString('pt-BR'), icon: '⏰', color: '#f59e0b' },
          ].map(m => (
            <div key={m.label} className="metric-card" style={{ '--metric-color': m.color } as React.CSSProperties}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="metric-label">{m.label}</span>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
              </div>
              <div className="metric-value" style={{ fontSize: 'var(--font-size-xl)', color: m.color }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {([
          { id: 'radar', label: '🏆 Radar de Órgãos' },
          { id: 'oportunidades', label: '🎯 Oportunidades Abertas' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Radar ─────────────────────────────────────────────────────── */}
      {tab === 'radar' && (
        <>
          {/* Distribuição de Modalidades */}
          {radarData?.topModalidades && radarData.topModalidades.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="card-header">
                <h2 className="card-title">Distribuição por Modalidade (30d)</h2>
              </div>
              <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  {radarData.topModalidades.map((m, i) => {
                    const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
                    const color = colors[i % colors.length];
                    return (
                      <div key={m.modalidade} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30`,
                        borderRadius: 8, padding: '6px 12px',
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                          {m.modalidade}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color }}>
                          {m.total.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Radar de Órgãos */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Radar de Órgãos — Mais Ativos</h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {radarData?.radar.length ?? 0} órgãos analisados
              </span>
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 52 }}>Score</th>
                    <th>Órgão</th>
                    <th style={{ textAlign: 'center' }}>UF</th>
                    <th style={{ textAlign: 'right' }}>Licitações</th>
                    <th style={{ width: 120 }}>Últimos 30d</th>
                    <th style={{ textAlign: 'right' }}>Valor Estimado</th>
                    <th style={{ textAlign: 'center' }}>Tendência</th>
                    <th>Modalidade Top</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRadar
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 9 }).map((_, j) => (
                            <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                          ))}
                        </tr>
                      ))
                    : radarData?.radar.map((orgao) => {
                        const { icon, color } = tendenciaIcon(orgao.tendencia);
                        return (
                          <tr key={orgao.cnpj} style={{ verticalAlign: 'middle' }}>
                            <td><ScoreCircle score={orgao.scoreOportunidade} /></td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', maxWidth: 260 }}>
                                {orgao.razaoSocial}
                              </div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {orgao.cnpj}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-neutral">{orgao.uf ?? '—'}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700 }}>{orgao.totalLicitacoes.toLocaleString('pt-BR')}</div>
                              <MiniBar value={orgao.totalLicitacoes} max={maxLic} color="#6366f1" />
                            </td>
                            <td>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                {orgao.licitacoesUltimos30d} licitações
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {formatCurrency(orgao.valorTotalEstimadoLicitacoes)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: 18, color, fontWeight: 700 }}>
                                {icon}
                              </span>
                              <div style={{ fontSize: 'var(--font-size-xs)', color }}>
                                {orgao.tendencia}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                {orgao.modalidadeTop ?? '—'}
                              </span>
                            </td>
                            <td>
                              <Link
                                href={`/orgaos/${orgao.cnpj}`}
                                className="btn btn-ghost btn-sm"
                              >
                                Ver →
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Oportunidades ────────────────────────────────────────────── */}
      {tab === 'oportunidades' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Oportunidades Abertas — Ranqueadas por Score</h2>
            {opData && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {opData.total.toLocaleString('pt-BR')} resultados
              </span>
            )}
          </div>

          <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
            {loadingOp ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <span className="spinner" style={{ width: 32, height: 32 }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {(opData?.items ?? []).map((op) => (
                  <OportunidadeCard key={op.id} op={op} />
                ))}
              </div>
            )}
          </div>

          {/* Paginação */}
          {opData && opData.total > 20 && (
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'center', gap: 'var(--space-2)',
            }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={paginaOpor <= 1}
                onClick={() => setPaginaOpor(p => p - 1)}
              >
                ← Anterior
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', padding: '0 12px' }}>
                Página {paginaOpor} de {Math.ceil(opData.total / 20)}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={paginaOpor >= Math.ceil(opData.total / 20)}
                onClick={() => setPaginaOpor(p => p + 1)}
              >
                Próximo →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Card de Oportunidade ──────────────────────────────────────────────────────

function OportunidadeCard({ op }: { op: OportunidadeRanking }) {
  const urgencia = op.diasRestantes <= 3
    ? { label: `⚡ ${op.diasRestantes}d`, color: '#ef4444' }
    : op.diasRestantes <= 7
    ? { label: `🔥 ${op.diasRestantes}d`, color: '#f59e0b' }
    : { label: `⏰ ${op.diasRestantes}d`, color: '#10b981' };

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: 'var(--space-4)',
      background: 'rgba(255,255,255,0.02)',
      transition: 'border-color 0.2s',
      display: 'grid',
      gridTemplateColumns: '52px 1fr auto',
      gap: 'var(--space-4)',
      alignItems: 'start',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#6366f160')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      {/* Score */}
      <ScoreCircle score={op.scoreOportunidade} />

      {/* Conteúdo */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 'var(--font-size-sm)', lineHeight: 1.4 }}>
          {op.objetoCompra.length > 120 ? op.objetoCompra.slice(0, 120) + '...' : op.objetoCompra}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 8 }}>
          {op.orgaoRazaoSocial && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              🏢 {op.orgaoRazaoSocial.slice(0, 50)}
            </span>
          )}
          {op.uf && (
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>{op.uf}</span>
          )}
          {op.modalidadeNome && (
            <span className="badge badge-info" style={{ fontSize: 10 }}>{op.modalidadeNome}</span>
          )}
        </div>
        {/* Motivos do score */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {op.motivos.map(m => (
            <span key={m} style={{
              fontSize: 10, padding: '2px 8px',
              background: 'rgba(99,102,241,0.12)', color: '#818cf8',
              borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)',
            }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Lado direito */}
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
        {op.valorTotalEstimado != null && op.valorTotalEstimado > 0 && (
          <div style={{ fontWeight: 700, color: '#10b981', fontSize: 'var(--font-size-sm)' }}>
            {formatCurrency(op.valorTotalEstimado)}
          </div>
        )}
        <div style={{ fontWeight: 700, color: urgencia.color, fontSize: 'var(--font-size-sm)' }}>
          {urgencia.label}
        </div>
        {op.dataEncerramentoProposta && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Encerra: {formatDate(op.dataEncerramentoProposta)}
          </div>
        )}
        <Link
          href={`/licitacoes/${op.id}`}
          className="btn btn-primary btn-sm"
          style={{ marginTop: 4 }}
        >
          Ver edital →
        </Link>
      </div>
    </div>
  );
}
