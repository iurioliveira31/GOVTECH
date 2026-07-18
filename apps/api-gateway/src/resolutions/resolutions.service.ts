import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResolutionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 1000) {
    const skip = (page - 1) * limit;
    // Mostrar apenas a partir do dia 10/07/2026 conforme pedido do usuário
    const cutoffDate = new Date('2026-07-10T00:00:00.000Z');
    const where = { dataPublicacao: { gte: cutoffDate } };

    const [data, total] = await Promise.all([
      this.prisma.resolution.findMany({
        where,
        orderBy: { dataPublicacao: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      this.prisma.resolution.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!resolution) {
      throw new NotFoundException('Resolução não encontrada');
    }

    return resolution;
  }
}
