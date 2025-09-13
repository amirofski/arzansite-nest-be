import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Transaction } from '../common/types/database.types';
import { ConfigService } from '@nestjs/config';
import { Query } from 'node-appwrite';

@Injectable()
export class TransactionsService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async getTransactions(
    user_id?: string,
    page: number = 1,
    limit: number = 50,
    from?: string,
    to?: string,
  ): Promise<{ items: Transaction[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const offset = (page - 1) * limit;
    const queries: string[] = [Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)];
    if (user_id) queries.push(Query.equal('user_id', user_id));
    if (from) queries.push(Query.greaterThanEqual('created_at', from));
    if (to) queries.push(Query.lessThanEqual('created_at', to));
    const res = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      queries,
    );
    return {
      items: (res.documents as any) || [],
      pagination: {
        page,
        limit,
        total: res.total,
        pages: Math.max(1, Math.ceil(res.total / limit)),
      },
    };
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    let doc: any = null;
    try {
      doc = await databases.getDocument(
        databaseId,
        transactionsCollection,
        transactionId,
      );
    } catch (_) {
      doc = null;
    }
    if (!doc) throw new Error('Transaction not found');
    return doc as any;
  }

  async getTransactionsByOrder(order_id: string, page: number = 1, limit: number = 20): Promise<{ items: Transaction[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const offset = (page - 1) * limit;
    const res = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      [
        Query.equal('reference_id', order_id),
        Query.equal('reference_type', 'order'),
        Query.orderDesc('created_at'),
        Query.offset(offset),
        Query.limit(limit),
      ],
    );
    return {
      items: (res.documents as any) || [],
      pagination: {
        page,
        limit,
        total: res.total,
        pages: Math.max(1, Math.ceil(res.total / limit)),
      },
    };
  }
}
