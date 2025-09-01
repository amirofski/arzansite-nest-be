import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import { ID } from 'node-appwrite';

export interface EnhancedWalletBalance {
  balance: number;
  currency: string;
  lastUpdated: string;
  recentTransactions: EnhancedTransaction[];
  statistics: WalletStatistics;
}

export interface EnhancedTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  balance_before: number;
  balance_after: number;
  created_at: string;
  reference_id?: string;
  reference_type?: string;
}

export interface WalletStatistics {
  totalDeposits: number;
  totalWithdrawals: number;
  totalPayments: number;
  totalRefunds: number;
}

export interface EnhancedWalletTransactions {
  transactions: EnhancedTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    total_amount: number;
    transactionCount: number;
    averageAmount: number;
  };
}

export interface WalletPaymentResult {
  success: boolean;
  transactionId: string;
  newBalance: number;
  paymentDetails: {
    amount: number;
    description: string;
    timestamp: string;
    referenceId: string;
  };
}

export interface EnhancedDepositRequest {
  amount: number;
  description: string;
  callback_url?: string;
  metadata?: {
    source?: 'dashboard' | 'order_flow' | 'wallet_page';
    user_agent?: string;
    ip_address?: string;
    referrer?: string;
  };
  preferredPaymentMethod?: 'zarinpal' | 'other';
}

export interface EnhancedDepositResponse {
  paymentUrl: string;
  order_id: string;
  depositId: string;
  expiresAt: string;
  qrCode?: string;
}

@Injectable()
export class EnhancedWalletsService {
  private readonly logger = new Logger(EnhancedWalletsService.name);

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly emailService: EmailService,
  ) {}

  async getEnhancedWalletBalance(user_id: string): Promise<EnhancedWalletBalance> {
    this.logger.log(`Getting enhanced wallet balance for user ${user_id}`);

    try {
      // Get basic wallet balance
      const basicBalance = await this.getBasicWalletBalance(user_id);
      
      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions(user_id, 5);
      
      // Calculate statistics
      const statistics = await this.calculateWalletStatistics(user_id);

      return {
        balance: basicBalance.balance,
        currency: 'IRR', // Iranian Rials
        lastUpdated: new Date().toISOString(),
        recentTransactions: recentTransactions.map(tx => this.mapToEnhancedTransaction(tx)),
        statistics,
      };
    } catch (error) {
      this.logger.error(`Failed to get enhanced wallet balance: ${error.message}`);
      throw new BadRequestException(`Failed to get wallet balance: ${error.message}`);
    }
  }

  async getEnhancedWalletTransactions(
    user_id: string,
    filters: {
      type?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
      page?: number;
      limit?: number;
      reference_type?: string;
      reference_id?: string;
    } = {}
  ): Promise<EnhancedWalletTransactions> {
    this.logger.log(`Getting enhanced wallet transactions for user ${user_id} with filters: ${JSON.stringify(filters)}`);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_TRANSACTIONS');
    const { Query } = await import('node-appwrite');

    try {
      // Build query filters
      const queryFilters = [Query.equal('user_id', user_id)];
      
      if (filters.type) {
        queryFilters.push(Query.equal('type', filters.type));
      }
      
      if (filters.status) {
        queryFilters.push(Query.equal('status', filters.status));
      }
      
      if (filters.from_date) {
        queryFilters.push(Query.greaterThanEqual('created_at', filters.from_date));
      }
      
      if (filters.to_date) {
        queryFilters.push(Query.lessThanEqual('created_at', filters.to_date));
      }

      if (filters.reference_type) {
        queryFilters.push(Query.equal('reference_type', filters.reference_type));
      }

      if (filters.reference_id) {
        queryFilters.push(Query.equal('reference_id', filters.reference_id));
      }

      // Add pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      queryFilters.push(Query.orderDesc('created_at'));
      queryFilters.push(Query.limit(limit));
      queryFilters.push(Query.offset(offset));

      // Get transactions
      const result = await databases.listDocuments(databaseId, transactionsCollection, queryFilters);

      // Get total count for pagination
      const totalResult = await databases.listDocuments(databaseId, transactionsCollection, [
        Query.equal('user_id', user_id)
      ]);

      const transactions = result.documents.map(tx => this.mapToEnhancedTransaction(tx));
      const total = totalResult.total;
      const totalPages = Math.ceil(total / limit);

      // Calculate summary
      const summary = this.calculateTransactionSummary(transactions);

      return {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
        summary,
      };
    } catch (error) {
      this.logger.error(`Failed to get enhanced wallet transactions: ${error.message}`);
      throw new BadRequestException(`Failed to get transactions: ${error.message}`);
    }
  }

  async processWalletPaymentForOrder(
    user_id: string,
    order_id: string,
    amount: number,
    description: string,
    referenceData?: {
      order_title: string;
      site_type: string;
      domain: string;
    }
  ): Promise<WalletPaymentResult> {
    this.logger.log(`Processing wallet payment for order ${order_id}, user ${user_id}, amount ${amount}`);

    try {
      // Check wallet balance
      const walletBalance = await this.getBasicWalletBalance(user_id);
      if (walletBalance.balance < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      // Create payment transaction
      const paymentResult = await this.createWalletTransaction(user_id, {
        type: 'payment',
        amount: amount,
        description: description,
        referenceId: order_id,
        referenceType: 'order',
        metadata: referenceData,
      });

      // Update wallet balance
      const newBalance = walletBalance.balance - amount;
      await this.updateWalletBalance(user_id, newBalance);

      // Send payment confirmation email
      await this.sendWalletPaymentEmail(user_id, amount, order_id, description);

      this.logger.log(`Wallet payment processed successfully for order ${order_id}`);

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        newBalance: newBalance,
        paymentDetails: {
          amount,
          description,
          timestamp: new Date().toISOString(),
          referenceId: order_id,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process wallet payment: ${error.message}`);
      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }
  }

  async requestEnhancedWalletDeposit(
    user_id: string,
    depositRequest: EnhancedDepositRequest
  ): Promise<EnhancedDepositResponse> {
    this.logger.log(`Requesting enhanced wallet deposit for user ${user_id}, amount ${depositRequest.amount}`);

    try {
      // Validate amount
      if (depositRequest.amount < 1000000) { // 1,000,000 Rials minimum
        throw new BadRequestException('Minimum deposit amount is 1,000,000 Rials');
      }

      // Create deposit request using payments service
      const depositResult = await this.paymentsService.createWalletDeposit(
        user_id,
        depositRequest.amount,
        depositRequest.description,
        depositRequest.callback_url
      );

      // Store deposit metadata
      await this.storeDepositMetadata(user_id, depositResult.order_id, depositRequest);

      // Calculate expiration (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      return {
        paymentUrl: depositResult.paymentUrl,
        order_id: depositResult.order_id,
        depositId: depositResult.invoiceId,
        expiresAt,
        qrCode: await this.generateQRCode(depositResult.paymentUrl),
      };
    } catch (error) {
      this.logger.error(`Failed to request enhanced wallet deposit: ${error.message}`);
      throw new BadRequestException(`Deposit request failed: ${error.message}`);
    }
  }

  async verifyEnhancedWalletDeposit(
    user_id: string,
    order_id: string,
    authority: string,
    userIp?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    refId: string;
    order_id: string;
    amount: number;
    description: string;
    error?: string;
    errorCode?: string;
    errorDetails?: string;
    retryable: boolean;
    supportRequired: boolean;
  }> {
    this.logger.log(`Verifying enhanced wallet deposit for user ${user_id}, order ${order_id}, authority ${authority}`);

    try {
      // Verify payment with ZarinPal
      const verificationResult = await this.paymentsService.verifyWalletDeposit(user_id, authority);

      if (verificationResult.success) {
        // Log verification metadata
        await this.logDepositVerification(user_id, order_id, authority, userIp, userAgent);

        // Send success notification
        await this.sendDepositSuccessEmail(user_id, verificationResult.amount, verificationResult.refId);

        return {
          success: true,
          refId: verificationResult.refId,
          order_id,
          amount: verificationResult.amount,
          description: 'Wallet deposit verified successfully',
          retryable: false,
          supportRequired: false,
        };
      } else {
        return {
          success: false,
          refId: '',
          order_id,
          amount: 0,
          description: 'Deposit verification failed',
          error: 'Verification failed',
          errorCode: 'VERIFICATION_FAILED',
          errorDetails: 'Payment verification was unsuccessful',
          retryable: true,
          supportRequired: false,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to verify enhanced wallet deposit: ${error.message}`);
      
      const isRetryable = this.isRetryableError(error);
      const needsSupport = this.needsSupportError(error);

      return {
        success: false,
        refId: '',
        order_id,
        amount: 0,
        description: 'Deposit verification failed',
        error: error.message,
        errorCode: this.getErrorCode(error),
        errorDetails: error.message,
        retryable: isRetryable,
        supportRequired: needsSupport,
      };
    }
  }

  private async getBasicWalletBalance(user_id: string): Promise<{ balance: number }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, walletsCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        // Create wallet if it doesn't exist
        return await this.createWallet(user_id);
      }

      return { balance: result.documents[0].balance || 0 };
    } catch (error) {
      this.logger.error(`Failed to get basic wallet balance: ${error.message}`);
      throw new BadRequestException(`Failed to get wallet balance: ${error.message}`);
    }
  }

  private async getRecentTransactions(user_id: string, limit: number): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_TRANSACTIONS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, transactionsCollection, [
        Query.equal('user_id', user_id),
        Query.orderDesc('created_at'),
        Query.limit(limit),
      ]);

      return result.documents || [];
    } catch (error) {
      this.logger.warn(`Failed to get recent transactions: ${error.message}`);
      return [];
    }
  }

  private async calculateWalletStatistics(user_id: string): Promise<WalletStatistics> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_TRANSACTIONS');
    const { Query } = await import('node-appwrite');

    try {
      const allTransactions = await databases.listDocuments(databaseId, transactionsCollection, [
        Query.equal('user_id', user_id),
        Query.equal('status', 'completed'),
      ]);

      const statistics: WalletStatistics = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalPayments: 0,
        totalRefunds: 0,
      };

      allTransactions.documents.forEach(tx => {
        switch (tx.type) {
          case 'deposit':
            statistics.totalDeposits += tx.amount;
            break;
          case 'withdrawal':
            statistics.totalWithdrawals += tx.amount;
            break;
          case 'payment':
            statistics.totalPayments += tx.amount;
            break;
          case 'refund':
            statistics.totalRefunds += tx.amount;
            break;
        }
      });

      return statistics;
    } catch (error) {
      this.logger.warn(`Failed to calculate wallet statistics: ${error.message}`);
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalPayments: 0,
        totalRefunds: 0,
      };
    }
  }

  private async createWallet(user_id: string): Promise<{ balance: number }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');

    try {
      await databases.createDocument(
        databaseId,
        walletsCollection,
        ID.unique(),
        {
          user_id: user_id,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      return { balance: 0 };
    } catch (error) {
      this.logger.error(`Failed to create wallet: ${error.message}`);
      throw new BadRequestException(`Failed to create wallet: ${error.message}`);
    }
  }

  private async createWalletTransaction(
    user_id: string,
    transactionData: {
      type: string;
      amount: number;
      description: string;
      referenceId?: string;
      referenceType?: string;
      metadata?: any;
    }
  ): Promise<{ transactionId: string }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_TRANSACTIONS');

    try {
      const transactionDocument = await databases.createDocument(
        databaseId,
        transactionsCollection,
        ID.unique(),
        {
          user_id: user_id,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          reference_id: transactionData.referenceId,
          reference_type: transactionData.referenceType,
          metadata: transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      return { transactionId: transactionDocument.$id };
    } catch (error) {
      this.logger.error(`Failed to create wallet transaction: ${error.message}`);
      throw new BadRequestException(`Failed to create transaction: ${error.message}`);
    }
  }

  private async updateWalletBalance(user_id: string, newBalance: number): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const { Query } = await import('node-appwrite');

    try {
      const wallet = await databases.listDocuments(databaseId, walletsCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (wallet.documents.length > 0) {
        await databases.updateDocument(
          databaseId,
          walletsCollection,
          wallet.documents[0].$id,
          {
            balance: newBalance,
            updated_at: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update wallet balance: ${error.message}`);
      throw new BadRequestException(`Failed to update wallet balance: ${error.message}`);
    }
  }

  private mapToEnhancedTransaction(transaction: any): EnhancedTransaction {
    return {
      id: transaction.$id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      status: transaction.status,
      balance_before: transaction.balance_before || 0,
      balance_after: transaction.balance_after || 0,
      created_at: transaction.created_at,
      reference_id: transaction.reference_id,
      reference_type: transaction.reference_type,
    };
  }

  private calculateTransactionSummary(transactions: EnhancedTransaction[]): {
    total_amount: number;
    transactionCount: number;
    averageAmount: number;
  } {
    if (transactions.length === 0) {
      return { total_amount: 0, transactionCount: 0, averageAmount: 0 };
    }

    const total_amount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const transactionCount = transactions.length;
    const averageAmount = total_amount / transactionCount;

    return { total_amount, transactionCount, averageAmount };
  }

  private async storeDepositMetadata(
    user_id: string,
    order_id: string,
    depositRequest: EnhancedDepositRequest
  ): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const metadataCollection = this.configService.get<string>('APPWRITE_COLLECTION_DEPOSIT_METADATA');

    try {
      await databases.createDocument(
        databaseId,
        metadataCollection,
        ID.unique(),
        {
          user_id: user_id,
          order_id: order_id,
          metadata: JSON.stringify(depositRequest.metadata || {}),
          preferred_payment_method: depositRequest.preferredPaymentMethod,
          created_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to store deposit metadata: ${error.message}`);
    }
  }

  private async generateQRCode(url: string): Promise<string | undefined> {
    // This would integrate with a QR code generation service
    // For now, return undefined
    return undefined;
  }

  private async logDepositVerification(
    user_id: string,
    order_id: string,
    authority: string,
    userIp?: string,
    userAgent?: string
  ): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const verificationLogsCollection = this.configService.get<string>('APPWRITE_COLLECTION_VERIFICATION_LOGS');

    try {
      await databases.createDocument(
        databaseId,
        verificationLogsCollection,
        ID.unique(),
        {
          user_id: user_id,
          order_id: order_id,
          authority,
          user_ip: userIp,
          user_agent: userAgent,
          verified_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to log deposit verification: ${error.message}`);
    }
  }

  private async sendWalletPaymentEmail(
    user_id: string,
    amount: number,
    order_id: string,
    description: string
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: order_id,
          amount: amount,
          status: 'completed',
          order_title: description,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send wallet payment email: ${error.message}`);
    }
  }

  private async sendDepositSuccessEmail(
    user_id: string,
    amount: number,
    refId: string
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendWalletTopUpEmail(user_id, amount, refId);
      }
    } catch (error) {
      this.logger.warn(`Failed to send deposit success email: ${error.message}`);
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'rate limit',
      'quota exceeded',
    ];

    return retryableErrors.some(msg => 
      error.message?.toLowerCase().includes(msg)
    );
  }

  private needsSupportError(error: any): boolean {
    const supportErrors = [
      'authentication',
      'authorization',
      'invalid',
      'malformed',
      'permission',
    ];

    return supportErrors.some(msg => 
      error.message?.toLowerCase().includes(msg)
    );
  }

  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    return 'UNKNOWN_ERROR';
  }
}