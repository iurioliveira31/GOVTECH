import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

// ── Nome dos índices ─────────────────────────────────────────────────────────
export const INDICES = {
  CONTRATACOES: 'pncp_contratacoes',
  CONTRATOS:    'pncp_contratos',
  ATAS:         'pncp_atas',
  ORGAOS:       'pncp_orgaos',
} as const;

export type IndexName = (typeof INDICES)[keyof typeof INDICES];

// ── Mapping: Contratações ─────────────────────────────────────────────────────
export const CONTRATACOES_MAPPING: Record<string, MappingProperty> = {
  id:                       { type: 'keyword' },
  numeroControlePncp:       { type: 'keyword' },
  objetoCompra:             { type: 'text', analyzer: 'portuguese',
                              fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
  modalidadeNome:           { type: 'keyword' },
  modalidadeId:             { type: 'integer' },
  situacao:                 { type: 'keyword' },
  srp:                      { type: 'boolean' },
  valorTotalEstimado:       { type: 'double' },
  valorTotalHomologado:     { type: 'double' },
  dataPublicacaoPncp:       { type: 'date', format: 'strict_date_optional_time||yyyy-MM-dd' },
  dataEncerramentoProposta: { type: 'date', format: 'strict_date_optional_time||yyyy-MM-dd' },
  orgaoCnpj:                { type: 'keyword' },
  orgaoRazaoSocial:         { type: 'text', analyzer: 'portuguese',
                              fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
  unidadeUfSigla:           { type: 'keyword' },
  unidadeMunicipioNome:     { type: 'keyword' },
  esfera:                   { type: 'keyword' },
  poder:                    { type: 'keyword' },
  // Campo combinado para busca geral
  _fulltext: {
    type: 'text',
    analyzer: 'portuguese',
  },
};

// ── Mapping: Contratos ────────────────────────────────────────────────────────
export const CONTRATOS_MAPPING: Record<string, MappingProperty> = {
  id:                       { type: 'keyword' },
  numeroControlePncp:       { type: 'keyword' },
  objetoContrato:           { type: 'text', analyzer: 'portuguese',
                              fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
  tipoContratoNome:         { type: 'keyword' },
  valorGlobal:              { type: 'double' },
  valorInicial:             { type: 'double' },
  dataVigenciaInicio:       { type: 'date', format: 'strict_date_optional_time||yyyy-MM-dd' },
  dataVigenciaFim:          { type: 'date', format: 'strict_date_optional_time||yyyy-MM-dd' },
  dataPublicacaoPncp:       { type: 'date', format: 'strict_date_optional_time||yyyy-MM-dd' },
  niFornecedor:             { type: 'keyword' },
  nomeRazaoSocialFornecedor: { type: 'text', analyzer: 'portuguese',
                               fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
  orgaoCnpj:                { type: 'keyword' },
  orgaoRazaoSocial:         { type: 'text', analyzer: 'portuguese',
                              fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
  unidadeUfSigla:           { type: 'keyword' },
  _fulltext:                { type: 'text', analyzer: 'portuguese' },
};

// ── Settings compartilhadas (análise PT-BR) ───────────────────────────────────
export const INDEX_SETTINGS = {
  analysis: {
    filter: {
      portuguese_stop: {
        type: 'stop',
        stopwords: '_portuguese_',
      },
      portuguese_stemmer: {
        type: 'stemmer',
        language: 'light_portuguese',
      },
      portuguese_asciifolding: {
        type: 'asciifolding',
        preserve_original: true,
      },
    },
    analyzer: {
      portuguese: {
        type: 'custom' as const,
        tokenizer: 'standard',
        filter: [
          'lowercase',
          'portuguese_asciifolding',
          'portuguese_stop',
          'portuguese_stemmer',
        ],
      },
    },
  },
  number_of_shards:   1,
  number_of_replicas: 0, // em produção: 1
};
