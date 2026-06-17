import { PrismaClient } from '@prisma/client';

export class FornecedorService {
  private readonly cache = new Map<string, boolean>();

  constructor(private readonly prisma: PrismaClient) {}

  async upsert(
    ni: string | undefined | null,
    tipoPessoa: string | undefined | null,
    nome: string | undefined | null,
    porteId?: number | null,
    porteNome?: string | null,
  ): Promise<void> {
    if (!ni || !nome) return;
    const niClean = ni.replace(/\D/g, '') || ni; // mantém estrangeiro
    if (this.cache.has(niClean)) return;

    await this.prisma.pncpFornecedor.upsert({
      where: { ni: niClean },
      create: {
        ni: niClean,
        tipoPessoa: tipoPessoa ?? 'PJ',
        nome,
        porteId: porteId ?? null,
        porteNome: porteNome ?? null,
      },
      update: {
        nome,
        ...(porteId !== undefined && porteId !== null && { porteId }),
        ...(porteNome && { porteNome }),
      },
    });

    this.cache.set(niClean, true);
  }

  clearCache() {
    this.cache.clear();
  }
}
