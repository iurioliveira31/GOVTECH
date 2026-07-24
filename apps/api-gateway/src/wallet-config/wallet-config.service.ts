import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletConfigService {
  constructor(private prisma: PrismaService) {}

  /** Busca a configuração de carteira do tenant. Cria um default se não existir. */
  async getOrCreate(tenantId: string) {
    const existing = await this.prisma.tenantWalletConfig.findUnique({
      where: { tenantId },
    });

    if (existing) return existing;

    // Cria configuração padrão
    return this.prisma.tenantWalletConfig.create({
      data: {
        tenantId,
        ibgesMunicipios: [],
        tier1Ibges: [],
        tier2Ibges: [],
        mesorregioes: [],
        categoriasEquipamento: [],
        bandaMinima: 'B',
        fontes: ['SESLEGIS', 'DOU_INLABS', 'PNCP'],
        palavrasChaveExtra: [],
        ativo: true,
      },
    });
  }

  /** Atualiza a configuração de carteira do tenant */
  async update(tenantId: string, dto: UpdateWalletConfigDto) {
    await this.getOrCreate(tenantId); // Garante que existe

    return this.prisma.tenantWalletConfig.update({
      where: { tenantId },
      data: {
        ibgesMunicipios: dto.ibgesMunicipios,
        tier1Ibges: dto.tier1Ibges,
        tier2Ibges: dto.tier2Ibges,
        mesorregioes: dto.mesorregioes,
        categoriasEquipamento: dto.categoriasEquipamento,
        bandaMinima: dto.bandaMinima,
        fontes: dto.fontes,
        palavrasChaveExtra: dto.palavrasChaveExtra,
        alertaWhatsapp: dto.alertaWhatsapp,
        alertaEmail: dto.alertaEmail,
        alertaTelegram: dto.alertaTelegram,
        ativo: dto.ativo ?? true,
      },
    });
  }

  /**
   * Filtra resoluções conforme o perfil de carteira do tenant.
   * Retorna apenas resoluções com municípios/categorias configurados
   * e que atendam à banda mínima.
   */
  async filtrarResolucoesPorCarteira(tenantId: string) {
    const config = await this.getOrCreate(tenantId);

    const where: any = {
      // Nunca exibir resoluções descartadas pela IA (convalidações, administrativas, sem repasse)
      status: { notIn: ['DESCARTADA', 'ERROR', 'PENDING'] as any[] },
    };

    // Filtro de banda mínima
    const bandaOrdem: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
    const bandaMin = bandaOrdem[config.bandaMinima] || 2;
    const bandasPermitidas = Object.entries(bandaOrdem)
      .filter(([, v]) => v >= bandaMin)
      .map(([k]) => k);
    where.banda = { in: bandasPermitidas };

    // Filtro de fonte
    if (config.fontes && config.fontes.length > 0) {
      where.fonte = { in: config.fontes };
    }

    // Se tem municípios ou categorias configurados, filtra por items
    const hasTerritory = config.ibgesMunicipios.length > 0 || config.mesorregioes.length > 0;
    const hasCategoria = config.categoriasEquipamento.length > 0;

    if (hasTerritory || hasCategoria) {
      where.items = {
        some: {
          ...(hasTerritory && config.ibgesMunicipios.length > 0
            ? { ibgeMunicipio: { in: config.ibgesMunicipios } }
            : {}),
          ...(hasCategoria
            ? { categoriaEquipamento: { in: config.categoriasEquipamento } }
            : {}),
        },
      };
    }

    // Palavras-chave extras
    if (config.palavrasChaveExtra && config.palavrasChaveExtra.length > 0) {
      where.OR = config.palavrasChaveExtra.map((kw) => ({
        resumoIa: { contains: kw, mode: 'insensitive' },
      }));
    }

    return this.prisma.resolution.findMany({
      where,
      orderBy: [{ score: 'desc' }, { dataPublicacao: 'desc' }],
      take: 200,
      include: { items: true },
    });
  }
}

export interface UpdateWalletConfigDto {
  ibgesMunicipios?: string[];
  tier1Ibges?: string[];
  tier2Ibges?: string[];
  mesorregioes?: string[];
  categoriasEquipamento?: string[];
  bandaMinima?: 'A' | 'B' | 'C' | 'D';
  fontes?: string[];
  palavrasChaveExtra?: string[];
  alertaWhatsapp?: string;
  alertaEmail?: string;
  alertaTelegram?: string;
  ativo?: boolean;
}
