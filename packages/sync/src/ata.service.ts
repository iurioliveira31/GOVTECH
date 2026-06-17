import { PrismaClient } from '@prisma/client';
import { PncpApiClient, PncpAtaDto } from '@aplicativo/pncp';
import { hashObjeto, parsePncpDate, parsePncpDateTime, SyncStats, emptySyncStats } from './utils';
import { OrgaoService } from './orgao.service';
import { createLogger } from './logger';

const logger = createLogger('AtaSync');

export class AtaSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pncp: PncpApiClient,
    private readonly orgaoSvc: OrgaoService,
  ) {}

  async upsertLote(items: PncpAtaDto[]): Promise<SyncStats> {
    const stats = emptySyncStats();

    for (const item of items) {
      stats.registrosProcessados++;
      try {
        const cnpj = item.cnpjOrgao?.replace(/\D/g, '') ?? '';
        await this.orgaoSvc.upsertPorCnpjNome(cnpj, item.nomeOrgao ?? '');

        const hash = hashObjeto(item);

        const existing = await this.prisma.pncpAta.findUnique({
          where: { numeroControlePncpAta: item.numeroControlePNCPAta },
          select: { id: true, hashConteudo: true },
        });

        const data = this.toUpsertData(item, cnpj, hash);

        if (existing) {
          if (existing.hashConteudo === hash) {
            stats.registrosDuplicados++;
            continue;
          }
          await this.prisma.pncpAta.update({ where: { id: existing.id }, data });
          stats.registrosAtualizados++;
        } else {
          await this.prisma.pncpAta.create({
            data: { ...data, numeroControlePncpAta: item.numeroControlePNCPAta },
          });
          stats.registrosInseridos++;
        }
      } catch (err: any) {
        stats.erros++;
        logger.error({ numeroControlePNCPAta: item.numeroControlePNCPAta, err: err.message }, 'Erro ao processar ata');
      }
    }

    return stats;
  }

  async syncDocumentos(
    ataId: string,
    cnpj: string,
    anoCompra: number,
    seqCompra: number,
    seqAta: number,
  ): Promise<void> {
    const docs = await this.pncp.consultarDocumentosAta(cnpj, anoCompra, seqCompra, seqAta);
    for (const doc of docs) {
      try {
        await this.prisma.pncpDocumento.upsert({
          where: {
            entidadeTipo_entidadeId_sequencialDocumento: {
              entidadeTipo: 'ATA',
              entidadeId: ataId,
              sequencialDocumento: doc.sequencialDocumento,
            },
          },
          create: {
            entidadeTipo: 'ATA',
            entidadeId: ataId,
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
        logger.error({ sequencialDocumento: doc.sequencialDocumento, err: err.message }, 'Erro ao processar documento de ata');
      }
    }
  }

  private toUpsertData(item: PncpAtaDto, cnpj: string, hash: string) {
    return {
      numeroControlePncpCompra: item.numeroControlePNCPCompra ?? null,
      numeroAtaRegistroPreco: item.numeroAtaRegistroPreco,
      anoAta: item.anoAta,
      sequencialAta: item.sequencialAta ?? 0,
      objetoContratacao: item.objetoContratacao,
      cancelado: item.cancelado ?? false,
      dataAssinatura: parsePncpDate(item.dataAssinatura),
      vigenciaInicio: parsePncpDate(item.vigenciaInicio),
      vigenciaFim: parsePncpDate(item.vigenciaFim),
      dataCancelamento: parsePncpDate(item.dataCancelamento),
      dataPublicacaoPncp: parsePncpDate(item.dataPublicacaoPncp),
      dataInclusao: parsePncpDate(item.dataInclusao),
      dataAtualizacao: parsePncpDateTime(item.dataAtualizacao),
      cnpjOrgao: cnpj,
      nomeOrgao: item.nomeOrgao,
      codigoUnidadeOrgao: item.codigoUnidadeOrgao,
      nomeUnidadeOrgao: item.nomeUnidadeOrgao,
      cnpjOrgaoSubrogado: item.cnpjOrgaoSubrogado,
      nomeOrgaoSubrogado: item.nomeOrgaoSubrogado,
      codigoUnidadeSubrogada: item.codigoUnidadeOrgaoSubrogado,
      nomeUnidadeSubrogada: item.nomeUnidadeOrgaoSubrogado,
      usuario: item.usuario,
      hashConteudo: hash,
      sincronizadoEm: new Date(),
    };
  }
}
