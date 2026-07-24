import {
  Controller, Get, Post, Patch, Delete, Param,
  Body, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto, UpdateFavoriteStatusDto } from './dto/favorite.dto';

interface JwtUser { id: string; tenantId: string; email: string; role: string }

// Alias tipado para evitar erros antes do prisma generate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaAny = any;

@Controller('favorites')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class FavoritesController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /favorites
   * Lista todos os favoritos do usuário autenticado.
   */
  @Get()
  async list(@Req() req: { user: JwtUser }) {
    const user = req.user;
    return (this.prisma as PrismaAny).favorite.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * POST /favorites
   * Adiciona um favorito.
   */
  @Post()
  async create(@Req() req: { user: JwtUser }, @Body() dto: CreateFavoriteDto) {
    const user = req.user;
    return (this.prisma as PrismaAny).favorite.upsert({
      where: {
        userId_entityType_entityId: {
          userId:     user.id,
          entityType: dto.entityType,
          entityId:   dto.entityId,
        },
      },
      create: {
        userId:     user.id,
        entityType: dto.entityType,
        entityId:   dto.entityId,
        label:      dto.label,
        status:     dto.status ?? 'ANALISE',
        valorProposta: dto.valorProposta,
      },
      update: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.valorProposta !== undefined ? { valorProposta: dto.valorProposta } : {}),
      },
    });
  }

  /**
   * PATCH /favorites/:id/status
   * Atualiza o status/fase no Kanban.
   */
  @Patch(':id/status')
  async updateStatus(
    @Req() req: { user: JwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateFavoriteStatusDto,
  ) {
    const user = req.user;
    return (this.prisma as PrismaAny).favorite.updateMany({
      where: { id, userId: user.id },
      data: {
        status: dto.status,
        ...(dto.valorProposta !== undefined ? { valorProposta: dto.valorProposta } : {}),
      },
    });
  }

  /**
   * DELETE /favorites/:id
   * Remove um favorito por ID.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    const user = req.user;
    await (this.prisma as PrismaAny).favorite.deleteMany({
      where: { id, userId: user.id },
    });
  }

  /**
   * DELETE /favorites/entity/:entityType/:entityId
   * Remove favorito por entidade (sem precisar do ID interno).
   */
  @Delete('entity/:entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeByEntity(
    @Req() req: { user: JwtUser },
    @Param('entityType') entityType: string,
    @Param('entityId')   entityId: string,
  ) {
    const user = req.user;
    await (this.prisma as PrismaAny).favorite.deleteMany({
      where: { userId: user.id, entityType, entityId },
    });
  }
}
