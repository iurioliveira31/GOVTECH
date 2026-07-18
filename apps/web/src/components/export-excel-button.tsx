"use client";

import React from 'react';

export function ExportExcelButton({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  const handleExport = () => {
    // Definir as colunas (cabeçalho)
    const header = [
      'Data',
      'Mesoregião',
      'Microrregião',
      'Município',
      'Resolução',
      'Local',
      'Item',
      'Valor'
    ];

    // Mapear os itens para linhas
    const rows = items.map(item => [
      item.resolutionData ? new Date(item.resolutionData).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '',
      item.mesoregiao || '',
      item.microrregiao || '',
      item.municipio || '',
      item.resolutionNumero || '',
      item.local || '',
      item.item || '',
      item.valor ? Number(item.valor).toFixed(2).replace('.', ',') : ''
    ]);

    // Montar o CSV com ponto e vírgula e aspas duplas (padrão Brasil/Excel)
    const csvContent = [
      header.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    // Adicionar BOM (Byte Order Mark) para o Excel reconhecer UTF-8 corretamente
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Fazer o download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resolucoes_ses_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleExport} className="btn btn-outline flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Baixar Excel
    </button>
  );
}
