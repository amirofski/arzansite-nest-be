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
    limit: number = 50,
    offset: number = 0,
  ): Promise<Transaction[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const queries: string[] = [Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)];
    if (user_id) queries.push(Query.equal('user_id', user_id));
    const res = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      queries,
    );
    return (res.documents as any) || [];
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

  async getTransactionsByOrder(order_id: string): Promise<Transaction[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
    const res = await databases.listDocuments(
      databaseId,
      transactionsCollection,
      [
        Query.equal('reference_id', order_id),
        Query.equal('reference_type', 'order'),
        Query.orderDesc('created_at'),
      ],
    );
    return (res.documents as any) || [];
  }
}
