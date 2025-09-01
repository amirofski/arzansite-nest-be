import { IsString, IsNumber, IsOptional, IsObject, IsEnum, Min, IsInt, IsUrl } from 'class-validator';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  PAYMENT = 'payment',
  REFUND = 'refund',
  CREDIT = 'credit',
  DEBIT = 'debit'
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(1000000, { message: 'Minimum amount is 1,000,000 Rials (10,000 Tomans)' })
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
  metadata?: Record<string, any>;
}

export class RefundOrderDto {
  @IsString()
  order_id: string;
}

export class WalletDepositDto {
  @IsInt({ message: 'amount must be an integer in Rials' })
  @Min(1000000, { message: 'Minimum deposit amount is 1,000,000 Rials' })
  amount: number;

  @IsString({ message: 'description must be a string' })
  description: string;

  @IsOptional()
  @IsUrl({ require_tld: true, protocols: ['https'] }, { message: 'callback_url must be a valid HTTPS URL' })
  callback_url?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
