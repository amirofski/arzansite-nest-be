import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { WalletsService } from '../wallets/wallets.service';
import { InvoicesService } from '../invoices/invoices.service';
import { ConfigService } from '@nestjs/config';
import { Query } from 'node-appwrite';
import { 
  WalletAdjustmentDto, 
  WalletAdjustmentResponseDto,
  AdminDashboardStatsDto 
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
    search?: string
  ): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');

    const queries = [Query.orderDesc('updated_at')];
    if (search) {
      // Search by user email or name
      const profiles = await databases.listDocuments(databaseId, profilesCollection, [
        Query.search('email', search),
      ]);
      if (profiles.documents.length > 0) {
        const userIds = profiles.documents.map(p => p.user_id);
        queries.push(Query.equal('user_id', userIds));
      }
    }

    const wallets = await databases.listDocuments(databaseId, walletsCollection, queries);
    
    // Enrich with user profile information
    const enrichedWallets = await Promise.all(
      wallets.documents.map(async (wallet) => {
        try {
          const profile = await databases.listDocuments(databaseId, profilesCollection, [
            Query.equal('user_id', wallet.user_id),
            Query.limit(1),
          ]);
          
          return {
            ...wallet,
            userProfile: profile.documents[0] || null,
          };
        } catch (error) {
          return { ...wallet, userProfile: null };
        }
      })
    );

    return enrichedWallets;
  }

  async adjustWalletBalance(
    walletId: string,
    adminId: string,
    adjustmentDto: WalletAdjustmentDto
  ): Promise<WalletAdjustmentResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const adjustmentsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_ADJUSTMENTS');

    // Get current wallet
    const wallet = await databases.getDocument(databaseId, walletsCollection, walletId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const balanceBefore = wallet.balance;
    let balanceAfter = balanceBefore;

    // Calculate new balance
    switch (adjustmentDto.type) {
      case 'credit':
        balanceAfter = balanceBefore + adjustmentDto.amount;
        break;
      case 'debit':
        if (balanceBefore < adjustmentDto.amount) {
          throw new BadRequestException('Insufficient balance for debit');
        }
        balanceAfter = balanceBefore - adjustmentDto.amount;
        break;
      case 'correction':
        balanceAfter = adjustmentDto.amount;
        break;
    }

    // Update wallet balance
    await databases.updateDocument(databaseId, walletsCollection, walletId, {
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    });

    // Create adjustment record
    const adjustment = await databases.createDocument(databaseId, adjustmentsCollection, 'unique()', {
      wallet_id: walletId,
      admin_id: adminId,
      amount: adjustmentDto.amount,
      type: adjustmentDto.type,
      reason: adjustmentDto.reason,
      notes: adjustmentDto.notes,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return this.mapToAdjustmentResponseDto(adjustment);
  }

  async getAllInvoices(
    page: number = 1,
    limit: number = 50,
    status?: string,
    userId?: string
  ): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');

    const queries = [Query.orderDesc('created_at')];
    if (status) {
      queries.push(Query.equal('status', status));
    }
    if (userId) {
      queries.push(Query.equal('user_id', userId));
    }

    const invoices = await databases.listDocuments(databaseId, invoicesCollection, queries);
    
    // Enrich with user profile information
    const enrichedInvoices = await Promise.all(
      invoices.documents.map(async (invoice) => {
        try {
          const profile = await databases.listDocuments(databaseId, profilesCollection, [
            Query.equal('user_id', invoice.user_id),
            Query.limit(1),
          ]);
          
          return {
            ...invoice,
            userProfile: profile.documents[0] || null,
          };
        } catch (error) {
          return { ...invoice, userProfile: null };
        }
      })
    );

    return enrichedInvoices;
  }

  async getAllPayments(
    page: number = 1,
    limit: number = 50,
    status?: string,
    userId?: string
  ): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');

    const queries = [Query.orderDesc('created_at')];
    if (status) {
      queries.push(Query.equal('status', status));
    }
    if (userId) {
      queries.push(Query.equal('user_id', userId));
    }

    const payments = await databases.listDocuments(databaseId, transactionsCollection, queries);
    
    // Enrich with user profile information
    const enrichedPayments = await Promise.all(
      payments.documents.map(async (payment) => {
        try {
          const profile = await databases.listDocuments(databaseId, profilesCollection, [
            Query.equal('user_id', payment.user_id),
            Query.limit(1),
          ]);
          
          return {
            ...payment,
            userProfile: profile.documents[0] || null,
          };
        } catch (error) {
          return { ...payment, userProfile: null };
        }
      })
    );

    return enrichedPayments;
  }

  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    // Get total users
    const wallets = await databases.listDocuments(databaseId, walletsCollection, [Query.limit(1000)]);
    const totalUsers = wallets.total;

    // Get total revenue (sum of all completed transactions)
    const completedTransactions = await databases.listDocuments(databaseId, transactionsCollection, [
      Query.equal('status', 'completed'),
      Query.equal('type', 'debit'),
      Query.limit(1000),
    ]);
    const totalRevenue = completedTransactions.documents.reduce((sum, t) => sum + t.amount, 0);

    // Get pending invoices
    const pendingInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('status', 'pending'),
      Query.limit(1000),
    ]);
    const pendingInvoicesCount = pendingInvoices.total;

    // Get overdue invoices
    const overdueInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('status', 'overdue'),
      Query.limit(1000),
    ]);
    const overdueInvoicesCount = overdueInvoices.total;

    // Get total transactions
    const allTransactions = await databases.listDocuments(databaseId, transactionsCollection, [Query.limit(1000)]);
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
      walletId: adjustment.wallet_id,
      adminId: adjustment.admin_id,
      amount: adjustment.amount,
      type: adjustment.type,
      reason: adjustment.reason,
      notes: adjustment.notes,
      balanceBefore: adjustment.balance_before,
      balanceAfter: adjustment.balance_after,
      createdAt: adjustment.created_at,
    };
  }
}
