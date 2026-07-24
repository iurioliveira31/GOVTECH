import React from 'react';
import Link from 'next/link';
import { ResolutionAlertModal } from '@/components/resolution-alert-modal';
import { ExportExcelButton } from '@/components/export-excel-button';
import { AutoRefresh } from '@/components/auto-refresh';
import { ResolutionCharts } from '@/components/resolution-charts';
import { BandaBadge, ScoreBar } from '@/components/banda-badge';

export const metadata = {
  title: 'Resoluções SES/MG | Inteligência em Verbas',
  description: 'Monitoramento inteligente de verbas fundo a fundo com IA — Resoluções da Secretaria de Estado de Saúde de Minas Gerais',
};

export const dynamic = 'force-dynamic';

async function getResolutions() {
  const apiUrl =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1';
  const ssrUrl = apiUrl
    .replace('http://137.131.227.255:4000', 'http://api-gateway:4000')
    .replace('localhost', 'api-gateway');
  try {
    const res = await fetch(`${ssrUrl}/resolutions?limit=1000`, {
      cache: 'no-store',
    });
    if (!res.ok) return { data: [] };
    return res.json();
  } catch (err) {
    console.error(err);
    return { data: [] };
  }
}

// Banda label para prazo
function prazoLabel(prazo: string | null | undefined) {
  if (!prazo) return null;
  const d = new Date(prazo);
  const hoje = new Date();
  const dias = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (dias < 0) return { text: 'Prazo vencido', color: '#ef4444' };
  if (dias <= 7) return { text: `${dias}d para adesão`, color: '#f59e0b' };
  if (dias <= 30) return { text: `${dias}d para adesão`, color: '#22c55e' };
  return { text: `${dias}d para adesão`, color: 'rgba(148,163,184,0.7)' };
}

const CATEGORIA_LABELS: Record<string, string> = {
  TOMOGRAFO: '🖥 Tomógrafo',
  ULTRASSOM: '🔊 Ultrassom',
  RAIO_X: '☢️ Raio-X',
  MAMOGRAFO: '🔬 Mamógrafo',
  RESSONANCIA: '🧲 Ressonância',
  DENSITOMETRO: '🦴 Densitômetro',
  ENDOSCOPIA: '🔭 Endoscopia',
  ARCO_CIRURGICO: '⚕️ Arco Cirúrgico',
  MESA_CIRURGICA: '🛏 Mesa Cirúrgica',
  BISTURI_ELETRICO: '⚡ Bisturi Elétrico',
  FOCO_CIRURGICO: '💡 Foco Cirúrgico',
  MONITOR_MULTIPARAMETRICO: '📊 Monitor',
  VENTILADOR_MECANICO: '💨 Ventilador',
  DESFIBRILADOR: '⚡ Desfibrilador',
  OXIMETRO: '🩺 Oxímetro',
  ELETROCARDIOGRAFO: '📈 ECG',
  ANALISADOR_BIOQUIMICO: '🧪 Bioquímica',
  HEMATOLOGIA: '🩸 Hematologia',
  AUTOCLAVE: '🔵 Autoclave',
  FISIOTERAPIA: '💪 Fisioterapia',
  AMBULANCIA: '🚑 Ambulância',
  EQUIPAMENTO_ODONTO: '🦷 Odonto',
  OUTROS: '📦 Outros',
};

export default async function ResolucoesPage() {
  const response = await getResolutions();
  let resolutions: any[] = [];
  if (response && Array.isArray(response.data)) {
    resolutions = response.data;
  } else if (response && response.data && Array.isArray(response.data.data)) {
    resolutions = response.data.data;
  } else if (Array.isArray(response)) {
    resolutions = response;
  }

  const cutoffDate = new Date('2026-07-10T00:00:00Z');

  // Prepara itens com dados enriquecidos da resolução mãe
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
                // Novos campos v2 da resolução mãe
                banda: res.banda || null,
                score: res.score || null,
                prazoAdesao: res.prazoAdesao || null,
                tipoAto: res.tipoAto || 'RESOLUCAO',
                programaFederal: res.programaFederal || null,
              });
            }
          }
        });
      }
    });
  }

  // Stats rápidas
  const totalValor = items.reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  const bandaA = items.filter((i) => i.banda === 'A').length;
  const bandaB = items.filter((i) => i.banda === 'B').length;
  const comEquipamento = items.filter(
    (i) => i.categoriaEquipamento && i.categoriaEquipamento !== 'OUTROS',
  ).length;
  const comPrazo = items.filter((i) => i.prazoAdesao).length;

  // Ordenar: banda A > B > C > D, depois por data
  const bandaOrdem: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  items.sort((a, b) => {
    const ba = bandaOrdem[a.banda] || 0;
    const bb = bandaOrdem[b.banda] || 0;
    if (bb !== ba) return bb - ba;
    return new Date(b.resolutionData || 0).getTime() - new Date(a.resolutionData || 0).getTime();
  });

  return (
    <div className="animate-fadeIn">
      <AutoRefresh intervalMs={30000} />
      <ResolutionCharts items={items} />

      {/* Page Header */}
      <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">Resoluções SES/MG</h1>
          <p className="page-subtitle">
            Monitoramento inteligente com IA — verbas fundo a fundo classificadas por oportunidade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportExcelButton items={items} />
          <ResolutionAlertModal />
        </div>
      </div>

      {/* Cards de inteligência */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Card Total */}
        <div
          className="card"
          style={{ padding: 'var(--space-4)', borderColor: 'rgba(0,240,255,0.15)' }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Total em Verbas
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00F0FF' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalValor)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {items.length} itens identificados
          </div>
        </div>

        {/* Card Banda A */}
        <div
          className="card"
          style={{ padding: 'var(--space-4)', borderColor: 'rgba(0,240,255,0.25)', background: 'rgba(0,240,255,0.04)' }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00F0FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ⚡ Banda A — Imediatos
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00F0FF' }}>
            {bandaA}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(0,240,255,0.6)', marginTop: 2 }}>
            Requerem ação urgente
          </div>
        </div>

        {/* Card Banda B */}
        <div
          className="card"
          style={{ padding: 'var(--space-4)', borderColor: 'rgba(34,197,94,0.2)' }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            🎯 Banda B — Qualificar
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e' }}>
            {bandaB}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(34,197,94,0.6)', marginTop: 2 }}>
            Fila de qualificação
          </div>
        </div>

        {/* Card Equipamentos */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            🏥 Com Equipamento
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            {comEquipamento}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            Produto identificado pela IA
          </div>
        </div>

        {/* Card Prazo */}
        <div className="card" style={{ padding: 'var(--space-4)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            ⏰ Com Prazo Adesão
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
            {comPrazo}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(245,158,11,0.6)', marginTop: 2 }}>
            Termo de adesão pendente
          </div>
        </div>
      </div>

      {/* Tabela principal */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2">
            <span className="status-dot status-dot-success" />
            Oportunidades Identificadas
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px 8px',
                borderRadius: 100,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Ordenadas por Banda IA
            </span>
          </h2>
        </div>

        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, overflowX: 'auto' }}>
          <table className="table whitespace-nowrap min-w-max">
            <thead>
              <tr>
                <th>Banda</th>
                <th>Score</th>
                <th>Data</th>
                <th>Município</th>
                <th>Equipamento</th>
                <th>Resolução</th>
                <th>Prazo Adesão</th>
                <th>Item</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const prazo = prazoLabel(item.prazoAdesao);
                const catLabel = item.categoriaEquipamento
                  ? CATEGORIA_LABELS[item.categoriaEquipamento] || item.categoriaEquipamento
                  : null;

                return (
                  <tr key={item.id}>
                    {/* Banda */}
                    <td>
                      <BandaBadge banda={item.banda} size="sm" />
                    </td>
                    {/* Score */}
                    <td style={{ minWidth: 100 }}>
                      {item.score != null ? (
                        <ScoreBar score={item.score} banda={item.banda} />
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>—</span>
                      )}
                    </td>
                    {/* Data */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {item.resolutionData
                        ? new Date(item.resolutionData).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                        : '-'}
                    </td>
                    {/* Município */}
                    <td className="font-medium text-[var(--text-main)]">
                      <div>{item.municipio || '-'}</div>
                      {item.microrregiao && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                          {item.microrregiao}
                        </div>
                      )}
                    </td>
                    {/* Equipamento */}
                    <td>
                      {catLabel ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid rgba(255,255,255,0.08)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {catLabel}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    {/* Resolução */}
                    <td style={{ fontSize: '0.8rem' }}>{item.resolutionNumero}</td>
                    {/* Prazo Adesão */}
                    <td>
                      {prazo ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: prazo.color,
                            background: `${prazo.color}18`,
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: `1px solid ${prazo.color}40`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prazo.text}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    {/* Item */}
                    <td className="max-w-[260px] truncate" title={item.item || ''}>
                      <span style={{ fontSize: '0.82rem' }}>{item.item || '-'}</span>
                    </td>
                    {/* Valor */}
                    <td>
                      <span style={{ fontWeight: 700, color: item.valor ? '#00F0FF' : 'var(--color-text-muted)' }}>
                        {item.valor
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(item.valor))
                          : 'N/E'}
                      </span>
                    </td>
                    {/* Ações */}
                    <td>
                      <Link href={`/resolucoes/${item.resolutionId}`} className="btn btn-sm btn-ghost">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-icon">📄</div>
                      <h3 className="empty-title">Nenhum repasse processado</h3>
                      <p className="empty-desc">
                        O robô ainda está aguardando ou processando as novas publicações.
                      </p>
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
