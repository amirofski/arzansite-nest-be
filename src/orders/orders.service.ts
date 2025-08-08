import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Order } from '../common/types/database.types';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private supabaseService: SupabaseService) {}

  async getOrders(userId: string, isAdmin: boolean = false): Promise<Order[]> {
    let query = this.supabaseService
      .getClient()
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to fetch orders');
    }

    return data || [];
  }

  async getOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<Order> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership or admin access
    if (!isAdmin && data.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return data;
  }

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .insert({
        ...createOrderDto,
        user_id: userId,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create order');
    }

    return data;
  }

  async updateOrder(
    orderId: string,
    userId: string,
    updateOrderDto: UpdateOrderDto,
    isAdmin: boolean = false,
  ): Promise<Order> {
    // Check ownership or admin access
    const existingOrder = await this.getOrder(orderId, userId, isAdmin);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({
        ...updateOrderDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update order');
    }

    return data;
  }

  async deleteOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    // Check ownership or admin access
    await this.getOrder(orderId, userId, isAdmin);

    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      throw new Error('Failed to delete order');
    }
  }

  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: string,
    zarinpalAuthority?: string,
    zarinpalRefId?: string,
  ): Promise<Order> {
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (zarinpalAuthority) {
      updateData.zarinpal_authority = zarinpalAuthority;
    }

    if (zarinpalRefId) {
      updateData.zarinpal_ref_id = zarinpalRefId;
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update order payment status');
    }

    return data;
  }
}
