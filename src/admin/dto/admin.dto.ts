import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';

export enum AdjustmentType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  CORRECTION = 'correction',
}

export class WalletAdjustmentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(AdjustmentType)
  type: AdjustmentType;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WalletAdjustmentResponseDto {
  id: string;
  walletId: string;
  adminId: string;
  amount: number;
  type: AdjustmentType;
  reason: string;
  notes?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export class AdminDashboardStatsDto {
  totalUsers: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalTransactions: number;
}
