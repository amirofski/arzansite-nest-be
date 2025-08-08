import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Transaction } from '../common/types/database.types';

@Injectable()
export class TransactionsService {
  constructor(private supabaseService: SupabaseService) {}

  async getTransactions(
    userId?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Transaction[]> {
    let query = this.supabaseService
      .getClient()
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to fetch transactions');
    }

    return data || [];
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !data) {
      throw new Error('Transaction not found');
    }

    return data;
  }

  async getTransactionsByOrder(orderId: string): Promise<Transaction[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('transactions')
      .select('*')
      .eq('reference_id', orderId)
      .eq('reference_type', 'order')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch order transactions');
    }

    return data || [];
  }
}
