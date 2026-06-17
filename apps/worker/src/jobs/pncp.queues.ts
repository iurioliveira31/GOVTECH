// Definições de filas e tipos de jobs para sincronização PNCP

export const PNCP_QUEUE_NAME = 'pncp-sync';

export const PNCP_JOB_NAMES = {
  SYNC_INCREMENTAL: 'pncp:sync:incremental',
  SYNC_CONTRATACOES: 'pncp:sync:contratacoes',
  SYNC_CONTRATOS: 'pncp:sync:contratos',
  SYNC_ATAS: 'pncp:sync:atas',
  SYNC_PCA: 'pncp:sync:pca',
  SYNC_DETALHES_CONTRATACAO: 'pncp:sync:detalhes-contratacao',
  REPROCESSAR_FALHOS: 'pncp:sync:reprocessar-falhos',
} as const;

export type PncpJobName = typeof PNCP_JOB_NAMES[keyof typeof PNCP_JOB_NAMES];

// Payloads dos jobs
export interface SyncIncrementalJobData {
  syncDetalhes?: boolean;
}

export interface SyncContratacoesPeriodoJobData {
  dataInicial: string; // ISO string
  dataFinal: string;
  syncDetalhes?: boolean;
}

export interface SyncContratosPeriodoJobData {
  dataInicial: string;
  dataFinal: string;
}

export interface SyncAtasPeriodoJobData {
  dataInicial: string;
  dataFinal: string;
}

export interface SyncPcaJobData {
  ano: number;
}

export interface SyncDetalhesContratacaoJobData {
  contratacaoId: string;
  cnpj: string;
  anoCompra: number;
  sequencialCompra: number;
}
