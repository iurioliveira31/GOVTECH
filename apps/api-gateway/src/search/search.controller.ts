import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SearchService } from '@aplicativo/search';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchQueryDto, AutocompleteQueryDto } from './dto/search.dto';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search
   * Busca full-text unificada: licitações + contratos.
   *
   * Parâmetros: q, uf, modalidadeId, situacao, srp, valorMinimo, valorMaximo,
   *             dataPublicacaoInicio, dataPublicacaoFim, orgaoCnpj, niFornecedor,
   *             vigentes, entidade, pagina, limite
   */
  @Get()
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  /**
   * GET /search/autocomplete?q=
   * Sugestões em tempo real (phrase_prefix).
   */
  @Get('autocomplete')
  autocomplete(@Query() query: AutocompleteQueryDto) {
    return this.searchService.autocomplete(query.q, query.limite);
  }

  /**
   * POST /search/setup
   * Cria/reconfigura os índices no Elasticsearch.
   */
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  setup() {
    return this.searchService.setupIndices().then(() => ({
      ok: true,
      message: 'Índices configurados',
    }));
  }
}
