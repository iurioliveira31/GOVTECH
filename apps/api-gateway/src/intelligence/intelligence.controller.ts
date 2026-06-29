import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';

@Controller('intelligence')
@UseGuards(JwtAuthGuard, TenantGuard)
export class IntelligenceController {
  constructor(private readonly svc: IntelligenceService) {}

  /**
   * GET /intelligence/radar
   * Painel de radar dos órgãos mais ativos com tendências.
   * Parâmetros:
   *   - uf: filtro por estado (ex: SP, RJ)
   *   - limite: quantidade de órgãos (padrão 20, máx 50)
   */
  @Get('radar')
  getRadar(
    @Query('uf') uf?: string,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite = 20,
  ) {
    return this.svc.getOrgaoRadar(uf, Math.min(limite, 50));
  }

  /**
   * GET /intelligence/oportunidades
   * Ranking de oportunidades abertas ordenadas por score (Raio-X).
   * Parâmetros:
   *   - uf: filtro por estado
   *   - modalidadeId: filtro por modalidade
   *   - pagina: página (padrão 1)
   *   - limite: itens por página (padrão 20, máx 50)
   */
  @Get('oportunidades')
  getOportunidades(
    @Query('uf') uf?: string,
    @Query('modalidadeId') modalidadeId?: string,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina = 1,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite = 20,
  ) {
    return this.svc.getRankingOportunidades(
      uf,
      modalidadeId ? parseInt(modalidadeId, 10) : undefined,
      pagina,
      Math.min(limite, 50),
    );
  }

  /**
   * GET /intelligence/orgao/:cnpj
   * Análise completa de um órgão: histórico, modalidades, objetos mais frequentes.
   */
  @Get('orgao/:cnpj')
  getOrgaoAnalise(@Param('cnpj') cnpj: string) {
    return this.svc.getOrgaoAnalise(cnpj);
  }

  /**
   * GET /intelligence/fornecedores-vencedores
   * Ranking de fornecedores vencedores por segmento (Saúde, Educação, Tecnologia, etc.)
   */
  @Get('fornecedores-vencedores')
  getFornecedoresVencedores(
    @Query('segmento') segmento = 'saude',
    @Query('anoInicio', new DefaultValuePipe(2025), ParseIntPipe) anoInicio = 2025,
    @Query('anoFim', new DefaultValuePipe(2026), ParseIntPipe) anoFim = 2026,
    @Query('cnpjConcorrente') cnpjConcorrente?: string,
  ) {
    return this.svc.getFornecedoresVencedores(segmento, anoInicio, anoFim, cnpjConcorrente);
  }
}
