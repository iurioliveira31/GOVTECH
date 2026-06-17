import { PrismaClient } from '@prisma/client';
import { PncpApiClient, PncpItemPcaDto } from '@aplicativo/pncp';
import { parsePncpDate, SyncStats, emptySyncStats } from './utils';
import { OrgaoService } from './orgao.service';
import { createLogger } from './logger';

const logger = createLogger('PcaSync');

export class PcaSyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pncp: PncpApiClient,
    private readonly orgaoSvc: OrgaoService,
  ) {}

  async upsertLote(grupos: PncpItemPcaDto[]): Promise<SyncStats> {
    const stats = emptySyncStats();

    for (const grupo of grupos) {
      stats.registrosProcessados++;
      try {
        const cnpj = grupo.orgaoEntidadeCnpj?.replace(/\D/g, '') ?? '';
        await this.orgaoSvc.upsertPorCnpjNome(cnpj, grupo.orgaoEntidadeRazaoSocial ?? '');

        // Upsert do PCA (cabeçalho)
        const pca = await this.prisma.pncpPca.upsert({
          where: { idPcaPncp: grupo.idPcaPncp },
          create: {
            idPcaPncp: grupo.idPcaPncp,
            anoPca: grupo.anoPca,
            cnpjOrgao: cnpj,
            razaoSocialOrgao: grupo.orgaoEntidadeRazaoSocial,
            codigoUnidade: grupo.codigoUnidade,
            nomeUnidade: grupo.nomeUnidade,
            dataPublicacaoPncp: parsePncpDate(grupo.dataPublicacaoPncp),
          },
          update: {
            nomeUnidade: grupo.nomeUnidade,
            dataPublicacaoPncp: parsePncpDate(grupo.dataPublicacaoPncp),
          },
        });

        // Upsert dos itens
        for (const item of grupo.itens ?? []) {
          try {
            await this.prisma.pncpItemPca.upsert({
              where: { pcaId_numeroItem: { pcaId: pca.id, numeroItem: item.numeroItem } },
              create: {
                pcaId: pca.id,
                numeroItem: item.numeroItem,
                categoriaItemPcaNome: item.categoriaItemPcaNome,
                classificacaoCatalogoId: item.classificacaoCatalogoId,
                nomeClassificacaoCatalogo: item.nomeClassificacaoCatalogo,
                classificacaoSuperiorCodigo: item.classificacaoSuperiorCodigo,
                classificacaoSuperiorNome: item.classificacaoSuperiorNome,
                pdmCodigo: item.pdmCodigo,
                pdmDescricao: item.pdmDescricao,
                codigoItem: item.codigoItem,
                descricaoItem: item.descricaoItem,
                unidadeFornecimento: item.unidadeFornecimento,
                quantidadeEstimada: item.quantidadeEstimada,
                valorUnitario: item.valorUnitario,
                valorTotal: item.valorTotal,
                valorOrcamentoExercicio: item.valorOrcamentoExercicio,
                dataDesejada: parsePncpDate(item.dataDesejada),
                unidadeRequisitante: item.unidadeRequisitante,
                grupoContratacaoCodigo: item.grupoContratacaoCodigo,
                grupoContratacaoNome: item.grupoContratacaoNome,
                dataInclusao: parsePncpDate(item.dataInclusao),
                dataAtualizacao: parsePncpDate(item.dataAtualizacao),
              },
              update: {
                quantidadeEstimada: item.quantidadeEstimada,
                valorUnitario: item.valorUnitario,
                valorTotal: item.valorTotal,
                valorOrcamentoExercicio: item.valorOrcamentoExercicio,
                dataDesejada: parsePncpDate(item.dataDesejada),
                dataAtualizacao: parsePncpDate(item.dataAtualizacao),
              },
            });
            stats.registrosInseridos++;
          } catch (err: any) {
            stats.erros++;
            logger.error({ numeroItem: item.numeroItem, idPcaPncp: grupo.idPcaPncp, err: err.message }, 'Erro ao processar item PCA');
          }
        }
      } catch (err: any) {
        stats.erros++;
        logger.error({ idPcaPncp: grupo.idPcaPncp, err: err.message }, 'Erro ao processar PCA');
      }
    }

    return stats;
  }
}
