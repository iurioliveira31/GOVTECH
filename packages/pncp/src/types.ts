// ============================================================
// Tipos da API de Consultas do PNCP
// Base URL: https://pncp.gov.br/api/consulta
// ============================================================

// ---------------------------
// Paginação padrão
// ---------------------------
export interface PncpPaginatedResponse<T> {
  data: T[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

// ---------------------------
// Órgão / Entidade
// ---------------------------
export interface PncpOrgaoEntidade {
  cnpj: string;
  razaoSocial: string;
  poderId: string; // L, E, J
  esferaId: string; // F, E, M, D
}

// ---------------------------
// Unidade Administrativa
// ---------------------------
export interface PncpUnidadeOrgao {
  codigoUnidade: string;
  nomeUnidade: string;
  codigoIbge?: number;
  municipioNome?: string;
  ufSigla?: string;
  ufNome?: string;
}

// ---------------------------
// Amparo Legal
// ---------------------------
export interface PncpAmparoLegal {
  codigo: number;
  nome: string;
  descricao: string;
}

// ---------------------------
// Contratação (Licitação / Contratação Direta)
// ---------------------------
export interface PncpContratacaoDto {
  numeroControlePNCP: string;
  numeroCompra: string;
  anoCompra: number;
  processo: string;
  tipoInstrumentoConvocatorioId: number;
  tipoInstrumentoConvocatorioNome: string;
  modalidadeId: number;
  modalidadeNome: string;
  modoDisputaId?: number;
  modoDisputaNome?: string;
  situacaoCompraId: number;
  situacaoCompraNome: string;
  objetoCompra: string;
  informacaoComplementar?: string;
  srp: boolean;
  orcamentoSigiloso?: boolean;
  amparoLegal?: PncpAmparoLegal;
  valorTotalEstimado?: number;
  valorTotalHomologado?: number;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  dataPublicacaoPncp: string;
  dataInclusao: string;
  dataAtualizacao: string;
  sequencialCompra: number;
  orgaoEntidade: PncpOrgaoEntidade;
  unidadeOrgao: PncpUnidadeOrgao;
  orgaoSubRogado?: PncpOrgaoEntidade;
  unidadeSubRogada?: PncpUnidadeOrgao;
  usuarioNome?: string;
  linkSistemaOrigem?: string;
  justificativaPresencial?: string;
  categoriaProcessoId?: number;
  categoriaProcessoNome?: string;
}

// ---------------------------
// Item de Contratação
// ---------------------------
export interface PncpItemContratacaoDto {
  numeroItem: number;
  descricao: string;
  materialOuServico?: string;
  tipoBeneficioId?: number;
  tipoBeneficioNome?: string;
  incentivoProdutivoBasico?: boolean;
  criterioJulgamentoId?: number;
  criterioJulgamentoNome?: string;
  situacaoCompraItemId?: number;
  situacaoCompraItemNome?: string;
  unidadeMedida?: string;
  quantidade?: number;
  valorUnitarioEstimado?: number;
  valorTotal?: number;
  orcamentoSigiloso?: boolean;
  dataAtualizacao?: string;
}

// ---------------------------
// Resultado de Item
// ---------------------------
export interface PncpResultadoItemDto {
  sequencialResultado: number;
  tipoPessoa?: string;
  niFornecedor?: string;
  nomeFornecedor?: string;
  porteId?: number;
  porteNome?: string;
  situacaoResultadoItemId?: number;
  situacaoResultadoItemNome?: string;
  valorUnitario?: number;
  quantidade?: number;
  valorTotal?: number;
  marca?: string;
  modelo?: string;
  dataResultado?: string;
  dataAtualizacao?: string;
}

// ---------------------------
// Contrato
// ---------------------------
export interface PncpContratoDto {
  numeroControlePNCP: string;
  numeroControlePNCPCompra?: string;
  numeroContratoEmpenho: string;
  anoContrato: number;
  sequencialContrato: number;
  processo?: string;
  tipoContrato?: { id: number; nome: string };
  categoriaProcesso?: { id: number; nome: string };
  receita: boolean;
  objetoContrato: string;
  informacaoComplementar?: string;
  orgaoEntidade: PncpOrgaoEntidade;
  unidadeOrgao: PncpUnidadeOrgao;
  orgaoSubRogado?: PncpOrgaoEntidade;
  unidadeSubRogada?: PncpUnidadeOrgao;
  tipoPessoa?: string;
  niFornecedor?: string;
  nomeRazaoSocialFornecedor?: string;
  tipoPessoaSubContratada?: string;
  niFornecedorSubContratado?: string;
  nomeFornecedorSubContratado?: string;
  valorInicial?: number;
  numeroParcelas?: number;
  valorParcela?: number;
  valorGlobal?: number;
  valorAcumulado?: number;
  dataAssinatura?: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  numeroRetificacao?: number;
  usuarioNome?: string;
  dataPublicacaoPncp?: string;
  dataAtualizacao?: string;
  identificadorCipi?: string;
  urlCipi?: string;
}

// ---------------------------
// Ata de Registro de Preços
// ---------------------------
export interface PncpAtaDto {
  numeroControlePNCPAta: string;
  numeroControlePNCPCompra?: string;
  numeroAtaRegistroPreco?: string;
  anoAta: number;
  sequencialAta?: number;
  dataAssinatura?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  dataCancelamento?: string;
  cancelado: boolean;
  dataPublicacaoPncp?: string;
  dataInclusao?: string;
  dataAtualizacao?: string;
  objetoContratacao?: string;
  cnpjOrgao: string;
  nomeOrgao?: string;
  codigoUnidadeOrgao?: string;
  nomeUnidadeOrgao?: string;
  cnpjOrgaoSubrogado?: string;
  nomeOrgaoSubrogado?: string;
  codigoUnidadeOrgaoSubrogado?: string;
  nomeUnidadeOrgaoSubrogado?: string;
  usuario?: string;
}

// ---------------------------
// Item de PCA
// ---------------------------
export interface PncpItemPcaDto {
  orgaoEntidadeCnpj: string;
  orgaoEntidadeRazaoSocial?: string;
  codigoUnidade?: string;
  nomeUnidade?: string;
  anoPca: number;
  idPcaPncp: string;
  dataPublicacaoPncp?: string;
  itens: PncpItemPcaDetalheDto[];
}

export interface PncpItemPcaDetalheDto {
  numeroItem: number;
  categoriaItemPcaNome?: string;
  classificacaoCatalogoId?: string;
  nomeClassificacaoCatalogo?: string;
  classificacaoSuperiorCodigo?: string;
  classificacaoSuperiorNome?: string;
  pdmCodigo?: string;
  pdmDescricao?: string;
  codigoItem?: string;
  descricaoItem?: string;
  unidadeFornecimento?: string;
  quantidadeEstimada?: number;
  valorUnitario?: number;
  valorTotal?: number;
  valorOrcamentoExercicio?: number;
  dataDesejada?: string;
  unidadeRequisitante?: string;
  grupoContratacaoCodigo?: string;
  grupoContratacaoNome?: string;
  dataInclusao?: string;
  dataAtualizacao?: string;
}

// ---------------------------
// Documento
// ---------------------------
export interface PncpDocumentoDto {
  sequencialDocumento: number;
  tipoDocumentoId?: number;
  tipoDocumentoNome?: string;
  titulo?: string;
  url?: string;
  tamanho?: number;
  dataPublicacao?: string;
}

// ---------------------------
// Parâmetros de consulta
// ---------------------------
export interface PncpConsultaContratacaoParams {
  dataInicial: string;        // AAAAMMDD
  dataFinal: string;
  codigoModalidadeContratacao: number;
  codigoModoDisputa?: number;
  uf?: string;
  codigoMunicipioIbge?: string;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
  idUsuario?: number;
  pagina: number;
  tamanhoPagina?: number;
}

export interface PncpConsultaContratoParams {
  dataInicial: string;
  dataFinal: string;
  cnpjOrgao?: string;
  codigoUnidadeAdministrativa?: string;
  usuarioId?: number;
  pagina: number;
  tamanhoPagina?: number;
}

export interface PncpConsultaAtaParams {
  dataInicial: string;
  dataFinal: string;
  idUsuario?: number;
  cnpj?: string;
  codigoUnidadeAdministrativa?: string;
  pagina: number;
  tamanhoPagina?: number;
}

export interface PncpConsultaPcaParams {
  anoPca: number;
  codigoClassificacaoSuperior?: string;
  idUsuario?: number;
  pagina: number;
  tamanhoPagina?: number;
}

// ---------------------------
// Modalidades para sincronização
// ---------------------------
export const PNCP_MODALIDADES = {
  LEILAO_ELETRONICO: 1,
  DIALOGO_COMPETITIVO: 2,
  CONCURSO: 3,
  CONCORRENCIA_ELETRONICA: 4,
  CONCORRENCIA_PRESENCIAL: 5,
  PREGAO_ELETRONICO: 6,
  PREGAO_PRESENCIAL: 7,
  DISPENSA: 8,
  INEXIGIBILIDADE: 9,
  MANIFESTACAO_INTERESSE: 10,
  PRE_QUALIFICACAO: 11,
  CREDENCIAMENTO: 12,
  LEILAO_PRESENCIAL: 13,
} as const;

export type PncpModalidadeCodigo = typeof PNCP_MODALIDADES[keyof typeof PNCP_MODALIDADES];

// Mapeia código numérico para enum Prisma
export const MODALIDADE_PARA_ENUM: Record<number, string> = {
  1: 'LEILAO_ELETRONICO',
  2: 'DIALOGO_COMPETITIVO',
  3: 'CONCURSO',
  4: 'CONCORRENCIA_ELETRONICA',
  5: 'CONCORRENCIA_PRESENCIAL',
  6: 'PREGAO_ELETRONICO',
  7: 'PREGAO_PRESENCIAL',
  8: 'DISPENSA',
  9: 'INEXIGIBILIDADE',
  10: 'MANIFESTACAO_INTERESSE',
  11: 'PRE_QUALIFICACAO',
  12: 'CREDENCIAMENTO',
  13: 'LEILAO_PRESENCIAL',
};

export const SITUACAO_CONTRATACAO_ENUM: Record<number, string> = {
  1: 'DIVULGADA',
  2: 'REVOGADA',
  3: 'ANULADA',
  4: 'SUSPENSA',
};

export const SITUACAO_ITEM_ENUM: Record<number, string> = {
  1: 'EM_ANDAMENTO',
  2: 'HOMOLOGADO',
  3: 'ANULADO_REVOGADO_CANCELADO',
  4: 'DESERTO',
  5: 'FRACASSADO',
};

export const TIPO_CONTRATO_ENUM: Record<number, string> = {
  1: 'CONTRATO',
  2: 'COMODATO',
  3: 'ARRENDAMENTO',
  4: 'CONCESSAO',
  5: 'TERMO_ADESAO',
  6: 'CONVENIO',
  7: 'EMPENHO',
  8: 'OUTROS',
  9: 'TED',
  10: 'ACT',
  11: 'TERMO_COMPROMISSO',
  12: 'CARTA_CONTRATO',
};

export const ESFERA_ENUM: Record<string, string> = {
  F: 'FEDERAL',
  E: 'ESTADUAL',
  M: 'MUNICIPAL',
  D: 'DISTRITAL',
};

export const PODER_ENUM: Record<string, string> = {
  L: 'LEGISLATIVO',
  E: 'EXECUTIVO',
  J: 'JUDICIARIO',
};
