import { IsString, IsNumber, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaymentStatus, OrderStatus } from './order.dto';

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
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  site_type?: string;

  @IsOptional()
  website_framework?: any;

  @IsOptional()
  branding?: any;

  @IsOptional()
  additional_services?: any;

  @IsOptional()
  domains?: any;

  @IsOptional()
  pricing?: any;

  @IsOptional()
  @IsString()
  payment_gateway?: string;

  @IsOptional()
  @IsString()
  callback_url?: string;

  @IsOptional()
  @IsString()
  return_url?: string;

  @IsOptional()
  @IsString()
  zarinpal_authority?: string;

  @IsOptional()
  @IsString()
  zarinpal_ref_id?: string;

  @IsOptional()
  design_data?: any;

  @IsOptional()
  design_options?: any;

  @IsOptional()
  @IsString()
  design_preview_url?: string;
}
