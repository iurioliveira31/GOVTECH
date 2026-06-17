'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiApi, type AnaliseContrato, type ResumoLicitacao } from '@/lib/api/ai';

type ModoAnalise = 'contrato' | 'licitacao';

// ── Subcomponente: Gauge de Score ─────────────────────────────────────────────
function ScoreGauge({
  label,
  value,
  inverted = false,
}: {
  label: string;
  value: number;
  inverted?: boolean;
}) {
  const color =
    inverted
      ? value >= 70 ? 'var(--color-danger)' : value >= 40 ? 'var(--color-warning)' : 'var(--color-success)'
      : value >= 70 ? 'var(--color-success)' : value >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 213.6} 213.6`}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dasharray 1s ease, stroke 0.3s ease' }}
          />
        </svg>
        <span style={{
          position: 'absolute',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
        }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  );
}

// ── Subcomponente: Badge de Classificação ─────────────────────────────────────
function ClassificacaoBadge({ c }: { c: string }) {
  const map: Record<string, { cls: string; label: string; icon: string }> = {
    BAIXO_RISCO: { cls: 'badge-success', label: 'Baixo Risco', icon: '✅' },
    MEDIO_RISCO: { cls: 'badge-warning', label: 'Médio Risco', icon: '⚠️' },
    ALTO_RISCO:  { cls: 'badge-danger',  label: 'Alto Risco',  icon: '🔴' },
    CRITICO:     { cls: 'badge-danger',  label: 'Crítico',     icon: '🚨' },
    BAIXA:  { cls: 'badge-success', label: 'Baixa Complexidade', icon: '🟢' },
    MEDIA:  { cls: 'badge-warning', label: 'Média Complexidade', icon: '🟡' },
    ALTA:   { cls: 'badge-danger',  label: 'Alta Complexidade',  icon: '🔴' },
  };
  const m = map[c] ?? { cls: 'badge-neutral', label: c, icon: '•' };
  return (
    <span className={`badge ${m.cls}`} style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px' }}>
      {m.icon} {m.label}
    </span>
  );
}

// ── Resultado: Análise de Contrato ────────────────────────────────────────────
function ResultadoContrato({ r }: { r: AnaliseContrato }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', animation: 'fadeIn 0.4s ease both' }}>

      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30,58,138,0.4), rgba(15,22,41,0.8))', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>Análise Gemini AI</div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text-primary)' }}>Contrato {r.numeroControlePncp}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Gerado em {new Date(r.analisadoEm).toLocaleString('pt-BR')}
            </div>
          </div>
          <ClassificacaoBadge c={r.classificacao} />
        </div>
      </div>

      {/* Scores */}
      <div className="card">
        <div className="card-header"><h2 className="card-title">Scores</h2></div>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-8)' }}>
          <ScoreGauge label="Conformidade" value={r.scoreConformidade} />
          <ScoreGauge label="Risco" value={r.scoreRisco} inverted />
        </div>
      </div>

      {/* Resumo */}
      <div className="card">
        <div className="card-header"><h2 className="card-title">Resumo Executivo</h2></div>
        <div className="card-body">
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{r.resumo}</p>
        </div>
      </div>

      {/* Pontos de atenção */}
      {r.pontosAtencao.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⚠️ Pontos de Atenção</h2>
            <span className="badge badge-warning">{r.pontosAtencao.length}</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {r.pontosAtencao.map((p, i) => (
              <div key={i} style={{
                padding: 'var(--space-3) var(--space-4)',
                borderLeft: '3px solid var(--color-warning)',
                background: 'var(--color-warning-bg)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}>{p}</div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendações */}
      {r.recomendacoes.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">💡 Recomendações</h2></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {r.recomendacoes.map((rec, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}>
                <span style={{ color: 'var(--color-brand-400)', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fundamento legal */}
      {r.fundamentoLegal.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">📖 Fundamento Legal</h2></div>
          <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {r.fundamentoLegal.map((f, i) => (
              <span key={i} className="badge badge-info" style={{ fontSize: 'var(--font-size-xs)' }}>{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resultado: Resumo de Licitação ────────────────────────────────────────────
function ResultadoLicitacao({ r }: { r: ResumoLicitacao }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', animation: 'fadeIn 0.4s ease both' }}>

      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.2), rgba(15,22,41,0.8))', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>Resumo Executivo — Gemini AI</div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700 }}>Licitação {r.numeroControlePncp}</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {new Date(r.analisadoEm).toLocaleString('pt-BR')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <ClassificacaoBadge c={r.complexidade} />
            <span className="badge badge-brand" style={{ fontSize: 10 }}>{r.classificacaoObjeto}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="card-title">Resumo para Gestão</h2></div>
        <div className="card-body">
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>{r.resumoExecutivo}</p>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div className="detail-field-label">Análise de Prazo</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>{r.prazoAnalise}</div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {r.oportunidades.length > 0 && (
          <div className="card">
            <div className="card-header"><h2 className="card-title">🎯 Oportunidades</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {r.oportunidades.map((o, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-success)', flexShrink: 0 }}>▸</span>{o}
                </div>
              ))}
            </div>
          </div>
        )}
        {r.requisitosProvaveis.length > 0 && (
          <div className="card">
            <div className="card-header"><h2 className="card-title">📋 Requisitos Prováveis</h2></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {r.requisitosProvaveis.map((req, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-brand-400)', flexShrink: 0 }}>▸</span>{req}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {r.tags.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">Tags</h2></div>
          <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {r.tags.map((tag, i) => (
              <span key={i} className="badge badge-neutral">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────────
export default function AnalisePage() {
  const [modo, setModo] = useState<ModoAnalise>('contrato');
  const [inputId, setInputId] = useState('');
  const [resultadoContrato, setResultadoContrato] = useState<AnaliseContrato | null>(null);
  const [resultadoLicitacao, setResultadoLicitacao] = useState<ResumoLicitacao | null>(null);

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.status(),
    staleTime: 60_000,
  });

  const analisarContrato = useMutation({
    mutationFn: (id: string) => aiApi.analisarContrato(id),
    onSuccess: (data) => { setResultadoContrato(data); setResultadoLicitacao(null); },
  });

  const resumirLicitacao = useMutation({
    mutationFn: (id: string) => aiApi.resumirLicitacao(id),
    onSuccess: (data) => { setResultadoLicitacao(data); setResultadoContrato(null); },
  });

  const isLoading = analisarContrato.isPending || resumirLicitacao.isPending;
  const error = analisarContrato.error || resumirLicitacao.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    if (modo === 'contrato') analisarContrato.mutate(inputId.trim());
    else resumirLicitacao.mutate(inputId.trim());
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🤖 Análise com IA</h1>
        <p className="page-subtitle">
          Análise inteligente de contratos e licitações com Gemini AI — score de conformidade, riscos e recomendações legais
        </p>
      </div>

      {/* Status AI */}
      <div
        className="card"
        style={{ marginBottom: 'var(--space-5)', border: aiStatus?.available ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)' }}
      >
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className={`status-dot ${aiStatus?.available ? 'status-dot-success' : 'status-dot-danger'}`} style={{ width: 10, height: 10 }} />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {aiStatus?.available
              ? `Gemini AI ativo (${aiStatus.model})`
              : 'Gemini AI offline — configure GEMINI_API_KEY no servidor'}
          </span>
        </div>
      </div>

      {/* Formulário */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2 className="card-title">Selecionar Objeto de Análise</h2>
        </div>
        <div className="card-body">
          {/* Toggle modo */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', padding: 4, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
            {([
              { value: 'contrato',  label: '📋 Contrato' },
              { value: 'licitacao', label: '🏛 Licitação' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setModo(opt.value); setInputId(''); }}
                className={`btn ${modo === opt.value ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                style={{ minWidth: 120 }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="input-group" style={{ flex: 1, minWidth: 280 }}>
              <label className="input-label">
                {modo === 'contrato' ? 'ID do Contrato (UUID interno)' : 'ID da Licitação (UUID interno)'}
              </label>
              <input
                type="text"
                className="input"
                placeholder={modo === 'contrato' ? 'Ex: 3f4a8c12-...' : 'Ex: 7b2d1e09-...'}
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                required
              />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                Copie o ID da URL da página de detalhe do {modo === 'contrato' ? 'contrato' : 'licitação'}
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !aiStatus?.available}
              style={{ minWidth: 160 }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" /> Analisando...
                </>
              ) : (
                <>🤖 Analisar com IA</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center', padding: 'var(--space-10)' }}>
            <div className="spinner spinner-lg" />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Gemini AI está analisando os dados... Isso pode levar alguns segundos.
            </p>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-5)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--space-3)', color: 'var(--color-danger)' }}>
            <span>❌</span>
            <div>
              <strong>Erro na análise:</strong>
              <p style={{ marginTop: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {(error as Error).message ?? 'Erro desconhecido'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultadoContrato && <ResultadoContrato r={resultadoContrato} />}
      {resultadoLicitacao && <ResultadoLicitacao r={resultadoLicitacao} />}
    </>
  );
}
