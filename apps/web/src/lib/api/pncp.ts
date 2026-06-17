import { apiClient } from './client';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ── Tipos base ─────────────────────────────────────────────────────────────

export interface Contratacao {
  id: string;
  numeroControlePncp: string;
  objetoCompra?: string;
  modalidadeNome?: string;
  situacao?: string;
  valorTotalEstimado?: number;
  dataPublicacaoPncp?: string;
  dataEncerramentoProposta?: string;
  orgaoCnpj?: string;
  orgaoRazaoSocial?: string;
  unidadeUfSigla?: string;
  unidadeMunicipioNome?: string;
  srp?: boolean;
}

export interface Contrato {
  id: string;
  numeroControlePncp: string;
  numeroContratoEmpenho?: string;
  objetoContrato?: string;
  tipoContratoNome?: string;
  tipoContrato?: string;
  valorInicial?: number;
  valorGlobal?: number;
  valorAcumulado?: number;
  numeroParcelas?: number;
  dataAssinatura?: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  dataPublicacaoPncp?: string;
  niFornecedor?: string;
  nomeRazaoSocialFornecedor?: string;
  orgaoCnpj?: string;
  orgaoRazaoSocial?: string;
  unidadeUfSigla?: string;
  unidadeMunicipioNome?: string;
  unidadeNome?: string;
  documentos?: ContratoDocumento[];
}

export interface ContratoDocumento {
  id: string;
  titulo?: string;
  url?: string;
  nomeArquivo?: string;
}

export interface Ata {
  id: string;
  numeroControlePncpAta: string;
  numeroAtaRegistroPreco?: string;
  objetoContratacao?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  cancelado?: boolean;
  cnpjOrgao?: string;
  nomeOrgao?: string;
}

export interface Orgao {
  id: string;
  cnpj: string;
  razaoSocial: string;
  ufSigla?: string;
  ufNome?: string;
  municipioNome?: string;
  poderId?: string;
  esferaId?: string;
  _count?: {
    contratacoes: number;
    contratos: number;
    atas: number;
  };
}

export interface Fornecedor {
  ni: string;
  tipoPessoa?: string;
  razaoSocial?: string;
  _count?: {
    contratos: number;
    resultados: number;
  };
  valorTotalContratos?: number;
}

export interface SyncStatus {
  recentes: Array<{
    entityType: string;
    status: string;
    registrosProcessados: number;
    erros: number;
    iniciadoEm: string;
    concluidoEm?: string;
    ultimoErro?: string;
  }>;
  porStatus: Array<{ entityType: string; status: string; _count: number }>;
  totais: {
    contratacoes: number;
    contratos: number;
    atas: number;
    pcas: number;
    orgaos: number;
    fornecedores: number;
  };
}

// ── Query Params ────────────────────────────────────────────────────────────

export interface FiltroContratacao {
  q?: string;
  uf?: string;
  modalidadeId?: number;
  situacao?: string;
  srp?: boolean;
  abertas?: boolean;
  dataPublicacaoInicio?: string;
  dataPublicacaoFim?: string;
  valorMinimo?: number;
  valorMaximo?: number;
  ordem?: string;
  pagina?: number;
  limite?: number;
}

export interface FiltroContrato {
  q?: string;
  uf?: string;
  orgaoCnpj?: string;
  niFornecedor?: string;
  vigentes?: boolean;
  vencendoEm30Dias?: boolean;
  pagina?: number;
  limite?: number;
}

export interface FiltroAta {
  q?: string;
  orgaoCnpj?: string;
  vigentes?: boolean;
  canceladas?: boolean;
  pagina?: number;
  limite?: number;
}

export interface FiltroOrgao {
  q?: string;
  uf?: string;
  esfera?: string;
  poder?: string;
  pagina?: number;
  limite?: number;
}

export interface FiltroFornecedor {
  q?: string;
  ni?: string;
  pagina?: number;
  limite?: number;
}

// ── API Functions ───────────────────────────────────────────────────────────

export const pncpApi = {
  // Contratações (licitações)
  listarContratacoes: async (params: FiltroContratacao = {}): Promise<PaginatedResponse<Contratacao>> => {
    const { data } = await apiClient.get('/pncp/contratacoes', { params });
    return data;
  },

  detalharContratacao: async (id: string): Promise<Contratacao & { itens?: unknown[]; documentos?: unknown[] }> => {
    const { data } = await apiClient.get(`/pncp/contratacoes/${id}`);
    return data;
  },

  // Contratos
  listarContratos: async (params: FiltroContrato = {}): Promise<PaginatedResponse<Contrato>> => {
    const { data } = await apiClient.get('/pncp/contratos', { params });
    return data;
  },

  detalharContrato: async (id: string): Promise<Contrato> => {
    const { data } = await apiClient.get(`/pncp/contratos/${id}`);
    return data;
  },

  // Atas
  listarAtas: async (params: FiltroAta = {}): Promise<PaginatedResponse<Ata>> => {
    const { data } = await apiClient.get('/pncp/atas', { params });
    return data;
  },

  // Órgãos
  listarOrgaos: async (params: FiltroOrgao = {}): Promise<PaginatedResponse<Orgao>> => {
    const { data } = await apiClient.get('/pncp/orgaos', { params });
    return data;
  },

  detalharOrgao: async (cnpj: string): Promise<Orgao & { contratacoes?: Contratacao[]; contratos?: Contrato[] }> => {
    const { data } = await apiClient.get(`/pncp/orgaos/${cnpj}`);
    return data;
  },

  // Fornecedores
  listarFornecedores: async (params: FiltroFornecedor = {}): Promise<PaginatedResponse<Fornecedor>> => {
    const { data } = await apiClient.get('/pncp/fornecedores', { params });
    return data;
  },

  detalharFornecedor: async (ni: string): Promise<Fornecedor & { contratos?: Contrato[] }> => {
    const { data } = await apiClient.get(`/pncp/fornecedores/${ni}`);
    return data;
  },

  // Sync status
  statusSync: async (): Promise<SyncStatus> => {
    const { data } = await apiClient.get('/pncp/sync/status');
    return data;
  },

  // Trigger syncs (admin)
  triggerIncremental: async () => {
    const { data } = await apiClient.post('/pncp/sync/incremental');
    return data;
  },
};
