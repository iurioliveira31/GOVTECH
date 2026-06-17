import { PrismaClient } from '@prisma/client';
import { PncpOrgaoEntidade, PncpUnidadeOrgao, ESFERA_ENUM, PODER_ENUM } from '@aplicativo/pncp';

export class OrgaoService {
  // Cache local para evitar hit no banco a cada registro
  private readonly cache = new Map<string, boolean>();

  constructor(private readonly prisma: PrismaClient) {}

  async upsert(
    orgao: PncpOrgaoEntidade,
    unidade?: PncpUnidadeOrgao,
  ): Promise<void> {
    const cnpj = orgao.cnpj?.replace(/\D/g, '') ?? '';
    if (!cnpj || this.cache.has(cnpj)) return;

    const esferaId = ESFERA_ENUM[orgao.esferaId] as any ?? null;
    const poderId = PODER_ENUM[orgao.poderId] as any ?? null;

    await this.prisma.pncpOrgao.upsert({
      where: { cnpj },
      create: {
        cnpj,
        razaoSocial: orgao.razaoSocial ?? 'Não informado',
        poderId,
        esferaId,
        ufSigla: unidade?.ufSigla ?? null,
        ufNome: unidade?.ufNome ?? null,
        municipioIbge: unidade?.codigoIbge?.toString() ?? null,
        municipioNome: unidade?.municipioNome ?? null,
      },
      update: {
        razaoSocial: orgao.razaoSocial ?? 'Não informado',
        poderId,
        esferaId,
        ...(unidade?.ufSigla && { ufSigla: unidade.ufSigla }),
        ...(unidade?.ufNome && { ufNome: unidade.ufNome }),
        ...(unidade?.municipioNome && { municipioNome: unidade.municipioNome }),
      },
    });

    this.cache.set(cnpj, true);
  }

  async upsertPorCnpjNome(cnpj: string, nome: string): Promise<void> {
    const cnpjClean = cnpj?.replace(/\D/g, '') ?? '';
    if (!cnpjClean || this.cache.has(cnpjClean)) return;

    await this.prisma.pncpOrgao.upsert({
      where: { cnpj: cnpjClean },
      create: { cnpj: cnpjClean, razaoSocial: nome ?? 'Não informado' },
      update: { razaoSocial: nome ?? 'Não informado' },
    });

    this.cache.set(cnpjClean, true);
  }

  clearCache() {
    this.cache.clear();
  }
}
