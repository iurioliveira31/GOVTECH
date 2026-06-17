import { IsString, IsOptional, MaxLength, IsNumber, Min } from 'class-validator';

export class CreateFavoriteDto {
  @IsString()
  entityType!: 'procurement' | 'contract';

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorProposta?: number;
}

export class UpdateFavoriteStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorProposta?: number;
}
