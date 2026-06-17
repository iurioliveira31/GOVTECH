import { PrismaClient } from '@prisma/client';
import { PncpApiClient, PncpContratoDto, TIPO_CONTRATO_ENUM } from '@aplicativo/pncp';
import { hashObjeto, parsePncpDate, parsePncpDateTime, SyncStats, emptySyncStats } from './utils';
import { OrgaoService } from './orgao.service';
import { FornecedorService } from './fornecedor.service';
import { createLogger } from './logger';

const logger = createLogger('ContratoSync');

export class ContratoSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pncp: PncpApiClient,
    private readonly orgaoSvc: OrgaoService,
    private readonly fornecedorSvc: FornecedorService,
  ) {}

  async upsertLote(items: PncpContratoDto[]): Promise<SyncStats> {
    const stats = emptySyncStats();

    for (const item of items) {
      stats.registrosProcessados++;
      try {
        const cnpj = item.orgaoEntidade?.cnpj?.replace(/\D/g, '') ?? '';
        await this.orgaoSvc.upsert(item.orgaoEntidade, item.unidadeOrgao);
        await this.fornecedorSvc.upsert(
          item.niFornecedor,
          item.tipoPessoa,
          item.nomeRazaoSocialFornecedor,
        );

        const hash = hashObjeto(item);

        const existing = await this.prisma.pncpContrato.findUnique({
          where: { numeroControlePncp: item.numeroControlePNCP },
          select: { id: true, hashConteudo: true, numeroRetificacao: true },
        });

        const data = this.toUpsertData(item, cnpj, hash);

        if (existing) {
          // Só atualiza se retificação mudou ou hash diferente
          if (
            existing.hashConteudo === hash &&
            existing.numeroRetificacao === (item.numeroRetificacao ?? 0)
          ) {
            stats.registrosDuplicados++;
            continue;
          }
          await this.prisma.pncpContrato.update({ where: { id: existing.id }, data });
          stats.registrosAtualizados++;
        } else {
          await this.prisma.pncpContrato.create({
            data: { ...data, numeroControlePncp: item.numeroControlePNCP },
          });
          stats.registrosInseridos++;
        }
      } catch (err: any) {
        stats.erros++;
        logger.error({ numeroControlePNCP: item.numeroControlePNCP, err: err.message }, 'Erro ao processar contrato');
      }
    }

    return stats;
  }

  async syncDocumentos(contratoId: string, cnpj: string, anoContrato: number, seq: number): Promise<void> {
    const docs = await this.pncp.consultarDocumentosContrato(cnpj, anoContrato, seq);
    for (const doc of docs) {
      try {
        await this.prisma.pncpDocumento.upsert({
          where: {
            entidadeTipo_entidadeId_sequencialDocumento: {
              entidadeTipo: 'CONTRATO',
              entidadeId: contratoId,
              sequencialDocumento: doc.sequencialDocumento,
            },
          },
          create: {
            entidadeTipo: 'CONTRATO',
            entidadeId: contratoId,
            sequencialDocumento: doc.sequencialDocumento,
            tipoDocumentoId: doc.tipoDocumentoId,
            tipoDocumentoNome: doc.tipoDocumentoNome,
            titulo: doc.titulo,
            url: doc.url,
            tamanho: doc.tamanho ? BigInt(doc.tamanho) : null,
            dataPublicacao: parsePncpDate(doc.dataPublicacao),
          },
          update: { titulo: doc.titulo, url: doc.url },
        });
      } catch (err: any) {
        logger.error({ sequencialDocumento: doc.sequencialDocumento, err: err.message }, 'Erro ao processar documento de contrato');
      }
    }
  }

  private toUpsertData(item: PncpContratoDto, cnpj: string, hash: string) {
    return {
      numeroControlePncpCompra: item.numeroControlePNCPCompra,
      numeroContratoEmpenho: item.numeroContratoEmpenho,
      anoContrato: item.anoContrato,
      sequencialContrato: item.sequencialContrato,
      processo: item.processo,
      tipoContratoId: item.tipoContrato?.id,
      tipoContratoNome: item.tipoContrato?.nome,
      tipoContrato: (TIPO_CONTRATO_ENUM[item.tipoContrato?.id ?? 0] as any) ?? null,
      categoriaProcessoId: item.categoriaProcesso?.id,
      categoriaProcessoNome: item.categoriaProcesso?.nome,
      receita: item.receita ?? false,
      objetoContrato: item.objetoContrato,
      informacaoComplementar: item.informacaoComplementar,
      tipoPessoa: item.tipoPessoa,
      niFornecedor: item.niFornecedor?.replace(/\D/g, '') || item.niFornecedor || null,
      nomeRazaoSocialFornecedor: item.nomeRazaoSocialFornecedor,
      tipoPessoaSubcontratada: item.tipoPessoaSubContratada,
      niFornecedorSubcontratado: item.niFornecedorSubContratado,
      nomeFornecedorSubcontratado: item.nomeFornecedorSubContratado,
      valorInicial: item.valorInicial,
      numeroParcelas: item.numeroParcelas,
      valorParcela: item.valorParcela,
      valorGlobal: item.valorGlobal,
      valorAcumulado: item.valorAcumulado,
      dataAssinatura: parsePncpDate(item.dataAssinatura),
      dataVigenciaInicio: parsePncpDate(item.dataVigenciaInicio),
      dataVigenciaFim: parsePncpDate(item.dataVigenciaFim),
      dataPublicacaoPncp: parsePncpDateTime(item.dataPublicacaoPncp),
      dataAtualizacao: parsePncpDateTime(item.dataAtualizacao),
      numeroRetificacao: item.numeroRetificacao ?? 0,
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
      unidadeSubrogadaCodigo: item.unidadeSubRogada?.codigoUnidade,
      unidadeSubrogadaNome: item.unidadeSubRogada?.nomeUnidade,
      identificadorCipi: item.identificadorCipi,
      urlCipi: item.urlCipi,
      usuarioNome: item.usuarioNome,
      hashConteudo: hash,
      sincronizadoEm: new Date(),
    };
  }
}
