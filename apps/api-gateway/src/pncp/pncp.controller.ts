import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PncpService } from './pncp.service';
import { PncpSyncService } from './pncp-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  FiltroContratacaoDto,
  FiltroContratoDto,
  FiltroAtaDto,
  FiltroPcaDto,
  FiltroOrgaoDto,
  FiltroFornecedorDto,
  TriggerSyncDto,
} from './dto/pncp-query.dto';

@Controller('pncp')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PncpController {
  constructor(
    private readonly pncpService: PncpService,
    private readonly syncService: PncpSyncService,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // Contratações
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/contratacoes
   * Lista licitações com filtros avançados e paginação.
   */
  @Get('contratacoes')
  listarContratacoes(@Query() filtro: FiltroContratacaoDto) {
    return this.pncpService.listarContratacoes(filtro);
  }

  /**
   * GET /pncp/contratacoes/:id
   * Detalha uma contratação com itens, resultados e documentos.
   */
  @Get('contratacoes/:id')
  detalharContratacao(@Param('id') id: string) {
    return this.pncpService.detalharContratacao(id);
  }

  /**
   * GET /pncp/contratacoes/pncp/:numeroControlePncp
   * Busca pelo número de controle PNCP (ex: 00394502000133-1-000001/2024).
   */
  @Get('contratacoes/pncp/:numeroControlePncp')
  detalharContratacaoPorControle(@Param('numeroControlePncp') numero: string) {
    return this.pncpService.detalharContratacaoPorNumeroControle(numero);
  }

  /**
   * GET /pncp/contratacoes/:id/itens
   * Lista itens de uma contratação com resultados/vencedores.
   */
  @Get('contratacoes/:id/itens')
  listarItens(@Param('id') id: string) {
    return this.pncpService.listarItensContratacao(id);
  }

  // ──────────────────────────────────────────────────────────────
  // Contratos
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/contratos
   * Lista contratos com filtros. Suporta ?vigentes=true e ?vencendoEm30Dias=true.
   */
  @Get('contratos')
  listarContratos(@Query() filtro: FiltroContratoDto) {
    return this.pncpService.listarContratos(filtro);
  }

  /**
   * GET /pncp/contratos/:id
   * Detalha um contrato com documentos e fornecedor.
   */
  @Get('contratos/:id')
  detalharContrato(@Param('id') id: string) {
    return this.pncpService.detalharContrato(id);
  }

  // ──────────────────────────────────────────────────────────────
  // Atas de Registro de Preços
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/atas
   * Lista atas de registro de preços.
   */
  @Get('atas')
  listarAtas(@Query() filtro: FiltroAtaDto) {
    return this.pncpService.listarAtas(filtro);
  }

  /**
   * GET /pncp/atas/:id
   */
  @Get('atas/:id')
  detalharAta(@Param('id') id: string) {
    return this.pncpService.detalharAta(id);
  }

  // ──────────────────────────────────────────────────────────────
  // PCA — Plano de Contratações Anual
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/pca
   * Lista PCAs com filtro por órgão e ano.
   */
  @Get('pca')
  listarPcas(@Query() filtro: FiltroPcaDto) {
    return this.pncpService.listarPcas(filtro);
  }

  /**
   * GET /pncp/pca/:id
   */
  @Get('pca/:id')
  detalharPca(@Param('id') id: string) {
    return this.pncpService.detalharPca(id);
  }

  /**
   * GET /pncp/pca/:id/itens
   * Lista itens de um PCA específico.
   */
  @Get('pca/:id/itens')
  listarItensPca(
    @Param('id') id: string,
    @Query('pagina') pagina?: number,
    @Query('limite') limite?: number,
  ) {
    return this.pncpService.listarItensPca(id, pagina, limite);
  }

  // ──────────────────────────────────────────────────────────────
  // Órgãos Compradores
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/orgaos
   * Lista órgãos com filtro por UF, esfera e razão social.
   */
  @Get('orgaos')
  listarOrgaos(@Query() filtro: FiltroOrgaoDto) {
    return this.pncpService.listarOrgaos(filtro);
  }

  /**
   * GET /pncp/orgaos/:cnpj
   * Detalha um órgão com contagens de contratações e contratos.
   */
  @Get('orgaos/:cnpj')
  detalharOrgao(@Param('cnpj') cnpj: string) {
    return this.pncpService.detalharOrgao(cnpj);
  }

  // ──────────────────────────────────────────────────────────────
  // Fornecedores
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/fornecedores
   * Lista fornecedores com histórico de contratos.
   */
  @Get('fornecedores')
  listarFornecedores(@Query() filtro: FiltroFornecedorDto) {
    return this.pncpService.listarFornecedores(filtro);
  }

  /**
   * GET /pncp/fornecedores/:ni
   * Detalha um fornecedor por CNPJ/CPF com últimos contratos.
   */
  @Get('fornecedores/:ni')
  detalharFornecedor(@Param('ni') ni: string) {
    return this.pncpService.detalharFornecedor(ni);
  }

  // ──────────────────────────────────────────────────────────────
  // Sincronização (restrito a ADMIN/OWNER)
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /pncp/sync/status
   * Retorna estado atual de todas as sincronizações (cursors, últimos syncs, totais).
   */
  @Get('sync/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  statusSync() {
    return this.pncpService.statusSync();
  }

  /**
   * POST /pncp/sync/incremental
   * Dispara sync incremental (a partir do último cursor).
   */
  @Post('sync/incremental')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerSyncIncremental(@Body() dto: TriggerSyncDto) {
    return this.syncService.triggerIncremental(dto);
  }

  /**
   * POST /pncp/sync/contratacoes
   * Dispara sync de contratações em um período específico.
   */
  @Post('sync/contratacoes')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerSyncContratacoes(@Body() dto: TriggerSyncDto) {
    return this.syncService.triggerContratacoes(dto);
  }

  /**
   * POST /pncp/sync/contratos
   * Dispara sync de contratos em um período específico.
   */
  @Post('sync/contratos')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerSyncContratos(@Body() dto: TriggerSyncDto) {
    return this.syncService.triggerContratos(dto);
  }

  /**
   * POST /pncp/sync/atas
   */
  @Post('sync/atas')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerSyncAtas(@Body() dto: TriggerSyncDto) {
    return this.syncService.triggerAtas(dto);
  }

  /**
   * POST /pncp/sync/pca
   * Dispara sync do PCA de um ano específico (default: ano corrente).
   */
  @Post('sync/pca')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerSyncPca(@Body() dto: TriggerSyncDto) {
    return this.syncService.triggerPca(dto);
  }

  /**
   * POST /pncp/sync/reprocessar
   * Reprocessa janelas com falha.
   */
  @Post('sync/reprocessar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  reprocessarFalhos() {
    return this.syncService.triggerReprocessar();
  }

  /**
   * POST /pncp/sync/comprasgov
   * Dispara sync histórico do ComprasNet (licitações anteriores ao PNCP).
   * Busca dados de órgãos federais no portal contratos.comprasnet.gov.br.
   */
  @Post('sync/comprasgov')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.ACCEPTED)
  triggerSyncComprasGov() {
    return this.syncService.triggerComprasGovHistorico();
  }
}
