// ─────────────────────────────────────────────────────────────────
// PROMPTS DE ANÁLISE GOVTECH
// Todos os prompts são em pt-BR e retornam JSON estruturado.
// ─────────────────────────────────────────────────────────────────

export const SYSTEM_GOVTECH = `
Você é um especialista em licitações e contratos públicos brasileiros,
com profundo conhecimento da Lei 14.133/2021 (Nova Lei de Licitações),
da Lei 8.666/1993, e dos procedimentos do PNCP.

Suas análises devem ser:
- Objetivas e baseadas nos dados fornecidos
- Citando leis e artigos pertinentes quando relevante
- Sinalizando riscos reais (não hipotéticos)
- Escritas em português formal e claro

IMPORTANTE: Retorne SEMPRE um JSON válido conforme o schema solicitado.
`.trim();

// ── Prompt: Análise de Contrato ───────────────────────────────────

export function promptAnalisarContrato(contrato: {
  numeroControlePncp?: string;
  objetoContrato?: string;
  valorGlobal?: number;
  valorInicial?: number;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  tipoContratoNome?: string;
  orgaoRazaoSocial?: string;
  nomeRazaoSocialFornecedor?: string;
  niFornecedor?: string;
  numeroParcelas?: number;
  dataAssinatura?: string;
}) {
  const valor = (v?: number) =>
    v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : 'N/D';

  return `
Analise o seguinte contrato público e retorne um JSON com o schema abaixo.

DADOS DO CONTRATO:
- Número: ${contrato.numeroControlePncp ?? 'N/D'}
- Objeto: ${contrato.objetoContrato ?? 'N/D'}
- Tipo: ${contrato.tipoContratoNome ?? 'N/D'}
- Órgão: ${contrato.orgaoRazaoSocial ?? 'N/D'}
- Fornecedor: ${contrato.nomeRazaoSocialFornecedor ?? 'N/D'} (${contrato.niFornecedor ?? 'N/D'})
- Valor Inicial: ${valor(contrato.valorInicial)}
- Valor Global: ${valor(contrato.valorGlobal)}
- Parcelas: ${contrato.numeroParcelas ?? 'N/D'}
- Assinado em: ${contrato.dataAssinatura ?? 'N/D'}
- Vigência: ${contrato.dataVigenciaInicio ?? 'N/D'} até ${contrato.dataVigenciaFim ?? 'N/D'}

SCHEMA JSON OBRIGATÓRIO:
{
  "resumo": "string — resumo executivo em 2-3 frases",
  "pontosAtencao": ["string — cada ponto de atenção ou risco identificado"],
  "scoreConformidade": number (0-100),
  "scoreRisco": number (0-100, maior = maior risco),
  "recomendacoes": ["string — ação recomendada"],
  "fundamentoLegal": ["string — lei/artigo aplicável"],
  "classificacao": "BAIXO_RISCO" | "MEDIO_RISCO" | "ALTO_RISCO" | "CRITICO"
}

Responda APENAS com o JSON, sem markdown, sem explicações adicionais.
`.trim();
}

// ── Prompt: Resumo de Licitação ───────────────────────────────────

export function promptResumirLicitacao(licitacao: {
  numeroControlePncp?: string;
  objetoCompra?: string;
  modalidadeNome?: string;
  situacao?: string;
  valorTotalEstimado?: number;
  orgaoRazaoSocial?: string;
  dataPublicacaoPncp?: string;
  dataEncerramentoProposta?: string;
  srp?: boolean;
  unidadeUfSigla?: string;
}) {
  const valor = (v?: number) =>
    v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : 'N/D';

  return `
Elabore um resumo executivo desta licitação pública para gestor público.

DADOS DA LICITAÇÃO:
- Número PNCP: ${licitacao.numeroControlePncp ?? 'N/D'}
- Objeto: ${licitacao.objetoCompra ?? 'N/D'}
- Modalidade: ${licitacao.modalidadeNome ?? 'N/D'}
- Situação: ${licitacao.situacao ?? 'N/D'}
- Valor Estimado: ${valor(licitacao.valorTotalEstimado)}
- Órgão: ${licitacao.orgaoRazaoSocial ?? 'N/D'} (${licitacao.unidadeUfSigla ?? 'N/D'})
- Publicação: ${licitacao.dataPublicacaoPncp ?? 'N/D'}
- Encerramento: ${licitacao.dataEncerramentoProposta ?? 'N/D'}
- SRP (Ata de Preço): ${licitacao.srp ? 'Sim' : 'Não'}

SCHEMA JSON OBRIGATÓRIO:
{
  "resumoExecutivo": "string — 3-5 frases descrevendo a licitação para um gestor",
  "oportunidades": ["string — oportunidade identificada para fornecedores ou órgãos"],
  "requisitosProvaveis": ["string — requisito técnico provável com base no objeto"],
  "prazoAnalise": "string — análise do prazo disponível",
  "classificacaoObjeto": "string — categoria do objeto (TI, Obras, Serviços, etc.)",
  "complexidade": "BAIXA" | "MEDIA" | "ALTA",
  "tags": ["string — palavras-chave relevantes"]
}

Responda APENAS com o JSON, sem markdown.
`.trim();
}

// ── Prompt: Análise de Risco de Fornecedor ────────────────────────

export function promptAnalisarFornecedor(dados: {
  razaoSocial?: string;
  ni?: string;
  totalContratos?: number;
  valorTotal?: number;
  orgaosAtendidos?: number;
}) {
  const valor = (v?: number) =>
    v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : 'N/D';

  return `
Analise o perfil de fornecedor público com base nos dados históricos.

DADOS DO FORNECEDOR:
- Razão Social: ${dados.razaoSocial ?? 'N/D'}
- CNPJ/CPF: ${dados.ni ?? 'N/D'}
- Total de Contratos: ${dados.totalContratos ?? 'N/D'}
- Valor Total Contratado: ${valor(dados.valorTotal)}
- Órgãos Diferentes Atendidos: ${dados.orgaosAtendidos ?? 'N/D'}

SCHEMA JSON OBRIGATÓRIO:
{
  "perfilFornecedor": "string — descrição do perfil do fornecedor",
  "indicadoresPositivos": ["string"],
  "indicadoresNegativos": ["string"],
  "scoreConcentracao": number (0-100, maior = mais concentrado num órgão),
  "recomendacao": "APTO" | "VERIFICAR" | "ALTO_RISCO",
  "observacoes": "string"
}

Responda APENAS com o JSON.
`.trim();
}
