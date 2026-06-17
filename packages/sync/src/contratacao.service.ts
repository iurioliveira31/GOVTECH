import { PrismaClient } from '@prisma/client';
import { PncpApiClient, PncpContratacaoDto, MODALIDADE_PARA_ENUM, SITUACAO_CONTRATACAO_ENUM } from '@aplicativo/pncp';
import { hashObjeto, parsePncpDate, parsePncpDateTime, SyncStats, emptySyncStats } from './utils';
import { OrgaoService } from './orgao.service';
import { createLogger } from './logger';

const logger = createLogger('ContratacaoSync');

export class ContratacaoSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pncp: PncpApiClient,
    private readonly orgaoSvc: OrgaoService,
  ) {}

  // ------------------------------------------------------------------
  // Persiste um lote de contratações (upsert por numeroControlePncp)
  // ------------------------------------------------------------------
  async upsertLote(items: PncpContratacaoDto[]): Promise<SyncStats> {
    const stats = emptySyncStats();

    for (const item of items) {
      stats.registrosProcessados++;
      try {
        // Garante que o órgão existe
        await this.orgaoSvc.upsert(item.orgaoEntidade, item.unidadeOrgao);

        const hash = hashObjeto(item);
        const cnpj = item.orgaoEntidade?.cnpj?.replace(/\D/g, '') ?? '';

        const existing = await this.prisma.pncpContratacao.findUnique({
          where: { numeroControlePncp: item.numeroControlePNCP },
          select: { id: true, hashConteudo: true },
        });

        if (existing) {
          if (existing.hashConteudo === hash) {
            stats.registrosDuplicados++;
            continue;
          }
          // Atualiza
          await this.prisma.pncpContratacao.update({
            where: { id: existing.id },
            data: this.toUpsertData(item, cnpj, hash),
          });
          stats.registrosAtualizados++;
        } else {
          // Insere
          await this.prisma.pncpContratacao.create({
            data: {
              ...this.toUpsertData(item, cnpj, hash),
              numeroControlePncp: item.numeroControlePNCP,
            },
          });
          stats.registrosInseridos++;
        }
      } catch (err: any) {
        stats.erros++;
        logger.error({ numeroControlePNCP: item.numeroControlePNCP, err: err.message }, 'Erro ao processar contratação');
      }
    }

    return stats;
  }

  // ------------------------------------------------------------------
  // Sincroniza itens de uma contratação
  // ------------------------------------------------------------------
  async syncItens(contratacaoId: string, cnpj: string, anoCompra: number, seq: number): Promise<void> {
    const itens = await this.pncp.consultarItensContratacao(cnpj, anoCompra, seq);
    if (!itens.length) return;

    for (const item of itens) {
      try {
        await this.prisma.pncpItemContratacao.upsert({
          where: {
            contratacaoId_numeroItem: {
              contratacaoId,
              numeroItem: item.numeroItem,
            },
          },
          create: {
            contratacaoId,
            numeroItem: item.numeroItem,
            descricao: item.descricao,
            materialOuServico: item.materialOuServico,
            tipoBeneficioId: item.tipoBeneficioId,
            tipoBeneficioNome: item.tipoBeneficioNome,
            incentivoProdutivoBasico: item.incentivoProdutivoBasico,
            criterioJulgamentoId: item.criterioJulgamentoId,
            criterioJulgamentoNome: item.criterioJulgamentoNome,
            situacaoId: item.situacaoCompraItemId,
            situacaoNome: item.situacaoCompraItemNome,
            situacao: (SITUACAO_ITEM_ENUM[item.situacaoCompraItemId ?? 0] as any) ?? null,
            unidadeMedida: item.unidadeMedida,
            quantidade: item.quantidade,
            valorUnitarioEstimado: item.valorUnitarioEstimado,
            valorTotal: item.valorTotal,
            orcamentoSigiloso: item.orcamentoSigiloso ?? false,
            dataAtualizacao: parsePncpDateTime(item.dataAtualizacao),
          },
          update: {
            descricao: item.descricao,
            situacaoId: item.situacaoCompraItemId,
            situacaoNome: item.situacaoCompraItemNome,
            situacao: (SITUACAO_ITEM_ENUM[item.situacaoCompraItemId ?? 0] as any) ?? null,
            quantidade: item.quantidade,
            valorUnitarioEstimado: item.valorUnitarioEstimado,
            valorTotal: item.valorTotal,
            dataAtualizacao: parsePncpDateTime(item.dataAtualizacao),
          },
        });

        // Sincroniza resultados do item (vencedores)
        await this.syncResultadosItem(contratacaoId, item.numeroItem, cnpj, anoCompra, seq);
      } catch (err: any) {
        logger.error({ numeroItem: item.numeroItem, err: err.message }, 'Erro ao processar item de contratação');
      }
    }
  }

  // ------------------------------------------------------------------
  // Resultados de item (vencedores/homologados)
  // ------------------------------------------------------------------
  private async syncResultadosItem(
    contratacaoId: string,
    numeroItem: number,
    cnpj: string,
    anoCompra: number,
    seq: number,
  ): Promise<void> {
    const itemRec = await this.prisma.pncpItemContratacao.findUnique({
      where: { contratacaoId_numeroItem: { contratacaoId, numeroItem } },
      select: { id: true },
    });
    if (!itemRec) return;

    const resultados = await this.pncp.consultarResultadosItem(cnpj, anoCompra, seq, numeroItem);
    for (const res of resultados) {
      try {
        await this.prisma.pncpResultadoItem.upsert({
          where: {
            itemId_sequencialResultado: {
              itemId: itemRec.id,
              sequencialResultado: res.sequencialResultado,
            },
          },
          create: {
            itemId: itemRec.id,
            sequencialResultado: res.sequencialResultado,
            tipoPessoa: res.tipoPessoa,
            niFornecedor: res.niFornecedor,
            nomeFornecedor: res.nomeFornecedor,
            porteEmpresaId: res.porteId,
            porteEmpresaNome: res.porteNome,
            situacaoId: res.situacaoResultadoItemId,
            situacaoNome: res.situacaoResultadoItemNome,
            valorUnitario: res.valorUnitario,
            quantidade: res.quantidade,
            valorTotal: res.valorTotal,
            marca: res.marca,
            modelo: res.modelo,
            dataResultado: parsePncpDate(res.dataResultado),
            dataAtualizacao: parsePncpDateTime(res.dataAtualizacao),
          },
          update: {
            situacaoId: res.situacaoResultadoItemId,
            valorUnitario: res.valorUnitario,
            quantidade: res.quantidade,
            valorTotal: res.valorTotal,
            dataAtualizacao: parsePncpDateTime(res.dataAtualizacao),
          },
        });
      } catch (err: any) {
        logger.error({ sequencialResultado: res.sequencialResultado, err: err.message }, 'Erro ao processar resultado de item');
      }
    }
  }

  // ------------------------------------------------------------------
  // Documentos de uma contratação
  // ------------------------------------------------------------------
  async syncDocumentos(contratacaoId: string, cnpj: string, anoCompra: number, seq: number): Promise<void> {
    const docs = await this.pncp.consultarDocumentosContratacao(cnpj, anoCompra, seq);
    for (const doc of docs) {
      try {
        await this.prisma.pncpDocumento.upsert({
          where: {
            entidadeTipo_entidadeId_sequencialDocumento: {
              entidadeTipo: 'CONTRATACAO',
              entidadeId: contratacaoId,
              sequencialDocumento: doc.sequencialDocumento,
            },
          },
          create: {
            entidadeTipo: 'CONTRATACAO',
            entidadeId: contratacaoId,
            sequencialDocumento: doc.sequencialDocumento,
            tipoDocumentoId: doc.tipoDocumentoId,
            tipoDocumentoNome: doc.tipoDocumentoNome,
            titulo: doc.titulo,
            url: doc.url,
            tamanho: doc.tamanho ? BigInt(doc.tamanho) : null,
            dataPublicacao: parsePncpDate(doc.dataPublicacao),
          },
          update: {
            titulo: doc.titulo,
            url: doc.url,
            tipoDocumentoNome: doc.tipoDocumentoNome,
          },
        });
      } catch (err: any) {
        logger.error({ sequencialDocumento: doc.sequencialDocumento, err: err.message }, 'Erro ao processar documento de contratação');
      }
    }
  }

  // ------------------------------------------------------------------
  // Mapeamento DTO → dados do Prisma
  // ------------------------------------------------------------------
  private toUpsertData(item: PncpContratacaoDto, cnpj: string, hash: string) {
    return {
      anoCompra: item.anoCompra,
      sequencialCompra: item.sequencialCompra,
      numeroCompra: item.numeroCompra,
      processo: item.processo,
      modalidadeId: item.modalidadeId,
      modalidadeNome: item.modalidadeNome,
      modalidade: (MODALIDADE_PARA_ENUM[item.modalidadeId] as any) ?? null,
      modoDisputaId: item.modoDisputaId,
      modoDisputaNome: item.modoDisputaNome,
      tipoInstrumentoId: item.tipoInstrumentoConvocatorioId,
      tipoInstrumentoNome: item.tipoInstrumentoConvocatorioNome,
      situacaoId: item.situacaoCompraId,
      situacaoNome: item.situacaoCompraNome,
      situacao: (SITUACAO_CONTRATACAO_ENUM[item.situacaoCompraId] as any) ?? 'DIVULGADA',
      categoriaProcessoId: item.categoriaProcessoId,
      categoriaProcessoNome: item.categoriaProcessoNome,
      objetoCompra: item.objetoCompra,
      informacaoComplementar: item.informacaoComplementar,
      srp: item.srp ?? false,
      orcamentoSigiloso: item.orcamentoSigiloso ?? false,
      valorTotalEstimado: item.valorTotalEstimado,
      valorTotalHomologado: item.valorTotalHomologado,
      dataAberturaProposta: parsePncpDateTime(item.dataAberturaProposta),
      dataEncerramentoProposta: parsePncpDateTime(item.dataEncerramentoProposta),
      dataPublicacaoPncp: parsePncpDate(item.dataPublicacaoPncp),
      dataInclusao: parsePncpDate(item.dataInclusao),
      dataAtualizacao: parsePncpDateTime(item.dataAtualizacao),
      amparoLegalCodigo: item.amparoLegal?.codigo,
      amparoLegalNome: item.amparoLegal?.nome,
      amparoLegalDescricao: item.amparoLegal?.descricao,
      orgaoCnpj: cnpj,
      orgaoRazaoSocial: item.orgaoEntidade?.razaoSocial,
      orgaoPoderId: item.orgaoEntidade?.poderId,
      orgaoEsferaId: item.orgaoEntidade?.esferaId,
      unidadeCodigo: item.unidadeOrgao?.codigoUnidade,
      unidadeNome: item.unidadeOrgao?.nomeUnidade,
      unidadeCodigoIbge: item.unidadeOrgao?.codigoIbge?.toString(),
      unidadeMunicipioNome: item.unidadeOrgao?.municipioNome,
      unidadeUfSigla: item.unidadeOrgao?.ufSigla,
      unidadeUfNome: item.unidadeOrgao?.ufNome,
      orgaoSubrogadoCnpj: item.orgaoSubRogado?.cnpj,
      orgaoSubrogadoRazaoSocial: item.orgaoSubRogado?.razaoSocial,
      unidadeSubrogadaCodigo: item.unidadeSubRogada?.codigoUnidade,
      unidadeSubrogadaNome: item.unidadeSubRogada?.nomeUnidade,
      unidadeSubrogadaUfSigla: item.unidadeSubRogada?.ufSigla,
      unidadeSubrogadaMunicipioNome: item.unidadeSubRogada?.municipioNome,
      usuarioNome: item.usuarioNome,
      linkSistemaOrigem: item.linkSistemaOrigem,
      justificativaPresencial: item.justificativaPresencial,
      hashConteudo: hash,
      sincronizadoEm: new Date(),
    };
  }
}

// Import necessário aqui para não criar dep circular
import { SITUACAO_ITEM_ENUM } from '@aplicativo/pncp';
