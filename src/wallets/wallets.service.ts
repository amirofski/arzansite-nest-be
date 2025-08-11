import { Injectable, NotFoundException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Wallet, Transaction } from '../common/types/database.types';
import { CreateTransactionDto, RefundOrderDto, TransactionType } from './dto/wallet.dto';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';

@Injectable()
export class WalletsService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async getWallet(userId: string): Promise<Wallet> {
    // Try to get existing wallet
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const existing = await databases.listDocuments(databaseId, walletsCollection, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);

    const wallet: any = existing.documents[0];
    if (!wallet) {
      const newWallet = await databases.createDocument(databaseId, walletsCollection, ID.unique(), {
        user_id: userId,
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
      return newWallet as any;
    }

    return wallet as any;
  }

  async getBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.getWallet(userId);
    return { balance: wallet.balance };
  }

  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Transaction[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const { Query } = await import('node-appwrite');
    const result = await databases.listDocuments(databaseId, transactionsCollection, [
      Query.equal('user_id', userId),
      Query.orderDesc('created_at'),
      Query.limit(limit),
      Query.offset(offset),
    ]);
    return (result.documents as any) || [];
  }

  async createTransaction(
    userId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<{ transactionId: string }> {
    // Ensure wallet exists
    await this.getWallet(userId);

    // Manual process: create transaction and update wallet balance
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

    const wallet: any = await this.getWallet(userId);
    const balanceBefore = wallet.balance || 0;

    let balanceAfter = balanceBefore;
    if (createTransactionDto.type === TransactionType.CREDIT) {
      balanceAfter = balanceBefore + createTransactionDto.amount;
    } else if (createTransactionDto.type === TransactionType.DEBIT) {
      balanceAfter = balanceBefore - createTransactionDto.amount;
      if (balanceAfter < 0) throw new Error('Insufficient balance');
    }

    const tx = await databases.createDocument(databaseId, transactionsCollection, ID.unique(), {
      user_id: userId,
      wallet_id: wallet.$id,
      type: createTransactionDto.type,
      status: 'completed',
      amount: createTransactionDto.amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: createTransactionDto.description,
      reference_id: createTransactionDto.referenceId,
      reference_type: createTransactionDto.referenceType,
      metadata: createTransactionDto.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    await databases.updateDocument(databaseId, walletsCollection, wallet.$id, {
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    } as any);

    return { transactionId: (tx as any).$id };
  }

  async refundOrder(refundOrderDto: RefundOrderDto): Promise<{ resultId: string }> {
    // Implement: credit the wallet with order amount
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');

    const order: any = await databases.getDocument(databaseId, ordersCollection, refundOrderDto.orderId);
    const amount = order.price || 0;
    const userId = order.user_id;

    const result = await this.createTransaction(userId, {
      type: TransactionType.CREDIT,
      amount,
      description: 'Order refund',
      referenceId: refundOrderDto.orderId,
      referenceType: 'order_refund',
    });

    return { resultId: result.transactionId };
  }

  async creditWallet(userId: string, amount: number, description?: string): Promise<Wallet> {
    await this.createTransaction(userId, {
      type: TransactionType.CREDIT,
      amount,
      description: description || 'Admin credit',
      referenceType: 'admin_credit',
    });

    return this.getWallet(userId);
  }

  async debitWallet(userId: string, amount: number, description?: string): Promise<Wallet> {
    await this.createTransaction(userId, {
      type: TransactionType.DEBIT,
      amount,
      description: description || 'Admin debit',
      referenceType: 'admin_debit',
    });

    return this.getWallet(userId);
  }
}
