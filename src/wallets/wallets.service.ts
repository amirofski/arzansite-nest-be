import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Wallet, Transaction } from '../common/types/database.types';
import { CreateTransactionDto, RefundOrderDto, TransactionType } from './dto/wallet.dto';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async getWallet(user_id: string): Promise<Wallet> {
    // Try to get existing wallet
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const existing = await databases.listDocuments(
      databaseId,
      walletsCollection,
      [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ],
    );

    const wallet: any = existing.documents[0];
    if (!wallet) {
      const newWallet = await databases.createDocument(
        databaseId,
        walletsCollection,
        ID.unique(),
        {
          user_id: user_id,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      );
      return newWallet as any;
    }

    return wallet as any;
  }

  async getBalance(user_id: string): Promise<{ balance: number }> {
    const wallet = await this.getWallet(user_id);
    return { balance: wallet.balance };
  }

  async getTransactions(
    user_id: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Transaction[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const result = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      [
        Query.equal('user_id', user_id),
        Query.orderDesc('created_at'),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );
    
    // Parse metadata from JSON string back to object
    const transactions = (result.documents as any[]).map(transaction => {
      if (transaction.metadata && typeof transaction.metadata === 'string') {
        try {
          transaction.metadata = JSON.parse(transaction.metadata);
        } catch (error) {
          this.logger.warn('Failed to parse transaction metadata:', error);
          transaction.metadata = null;
        }
      }
      return transaction;
    });
    
    return transactions || [];
  }

  /**
   * Create a transaction with streamlined approach
   */
  async createTransaction(
    user_id: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<{ transactionId: string; balanceAfter: number }> {
    this.logger.log(`Creating transaction for user ${user_id}: ${JSON.stringify({
      type: createTransactionDto.type,
      amount: createTransactionDto.amount,
      referenceType: createTransactionDto.referenceType
    })}`);

    // Ensure wallet exists
    const wallet = await this.getWallet(user_id);
    const walletId = (wallet as any).$id ?? (wallet as any).id;
    const balanceBefore = wallet.balance || 0;

    // Validate transaction
    await this.validateTransaction(createTransactionDto, balanceBefore);

    // Calculate new balance
    const balanceAfter = this.calculateNewBalance(balanceBefore, createTransactionDto);

    // Prepare transaction document
    const transactionDoc = this.prepareTransactionDocument(
      user_id,
      walletId,
      createTransactionDto,
      balanceBefore,
      balanceAfter
    );

    // Create transaction and update wallet balance atomically
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    try {
      // Create transaction first
      const tx = await databases.createDocument(
        databaseId,
        transactionsCollection,
        ID.unique(),
        transactionDoc,
      );

      // Update wallet balance
      await databases.updateDocument(
        databaseId,
        walletsCollection,
        walletId,
        {
          balance: balanceAfter,
          updated_at: new Date().toISOString(),
        } as any,
      );

      this.logger.log(`Transaction created successfully: ${(tx as any).$id}. Balance: ${balanceBefore} → ${balanceAfter}`);

      return { 
        transactionId: (tx as any).$id,
        balanceAfter 
      };

    } catch (error) {
      this.logger.error(`Failed to create transaction for user ${user_id}:`, error.message);
      throw new BadRequestException('Failed to create transaction. Please try again.');
    }
  }

  /**
   * Validate transaction parameters
   */
  private async validateTransaction(
    createTransactionDto: CreateTransactionDto, 
    currentBalance: number
  ): Promise<void> {
    // Validate minimum amount for deposits
    if (createTransactionDto.type === TransactionType.CREDIT || createTransactionDto.type === TransactionType.DEPOSIT) {
      if (createTransactionDto.amount < 1000000) {
        throw new BadRequestException('Minimum deposit amount is 1,000,000 Rials (10,000 Tomans)');
      }
    }

    // Validate sufficient balance for debits
    if (createTransactionDto.type === TransactionType.DEBIT) {
      if (currentBalance < createTransactionDto.amount) {
        throw new BadRequestException(`Insufficient balance. Available: ${currentBalance} Rials, Required: ${createTransactionDto.amount} Rials`);
      }
    }

    // Validate amount is positive
    if (createTransactionDto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }

    // Validate metadata size
    if (createTransactionDto.metadata) {
      const metadataString = JSON.stringify(createTransactionDto.metadata);
      if (metadataString.length > 8192) {
        throw new BadRequestException('Metadata too large. Maximum size is 8192 characters when stringified.');
      }
    }

    // Check for duplicate reference ID if provided
    if (createTransactionDto.referenceId) {
      await this.checkDuplicateReferenceId(createTransactionDto.referenceId);
    }
  }

  /**
   * Calculate new balance based on transaction type
   */
  private calculateNewBalance(currentBalance: number, transaction: CreateTransactionDto): number {
    switch (transaction.type) {
      case TransactionType.CREDIT:
      case TransactionType.DEPOSIT:
        return currentBalance + transaction.amount;
      case TransactionType.DEBIT:
        return currentBalance - transaction.amount;
      default:
        throw new BadRequestException(`Invalid transaction type: ${transaction.type}`);
    }
  }

  /**
   * Prepare transaction document
   */
  private prepareTransactionDocument(
    user_id: string,
    wallet_id: string,
    createTransactionDto: CreateTransactionDto,
    balanceBefore: number,
    balanceAfter: number
  ): any {
    const metadataString = createTransactionDto.metadata
      ? JSON.stringify(createTransactionDto.metadata)
      : null;

    return {
      user_id: user_id,
      wallet_id: wallet_id,
      type: createTransactionDto.type,
      status: 'completed',
      amount: createTransactionDto.amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: createTransactionDto.description,
      reference_id: createTransactionDto.referenceId,
      reference_type: createTransactionDto.referenceType,
      metadata: metadataString,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Check for duplicate reference ID
   */
  private async checkDuplicateReferenceId(referenceId: string): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    const existingTransaction = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      [
        Query.equal('reference_id', referenceId),
        Query.limit(1),
      ],
    );

    if (existingTransaction.documents.length > 0) {
      throw new BadRequestException(`Reference ID '${referenceId}' has already been used for a transaction`);
    }
  }

  async refundOrder(refundOrderDto: RefundOrderDto): Promise<{ resultId: string }> {
    this.logger.log(`Processing refund for order: ${refundOrderDto.order_id}`);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');

    try {
      const order: any = await databases.getDocument(
        databaseId,
        ordersCollection,
        refundOrderDto.order_id,
      );
      const amount = order.price || 0;
      const user_id = order.user_id;

      if (amount <= 0) {
        throw new BadRequestException('Order amount is invalid or zero');
      }

      const result = await this.createTransaction(user_id, {
        type: TransactionType.CREDIT,
        amount,
        description: 'Order refund',
        referenceId: refundOrderDto.order_id,
        referenceType: 'order_refund',
        metadata: {
          order_id: refundOrderDto.order_id,
          refundReason: 'customer_request',
          originalOrderAmount: amount,
          refundTimestamp: new Date().toISOString(),
        },
      });

      this.logger.log(`Refund processed successfully for order ${refundOrderDto.order_id}. Transaction: ${result.transactionId}`);

      return { resultId: result.transactionId };

    } catch (error) {
      this.logger.error(`Failed to process refund for order ${refundOrderDto.order_id}:`, error.message);
      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }

  async creditWallet(user_id: string, amount: number, description?: string): Promise<Wallet> {
    this.logger.log(`Crediting wallet for user ${user_id}: ${amount} Rials`);

    await this.createTransaction(user_id, {
      type: TransactionType.CREDIT,
      amount,
      description: description || 'Admin credit',
      referenceType: 'admin_credit',
      metadata: {
        adminAction: true,
        creditReason: description || 'Admin credit',
        timestamp: new Date().toISOString(),
      },
    });

    return this.getWallet(user_id);
  }

  async debitWallet(user_id: string, amount: number, description?: string): Promise<Wallet> {
    this.logger.log(`Debiting wallet for user ${user_id}: ${amount} Rials`);

    await this.createTransaction(user_id, {
      type: TransactionType.DEBIT,
      amount,
      description: description || 'Admin debit',
      referenceType: 'admin_debit',
      metadata: {
        adminAction: true,
        debitReason: description || 'Admin debit',
        timestamp: new Date().toISOString(),
      },
    });

    return this.getWallet(user_id);
  }

  async topUpWallet(user_id: string, amount: number, refId: string): Promise<{ success: boolean; transactionId: string; balanceAfter: number }> {
    this.logger.log(`Processing wallet top-up for user ${user_id}: ${amount} Rials, Ref ID: ${refId}`);

    // Validate minimum amount
    if (amount < 1000000) {
      throw new BadRequestException('Minimum top-up amount is 1,000,000 Rials (10,000 Tomans)');
    }

    // Create top-up transaction
    const result = await this.createTransaction(user_id, {
      type: TransactionType.CREDIT,
      amount,
      description: 'Wallet top-up',
      referenceId: refId,
      referenceType: 'wallet_topup',
      metadata: {
        refId,
        topUpMethod: 'payment_gateway',
        timestamp: new Date().toISOString(),
        gateway: 'zarinpal',
      },
    });

    this.logger.log(`Wallet top-up successful for user ${user_id}. Transaction: ${result.transactionId}`);

    return { 
      success: true, 
      transactionId: result.transactionId,
      balanceAfter: result.balanceAfter
    };
  }

  async verifyPaymentRefId(refId: string): Promise<{ isValid: boolean; amount?: number; user_id?: string }> {
    this.logger.log(`Verifying payment Ref ID: ${refId}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

      // Check if RefId has already been used
      const transaction = await databases.listDocuments(
        databaseId,
        transactionsCollection,
        [
          Query.equal('reference_id', refId),
          Query.limit(1),
        ],
      );

      if (transaction.documents.length > 0) {
        this.logger.warn(`Ref ID ${refId} has already been used`);
        return { isValid: false }; // RefId already used
      }

      // TODO: Integrate with payment gateway API to verify RefId
      // This is where you would make a call to your payment gateway
      // to verify the RefId and get payment details
      // For now, returning mock verification - replace with actual gateway call

      this.logger.log(`Ref ID ${refId} verification completed (mock)`);
      return { 
        isValid: true, 
        amount: 1000000, // This should come from gateway
        user_id: 'user_id_from_gateway' // This should come from gateway
      };

    } catch (error) {
      this.logger.error(`Error verifying Ref ID ${refId}:`, error.message);
      return { isValid: false };
    }
  }

  /**
   * Get transaction by reference ID
   */
  async getTransactionByReferenceId(referenceId: string): Promise<Transaction | null> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    const result = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      [
        Query.equal('reference_id', referenceId),
        Query.limit(1),
      ],
    );

    if (result.documents.length === 0) {
      return null;
    }

    const transaction = result.documents[0] as any;
    
    // Parse metadata if it's a string
    if (transaction.metadata && typeof transaction.metadata === 'string') {
      try {
        transaction.metadata = JSON.parse(transaction.metadata);
      } catch (error) {
        this.logger.warn('Failed to parse transaction metadata:', error);
        transaction.metadata = null;
      }
    }

    return transaction;
  }

  /**
   * Handle wallet deposit verification with idempotency checks
   * This method ensures that the same payment is not credited multiple times
   */
  async handleWalletDepositVerification(params: {
    authority: string;
    refId: string;
    amount: number;
    user_id: string;
    order_id?: string;
  }): Promise<{
    success: boolean;
    message: string;
    refId?: string;
    transactionId?: string;
    balanceAfter?: number;
    error?: string;
  }> {
    this.logger.log(`Handling wallet deposit verification: ${JSON.stringify({
      authority: params.authority,
      refId: params.refId,
      amount: params.amount,
      user_id: params.user_id,
      order_id: params.order_id
    })}`);

    try {
      // 1. Check for existing transaction with the same ref_id (primary idempotency check)
      const existingTransaction = await this.getTransactionByReferenceId(params.refId);
      
      if (existingTransaction) {
        this.logger.warn(`Duplicate verification ignored - Ref ID already exists: ${params.refId}`, {
          authority: params.authority,
          refId: params.refId,
          existingTransactionId: existingTransaction.id
        });
        
        return {
          success: true,
          message: 'Payment already processed',
          refId: params.refId,
          transactionId: existingTransaction.id,
          balanceAfter: existingTransaction.balance_after
        };
      }

      // 2. Check for existing transaction with the same authority (secondary idempotency check)
      const existingByAuthority = await this.findTransactionByAuthority(params.authority);
      
      if (existingByAuthority) {
        this.logger.warn(`Duplicate verification ignored - Authority already exists: ${params.authority}`, {
          authority: params.authority,
          refId: params.refId,
          existingTransactionId: existingByAuthority.id,
          existingRefId: existingByAuthority.reference_id
        });
        
        return {
          success: true,
          message: 'Payment already processed (different ref ID)',
          refId: existingByAuthority.reference_id,
          transactionId: existingByAuthority.id,
          balanceAfter: existingByAuthority.balance_after
        };
      }

      // 3. Validate amount
      if (params.amount < 1000000) {
        throw new BadRequestException('Minimum deposit amount is 1,000,000 Rials (10,000 Tomans)');
      }

      // 4. Create transaction and credit wallet atomically
      const result = await this.createTransaction(params.user_id, {
        type: TransactionType.CREDIT,
        amount: params.amount,
        description: `Wallet deposit via ZarinPal - Ref ID: ${params.refId}`,
        referenceId: params.refId,
        referenceType: 'wallet_deposit',
        metadata: {
          zarinpal_authority: params.authority,
          zarinpal_ref_id: params.refId,
          payment_gateway: 'zarinpal',
          order_id: params.order_id,
          depositTimestamp: new Date().toISOString(),
          verificationMethod: 'callback',
        },
      });

      this.logger.log(`Wallet deposit verification successful for user ${params.user_id}`, {
        authority: params.authority,
        refId: params.refId,
        transactionId: result.transactionId,
        amount: params.amount,
        balanceAfter: result.balanceAfter
      });

      return {
        success: true,
        message: 'Payment verified and wallet credited successfully',
        refId: params.refId,
        transactionId: result.transactionId,
        balanceAfter: result.balanceAfter
      };

    } catch (error) {
      this.logger.error(`Wallet deposit verification failed:`, {
        authority: params.authority,
        refId: params.refId,
        user_id: params.user_id,
        error: error.message
      });

      return {
        success: false,
        message: 'Verification failed',
        error: error.message || 'Verification failed'
      };
    }
  }

  /**
   * Find transaction by ZarinPal authority (from metadata)
   */
  private async findTransactionByAuthority(authority: string): Promise<Transaction | null> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    try {
      // Search for transactions with the authority in metadata
      // Note: This is a simplified search - in production, you might want to create a separate index
      const result = await databases.listDocuments(
        databaseId,
        transactionsCollection,
        [
          Query.equal('reference_type', 'wallet_deposit'),
          Query.limit(100), // Get recent deposits to search through
          Query.orderDesc('created_at'),
        ],
      );

      // Search through the results for matching authority
      for (const doc of result.documents) {
        const transaction = doc as any;
        
        // Parse metadata if it's a string
        let metadata = transaction.metadata;
        if (metadata && typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (error) {
            continue; // Skip if metadata parsing fails
          }
        }

        // Check if this transaction has the same authority
        if (metadata && metadata.zarinpal_authority === authority) {
          return transaction;
        }
      }

      return null;

    } catch (error) {
      this.logger.error(`Error searching for transaction by authority ${authority}:`, error.message);
      return null;
    }
  }

  /**
   * Enhanced top-up method with idempotency checks
   */
  async topUpWalletWithIdempotency(params: {
    user_id: string;
    amount: number;
    refId: string;
    authority?: string;
    order_id?: string;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    balanceAfter?: number;
    message?: string;
    error?: string;
  }> {
    this.logger.log(`Processing wallet top-up with idempotency: ${JSON.stringify({
      user_id: params.user_id,
      amount: params.amount,
      refId: params.refId,
      authority: params.authority
    })}`);

    try {
      // Check for existing transaction with the same ref_id
      const existingTransaction = await this.getTransactionByReferenceId(params.refId);
      
      if (existingTransaction) {
        this.logger.warn(`Duplicate top-up ignored - Ref ID already exists: ${params.refId}`, {
          user_id: params.user_id,
          refId: params.refId,
          existingTransactionId: existingTransaction.id
        });
        
        return {
          success: true,
          transactionId: existingTransaction.id,
          balanceAfter: existingTransaction.balance_after,
          message: 'Top-up already processed'
        };
      }

      // If authority is provided, also check for existing transaction with same authority
      if (params.authority) {
        const existingByAuthority = await this.findTransactionByAuthority(params.authority);
        
        if (existingByAuthority) {
          this.logger.warn(`Duplicate top-up ignored - Authority already exists: ${params.authority}`, {
            user_id: params.user_id,
            refId: params.refId,
            authority: params.authority,
            existingTransactionId: existingByAuthority.id
          });
          
          return {
            success: true,
            transactionId: existingByAuthority.id,
            balanceAfter: existingByAuthority.balance_after,
            message: 'Top-up already processed (different ref ID)'
          };
        }
      }

      // Create the top-up transaction
      const result = await this.createTransaction(params.user_id, {
        type: TransactionType.CREDIT,
        amount: params.amount,
        description: 'Wallet top-up',
        referenceId: params.refId,
        referenceType: 'wallet_topup',
        metadata: {
          refId: params.refId,
          authority: params.authority,
          topUpMethod: 'payment_gateway',
          timestamp: new Date().toISOString(),
          gateway: 'zarinpal',
          order_id: params.order_id,
        },
      });

      this.logger.log(`Wallet top-up successful for user ${params.user_id}`, {
        refId: params.refId,
        authority: params.authority,
        transactionId: result.transactionId,
        amount: params.amount,
        balanceAfter: result.balanceAfter
      });

      return {
        success: true,
        transactionId: result.transactionId,
        balanceAfter: result.balanceAfter,
        message: 'Top-up processed successfully'
      };

    } catch (error) {
      this.logger.error(`Wallet top-up failed:`, {
        user_id: params.user_id,
        refId: params.refId,
        authority: params.authority,
        error: error.message
      });

      return {
        success: false,
        error: error.message || 'Top-up failed'
      };
    }
  }
}
