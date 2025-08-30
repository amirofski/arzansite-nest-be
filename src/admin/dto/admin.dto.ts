import { IsString, IsNumber, IsOptional, Min, IsEnum, IsBoolean, IsEmail, IsArray } from 'class-validator';

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

// New DTOs for additional admin endpoints

export class DeleteUserResponseDto {
  success: boolean;
  message: string;
  data: {
    deletedUserId: string;
    deletedAt: string;
  };
}

export class DomainExtensionDto {
  id: string;
  extension: string;
  price: number;
  available: boolean;
  description: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CreateDomainExtensionDto {
  @IsString()
  extension: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  description: string;

  @IsBoolean()
  available: boolean;
}

export class UpdateDomainExtensionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CheckDomainAvailabilityDto {
  @IsString()
  domain: string;

  @IsString()
  extension: string;
}

export class DomainAvailabilityResponseDto {
  domain: string;
  available: boolean;
  price: number;
  checkedAt: string;
}

export class SystemMetricsDto {
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    activeQueries: number;
    connectionPool: {
      active: number;
      idle: number;
      max: number;
    };
  };
  services: {
    email: ServiceStatusDto;
    payment: ServiceStatusDto;
    storage: ServiceStatusDto;
  };
  performance: {
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    lastUpdated: string;
  };
}

export class ServiceStatusDto {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  queueSize?: number;
  gatewayStatus?: string;
  usedSpace?: string;
  totalSpace?: string;
}

export class WalletAdjustmentHistoryDto {
  id: string;
  walletId: string;
  adminId: string;
  adminName: string;
  type: AdjustmentType;
  amount: number;
  reason: string;
  notes?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export class WalletAdjustmentHistoryResponseDto {
  adjustments: WalletAdjustmentHistoryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class EmailServiceTestDto {
  @IsString()
  testType: 'connection' | 'send' | 'template';

  @IsEmail()
  recipient: string;

  @IsOptional()
  @IsString()
  template?: string;
}

export class EmailServiceTestResponseDto {
  testType: string;
  status: 'success' | 'failed';
  message: string;
  details: {
    smtpStatus?: string;
    authentication?: string;
    testEmailSent?: boolean;
    testEmailId?: string;
    error?: string;
  };
  testedAt: string;
}
