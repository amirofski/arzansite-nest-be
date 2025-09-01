import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class CreateInvoiceDto {
  @IsString()
  order_id: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amount: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PayInvoiceDto {
  @IsOptional()
  @IsString()
  refId?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

export class InvoiceResponseDto {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description?: string;
  created_at: string;
  updated_at: string;
}
