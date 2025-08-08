import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export class CreateOrderDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  comments?: string;

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
  comments?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

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
