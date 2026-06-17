'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { searchApi, type SearchQuery, type SearchResultItem } from '@/lib/api/search';

// ── Constantes ────────────────────────────────────────────────────────────────

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const MODALIDADES = [
  { id: 1, nome: 'Pregão Eletrônico' },
  { id: 2, nome: 'Concorrência' },
  { id: 3, nome: 'Concurso' },
  { id: 4, nome: 'Leilão' },
  { id: 5, nome: 'Diálogo Competitivo' },
  { id: 6, nome: 'Manifestação de Interesse' },
  { id: 7, nome: 'Pré-qualificação' },
  { id: 8, nome: 'Dispensa Eletrônica' },
];

const ENTIDADES = [
  { value: 'todos',        label: '🔍 Todos' },
  { value: 'contratacoes', label: '🏛 Licitações' },
  { value: 'contratos',    label: '📋 Contratos' },
] as const;

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatCurrency(v?: number) {
  if (!v) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

function highlight(text: string, query: string) {
  if (!query?.trim() || !text) return text;
  const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part) =>
    regex.test(part) ? `<mark>${part}</mark>` : part
  ).join('');
}

// ── Autocomplete ──────────────────────────────────────────────────────────────
function AutocompleteInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    const res = await searchApi.autocomplete(q);
    setSuggestions(res.slice(0, 8));
    setOpen(res.length > 0);
  }, []);

  const handleChange = (q: string) => {
    onChange(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(q), 300);
  };

  const select = (s: string) => {
    onChange(s);
    setSuggestions([]);
    setOpen(false);
    onSubmit();
  };

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        type="search"
        className="input"
        placeholder="Ex: serviços de TI, pavimentação, consultoria..."
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { setOpen(false); onSubmit(); } if (e.key === 'Escape') setOpen(false); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ paddingLeft: 'var(--space-10)' }}
        autoComplete="off"
      />
      <span style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', fontSize: 18 }}>
        🔍
      </span>
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', listStyle: 'none', padding: 'var(--space-1)',
          zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                onMouseDown={() => select(s)}
                style={{
                  width: '100%', textAlign: 'left', padding: 'var(--space-2) var(--space-3)',
                  background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                🔎 {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Chip de filtro ativo ──────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 999,
      background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
      fontSize: 'var(--font-size-xs)', color: 'var(--color-brand-400)',
      fontWeight: 600,
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0, lineHeight: 1, fontSize: 14 }}
      >×</button>
    </span>
  );
}

// ── Card de resultado ─────────────────────────────────────────────────────────
function ResultCard({ item, query }: { item: SearchResultItem; query: string }) {
  const href = item.tipo === 'contrato'
    ? `/contratos/${item.id}`
    : `/licitacoes/${item.id}`;

  const objeto = item.objeto ?? '';
  const highlightedObjeto = highlight(objeto, query);

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ transition: 'all 0.2s', cursor: 'pointer' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59,130,246,0.4)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '';
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '';
        }}
      >
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className={`badge ${item.tipo === 'contrato' ? 'badge-info' : 'badge-brand'}`}>
                {item.tipo === 'contrato' ? '📋 Contrato' : '🏛 Licitação'}
              </span>
              {item.uf && <span className="badge badge-neutral">{item.uf}</span>}
              {item.situacao && (
                <span className={`badge ${item.situacao === 'Encerrada' ? 'badge-warning' : 'badge-success'}`}>
                  {item.situacao}
                </span>
              )}
            </div>
            {item.valorPrincipal && (
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-brand-400)', whiteSpace: 'nowrap' }}>
                {formatCurrency(item.valorPrincipal)}
              </span>
            )}
          </div>

          {/* Objeto */}
          <p
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: highlightedObjeto.slice(0, 280) + (objeto.length > 280 ? '…' : '') }}
          />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {item.orgaoRazaoSocial}
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              {item.dataPublicacao && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(item.dataPublicacao).toLocaleDateString('pt-BR')}
                </span>
              )}
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', opacity: 0.5 }}>
                {item.numeroControlePncp}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ResultSkeleton() {
  return (
    <div className="card" style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <div style={{ width: 80, height: 20, borderRadius: 999, background: 'var(--color-bg-elevated)' }} />
          <div style={{ width: 40, height: 20, borderRadius: 999, background: 'var(--color-bg-elevated)' }} />
        </div>
        <div style={{ height: 14, background: 'var(--color-bg-elevated)', borderRadius: 4, width: '90%' }} />
        <div style={{ height: 14, background: 'var(--color-bg-elevated)', borderRadius: 4, width: '70%' }} />
        <div style={{ height: 12, background: 'var(--color-bg-elevated)', borderRadius: 4, width: '40%' }} />
      </div>
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────
function BuscaContent() {
  const router = useRouter();
  const params = useSearchParams();

  // Estado sincronizado com URL
  const [q, setQ]                     = useState(params.get('q') ?? '');
  const [uf, setUf]                   = useState(params.get('uf') ?? '');
  const [modalidadeId, setModalidade] = useState(params.get('modalidadeId') ?? '');
  const [entidade, setEntidade]       = useState<SearchQuery['entidade']>((params.get('entidade') as SearchQuery['entidade']) ?? 'todos');
  const [vigentes, setVigentes]       = useState(params.get('vigentes') === 'true');
  const [srp, setSrp]                 = useState(params.get('srp') === 'true');
  const [pagina, setPagina]           = useState(Number(params.get('pagina') ?? 1));
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Query ativa (só dispara com pelo menos 2 chars ou filtros ativos)
  const queryKey = { q, uf, modalidadeId: modalidadeId ? Number(modalidadeId) : undefined, entidade, vigentes: vigentes || undefined, srp: srp || undefined, pagina };

  const hasActiveFilters = !!(uf || modalidadeId || vigentes || srp || (entidade && entidade !== 'todos'));

  const { data, isFetching, isError } = useQuery({
    queryKey: ['search', queryKey],
    queryFn:  () => searchApi.search({ ...queryKey, limite: 20 }),
    enabled:  !!(q.length >= 2 || hasActiveFilters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Sincronizar URL (shallow)
  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (q)           p.set('q', q);
    if (uf)          p.set('uf', uf);
    if (modalidadeId) p.set('modalidadeId', modalidadeId);
    if (entidade && entidade !== 'todos') p.set('entidade', entidade);
    if (vigentes)    p.set('vigentes', 'true');
    if (srp)         p.set('srp', 'true');
    if (pagina > 1)  p.set('pagina', String(pagina));
    router.replace(`/busca?${p.toString()}`, { scroll: false });
  }, [q, uf, modalidadeId, entidade, vigentes, srp, pagina, router]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const resetPagina = () => setPagina(1);

  const activeChips: Array<{ label: string; clear: () => void }> = [
    ...(uf              ? [{ label: `UF: ${uf}`,              clear: () => { setUf('');             resetPagina(); } }] : []),
    ...(modalidadeId    ? [{ label: MODALIDADES.find(m => String(m.id) === modalidadeId)?.nome ?? 'Modalidade', clear: () => { setModalidade(''); resetPagina(); } }] : []),
    ...(vigentes        ? [{ label: 'Vigentes',               clear: () => { setVigentes(false);    resetPagina(); } }] : []),
    ...(srp             ? [{ label: 'SRP',                    clear: () => { setSrp(false);         resetPagina(); } }] : []),
    ...(entidade && entidade !== 'todos' ? [{ label: entidade === 'contratos' ? 'Contratos' : 'Licitações', clear: () => { setEntidade('todos'); resetPagina(); } }] : []),
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🔍 Busca Avançada</h1>
        <p className="page-subtitle">
          Busca full-text em licitações e contratos do PNCP com filtros facetados
        </p>
      </div>

      {/* Barra de busca */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <AutocompleteInput value={q} onChange={setQ} onSubmit={() => resetPagina()} />
            <button
              className={`btn ${filtersOpen ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFiltersOpen(!filtersOpen)}
              style={{ whiteSpace: 'nowrap' }}
            >
              ⚙️ Filtros {hasActiveFilters && <span className="badge badge-brand" style={{ marginLeft: 6, fontSize: 10 }}>{activeChips.length}</span>}
            </button>
          </div>

          {/* Chips de filtros ativos */}
          {activeChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              {activeChips.map((chip) => (
                <FilterChip key={chip.label} label={chip.label} onRemove={chip.clear} />
              ))}
              <button
                onClick={() => { setUf(''); setModalidade(''); setVigentes(false); setSrp(false); setEntidade('todos'); resetPagina(); }}
                className="btn btn-ghost btn-xs"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Painel de filtros */}
      {filtersOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', animation: 'fadeIn 0.2s ease' }}>
          <div className="card-header"><h2 className="card-title">Filtros</h2></div>
          <div className="card-body">
            <div className="detail-grid">

              {/* Tipo */}
              <div className="input-group">
                <label className="input-label">Tipo de Resultado</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {ENTIDADES.map((e) => (
                    <button
                      key={e.value}
                      onClick={() => { setEntidade(e.value); resetPagina(); }}
                      className={`btn btn-sm ${entidade === e.value ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* UF */}
              <div className="input-group">
                <label className="input-label">Estado (UF)</label>
                <select className="input" value={uf} onChange={(e) => { setUf(e.target.value); resetPagina(); }}>
                  <option value="">Todos</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Modalidade */}
              <div className="input-group">
                <label className="input-label">Modalidade</label>
                <select className="input" value={modalidadeId} onChange={(e) => { setModalidade(e.target.value); resetPagina(); }}>
                  <option value="">Todas</option>
                  {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              {/* Toggles */}
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={vigentes} onChange={(e) => { setVigentes(e.target.checked); resetPagina(); }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Somente vigentes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={srp} onChange={(e) => { setSrp(e.target.checked); resetPagina(); }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Somente SRP (Ata de Preços)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aggregations / facets */}
      {data?.aggregations && (data.aggregations.ufs.length > 0 || data.aggregations.modalidades.length > 0) && (
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          {data.aggregations.ufs.slice(0, 10).map((u) => (
            <button
              key={u.key}
              onClick={() => { setUf(u.key === uf ? '' : u.key); resetPagina(); }}
              className={`btn btn-xs ${uf === u.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              {u.key} <span style={{ opacity: 0.6, marginLeft: 3 }}>{u.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      <div>
        {/* Contagem */}
        {data && (
          <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              {data.total.toLocaleString('pt-BR')} resultado{data.total !== 1 ? 's' : ''} em {data.took}ms
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Página {data.pagina} de {data.totalPaginas}
            </span>
          </div>
        )}

        {/* Loading */}
        {isFetching && !data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 5 }).map((_, i) => <ResultSkeleton key={i} />)}
          </div>
        )}

        {/* Erro */}
        {isError && (
          <div className="card" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
            <div className="card-body" style={{ color: 'var(--color-danger)' }}>
              ❌ Elasticsearch offline ou erro de busca. Verifique a conexão com o servidor.
            </div>
          </div>
        )}

        {/* Empty state — nenhuma busca */}
        {!data && !isFetching && !isError && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 'var(--space-12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 64, opacity: 0.4 }}>🔍</span>
              <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>Comece sua busca</h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', maxWidth: 400 }}>
                Digite pelo menos 2 caracteres ou selecione filtros para buscar licitações e contratos do PNCP.
              </p>
            </div>
          </div>
        )}

        {/* Empty state — sem resultados */}
        {data && data.items.length === 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 'var(--space-12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: 64, opacity: 0.4 }}>😕</span>
              <h2 style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>Nenhum resultado</h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Tente termos mais genéricos ou remova alguns filtros.
              </p>
            </div>
          </div>
        )}

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          {data?.items.map((item) => (
            <ResultCard key={`${item.tipo}-${item.id}`} item={item} query={q} />
          ))}
        </div>

        {/* Paginação */}
        {data && data.totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-8)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(7, data.totalPaginas) }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`btn btn-sm ${pagina === p ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPagina(p)}
                >
                  {p}
                </button>
              );
            })}
            {data.totalPaginas > 7 && (
              <>
                <span style={{ color: 'var(--color-text-muted)', padding: '0 4px' }}>…</span>
                <button className={`btn btn-sm ${pagina === data.totalPaginas ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPagina(data.totalPaginas)}>
                  {data.totalPaginas}
                </button>
              </>
            )}
            <button
              className="btn btn-ghost btn-sm"
              disabled={pagina >= data.totalPaginas}
              onClick={() => setPagina((p) => Math.min(data.totalPaginas, p + 1))}
            >
              Próximo →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Wrapper com Suspense para compatibilidade com Next.js 15 SSG
export default function BuscaPage() {
  return (
    <Suspense fallback={
      <div className="card">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
          <span className="spinner spinner-lg" />
        </div>
      </div>
    }>
      <BuscaContent />
    </Suspense>
  );
}
