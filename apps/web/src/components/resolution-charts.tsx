"use client";

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ResolutionItem {
  id: string;
  resolutionData: string;
  mesoregiao: string;
  microrregiao: string;
  municipio: string;
  valor: number;
}

export function ResolutionCharts({ items }: { items: ResolutionItem[] }) {
  const { barData, lineData } = useMemo(() => {
    if (!items || items.length === 0) return { barData: [], lineData: [] };

    // Agrupar por microrregião (Top 10)
    const microMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};

    items.forEach(item => {
      const valor = Number(item.valor) || 0;
      
      // Microrregião
      const micro = item.microrregiao || 'Não Informado';
      microMap[micro] = (microMap[micro] || 0) + valor;

      // Data
      if (item.resolutionData) {
        const dateStr = item.resolutionData.split('T')[0];
        dateMap[dateStr] = (dateMap[dateStr] || 0) + valor;
      }
    });

    const barData = Object.entries(microMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10

    const lineData = Object.entries(dateMap)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        formattedDate: format(parseISO(item.date), 'dd/MM', { locale: ptBR })
      }));

    return { barData, lineData };
  }, [items]);

  if (items.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Gráfico de Barras: Top Microrregiões */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4 text-[var(--text-main)]">Top 10 Microrregiões (R$)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="var(--text-muted)" fontSize={12} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120} 
                stroke="var(--text-muted)" 
                fontSize={12}
                tick={{fill: 'var(--text-muted)'}}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Total Repassado']}
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-main)' }}
              />
              <Bar dataKey="value" fill="var(--primary-color)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Linha: Evolução de Repasses */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-4 text-[var(--text-main)]">Evolução Diária de Repasses (R$)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="var(--text-muted)" 
                fontSize={12} 
                tick={{fill: 'var(--text-muted)'}}
              />
              <YAxis 
                tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`} 
                stroke="var(--text-muted)" 
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Total Repassado']}
                labelStyle={{ color: 'var(--text-main)' }}
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name="Valor Diário"
                stroke="var(--accent-color)" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--accent-color)' }}
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
