import {
  Controller, Get, Post, Patch, Delete, Param,
  Body, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto, UpdateAlertDto } from './dto/alert.dto';

interface JwtUser { id: string; tenantId: string; email: string; role: string }

// Alias tipado para evitar erros antes do prisma generate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaAny = any;

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /alerts
   */
  @Get()
  async list(@Req() req: { user: JwtUser }) {
    const user = req.user;
    return (this.prisma as PrismaAny).alert.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * POST /alerts
   */
  @Post()
  async create(@Req() req: { user: JwtUser }, @Body() dto: CreateAlertDto) {
    const user = req.user;
    return (this.prisma as PrismaAny).alert.create({
      data: {
        userId:      user.id,
        name:        dto.name,
        keywords:    dto.keywords,
        uf:          dto.uf,
        modalidadeId: dto.modalidadeId,
        entidade:    dto.entidade ?? 'todos',
      },
    });
  }

  /**
   * PATCH /alerts/:id
   */
  @Patch(':id')
  async update(
    @Req()       req: { user: JwtUser },
    @Param('id') id:  string,
    @Body()      dto: UpdateAlertDto,
  ) {
    const user = req.user;
    return (this.prisma as PrismaAny).alert.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(dto.name      !== undefined ? { name:      dto.name }      : {}),
        ...(dto.keywords  !== undefined ? { keywords:  dto.keywords }  : {}),
        ...(dto.uf        !== undefined ? { uf:        dto.uf }        : {}),
        ...(dto.entidade  !== undefined ? { entidade:  dto.entidade }  : {}),
        ...(dto.isActive  !== undefined ? { isActive:  dto.isActive }  : {}),
      },
    });
  }

  /**
   * DELETE /alerts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Req() req: { user: JwtUser }, @Param('id') id: string) {
    const user = req.user;
    await (this.prisma as PrismaAny).alert.deleteMany({
      where: { id, userId: user.id },
    });
  }
}
