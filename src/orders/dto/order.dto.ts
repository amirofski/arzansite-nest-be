import { IsString, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum SiteType {
  PERSONAL = 'personal',
  BUSINESS = 'business'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  WALLET = 'wallet',
  ZARINPAL = 'zarinpal'
}

export enum PaymentCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

export class CreateOrderDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsNumber()
  total_pages?: number;

  @IsOptional()
  @IsNumber()
  total_sections?: number;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsEnum(SiteType)
  site_type?: SiteType;

  @IsOptional()
  @IsObject()
  wizard_data?: Record<string, unknown>; // Consolidated wizard data

  @IsOptional()
  @IsString()
  payment_gateway?: string;

  @IsOptional()
  @IsString()
  callback_url?: string;

  @IsOptional()
  @IsString()
  return_url?: string;
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
  total_amount?: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

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

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsEnum(SiteType)
  site_type?: SiteType;

  @IsOptional()
  @IsObject()
  wizard_data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  payment_gateway?: string;

  @IsOptional()
  @IsString()
  callback_url?: string;

  @IsOptional()
  @IsString()
  return_url?: string;
}
