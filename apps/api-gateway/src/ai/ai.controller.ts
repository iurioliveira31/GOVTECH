import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { GeminiService } from '@aplicativo/ai';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly gemini: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /ai/status
   */
  @Get('status')
  status() {
    return { available: this.gemini.isAvailable(), model: 'gemini-1.5-flash' };
  }

  /**
   * POST /ai/analisar/contrato/:id
   * Analisa um contrato e retorna score de conformidade, riscos e recomendações.
   * Campos do schema Prisma:
   *   Contract { id, contractNumber, title, supplierName, value, startDate, endDate, status, ... }
   */
  @Post('analisar/contrato/:id')
  @HttpCode(HttpStatus.OK)
  async analisarContrato(@Param('id') id: string) {
    const contrato = await this.prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        supplierName: true,
        value: true,
        startDate: true,
        endDate: true,
        status: true,
        procurement: {
          select: { agency: true, modality: true },
        },
      },
    });

    if (!contrato) throw new NotFoundException('Contrato não encontrado');

    const analise = await this.gemini.analisarContrato({
      numeroControlePncp:          contrato.contractNumber,
      objetoContrato:              contrato.title,
      tipoContratoNome:            contrato.procurement?.modality,
      orgaoRazaoSocial:            contrato.procurement?.agency,
      nomeRazaoSocialFornecedor:   contrato.supplierName,
      valorGlobal:                 Number(contrato.value),
      valorInicial:                Number(contrato.value),
      dataVigenciaInicio:          contrato.startDate.toISOString().split('T')[0],
      dataVigenciaFim:             contrato.endDate.toISOString().split('T')[0],
    });

    return {
      contratoId:         id,
      numeroControlePncp: contrato.contractNumber,
      analisadoEm:        new Date().toISOString(),
      ...analise,
    };
  }

  /**
   * POST /ai/resumir/licitacao/:id
   * Gera resumo executivo de uma licitação.
   * Campos do schema Prisma:
   *   Procurement { id, externalId, title, description, agency, modality, estimatedValue,
   *                 publicationDate, closingDate, status, ... }
   */
  @Post('resumir/licitacao/:id')
  @HttpCode(HttpStatus.OK)
  async resumirLicitacao(@Param('id') id: string) {
    const licitacao = await this.prisma.procurement.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        title: true,
        description: true,
        agency: true,
        modality: true,
        estimatedValue: true,
        publicationDate: true,
        closingDate: true,
        status: true,
      },
    });

    if (!licitacao) throw new NotFoundException('Licitação não encontrada');

    const resumo = await this.gemini.resumirLicitacao({
      numeroControlePncp:       licitacao.externalId,
      objetoCompra:             licitacao.title,
      modalidadeNome:           licitacao.modality,
      situacao:                 licitacao.status,
      valorTotalEstimado:       Number(licitacao.estimatedValue),
      orgaoRazaoSocial:         licitacao.agency,
      dataPublicacaoPncp:       licitacao.publicationDate.toISOString().split('T')[0],
      dataEncerramentoProposta: licitacao.closingDate.toISOString().split('T')[0],
    });

    return {
      licitacaoId:        id,
      numeroControlePncp: licitacao.externalId,
      analisadoEm:        new Date().toISOString(),
      ...resumo,
    };
  }

  /**
   * POST /ai/analisar/fornecedor/:contractNumber
   * Analisa perfil de fornecedor pelo nome (supplierName).
   * O schema não tem modelo Supplier separado — agrega via Contract.
   */
  @Post('analisar/fornecedor/:supplierName')
  @HttpCode(HttpStatus.OK)
  async analisarFornecedor(@Param('supplierName') supplierName: string) {
    const decoded = decodeURIComponent(supplierName);

    const agg = await this.prisma.contract.aggregate({
      where:  { supplierName: { contains: decoded, mode: 'insensitive' } },
      _sum:   { value: true },
      _count: { _all: true },
    });

    if (agg._count._all === 0) {
      throw new NotFoundException('Nenhum contrato encontrado para este fornecedor');
    }

    const analise = await this.gemini.analisarFornecedor({
      razaoSocial:    decoded,
      totalContratos: agg._count._all,
      valorTotal:     agg._sum.value != null ? Number(agg._sum.value) : undefined,
    });

    return {
      fornecedor:  decoded,
      analisadoEm: new Date().toISOString(),
      ...analise,
    };
  }
}
