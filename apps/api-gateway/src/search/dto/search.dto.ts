import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export type SearchEntidade = 'contratacoes' | 'contratos' | 'todos';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  modalidadeId?: number;

  @IsOptional()
  @IsString()
  situacao?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  srp?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMinimo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valorMaximo?: number;

  @IsOptional()
  @IsString()
  dataPublicacaoInicio?: string;

  @IsOptional()
  @IsString()
  dataPublicacaoFim?: string;

  @IsOptional()
  @IsString()
  orgaoCnpj?: string;

  @IsOptional()
  @IsString()
  niFornecedor?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  vigentes?: boolean;

  @IsOptional()
  @IsEnum(['contratacoes', 'contratos', 'todos'])
  entidade?: SearchEntidade;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limite?: number;
}

export class AutocompleteQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(20)
  limite?: number;
}
