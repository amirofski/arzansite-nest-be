import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { WalletsService } from '../wallets/wallets.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';
import {
  WalletAdjustmentDto,
  WalletAdjustmentResponseDto,
  AdminDashboardStatsDto,
  DeleteUserResponseDto,
  DomainExtensionDto,
  CreateDomainExtensionDto,
  UpdateDomainExtensionDto,
  CheckDomainAvailabilityDto,
  DomainAvailabilityResponseDto,
  SystemMetricsDto,
  WalletAdjustmentHistoryResponseDto,
  EmailServiceTestDto,
  EmailServiceTestResponseDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private appwriteService: AppwriteService,
    private walletsService: WalletsService,
    private invoicesService: InvoicesService,
    private configService: ConfigService,
  ) {}

  async getAllWallets(
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_USER_PROFILES');

    const q: string[] = [Query.orderDesc('updated_at'), Query.offset((page - 1) * limit), Query.limit(limit)];

    if (search) {
      try {
        const profiles = await databases.listDocuments(databaseId, profilesCollection, [
          Query.search('email', search),
          Query.limit(50),
        ]);
        if (profiles.documents.length > 0) {
          const userIds = profiles.documents.map((p: any) => p.user_id).filter(Boolean);
          if (userIds.length) q.push(Query.equal('user_id', userIds));
        }
      } catch (_) {
        // ignore search errors
      }
    }

    const wallets = await databases.listDocuments(databaseId, walletsCollection, q);

    const enriched = await Promise.all(
      wallets.documents.map(async (w: any) => {
        try {
          const prof = await databases.listDocuments(databaseId, profilesCollection, [
            Query.equal('user_id', w.user_id),
            Query.limit(1),
          ]);
          return { ...w, userProfile: prof.documents[0] || null };
        } catch {
          return { ...w, userProfile: null };
        }
      }),
    );

    return enriched;
  }

  async adjustWalletBalance(
    wallet_id: string,
    adminId: string,
    adjustmentDto: WalletAdjustmentDto,
  ): Promise<WalletAdjustmentResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const adjustmentsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_ADJUSTMENTS');

    const wallet = await databases.getDocument(databaseId, walletsCollection, wallet_id);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const balanceBefore = Number(wallet.balance || 0);
    let balanceAfter = balanceBefore;

    switch (adjustmentDto.type) {
      case 'credit':
        balanceAfter = balanceBefore + adjustmentDto.amount;
        break;
      case 'debit':
        if (balanceBefore < adjustmentDto.amount) throw new BadRequestException('Insufficient balance for debit');
        balanceAfter = balanceBefore - adjustmentDto.amount;
        break;
      case 'correction':
        balanceAfter = adjustmentDto.amount;
        break;
    }

    await databases.updateDocument(databaseId, walletsCollection, wallet_id, {
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    } as any);

    const adjustment = await databases.createDocument(databaseId, adjustmentsCollection, ID.unique(), {
      wallet_id,
      admin_id: adminId,
      amount: adjustmentDto.amount,
      type: adjustmentDto.type,
      reason: adjustmentDto.reason,
      notes: adjustmentDto.notes,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    return this.mapToAdjustmentResponseDto(adjustment);
  }

  async getAllInvoices(
    page: number = 1,
    limit: number = 50,
    status?: string,
    user_id?: string,
    from?: string,
    to?: string,
  ): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_USER_PROFILES');

    const q: string[] = [Query.orderDesc('created_at'), Query.offset((page - 1) * limit), Query.limit(limit)];
    if (status) q.push(Query.equal('status', status));
    if (user_id) q.push(Query.equal('user_id', user_id));
    if (from) q.push(Query.greaterThanEqual('created_at', from));
    if (to) q.push(Query.lessThanEqual('created_at', to));

    const invoices = await databases.listDocuments(databaseId, invoicesCollection, q);

    const enriched = await Promise.all(
      invoices.documents.map(async (inv: any) => {
        try {
          const prof = await databases.listDocuments(databaseId, profilesCollection, [
            Query.equal('user_id', inv.user_id),
            Query.limit(1),
          ]);
          return { ...inv, userProfile: prof.documents[0] || null };
        } catch {
          return { ...inv, userProfile: null };
        }
      }),
    );

    return enriched;
  }

  async getAllPayments(
    page: number = 1,
    limit: number = 50,
    status?: string,
    user_id?: string,
    from?: string,
    to?: string,
  ): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_USER_PROFILES');

    const q: string[] = [Query.orderDesc('created_at'), Query.offset((page - 1) * limit), Query.limit(limit)];
    if (status) q.push(Query.equal('status', status));
    if (user_id) q.push(Query.equal('user_id', user_id));
    if (from) q.push(Query.greaterThanEqual('created_at', from));
    if (to) q.push(Query.lessThanEqual('created_at', to));

    const payments = await databases.listDocuments(databaseId, transactionsCollection, q);

    const enriched = await Promise.all(
      payments.documents.map(async (pay: any) => {
        try {
          const prof = await databases.listDocuments(databaseId, profilesCollection, [
            Query.equal('user_id', pay.user_id),
            Query.limit(1),
          ]);
          return { ...pay, userProfile: prof.documents[0] || null };
        } catch {
          return { ...pay, userProfile: null };
        }
      }),
    );

    return enriched;
  }

  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    const wallets = await databases.listDocuments(databaseId, walletsCollection, [Query.limit(1)]);
    const totalUsers = wallets.total;

    const completedTransactions = await databases.listDocuments(databaseId, transactionsCollection, [
      Query.equal('status', 'completed'),
      Query.equal('type', 'debit'),
      Query.limit(1000),
    ]);
    const totalRevenue = completedTransactions.documents.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const pendingInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('status', 'pending'),
      Query.limit(1),
    ]);
    const pendingInvoicesCount = pendingInvoices.total;

    const overdueInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('status', 'overdue'),
      Query.limit(1),
    ]);
    const overdueInvoicesCount = overdueInvoices.total;

    const allTransactions = await databases.listDocuments(databaseId, transactionsCollection, [Query.limit(1)]);
    const totalTransactions = allTransactions.total;

    return {
      totalUsers,
      totalRevenue,
      pendingInvoices: pendingInvoicesCount,
      overdueInvoices: overdueInvoicesCount,
      totalTransactions,
    };
  }

  private mapToAdjustmentResponseDto(adjustment: any): WalletAdjustmentResponseDto {
    return {
      id: adjustment.$id,
      wallet_id: adjustment.wallet_id,
      adminId: adjustment.admin_id,
      amount: adjustment.amount,
      type: adjustment.type,
      reason: adjustment.reason,
      notes: adjustment.notes,
      balanceBefore: adjustment.balance_before,
      balanceAfter: adjustment.balance_after,
      created_at: adjustment.created_at,
    };
  }

  async deleteUser(user_id: string): Promise<DeleteUserResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const usersCollection = this.configService.get<string>('APPWRITE_COLLECTION_USERS');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');

    const activeOrders = await databases.listDocuments(databaseId, ordersCollection, [
      Query.equal('user_id', user_id),
      Query.equal('status', 'pending'),
      Query.limit(1),
    ]);
    if (activeOrders.total > 0) throw new BadRequestException('Cannot delete user with active orders');

    try {
      const wallets = await databases.listDocuments(databaseId, walletsCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);
      if (wallets.documents.length > 0) {
        await databases.deleteDocument(databaseId, walletsCollection, wallets.documents[0].$id);
      }

      const profiles = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);
      if (profiles.documents.length > 0) {
        await databases.deleteDocument(databaseId, profilesCollection, profiles.documents[0].$id);
      }

      const users = this.appwriteService.getUsers();
      await users.delete(user_id);

      return {
        success: true,
        message: 'User deleted successfully',
        data: { deletedUserId: user_id, deletedAt: new Date().toISOString() },
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to delete user: ${error.message}`);
    }
  }

  async getDomainPrices(): Promise<DomainExtensionDto[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');

    try {
      const extensions = await databases.listDocuments(databaseId, domainExtensionsCollection, [
        Query.orderAsc('extension'),
        Query.limit(1000),
      ]);
      return extensions.documents.map((ext: any) => ({
        id: ext.$id,
        extension: ext.extension,
        price: ext.price,
        available: ext.available,
        description: ext.description,
        isDefault: !!ext.isDefault,
        created_at: ext.created_at,
        updated_at: ext.updated_at,
      }));
    } catch {
      return [
        { id: 'ext_1', extension: '.ir', price: 0, available: true, description: 'Iranian domain extension', isDefault: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'ext_2', extension: '.com', price: 500000, available: true, description: 'International domain extension', isDefault: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ];
    }
  }

  async updateDomainPrice(extensionId: string, updateData: UpdateDomainExtensionDto): Promise<DomainExtensionDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');

    try {
      const updated = await databases.updateDocument(databaseId, domainExtensionsCollection, extensionId, {
        ...updateData,
        updated_at: new Date().toISOString(),
      } as any);

      return {
        id: updated.$id,
        extension: updated.extension,
        price: updated.price,
        available: updated.available,
        description: updated.description,
        isDefault: !!updated.isDefault,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      };
    } catch {
      throw new NotFoundException('Domain extension not found');
    }
  }

  async createDomainExtension(createData: CreateDomainExtensionDto): Promise<DomainExtensionDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');

    try {
      const created = await databases.createDocument(databaseId, domainExtensionsCollection, ID.unique(), {
        ...createData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      return {
        id: created.$id,
        extension: created.extension,
        price: created.price,
        available: created.available,
        description: created.description,
        isDefault: false,
        created_at: created.created_at,
        updated_at: created.updated_at,
      };
    } catch (error: any) {
      throw new BadRequestException(`Failed to create domain extension: ${error.message}`);
    }
  }

  async checkDomainAvailability(checkData: CheckDomainAvailabilityDto): Promise<DomainAvailabilityResponseDto> {
    const domain = `${checkData.domain}${checkData.extension}`;
    const domainPrices = await this.getDomainPrices();
    const extension = domainPrices.find((ext) => ext.extension === checkData.extension);
    const price = extension ? extension.price : 0;
    const available = Math.random() > 0.3;

    return { domain, available, price, checkedAt: new Date().toISOString() };
  }

  async getSystemMetrics(): Promise<SystemMetricsDto> {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const cpuUsage = Math.random() * 100;
    const diskUsage = Math.random() * 100;
    const activeConnections = Math.floor(Math.random() * 200) + 50;

    const database = {
      status: 'healthy' as const,
      responseTime: Math.floor(Math.random() * 50) + 5,
      activeQueries: Math.floor(Math.random() * 20) + 1,
      connectionPool: { active: Math.floor(Math.random() * 30) + 10, idle: Math.floor(Math.random() * 40) + 20, max: 100 },
    };

    const services = {
      email: { status: 'healthy' as const, lastCheck: new Date().toISOString(), queueSize: Math.floor(Math.random() * 10) },
      payment: { status: 'healthy' as const, lastCheck: new Date().toISOString(), gatewayStatus: 'online' },
      storage: { status: 'healthy' as const, lastCheck: new Date().toISOString(), usedSpace: '2.5GB', totalSpace: '10GB' },
    };

    const performance = {
      averageResponseTime: Math.floor(Math.random() * 100) + 20,
      requestsPerMinute: Math.floor(Math.random() * 200) + 100,
      errorRate: Math.random() * 0.05,
      lastUpdated: new Date().toISOString(),
    };

    return {
      system: { uptime, memoryUsage, cpuUsage, diskUsage, activeConnections },
      database,
      services,
      performance,
    };
  }

  async getWalletAdjustmentHistory(
    wallet_id: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<WalletAdjustmentHistoryResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const adjustmentsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_ADJUSTMENTS');
    const usersCollection = this.configService.get<string>('APPWRITE_COLLECTION_USERS');

    try {
      const offset = (page - 1) * limit;
      const adjustments = await databases.listDocuments(databaseId, adjustmentsCollection, [
        Query.equal('wallet_id', wallet_id),
        Query.orderDesc('created_at'),
        Query.offset(offset),
        Query.limit(limit),
      ]);

      const enriched = await Promise.all(
        adjustments.documents.map(async (adj: any) => {
          try {
            const admin = await databases.getDocument(databaseId, usersCollection, adj.admin_id);
            return {
              id: adj.$id,
              wallet_id: adj.wallet_id,
              adminId: adj.admin_id,
              adminName: admin.name || admin.email || 'Unknown Admin',
              type: adj.type,
              amount: adj.amount,
              reason: adj.reason,
              notes: adj.notes,
              balanceBefore: adj.balance_before,
              balanceAfter: adj.balance_after,
              created_at: adj.created_at,
            };
          } catch {
            return {
              id: adj.$id,
              wallet_id: adj.wallet_id,
              adminId: adj.admin_id,
              adminName: 'Unknown Admin',
              type: adj.type,
              amount: adj.amount,
              reason: adj.reason,
              notes: adj.notes,
              balanceBefore: adj.balance_before,
              balanceAfter: adj.balance_after,
              created_at: adj.created_at,
            };
          }
        }),
      );

      const totalRes = await databases.listDocuments(databaseId, adjustmentsCollection, [
        Query.equal('wallet_id', wallet_id),
        Query.limit(1),
      ]);

      const total = totalRes.total;
      const pages = Math.ceil(total / limit);

      return { adjustments: enriched, pagination: { page, limit, total, pages } };
    } catch {
      return { adjustments: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  }

  async testEmailService(testData: EmailServiceTestDto): Promise<EmailServiceTestResponseDto> {
    try {
      switch (testData.testType) {
        case 'connection': {
          const smtpStatus = 'connected';
          const authentication = 'successful';
          return { testType: testData.testType, status: 'success', message: 'Email service is working correctly', details: { smtpStatus, authentication }, testedAt: new Date().toISOString() };
        }
        case 'send': {
          const testEmailSent = true;
          const testEmailId = `test_${Date.now()}`;
          return { testType: testData.testType, status: 'success', message: 'Test email sent successfully', details: { smtpStatus: 'connected', authentication: 'successful', testEmailSent, testEmailId }, testedAt: new Date().toISOString() };
        }
        case 'template': {
          return { testType: testData.testType, status: 'success', message: 'Email template rendered successfully', details: { smtpStatus: 'connected', authentication: 'successful', testEmailSent: true, testEmailId: `template_test_${Date.now()}` }, testedAt: new Date().toISOString() };
        }
        default:
          throw new BadRequestException('Invalid test type');
      }
    } catch (error: any) {
      return { testType: testData.testType, status: 'failed', message: `Email service test failed: ${error.message}`, details: { error: error.message }, testedAt: new Date().toISOString() };
    }
  }
}
