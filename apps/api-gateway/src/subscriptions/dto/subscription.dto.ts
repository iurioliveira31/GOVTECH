import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;

  @IsOptional() @IsString()
  cnpj?: string;

  @IsOptional() @IsString()
  companyName?: string;

  @IsOptional() @IsString()
  segment?: string;

  @IsOptional() @IsString()
  role?: string;

  @IsIn(['TRIAL', 'STARTER_MONTHLY', 'STARTER_ANNUAL', 'PRO_MONTHLY', 'PRO_ANNUAL', 'ENTERPRISE'])
  planChoice: string;
}

export class StartTrialDto {
  @IsOptional() @IsString()
  cnpj?: string;
}

export class CreateCheckoutDto {
  @IsString() @IsNotEmpty()
  priceId: string;
}
