import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum OrdemContratacao {
  DATA_PUBLICACAO_DESC = 'dataPublicacaoPncp_desc',
  DATA_PUBLICACAO_ASC = 'dataPublicacaoPncp_asc',
  DATA_ENCERRAMENTO_ASC = 'dataEncerramentoProposta_asc',
  DATA_ENCERRAMENTO_DESC = 'dataEncerramentoProposta_desc',
  VALOR_DESC = 'valorTotalEstimado_desc',
  VALOR_ASC = 'valorTotalEstimado_asc',
  DATA_ATUALIZACAO_DESC = 'dataAtualizacao_desc',
}

export enum OrdemContrato {
  DATA_PUBLICACAO_DESC = 'dataPublicacaoPncp_desc',
  DATA_PUBLICACAO_ASC = 'dataPublicacaoPncp_asc',
  DATA_VIGENCIA_FIM_ASC = 'dataVigenciaFim_asc',
  DATA_VIGENCIA_FIM_DESC = 'dataVigenciaFim_desc',
  VALOR_DESC = 'valorGlobal_desc',
  VALOR_ASC = 'valorGlobal_asc',
}

// ── Filtros de contratações ──────────────────────────────────────

export class FiltroContratacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  q?: string; // busca no objeto da compra

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  orgaoCnpj?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modalidadeId?: number;

  @IsOptional()
  @IsString()
  situacao?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  srp?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  abertas?: boolean; // propostas ainda em aberto

  @IsOptional()
  @IsDateString()
  dataPublicacaoInicio?: string;

  @IsOptional()
  @IsDateString()
  dataPublicacaoFim?: string;

  @IsOptional()
  @IsDateString()
  dataEncerramentoInicio?: string;

  @IsOptional()
  @IsDateString()
  dataEncerramentoFim?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMinimo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorMaximo?: number;

  @IsOptional()
  @IsEnum(OrdemContratacao)
  ordem?: OrdemContratacao = OrdemContratacao.DATA_PUBLICACAO_DESC;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}

// ── Filtros de contratos ─────────────────────────────────────────

export class FiltroContratoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  q?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  orgaoCnpj?: string;

  @IsOptional()
  @IsString()
  niFornecedor?: string;

  @IsOptional()
  @IsString()
  tipoContrato?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  vigentes?: boolean; // dataVigenciaFim >= hoje

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  vencendoEm30Dias?: boolean;

  @IsOptional()
  @IsDateString()
  dataPublicacaoInicio?: string;

  @IsOptional()
  @IsDateString()
  dataPublicacaoFim?: string;

  @IsOptional()
  @IsDateString()
  dataVigenciaFimInicio?: string;

  @IsOptional()
  @IsDateString()
  dataVigenciaFimFim?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMinimo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorMaximo?: number;

  @IsOptional()
  @IsEnum(OrdemContrato)
  ordem?: OrdemContrato = OrdemContrato.DATA_PUBLICACAO_DESC;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}

// ── Filtros de atas ──────────────────────────────────────────────

export class FiltroAtaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  q?: string;

  @IsOptional()
  @IsString()
  orgaoCnpj?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  vigentes?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  canceladas?: boolean;

  @IsOptional()
  @IsDateString()
  vigenciaFimInicio?: string;

  @IsOptional()
  @IsDateString()
  vigenciaFimFim?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}

// ── Filtros de PCA ───────────────────────────────────────────────

export class FiltroPcaDto {
  @IsOptional()
  @IsString()
  orgaoCnpj?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2040)
  ano?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}

// ── Filtros de órgãos ────────────────────────────────────────────

export class FiltroOrgaoDto {
  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  esfera?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}

// ── Filtros de fornecedores ──────────────────────────────────────

export class FiltroFornecedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  tipoPessoa?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number = 20;
}

// ── DTO de sync manual ───────────────────────────────────────────

export class TriggerSyncDto {
  @IsOptional()
  @IsDateString()
  dataInicial?: string;

  @IsOptional()
  @IsDateString()
  dataFinal?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  syncDetalhes?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2040)
  anoPca?: number;
}
