import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
  PncpPaginatedResponse,
  PncpContratacaoDto,
  PncpContratoDto,
  PncpAtaDto,
  PncpItemPcaDto,
  PncpItemContratacaoDto,
  PncpResultadoItemDto,
  PncpDocumentoDto,
  PncpConsultaContratacaoParams,
  PncpConsultaContratoParams,
  PncpConsultaAtaParams,
  PncpConsultaPcaParams,
} from './types';

const BASE_URL = process.env.PNCP_BASE_URL ?? 'https://pncp.gov.br/api/consulta';
const DEFAULT_PAGE_SIZE = Number(process.env.PNCP_PAGE_SIZE ?? '500');
const REQUEST_DELAY_MS = Number(process.env.PNCP_REQUEST_DELAY_MS ?? '300');
const MAX_RETRIES = Number(process.env.PNCP_MAX_RETRIES ?? '3');

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PncpApiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 60_000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Aplicativo-PNCP-Sync/1.0',
      },
    });

    axiosRetry(this.http, {
      retries: MAX_RETRIES,
      retryDelay: (retryCount, error) => {
        // Respeita Retry-After se o servidor enviar
        const retryAfter = (error.response?.headers?.['retry-after'] as string | undefined);
        if (retryAfter) {
          return Number(retryAfter) * 1000;
        }
        // Backoff exponencial: 1s, 2s, 4s
        return axiosRetry.exponentialDelay(retryCount);
      },
      retryCondition: (error: AxiosError) => {
        // Retry em 429, 500, 502, 503, 504 e erros de rede
        if (axiosRetry.isNetworkError(error)) return true;
        const status = error.response?.status;
        return !!status && [429, 500, 502, 503, 504].includes(status);
      },
      onRetry: (retryCount, error) => {
        process.stderr.write(
          JSON.stringify({
            time: new Date().toISOString(),
            level: 'warn',
            module: 'PncpApiClient',
            msg: `Retry ${retryCount}/${MAX_RETRIES}`,
            url: error.config?.url,
            error: error.message,
          }) + '\n',
        );
      },
    });
  }

  // ------------------------------------------------------------------
  // Contratações por data de publicação
  // ------------------------------------------------------------------
  async consultarContratacoesPorPublicacao(
    params: PncpConsultaContratacaoParams,
  ): Promise<PncpPaginatedResponse<PncpContratacaoDto>> {
    await sleep(REQUEST_DELAY_MS);
    const { data } = await this.http.get<PncpPaginatedResponse<PncpContratacaoDto>>(
      '/v1/contratacoes/publicacao',
      {
        params: {
          ...params,
          tamanhoPagina: params.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
        },
      },
    );
    return data;
  }

  // ------------------------------------------------------------------
  // Contratações com propostas em aberto
  // ------------------------------------------------------------------
  async consultarContratacoesProposta(
    dataFinal: string,
    modalidade: number,
    pagina: number,
    extras?: Partial<PncpConsultaContratacaoParams>,
  ): Promise<PncpPaginatedResponse<PncpContratacaoDto>> {
    await sleep(REQUEST_DELAY_MS);
    const { data } = await this.http.get<PncpPaginatedResponse<PncpContratacaoDto>>(
      '/v1/contratacoes/proposta',
      {
        params: {
          dataFinal,
          codigoModalidadeContratacao: modalidade,
          pagina,
          tamanhoPagina: DEFAULT_PAGE_SIZE,
          ...extras,
        },
      },
    );
    return data;
  }

  // ------------------------------------------------------------------
  // Detalhe de uma contratação específica
  // ------------------------------------------------------------------
  async consultarContratacao(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
  ): Promise<PncpContratacaoDto | null> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpContratacaoDto>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}`,
      );
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Itens de uma contratação
  // ------------------------------------------------------------------
  async consultarItensContratacao(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
  ): Promise<PncpItemContratacaoDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpItemContratacaoDto[]>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}/itens`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Resultados de um item específico
  // ------------------------------------------------------------------
  async consultarResultadosItem(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
    numeroItem: number,
  ): Promise<PncpResultadoItemDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpResultadoItemDto[]>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}/itens/${numeroItem}/resultados`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Documentos de uma contratação
  // ------------------------------------------------------------------
  async consultarDocumentosContratacao(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
  ): Promise<PncpDocumentoDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpDocumentoDto[]>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}/arquivos`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Contratos por data de publicação
  // ------------------------------------------------------------------
  async consultarContratosPorPublicacao(
    params: PncpConsultaContratoParams,
  ): Promise<PncpPaginatedResponse<PncpContratoDto>> {
    await sleep(REQUEST_DELAY_MS);
    const { data } = await this.http.get<PncpPaginatedResponse<PncpContratoDto>>(
      '/v1/contratos',
      {
        params: {
          ...params,
          tamanhoPagina: params.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
        },
      },
    );
    return data;
  }

  // ------------------------------------------------------------------
  // Contratos de uma contratação específica
  // ------------------------------------------------------------------
  async consultarContratosDeContratacao(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
  ): Promise<PncpContratoDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpContratoDto[]>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}/contratos`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Documentos de um contrato
  // ------------------------------------------------------------------
  async consultarDocumentosContrato(
    cnpj: string,
    anoContrato: number,
    sequencialContrato: number,
  ): Promise<PncpDocumentoDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpDocumentoDto[]>(
        `/v1/orgaos/${cnpj}/contratos/${anoContrato}/${sequencialContrato}/arquivos`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Atas de registro de preços por período de vigência
  // ------------------------------------------------------------------
  async consultarAtasPorVigencia(
    params: PncpConsultaAtaParams,
  ): Promise<PncpPaginatedResponse<PncpAtaDto>> {
    await sleep(REQUEST_DELAY_MS);
    const { data } = await this.http.get<PncpPaginatedResponse<PncpAtaDto>>(
      '/v1/atas',
      {
        params: {
          ...params,
          tamanhoPagina: params.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
        },
      },
    );
    return data;
  }

  // ------------------------------------------------------------------
  // Atas de uma contratação específica
  // ------------------------------------------------------------------
  async consultarAtasDeContratacao(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
  ): Promise<PncpAtaDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpAtaDto[]>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}/atas`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // Documentos de uma ata
  // ------------------------------------------------------------------
  async consultarDocumentosAta(
    cnpj: string,
    anoCompra: number,
    sequencialCompra: number,
    sequencialAta: number,
  ): Promise<PncpDocumentoDto[]> {
    await sleep(REQUEST_DELAY_MS);
    try {
      const { data } = await this.http.get<PncpDocumentoDto[]>(
        `/v1/orgaos/${cnpj}/compras/${anoCompra}/${sequencialCompra}/atas/${sequencialAta}/arquivos`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err.response?.status === 404) return [];
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // PCA por ano e classificação
  // ------------------------------------------------------------------
  async consultarItensPca(
    params: PncpConsultaPcaParams,
  ): Promise<PncpPaginatedResponse<PncpItemPcaDto>> {
    await sleep(REQUEST_DELAY_MS);
    const endpoint = params.idUsuario ? '/v1/pca/usuario' : '/v1/pca/';
    const { data } = await this.http.get<PncpPaginatedResponse<PncpItemPcaDto>>(endpoint, {
      params: {
        anoPca: params.anoPca,
        codigoClassificacaoSuperior: params.codigoClassificacaoSuperior,
        idUsuario: params.idUsuario,
        pagina: params.pagina,
        tamanhoPagina: params.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
      },
    });
    return data;
  }

  // ------------------------------------------------------------------
  // Utilitário: percorre todas as páginas de uma consulta paginada
  // ------------------------------------------------------------------
  async *paginarContratacoes(
    params: Omit<PncpConsultaContratacaoParams, 'pagina'>,
  ): AsyncGenerator<PncpContratacaoDto[]> {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resp = await this.consultarContratacoesPorPublicacao({ ...params, pagina });
      if (resp.empty || !resp.data?.length) break;

      totalPaginas = resp.totalPaginas;
      yield resp.data;
      pagina++;
    } while (pagina <= totalPaginas);
  }

  async *paginarContratos(
    params: Omit<PncpConsultaContratoParams, 'pagina'>,
  ): AsyncGenerator<PncpContratoDto[]> {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resp = await this.consultarContratosPorPublicacao({ ...params, pagina });
      if (resp.empty || !resp.data?.length) break;

      totalPaginas = resp.totalPaginas;
      yield resp.data;
      pagina++;
    } while (pagina <= totalPaginas);
  }

  async *paginarAtas(
    params: Omit<PncpConsultaAtaParams, 'pagina'>,
  ): AsyncGenerator<PncpAtaDto[]> {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resp = await this.consultarAtasPorVigencia({ ...params, pagina });
      if (resp.empty || !resp.data?.length) break;

      totalPaginas = resp.totalPaginas;
      yield resp.data;
      pagina++;
    } while (pagina <= totalPaginas);
  }

  async *paginarPca(
    params: Omit<PncpConsultaPcaParams, 'pagina'>,
  ): AsyncGenerator<PncpItemPcaDto[]> {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resp = await this.consultarItensPca({ ...params, pagina });
      if (resp.empty || !resp.data?.length) break;

      totalPaginas = resp.totalPaginas;
      yield resp.data;
      pagina++;
    } while (pagina <= totalPaginas);
  }
}

// Singleton para reutilização
let _client: PncpApiClient | null = null;
export function getPncpClient(): PncpApiClient {
  if (!_client) _client = new PncpApiClient();
  return _client;
}
