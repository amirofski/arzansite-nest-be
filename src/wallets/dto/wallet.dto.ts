import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  type: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class RefundOrderDto {
  @IsString()
  orderId: string;
}
