import { IsString, IsOptional, IsArray, IsEnum, IsInt, ArrayMinSize, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlertDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  keywords!: string[];

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  modalidadeId?: number;

  @IsOptional()
  @IsEnum(['todos', 'contratacoes', 'contratos'])
  entidade?: 'todos' | 'contratacoes' | 'contratos';
}

export class UpdateAlertDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsEnum(['todos', 'contratacoes', 'contratos'])
  entidade?: 'todos' | 'contratacoes' | 'contratos';

  @IsOptional()
  isActive?: boolean;
}
