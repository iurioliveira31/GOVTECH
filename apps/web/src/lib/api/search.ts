import { apiClient } from './client';

export interface SearchQuery {
  q?: string;
  uf?: string;
  modalidadeId?: number;
  situacao?: string;
  srp?: boolean;
  valorMinimo?: number;
  valorMaximo?: number;
  dataPublicacaoInicio?: string;
  dataPublicacaoFim?: string;
  orgaoCnpj?: string;
  niFornecedor?: string;
  vigentes?: boolean;
  entidade?: 'contratacoes' | 'contratos' | 'todos';
  pagina?: number;
  limite?: number;
}

export interface SearchResultItem {
  id: string;
  tipo: 'contratacao' | 'contrato';
  score: number;
  numeroControlePncp: string;
  objeto?: string;
  valorPrincipal?: number;
  dataPublicacao?: string;
  uf?: string;
  orgaoRazaoSocial?: string;
  situacao?: string;
  modalidadeNome?: string;
  [key: string]: unknown;
}

export interface SearchResult {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  took: number;
  items: SearchResultItem[];
  aggregations?: {
    ufs: Array<{ key: string; count: number }>;
    modalidades: Array<{ key: string; count: number }>;
    faixasValor: Array<{ key: string; count: number }>;
  };
}

export const searchApi = {
  search: async (query: SearchQuery): Promise<SearchResult> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const { data } = await apiClient.get(`/search?${params.toString()}`);
    return data;
  },

  autocomplete: async (q: string): Promise<string[]> => {
    if (!q || q.length < 2) return [];
    const { data } = await apiClient.get(`/search/autocomplete?q=${encodeURIComponent(q)}`);
    return Array.isArray(data) ? data : [];
  },
};
