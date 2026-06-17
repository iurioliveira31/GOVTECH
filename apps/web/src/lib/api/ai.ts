import { apiClient } from './client';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface AnaliseContrato {
  contratoId: string;
  numeroControlePncp: string;
  analisadoEm: string;
  resumo: string;
  pontosAtencao: string[];
  scoreConformidade: number;
  scoreRisco: number;
  recomendacoes: string[];
  fundamentoLegal: string[];
  classificacao: 'BAIXO_RISCO' | 'MEDIO_RISCO' | 'ALTO_RISCO' | 'CRITICO';
}

export interface ResumoLicitacao {
  licitacaoId: string;
  numeroControlePncp: string;
  analisadoEm: string;
  resumoExecutivo: string;
  oportunidades: string[];
  requisitosProvaveis: string[];
  prazoAnalise: string;
  classificacaoObjeto: string;
  complexidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  tags: string[];
}

export interface AiStatus {
  available: boolean;
  model: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const aiApi = {
  status: async (): Promise<AiStatus> => {
    const { data } = await apiClient.get('/ai/status');
    return data;
  },

  analisarContrato: async (id: string): Promise<AnaliseContrato> => {
    const { data } = await apiClient.post(`/ai/analisar/contrato/${id}`);
    return data;
  },

  resumirLicitacao: async (id: string): Promise<ResumoLicitacao> => {
    const { data } = await apiClient.post(`/ai/resumir/licitacao/${id}`);
    return data;
  },

  analisarFornecedor: async (ni: string) => {
    const { data } = await apiClient.post(`/ai/analisar/fornecedor/${ni}`);
    return data;
  },
};
