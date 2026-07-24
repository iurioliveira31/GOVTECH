import {
  Controller, Post, Get, Patch, Delete, Param, Body,
  UseGuards, Request, Headers, ForbiddenException,
} from '@nestjs/common';
import { ResolutionAlertsService } from './resolution-alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { ConfigService } from '@nestjs/config';

@Controller('resolution-alerts')
export class ResolutionAlertsController {
  constructor(
    private readonly resolutionAlertsService: ResolutionAlertsService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Post()
  async createAlert(@Request() req: any, @Body() body: any) {
    return this.resolutionAlertsService.createAlert(req.user.sub, body);
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Get()
  async listAlerts(@Request() req: any) {
    return this.resolutionAlertsService.listAlerts(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Patch(':id')
  async toggleAlert(@Request() req: any, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.resolutionAlertsService.toggleAlert(req.user.sub, id, isActive);
  }

  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Delete(':id')
  async deleteAlert(@Request() req: any, @Param('id') id: string) {
    return this.resolutionAlertsService.deleteAlert(req.user.sub, id);
  }

  // Internal endpoint for the worker
  @Post('trigger-evaluation')
  async triggerEvaluation(
    @Body('resolutionId') resolutionId: string,
    @Headers('x-internal-key') internalKey?: string,
  ) {
    const expectedKey = this.config.get<string>('INTERNAL_API_KEY');
    
    // Se estiver em produção ou se a chave estiver configurada, exige correspondência
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction && !expectedKey) {
      throw new ForbiddenException('Chave secreta interna (INTERNAL_API_KEY) não configurada no servidor.');
    }

    if (expectedKey && internalKey !== expectedKey) {
      throw new ForbiddenException('Acesso negado: chave secreta inválida.');
    }

    return this.resolutionAlertsService.evaluateNewResolution(resolutionId);
  }
}

