import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletConfigService, UpdateWalletConfigDto } from './wallet-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/wallet-config')
@UseGuards(JwtAuthGuard)
export class WalletConfigController {
  constructor(private readonly walletConfigService: WalletConfigService) {}

  /** GET /api/v1/wallet-config — retorna configuração atual do tenant */
  @Get()
  async getConfig(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.walletConfigService.getOrCreate(tenantId);
  }

  /** PUT /api/v1/wallet-config — atualiza configuração do tenant */
  @Put()
  async updateConfig(@Request() req: any, @Body() dto: UpdateWalletConfigDto) {
    const tenantId = req.user.tenantId;
    return this.walletConfigService.update(tenantId, dto);
  }

  /**
   * GET /api/v1/wallet-config/resolucoes
   * Retorna resoluções filtradas pelo perfil de carteira do tenant.
   */
  @Get('resolucoes')
  async getResolucoesFiltradas(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.walletConfigService.filtrarResolucoesPorCarteira(tenantId);
  }
}
