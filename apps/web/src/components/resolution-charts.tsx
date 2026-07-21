"use client";

import React, { useMemo } from 'react';

interface ResolutionItem {
  id: string;
  resolutionData: string;
  mesoregiao: string;
  microrregiao: string;
  municipio: string;
  valor: number;
}

export function ResolutionCharts({ items }: { items: ResolutionItem[] }) {
  const stats = useMemo(() => {
    if (!items || items.length === 0) return null;

    const totalValor = items.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
    const municipiosUnicos = new Set(items.map(i => i.municipio).filter(Boolean)).size;
    const mesorregioes = new Set(items.map(i => i.mesoregiao).filter(Boolean)).size;

    // Top microrregião por valor
    const microMap: Record<string, number> = {};
    items.forEach(item => {
      const micro = item.microrregiao || 'Não Informado';
      microMap[micro] = (microMap[micro] || 0) + (Number(item.valor) || 0);
    });
    const topMicro = Object.entries(microMap).sort((a, b) => b[1] - a[1])[0];

    return { totalValor, municipiosUnicos, mesorregioes, topMicro };
  }, [items]);

  if (!stats || items.length === 0) return null;

  const fmt = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="card p-4">
        <p className="text-xs text-[var(--text-muted)] mb-1">Total Repassado</p>
        <p className="text-lg font-bold text-primary truncate">{fmt(stats.totalValor)}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{items.length} repasses</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-[var(--text-muted)] mb-1">Municípios</p>
        <p className="text-2xl font-bold text-[var(--text-main)]">{stats.municipiosUnicos}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">beneficiados</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-[var(--text-muted)] mb-1">Mesorregiões</p>
        <p className="text-2xl font-bold text-[var(--text-main)]">{stats.mesorregioes}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">atendidas</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-[var(--text-muted)] mb-1">Top Microrregião</p>
        <p className="text-sm font-bold text-[var(--text-main)] leading-tight truncate">{stats.topMicro?.[0] || '-'}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 truncate">{stats.topMicro ? fmt(stats.topMicro[1]) : '-'}</p>
      </div>
    </div>
  );
}
