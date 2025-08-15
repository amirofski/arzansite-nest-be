import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, Min } from 'class-validator';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class CreateInvoiceDto {
  @IsString()
  orderId: string;

  @IsNumber()
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
  @IsString()
  refId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class InvoiceResponseDto {
  id: string;
  userId: string;
  orderId: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
