'use client';

import React from 'react';

type Banda = 'A' | 'B' | 'C' | 'D';

interface BandaBadgeProps {
  banda: Banda | null | undefined;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

const BANDA_CONFIG: Record<Banda, { label: string; color: string; bg: string; border: string; glow: string; desc: string }> = {
  A: {
    label: 'BANDA A',
    color: '#00F0FF',
    bg: 'rgba(0, 240, 255, 0.12)',
    border: 'rgba(0, 240, 255, 0.4)',
    glow: '0 0 16px rgba(0, 240, 255, 0.4)',
    desc: 'Alerta imediato — alta prioridade',
  },
  B: {
    label: 'BANDA B',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.4)',
    glow: '0 0 16px rgba(34, 197, 94, 0.3)',
    desc: 'Fila de qualificação',
  },
  C: {
    label: 'BANDA C',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: '0 0 16px rgba(245, 158, 11, 0.25)',
    desc: 'Radar silencioso',
  },
  D: {
    label: 'BANDA D',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.1)',
    border: 'rgba(107, 114, 128, 0.3)',
    glow: 'none',
    desc: 'Baixa prioridade',
  },
};

export function BandaBadge({ banda, score, size = 'md', showScore = false }: BandaBadgeProps) {
  if (!banda) return null;

  const config = BANDA_CONFIG[banda];
  const sizeStyles =
    size === 'sm'
      ? { fontSize: '0.6rem', padding: '2px 6px', gap: '4px' }
      : size === 'lg'
        ? { fontSize: '0.8rem', padding: '6px 14px', gap: '8px' }
        : { fontSize: '0.7rem', padding: '3px 10px', gap: '6px' };

  return (
    <span
      title={config.desc}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...sizeStyles,
        fontWeight: 800,
        letterSpacing: '0.08em',
        borderRadius: '100px',
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.border}`,
        boxShadow: config.glow,
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        cursor: 'default',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Dot pulsante para banda A */}
      {banda === 'A' && (
        <span
          style={{
            width: size === 'sm' ? 5 : 7,
            height: size === 'sm' ? 5 : 7,
            borderRadius: '50%',
            background: config.color,
            animation: 'pulse-dot 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      {config.label}
      {showScore && score != null && (
        <span
          style={{
            marginLeft: 4,
            fontWeight: 600,
            opacity: 0.8,
            fontSize: '0.9em',
          }}
        >
          {score}
        </span>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>
    </span>
  );
}

/** Barra de progresso horizontal representando o score 0-100 */
export function ScoreBar({ score, banda }: { score: number; banda?: Banda | null }) {
  const b = banda || scoreToB(score);
  const config = BANDA_CONFIG[b];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(score, 100)}%`,
            height: '100%',
            borderRadius: 4,
            background: `linear-gradient(90deg, ${config.color}AA, ${config.color})`,
            boxShadow: `0 0 8px ${config.color}66`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: config.color, minWidth: 24, textAlign: 'right' }}>
        {score}
      </span>
    </div>
  );
}

function scoreToB(score: number): Banda {
  if (score >= 75) return 'A';
  if (score >= 55) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}
