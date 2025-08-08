import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Wallet, Transaction } from '../common/types/database.types';
import { CreateTransactionDto, RefundOrderDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(private supabaseService: SupabaseService) {}

  async getWallet(userId: string): Promise<Wallet> {
    // Try to get existing wallet
    let { data, error } = await this.supabaseService
      .getClient()
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Create wallet if it doesn't exist
      const { data: newWallet, error: createError } = await this.supabaseService
        .getClient()
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create wallet');
      }

      return newWallet;
    }

    return data;
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
    const { data, error } = await this.supabaseService
      .getClient()
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error('Failed to fetch transactions');
    }

    return data || [];
  }

  async createTransaction(
    userId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<{ transactionId: string }> {
    // Ensure wallet exists
    await this.getWallet(userId);

    // Call the existing RPC function
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_type: createTransactionDto.type,
        p_amount: createTransactionDto.amount,
        p_description: createTransactionDto.description,
        p_reference_id: createTransactionDto.referenceId,
        p_reference_type: createTransactionDto.referenceType,
        p_metadata: createTransactionDto.metadata,
      });

    if (error) {
      throw new Error(`Failed to process transaction: ${error.message}`);
    }

    return { transactionId: data };
  }

  async refundOrder(refundOrderDto: RefundOrderDto): Promise<{ resultId: string }> {
    // Call the existing RPC function
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('refund_order_to_wallet', {
        p_order_id: refundOrderDto.orderId,
      });

    if (error) {
      throw new Error(`Failed to refund order: ${error.message}`);
    }

    return { resultId: data };
  }

  async creditWallet(userId: string, amount: number, description?: string): Promise<Wallet> {
    await this.createTransaction(userId, {
      type: 'credit',
      amount,
      description: description || 'Admin credit',
      referenceType: 'admin_credit',
    });

    return this.getWallet(userId);
  }

  async debitWallet(userId: string, amount: number, description?: string): Promise<Wallet> {
    await this.createTransaction(userId, {
      type: 'debit',
      amount,
      description: description || 'Admin debit',
      referenceType: 'admin_debit',
    });

    return this.getWallet(userId);
  }
}
