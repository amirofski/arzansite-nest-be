import { IsString, IsNumber, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export class CreateOrderDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  total_amount: number;

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
  @IsString()
  total_sections?: number;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  site_type?: string;

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
