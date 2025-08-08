import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  total_pages?: number;

  @IsOptional()
  @IsNumber()
  total_sections?: number;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  payment_status?: string;

  @IsOptional()
  @IsString()
  zarinpal_authority?: string;

  @IsOptional()
  @IsString()
  zarinpal_ref_id?: string;

  @IsOptional()
  @IsNumber()
  total_pages?: number;

  @IsOptional()
  @IsNumber()
  total_sections?: number;
}
