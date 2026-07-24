'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BandaBadge } from '@/components/banda-badge';
import { useAuthStore } from '@/lib/stores/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletConfig {
  ibgesMunicipios: string[];
  tier1Ibges: string[];
  tier2Ibges: string[];
  mesorregioes: string[];
  categoriasEquipamento: string[];
  bandaMinima: 'A' | 'B' | 'C' | 'D';
  fontes: string[];
  palavrasChaveExtra: string[];
  alertaWhatsapp: string;
  alertaEmail: string;
  alertaTelegram: string;
  ativo: boolean;
}

// ─── Dados de referência ──────────────────────────────────────────────────────

const EQUIPAMENTOS = [
  { codigo: 'TOMOGRAFO', label: '🖥 Tomógrafo Computadorizado', segmento: 'Imagem' },
  { codigo: 'ULTRASSOM', label: '🔊 Ultrassonógrafo', segmento: 'Imagem' },
  { codigo: 'RAIO_X', label: '☢️ Raio-X Digital', segmento: 'Imagem' },
  { codigo: 'MAMOGRAFO', label: '🔬 Mamógrafo', segmento: 'Imagem' },
  { codigo: 'RESSONANCIA', label: '🧲 Ressonância Magnética', segmento: 'Imagem' },
  { codigo: 'DENSITOMETRO', label: '🦴 Densitômetro Ósseo', segmento: 'Imagem' },
  { codigo: 'ENDOSCOPIA', label: '🔭 Torre de Endoscopia', segmento: 'Imagem' },
  { codigo: 'ARCO_CIRURGICO', label: '⚕️ Arco Cirúrgico', segmento: 'Cirurgia' },
  { codigo: 'MESA_CIRURGICA', label: '🛏 Mesa Cirúrgica', segmento: 'Cirurgia' },
  { codigo: 'BISTURI_ELETRICO', label: '⚡ Bisturi Elétrico', segmento: 'Cirurgia' },
  { codigo: 'FOCO_CIRURGICO', label: '💡 Foco Cirúrgico', segmento: 'Cirurgia' },
  { codigo: 'MONITOR_MULTIPARAMETRICO', label: '📊 Monitor Multiparamétrico', segmento: 'Monitoração' },
  { codigo: 'VENTILADOR_MECANICO', label: '💨 Ventilador Mecânico', segmento: 'Monitoração' },
  { codigo: 'DESFIBRILADOR', label: '❤️ Desfibrilador', segmento: 'Monitoração' },
  { codigo: 'OXIMETRO', label: '🩺 Oxímetro', segmento: 'Monitoração' },
  { codigo: 'ELETROCARDIOGRAFO', label: '📈 Eletrocardiógrafo', segmento: 'Monitoração' },
  { codigo: 'ANALISADOR_BIOQUIMICO', label: '🧪 Analisador Bioquímico', segmento: 'Laboratório' },
  { codigo: 'HEMATOLOGIA', label: '🩸 Analisador Hematológico', segmento: 'Laboratório' },
  { codigo: 'AUTOCLAVE', label: '🔵 Autoclave', segmento: 'Laboratório' },
  { codigo: 'FISIOTERAPIA', label: '💪 Equipamentos de Fisioterapia', segmento: 'Reabilitação' },
  { codigo: 'AMBULANCIA', label: '🚑 Ambulância', segmento: 'Transporte' },
  { codigo: 'EQUIPAMENTO_ODONTO', label: '🦷 Equipamento Odontológico', segmento: 'Odontologia' },
];

const MESORREGIOES_MG = [
  'Campo das Vertentes',
  'Central Mineira',
  'Jequitinhonha',
  'Metropolitana de Belo Horizonte',
  'Noroeste de Minas',
  'Norte de Minas',
  'Oeste de Minas',
  'Sul/Sudoeste de Minas',
  'Triângulo Mineiro e Alto Paranaíba',
  'Vale do Mucuri',
  'Vale do Rio Doce',
  'Zona da Mata',
];

const FONTES = [
  { codigo: 'SESLEGIS', label: '🏥 SES-MG (Resoluções/Deliberações)', desc: 'Portal saude.mg.gov.br' },
  { codigo: 'DOU_INLABS', label: '📰 DOU / INLABS', desc: 'Portarias GM/MS do Diário Oficial' },
  { codigo: 'DIARIO_OFICIAL_MG', label: '📋 IOFMG', desc: 'Diário Oficial do Estado de MG' },
  { codigo: 'QUERIDO_DIARIO', label: '📖 Querido Diário', desc: 'Diários municipais (OKBR)' },
  { codigo: 'DOMM_AMM', label: '🏙 DOMM (AMM)', desc: 'Diário dos Municípios de MG' },
];

const BANDAS = ['A', 'B', 'C', 'D'] as const;

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="card"
      style={{ marginBottom: 'var(--space-5)' }}
    >
      <div className="card-header" style={{ paddingBottom: 'var(--space-3)' }}>
        <h2 className="card-title" style={{ fontSize: '1rem' }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
        {children}
      </div>
    </div>
  );
}

function CheckChip({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 12px',
        borderRadius: 100,
        fontSize: '0.78rem',
        fontWeight: 600,
        cursor: 'pointer',
        border: `1px solid ${checked ? (color || 'rgba(0,240,255,0.4)') : 'rgba(255,255,255,0.1)'}`,
        background: checked ? (color ? `${color}18` : 'rgba(0,240,255,0.08)') : 'rgba(255,255,255,0.03)',
        color: checked ? (color || '#00F0FF') : 'var(--color-text-muted)',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: '0.65rem' }}>{checked ? '✓' : '○'}</span>
      {label}
    </button>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function CarteiraPage() {
  const { token } = useAuthStore();
  const [config, setConfig] = useState<WalletConfig>({
    ibgesMunicipios: [],
    tier1Ibges: [],
    tier2Ibges: [],
    mesorregioes: [],
    categoriasEquipamento: [],
    bandaMinima: 'B',
    fontes: ['SESLEGIS', 'DOU_INLABS'],
    palavrasChaveExtra: [],
    alertaWhatsapp: '',
    alertaEmail: '',
    alertaTelegram: '',
    ativo: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [novoIbge, setNovoIbge] = useState('');
  const [novaPalavra, setNovaPalavra] = useState('');
  const [segmentoAtivo, setSegmentoAtivo] = useState<string | null>(null);

  const apiUrl =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1')
      : 'http://localhost:4000/api/v1';

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/wallet-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          ibgesMunicipios: data.ibgesMunicipios || [],
          tier1Ibges: data.tier1Ibges || [],
          tier2Ibges: data.tier2Ibges || [],
          mesorregioes: data.mesorregioes || [],
          categoriasEquipamento: data.categoriasEquipamento || [],
          bandaMinima: data.bandaMinima || 'B',
          fontes: data.fontes || ['SESLEGIS', 'DOU_INLABS'],
          palavrasChaveExtra: data.palavrasChaveExtra || [],
          alertaWhatsapp: data.alertaWhatsapp || '',
          alertaEmail: data.alertaEmail || '',
          alertaTelegram: data.alertaTelegram || '',
          ativo: data.ativo ?? true,
        });
      }
    } catch (e) {
      console.error('Erro ao carregar carteira:', e);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/wallet-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Erro ao salvar:', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoria = (codigo: string) => {
    setConfig((prev) => ({
      ...prev,
      categoriasEquipamento: prev.categoriasEquipamento.includes(codigo)
        ? prev.categoriasEquipamento.filter((c) => c !== codigo)
        : [...prev.categoriasEquipamento, codigo],
    }));
  };

  const toggleFonte = (codigo: string) => {
    setConfig((prev) => ({
      ...prev,
      fontes: prev.fontes.includes(codigo)
        ? prev.fontes.filter((f) => f !== codigo)
        : [...prev.fontes, codigo],
    }));
  };

  const toggleMeso = (m: string) => {
    setConfig((prev) => ({
      ...prev,
      mesorregioes: prev.mesorregioes.includes(m)
        ? prev.mesorregioes.filter((x) => x !== m)
        : [...prev.mesorregioes, m],
    }));
  };

  const adicionarIbge = () => {
    const ibge = novoIbge.trim().replace(/\D/g, '');
    if (ibge.length === 7 && !config.ibgesMunicipios.includes(ibge)) {
      setConfig((prev) => ({ ...prev, ibgesMunicipios: [...prev.ibgesMunicipios, ibge] }));
      setNovoIbge('');
    }
  };

  const removerIbge = (ibge: string) => {
    setConfig((prev) => ({
      ...prev,
      ibgesMunicipios: prev.ibgesMunicipios.filter((i) => i !== ibge),
      tier1Ibges: prev.tier1Ibges.filter((i) => i !== ibge),
      tier2Ibges: prev.tier2Ibges.filter((i) => i !== ibge),
    }));
  };

  const adicionarPalavra = () => {
    const p = novaPalavra.trim();
    if (p && !config.palavrasChaveExtra.includes(p)) {
      setConfig((prev) => ({ ...prev, palavrasChaveExtra: [...prev.palavrasChaveExtra, p] }));
      setNovaPalavra('');
    }
  };

  const segmentos = [...new Set(EQUIPAMENTOS.map((e) => e.segmento))];
  const equipamentosFiltrados = segmentoAtivo
    ? EQUIPAMENTOS.filter((e) => e.segmento === segmentoAtivo)
    : EQUIPAMENTOS;

  if (loading) {
    return (
      <div className="animate-fadeIn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚙️</div>
          <p>Carregando perfil de carteira…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="page-title">🗂 Minha Carteira</h1>
          <p className="page-subtitle">
            Configure o território, portfólio de produtos e preferências de alerta
          </p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: saving ? 'wait' : 'pointer',
            border: 'none',
            background: saved
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'linear-gradient(135deg, #00F0FF, #8A2BE2)',
            color: '#000',
            boxShadow: saved
              ? '0 0 20px rgba(34,197,94,0.4)'
              : '0 0 20px rgba(0,240,255,0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          {saving ? '⏳ Salvando…' : saved ? '✓ Salvo!' : '💾 Salvar Carteira'}
        </button>
      </div>

      {/* Seção 1 — Território */}
      <SectionCard
        title="🗺 Território Monitorado"
        subtitle="Defina quais municípios e mesorregiões sua equipe monitora ativamente"
      >
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Mesorregiões de MG
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MESORREGIOES_MG.map((m) => (
              <CheckChip
                key={m}
                label={m}
                checked={config.mesorregioes.includes(m)}
                onChange={() => toggleMeso(m)}
              />
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--space-4)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Municípios por IBGE (código 7 dígitos)
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={novoIbge}
              onChange={(e) => setNovoIbge(e.target.value.replace(/\D/g, '').slice(0, 7))}
              onKeyDown={(e) => e.key === 'Enter' && adicionarIbge()}
              placeholder="Ex: 3106200 (Belo Horizonte)"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={adicionarIbge}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(0,240,255,0.3)',
                background: 'rgba(0,240,255,0.08)',
                color: '#00F0FF',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              + Adicionar
            </button>
          </div>

          {config.ibgesMunicipios.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {config.ibgesMunicipios.map((ibge) => (
                <div
                  key={ibge}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    borderRadius: 100,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  📍 {ibge}
                  <button
                    type="button"
                    onClick={() => removerIbge(ibge)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'rgba(239,68,68,0.6)',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.8rem',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {config.ibgesMunicipios.length === 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Nenhum município adicionado. Deixar vazio = monitora todo o estado de MG.
            </p>
          )}
        </div>
      </SectionCard>

      {/* Seção 2 — Portfólio */}
      <SectionCard
        title="🏥 Portfólio de Equipamentos"
        subtitle="Selecione os produtos que sua empresa vende — a IA só alerta para esses equipamentos"
      >
        {/* Filtro por segmento */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSegmentoAtivo(null)}
            style={{
              padding: '4px 12px',
              borderRadius: 100,
              fontSize: '0.75rem',
              fontWeight: 700,
              border: `1px solid ${!segmentoAtivo ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: !segmentoAtivo ? 'rgba(0,240,255,0.08)' : 'transparent',
              color: !segmentoAtivo ? '#00F0FF' : 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            Todos
          </button>
          {segmentos.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegmentoAtivo(s === segmentoAtivo ? null : s)}
              style={{
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: '0.75rem',
                fontWeight: 700,
                border: `1px solid ${s === segmentoAtivo ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: s === segmentoAtivo ? 'rgba(0,240,255,0.08)' : 'transparent',
                color: s === segmentoAtivo ? '#00F0FF' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {equipamentosFiltrados.map((eq) => (
            <CheckChip
              key={eq.codigo}
              label={eq.label}
              checked={config.categoriasEquipamento.includes(eq.codigo)}
              onChange={() => toggleCategoria(eq.codigo)}
            />
          ))}
        </div>

        {config.categoriasEquipamento.length > 0 && (
          <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.15)' }}>
            <span style={{ fontSize: '0.75rem', color: '#00F0FF', fontWeight: 700 }}>
              ✓ {config.categoriasEquipamento.length} equipamento{config.categoriasEquipamento.length !== 1 ? 's' : ''} selecionado{config.categoriasEquipamento.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </SectionCard>

      {/* Seção 3 — Fontes */}
      <SectionCard
        title="📡 Fontes de Inteligência"
        subtitle="Quais portais o robô deve monitorar para sua carteira"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FONTES.map((f) => (
            <div
              key={f.codigo}
              onClick={() => toggleFonte(f.codigo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${config.fontes.includes(f.codigo) ? 'rgba(0,240,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
                background: config.fontes.includes(f.codigo) ? 'rgba(0,240,255,0.04)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>{f.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{f.desc}</div>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `2px solid ${config.fontes.includes(f.codigo) ? '#00F0FF' : 'rgba(255,255,255,0.2)'}`,
                  background: config.fontes.includes(f.codigo) ? '#00F0FF' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {config.fontes.includes(f.codigo) && (
                  <span style={{ fontSize: '0.65rem', color: '#000', fontWeight: 900 }}>✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Seção 4 — Filtro de Banda */}
      <SectionCard
        title="🎯 Sensibilidade de Alertas"
        subtitle="Defina a partir de qual banda a plataforma deve te avisar"
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {BANDAS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, bandaMinima: b }))}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 20px',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${config.bandaMinima === b ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                background: config.bandaMinima === b ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <BandaBadge banda={b} size="md" />
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {b === 'A' ? 'Só críticos' : b === 'B' ? 'Alta prioridade' : b === 'C' ? 'Radar amplo' : 'Tudo'}
              </span>
              {config.bandaMinima === b && (
                <span style={{ fontSize: '0.65rem', color: '#00F0FF', fontWeight: 700 }}>✓ Selecionado</span>
              )}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          Você receberá alertas de oportunidades com banda {config.bandaMinima} ou superior.
        </p>
      </SectionCard>

      {/* Seção 5 — Canais de Alerta */}
      <SectionCard
        title="🔔 Canais de Alerta"
        subtitle="Onde você quer ser notificado quando surgir uma oportunidade na sua carteira"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { field: 'alertaEmail', label: '📧 E-mail', placeholder: 'seuemail@empresa.com.br', type: 'email' },
            { field: 'alertaWhatsapp', label: '💬 WhatsApp', placeholder: '+55 31 99999-9999', type: 'tel' },
            { field: 'alertaTelegram', label: '✈️ Telegram (Chat ID)', placeholder: '-100123456789', type: 'text' },
          ].map(({ field, label, placeholder, type }) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                {label}
              </label>
              <input
                type={type}
                value={(config as any)[field] || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, [field]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  width: '100%',
                  maxWidth: 400,
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Seção 6 — Palavras-chave extras */}
      <SectionCard
        title="🔍 Termos Adicionais"
        subtitle="Palavras-chave extras para ampliar o radar além dos equipamentos selecionados"
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={novaPalavra}
            onChange={(e) => setNovaPalavra(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarPalavra()}
            placeholder="Ex: rede de urgência, habilitação, emenda parlamentar…"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={adicionarPalavra}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(0,240,255,0.3)',
              background: 'rgba(0,240,255,0.08)',
              color: '#00F0FF',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            + Adicionar
          </button>
        </div>

        {config.palavrasChaveExtra.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {config.palavrasChaveExtra.map((p) => (
              <div
                key={p}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 100,
                  border: '1px solid rgba(138,43,226,0.3)',
                  background: 'rgba(138,43,226,0.08)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#d8b4fe',
                }}
              >
                🔍 {p}
                <button
                  type="button"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      palavrasChaveExtra: prev.palavrasChaveExtra.filter((x) => x !== p),
                    }))
                  }
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(239,68,68,0.6)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.8rem',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Nenhum termo extra configurado.
          </p>
        )}
      </SectionCard>

      {/* Botão de salvar final */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 'var(--space-8)' }}>
        <button
          onClick={saveConfig}
          disabled={saving}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: saving ? 'wait' : 'pointer',
            border: 'none',
            background: saved
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'linear-gradient(135deg, #00F0FF, #8A2BE2)',
            color: '#000',
            boxShadow: saved
              ? '0 0 24px rgba(34,197,94,0.4)'
              : '0 0 24px rgba(0,240,255,0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          {saving ? '⏳ Salvando…' : saved ? '✓ Carteira Salva!' : '💾 Salvar Carteira'}
        </button>
      </div>
    </div>
  );
}
