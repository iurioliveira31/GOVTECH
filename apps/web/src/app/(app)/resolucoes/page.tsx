import React from 'react';
import Link from 'next/link';
import { ResolutionAlertModal } from '@/components/resolution-alert-modal';
import { ExportExcelButton } from '@/components/export-excel-button';
import { AutoRefresh } from '@/components/auto-refresh';

import { ResolutionCharts } from '@/components/resolution-charts';

export const metadata = {
  title: 'Resoluções SES/MG',
};

// Next.js config para recarregar a cada hora (opcional) ou sempre ser dinâmico
export const dynamic = 'force-dynamic';

async function getResolutions() {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  // Use internal docker network URL for SSR if possible to avoid hairpin NAT issues
  const ssrUrl = apiUrl.replace('http://137.131.227.255:4000', 'http://api-gateway:4000').replace('localhost', 'api-gateway');
  try {
    const res = await fetch(`${ssrUrl}/resolutions?limit=1000`, {
      cache: 'no-store'
    });
    if (!res.ok) return { data: [] };
    return res.json();
  } catch (err) {
    console.error(err);
    return { data: [] };
  }
}

export default async function ResolucoesPage() {
  const response = await getResolutions();
  let resolutions: any[] = [];
  if (response && Array.isArray(response.data)) {
    resolutions = response.data;
  } else if (Array.isArray(response)) {
    resolutions = response;
  }
  
  const cutoffDate = new Date('2026-07-10T00:00:00Z');

  const items: any[] = [];
  if (resolutions && Array.isArray(resolutions)) {
    resolutions.forEach((res: any) => {
      if (res && res.items && Array.isArray(res.items)) {
        res.items.forEach((item: any) => {
          const itemDate = item.resolutionData || res.dataPublicacao || res.data;
          if (itemDate) {
            const dateObj = new Date(itemDate);
            if (dateObj.getTime() >= cutoffDate.getTime()) {
              items.push({
                ...item,
                resolutionNumero: res.numero,
                resolutionData: res.dataPublicacao || res.data,
              });
            }
          }
        });
      }
    });
  }

  return (
    <div className="animate-fadeIn">
      <AutoRefresh intervalMs={30000} />
      <ResolutionCharts items={items} />
      <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Resoluções SES/MG</h1>
          <p className="page-subtitle">Monitoramento de verbas fundo a fundo (Resoluções de Saúde de Minas Gerais)</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton items={items} />
          <ResolutionAlertModal />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <span className="status-dot status-dot-success"></span>
            Últimos Repasses Identificados
          </h2>
        </div>
        
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
          <table className="table whitespace-nowrap min-w-max">
            <thead>
              <tr>
                <th>Data</th>
                <th>Mesoregião</th>
                <th>Microrregião</th>
                <th>Município</th>
                <th>Resolução</th>
                <th>Local</th>
                <th>Item</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.resolutionData ? new Date(item.resolutionData).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                  <td>{item.mesoregiao || '-'}</td>
                  <td>{item.microrregiao || '-'}</td>
                  <td className="font-medium text-[var(--text-main)]">{item.municipio || '-'}</td>
                  <td>{item.resolutionNumero}</td>
                  <td>{item.local || '-'}</td>
                  <td className="max-w-[300px] truncate" title={item.item || ''}>{item.item || '-'}</td>
                  <td className="font-semibold text-primary">
                    {item.valor 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valor))
                      : 'Não Especificado'}
                  </td>
                  <td>
                    <Link href={`/resolucoes/${item.resolutionId}`} className="btn btn-sm btn-ghost">
                      Ver Resolução
                    </Link>
                  </td>
                </tr>
              ))}
              
              {items.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <div className="empty-icon">📄</div>
                      <h3 className="empty-title">Nenhum repasse processado</h3>
                      <p className="empty-desc">O robô ainda está aguardando ou processando as novas publicações.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
