import { Injectable, Logger } from '@nestjs/common';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClientService } from './elasticsearch.client';
import {
  INDICES,
  CONTRATACOES_MAPPING,
  CONTRATOS_MAPPING,
  INDEX_SETTINGS,
} from './indices/index.definitions';


// ── DTOs de busca ─────────────────────────────────────────────────────────────

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
  pagina?: number;
  limite?: number;
  entidade?: 'contratacoes' | 'contratos' | 'todos';
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
  // campos extras por tipo
  [key: string]: unknown;
}

export interface SearchResult {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  took: number; // ms
  items: SearchResultItem[];
  aggregations?: {
    ufs: Array<{ key: string; count: number }>;
    modalidades: Array<{ key: string; count: number }>;
    faixasValor: Array<{ key: string; count: number }>;
  };
}

// ── Documento indexável ───────────────────────────────────────────────────────

export interface ContratacaoDoc {
  id: string;
  numeroControlePncp: string;
  objetoCompra?: string;
  modalidadeNome?: string;
  modalidadeId?: number;
  situacao?: string;
  srp?: boolean;
  valorTotalEstimado?: number;
  valorTotalHomologado?: number;
  dataPublicacaoPncp?: string;
  dataEncerramentoProposta?: string;
  orgaoCnpj?: string;
  orgaoRazaoSocial?: string;
  unidadeUfSigla?: string;
  unidadeMunicipioNome?: string;
  _fulltext?: string;
}

export interface ContratoDoc {
  id: string;
  numeroControlePncp: string;
  objetoContrato?: string;
  tipoContratoNome?: string;
  valorGlobal?: number;
  valorInicial?: number;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
  dataPublicacaoPncp?: string;
  niFornecedor?: string;
  nomeRazaoSocialFornecedor?: string;
  orgaoCnpj?: string;
  orgaoRazaoSocial?: string;
  unidadeUfSigla?: string;
  _fulltext?: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly es: ElasticsearchClientService) {}

  // ── Setup de índices ───────────────────────────────────────────────────────

  async setupIndices(): Promise<void> {
    await this.ensureIndex(INDICES.CONTRATACOES, CONTRATACOES_MAPPING);
    await this.ensureIndex(INDICES.CONTRATOS, CONTRATOS_MAPPING);
    this.logger.log('Índices ES configurados');
  }

  private async ensureIndex(
    index: string,
    properties: Record<string, MappingProperty>,
  ): Promise<void> {
    const exists = await this.es.client.indices.exists({ index });
    if (!exists) {
      await this.es.client.indices.create({
        index,
        settings: INDEX_SETTINGS as Record<string, unknown>,
        mappings: { properties },
      });
      this.logger.log(`Índice criado: ${index}`);
    }
  }

  // ── Indexação ──────────────────────────────────────────────────────────────

  async indexContratacao(doc: ContratacaoDoc): Promise<void> {
    await this.es.client.index({
      index: INDICES.CONTRATACOES,
      id: doc.id,
      document: {
        ...doc,
        _fulltext: [
          doc.objetoCompra,
          doc.orgaoRazaoSocial,
          doc.modalidadeNome,
          doc.unidadeMunicipioNome,
        ]
          .filter(Boolean)
          .join(' '),
      },
    });
  }

  async indexContrato(doc: ContratoDoc): Promise<void> {
    await this.es.client.index({
      index: INDICES.CONTRATOS,
      id: doc.id,
      document: {
        ...doc,
        _fulltext: [
          doc.objetoContrato,
          doc.orgaoRazaoSocial,
          doc.nomeRazaoSocialFornecedor,
        ]
          .filter(Boolean)
          .join(' '),
      },
    });
  }

  /**
   * Bulk indexação para reindexação completa.
   */
  async bulkIndexContratacoes(docs: ContratacaoDoc[]): Promise<{ indexed: number; errors: number }> {
    if (!docs.length) return { indexed: 0, errors: 0 };

    const operations = docs.flatMap((doc) => [
      { index: { _index: INDICES.CONTRATACOES, _id: doc.id } },
      {
        ...doc,
        _fulltext: [doc.objetoCompra, doc.orgaoRazaoSocial, doc.modalidadeNome]
          .filter(Boolean)
          .join(' '),
      },
    ]);

    const res = await this.es.client.bulk({ operations, refresh: false });
    const errors = res.items.filter((i) => i.index?.error).length;
    return { indexed: docs.length - errors, errors };
  }

  async bulkIndexContratos(docs: ContratoDoc[]): Promise<{ indexed: number; errors: number }> {
    if (!docs.length) return { indexed: 0, errors: 0 };

    const operations = docs.flatMap((doc) => [
      { index: { _index: INDICES.CONTRATOS, _id: doc.id } },
      {
        ...doc,
        _fulltext: [doc.objetoContrato, doc.orgaoRazaoSocial, doc.nomeRazaoSocialFornecedor]
          .filter(Boolean)
          .join(' '),
      },
    ]);

    const res = await this.es.client.bulk({ operations, refresh: false });
    const errors = res.items.filter((i) => i.index?.error).length;
    return { indexed: docs.length - errors, errors };
  }

  // ── Busca full-text ────────────────────────────────────────────────────────

  async search(query: SearchQuery): Promise<SearchResult> {
    const pagina = query.pagina ?? 1;
    const limite = Math.min(query.limite ?? 20, 100);
    const from   = (pagina - 1) * limite;
    const entidade = query.entidade ?? 'todos';

    // Construir query ES
    const must: unknown[] = [];
    const filter: unknown[] = [];

    if (query.q?.trim()) {
      must.push({
        multi_match: {
          query: query.q.trim(),
          fields: ['_fulltext^3', 'objetoCompra^2', 'objetoContrato^2', 'orgaoRazaoSocial'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          minimum_should_match: '75%',
        },
      });
    }

    if (query.uf)            filter.push({ term: { unidadeUfSigla: query.uf } });
    if (query.modalidadeId)  filter.push({ term: { modalidadeId: query.modalidadeId } });
    if (query.situacao)      filter.push({ term: { situacao: query.situacao } });
    if (query.srp !== undefined) filter.push({ term: { srp: query.srp } });
    if (query.orgaoCnpj)    filter.push({ term: { orgaoCnpj: query.orgaoCnpj } });
    if (query.niFornecedor) filter.push({ term: { niFornecedor: query.niFornecedor } });

    if (query.valorMinimo || query.valorMaximo) {
      filter.push({
        range: {
          valorTotalEstimado: {
            ...(query.valorMinimo ? { gte: query.valorMinimo } : {}),
            ...(query.valorMaximo ? { lte: query.valorMaximo } : {}),
          },
        },
      });
    }

    if (query.dataPublicacaoInicio || query.dataPublicacaoFim) {
      filter.push({
        range: {
          dataPublicacaoPncp: {
            ...(query.dataPublicacaoInicio ? { gte: query.dataPublicacaoInicio } : {}),
            ...(query.dataPublicacaoFim    ? { lte: query.dataPublicacaoFim }    : {}),
          },
        },
      });
    }

    if (query.vigentes) {
      filter.push({ range: { dataVigenciaFim: { gte: 'now/d' } } });
    }

    const esQuery = {
      bool: {
        must:   must.length   ? must   : [{ match_all: {} }],
        filter: filter.length ? filter : undefined,
      },
    };

    // Índices a consultar
    const indices =
      entidade === 'contratacoes' ? [INDICES.CONTRATACOES] :
      entidade === 'contratos'    ? [INDICES.CONTRATOS]    :
      [INDICES.CONTRATACOES, INDICES.CONTRATOS];

    const startTime = Date.now();

    try {
      const res = await this.es.client.search({
        index: indices,
        from,
        size: limite,
        query: esQuery as Record<string, unknown>,
        sort: query.q ? ['_score'] : [{ dataPublicacaoPncp: { order: 'desc' } }],
        aggs: {
          ufs: { terms: { field: 'unidadeUfSigla', size: 30 } },
          modalidades: { terms: { field: 'modalidadeNome.keyword', size: 15 } },
        },
      });


      const total = typeof res.hits.total === 'number'
        ? res.hits.total
        : (res.hits.total as { value: number }).value ?? 0;

      const items: SearchResultItem[] = res.hits.hits.map((hit) => {
        const src = (hit._source ?? {}) as Record<string, unknown>;
        const isContrato = (hit._index ?? '').includes('contratos');

        return {
          id:                 String(src['id'] ?? hit._id),
          tipo:               isContrato ? 'contrato' : 'contratacao',
          score:              hit._score ?? 0,
          numeroControlePncp: String(src['numeroControlePncp'] ?? ''),
          objeto:             String(src['objetoContrato'] ?? src['objetoCompra'] ?? ''),
          valorPrincipal:     Number(src['valorGlobal'] ?? src['valorTotalEstimado'] ?? 0) || undefined,
          dataPublicacao:     String(src['dataPublicacaoPncp'] ?? ''),
          uf:                 String(src['unidadeUfSigla'] ?? ''),
          orgaoRazaoSocial:   String(src['orgaoRazaoSocial'] ?? ''),
          situacao:           String(src['situacao'] ?? ''),
          ...src,
        } as SearchResultItem;
      });

      // Processar aggregations
      const aggs = res.aggregations as Record<string, { buckets?: Array<{ key: string; doc_count: number }> }> | undefined;

      return {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
        took: Date.now() - startTime,
        items,
        aggregations: {
          ufs: (aggs?.['ufs']?.buckets ?? []).map((b) => ({ key: b.key, count: b.doc_count })),
          modalidades: (aggs?.['modalidades']?.buckets ?? []).map((b) => ({ key: b.key, count: b.doc_count })),
          faixasValor: [],
        },
      };
    } catch (err) {
      this.logger.error({ err }, 'Erro na busca Elasticsearch');
      return { total: 0, pagina, limite, totalPaginas: 0, took: 0, items: [], aggregations: { ufs: [], modalidades: [], faixasValor: [] } };
    }
  }

  /**
   * Autocomplete para sugestão em tempo real.
   */
  async autocomplete(q: string, limite = 8): Promise<string[]> {
    if (!q || q.length < 2) return [];

    try {
      const res = await this.es.client.search({
        index: [INDICES.CONTRATACOES, INDICES.CONTRATOS],
        size: limite,
        query: {
          multi_match: {
            query: q,
            fields: ['objetoCompra', 'objetoContrato', 'orgaoRazaoSocial'],
            type: 'phrase_prefix',
          },
        } as Record<string, unknown>,
        _source: ['objetoCompra', 'objetoContrato'],
      });

      return res.hits.hits
        .map((h) => {
          const src = (h._source ?? {}) as Record<string, unknown>;
          return String(src['objetoCompra'] ?? src['objetoContrato'] ?? '');
        })
        .filter(Boolean)
        .slice(0, limite);
    } catch {
      return [];
    }
  }

  /**
   * Deletar um documento do índice.
   */
  async deleteDoc(index: string, id: string): Promise<void> {
    try {
      await this.es.client.delete({ index, id });
    } catch {
      // ignora se não encontrar
    }
  }
}
