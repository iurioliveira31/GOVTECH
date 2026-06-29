import { apiClient } from './client';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface OrgaoRadarItem {
  cnpj: string;
  razaoSocial: string;
  uf: string | null;
  municipio: string | null;
  totalLicitacoes: number;
  totalContratos: number;
  valorTotalEstimadoLicitacoes: number;
  valorTotalContratos: number;
  valorMedioLicitacao: number;
  licitacoesUltimos30d: number;
  licitacoesPeriodoAnterior: number;
  tendencia: 'ALTA' | 'ESTAVEL' | 'QUEDA';
  modalidadeTop: string | null;
  dataUltimaLicitacao: string | null;
  scoreOportunidade: number;
}

export interface ModalidadeDistribuicao {
  modalidade: string;
  total: number;
  valorTotal: number;
}

export interface TendenciaTemporalItem {
  mes: string;
  total: number;
  valor: number;
}

export interface RadarResponse {
  radar: OrgaoRadarItem[];
  topModalidades: ModalidadeDistribuicao[];
  tendenciaMensal: TendenciaTemporalItem[];
  resumo: {
    totalOrgaosAtivos: number;
    valorTotalMercado: number;
    licitacoesAbertasHoje: number;
    encerrando7dias: number;
  };
}

export interface OportunidadeRanking {
  id: string;
  numeroControlePncp: string;
  objetoCompra: string;
  orgaoRazaoSocial: string | null;
  orgaoCnpj: string | null;
  uf: string | null;
  modalidadeNome: string | null;
  valorTotalEstimado: number | null;
  dataEncerramentoProposta: string | null;
  diasRestantes: number;
  scoreOportunidade: number;
  motivos: string[];
}

export interface OportunidadesResponse {
  items: OportunidadeRanking[];
  total: number;
}

export interface OrgaoAnalise {
  orgao: { cnpj: string; razaoSocial: string; ufSigla?: string } | null;
  historico: TendenciaTemporalItem[];
  modalidades: ModalidadeDistribuicao[];
  top5Objetos: { objeto: string; total: number; valorMedio: number }[];
  scoreOportunidade: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const intelligenceApi = {
  getRadar: async (params: { uf?: string; limite?: number } = {}): Promise<RadarResponse> => {
    const { data } = await apiClient.get('/intelligence/radar', { params });
    return data;
  },

  getOportunidades: async (params: {
    uf?: string;
    modalidadeId?: number;
    pagina?: number;
    limite?: number;
  } = {}): Promise<OportunidadesResponse> => {
    const { data } = await apiClient.get('/intelligence/oportunidades', { params });
    return data;
  },

  getOrgaoAnalise: async (cnpj: string): Promise<OrgaoAnalise> => {
    const { data } = await apiClient.get(`/intelligence/orgao/${cnpj}`);
    return data;
  },
};
