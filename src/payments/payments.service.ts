import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentTransaction } from '../common/types/database.types';
import {
  PaymentRequestDto,
  PaymentVerifyDto,
  PaymentRefundDto,
  PaymentCancelDto,
} from './dto/payment.dto';
import axios from 'axios';

@Injectable()
export class PaymentsService {
  private readonly merchantId: string;
  private readonly zarinpalApiUrl = 'https://api.zarinpal.com/pg/v4/pay';

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
    private ordersService: OrdersService,
  ) {
    this.merchantId = this.configService.get<string>('ZARINPAL_MERCHANT_ID');
    if (!this.merchantId) {
      throw new Error('ZARINPAL_MERCHANT_ID is required');
    }
  }

  async requestPayment(
    userId: string,
    paymentRequestDto: PaymentRequestDto,
  ): Promise<{ success: boolean; authority: string; paymentUrl: string }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentRequestDto.orderId, userId);

    // Create Zarinpal payment request
    const zarinpalRequest = {
      merchant_id: this.merchantId,
      amount: paymentRequestDto.amount,
      description: paymentRequestDto.description,
      callback_url: paymentRequestDto.callbackUrl || `${this.configService.get('FRONTEND_URL')}/payment/callback`,
      metadata: {
        mobile: paymentRequestDto.mobile,
        email: paymentRequestDto.email,
        order_id: paymentRequestDto.orderId,
      },
    };

    try {
      const response = await axios.post(this.zarinpalApiUrl, zarinpalRequest);
      const { data } = response.data;

      if (data.code === 100) {
        // Update order with authority
        await this.ordersService.updateOrderPaymentStatus(
          paymentRequestDto.orderId,
          'pending',
          data.authority,
        );

        // Log payment transaction
        await this.logPaymentTransaction({
          order_id: paymentRequestDto.orderId,
          user_id: userId,
          transaction_type: 'payment_request',
          zarinpal_authority: data.authority,
          amount: paymentRequestDto.amount,
          status: 'pending',
          gateway_response: response.data,
        });

        return {
          success: true,
          authority: data.authority,
          paymentUrl: `https://www.zarinpal.com/pg/StartPay/${data.authority}`,
        };
      } else {
        throw new BadRequestException(`Zarinpal error: ${data.message}`);
      }
    } catch (error) {
      throw new BadRequestException(`Payment request failed: ${error.message}`);
    }
  }

  async verifyPayment(
    userId: string,
    paymentVerifyDto: PaymentVerifyDto,
  ): Promise<{ success: boolean; refId: string; amount: number }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentVerifyDto.orderId, userId);

    if (order.payment_status === 'paid') {
      throw new BadRequestException('Payment already verified');
    }

    // Verify with Zarinpal
    const verifyUrl = 'https://api.zarinpal.com/pg/v4/payment/verify.json';
    const verifyRequest = {
      merchant_id: this.merchantId,
      authority: paymentVerifyDto.authority,
      amount: order.price,
    };

    try {
      const response = await axios.post(verifyUrl, verifyRequest);
      const { data } = response.data;

      if (data.code === 100) {
        // Update order payment status
        await this.ordersService.updateOrderPaymentStatus(
          paymentVerifyDto.orderId,
          'paid',
          paymentVerifyDto.authority,
          data.ref_id,
        );

        // Log payment transaction
        await this.logPaymentTransaction({
          order_id: paymentVerifyDto.orderId,
          user_id: userId,
          transaction_type: 'payment_verification',
          zarinpal_authority: paymentVerifyDto.authority,
          zarinpal_ref_id: data.ref_id,
          amount: data.amount,
          status: 'completed',
          gateway_response: response.data,
        });

        return {
          success: true,
          refId: data.ref_id,
          amount: data.amount,
        };
      } else {
        throw new BadRequestException(`Payment verification failed: ${data.message}`);
      }
    } catch (error) {
      throw new BadRequestException(`Payment verification failed: ${error.message}`);
    }
  }

  async refundPayment(
    userId: string,
    paymentRefundDto: PaymentRefundDto,
  ): Promise<{ success: boolean }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentRefundDto.orderId, userId);

    if (order.payment_status !== 'paid') {
      throw new BadRequestException('Order is not paid');
    }

    // Log refund transaction
    await this.logPaymentTransaction({
      order_id: paymentRefundDto.orderId,
      user_id: userId,
      transaction_type: 'refund',
      zarinpal_ref_id: order.zarinpal_ref_id,
      amount: paymentRefundDto.amount || order.price,
      status: 'pending',
      metadata: { refund_reason: 'user_requested' },
    });

    // Update order status
    await this.ordersService.updateOrderPaymentStatus(
      paymentRefundDto.orderId,
      'refunded',
    );

    return { success: true };
  }

  async cancelPayment(
    userId: string,
    paymentCancelDto: PaymentCancelDto,
  ): Promise<{ success: boolean }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentCancelDto.orderId, userId);

    // Log cancellation transaction
    await this.logPaymentTransaction({
      order_id: paymentCancelDto.orderId,
      user_id: userId,
      transaction_type: 'cancellation',
      zarinpal_authority: order.zarinpal_authority,
      amount: order.price,
      status: 'cancelled',
      metadata: { cancellation_reason: 'user_cancelled' },
    });

    // Update order status
    await this.ordersService.updateOrderPaymentStatus(
      paymentCancelDto.orderId,
      'cancelled',
    );

    return { success: true };
  }

  async getOrderPayments(orderId: string, userId: string): Promise<PaymentTransaction[]> {
    // Verify order ownership
    await this.ordersService.getOrder(orderId, userId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch payment transactions');
    }

    return data || [];
  }

  private async logPaymentTransaction(transactionData: Partial<PaymentTransaction>): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('payment_transactions')
      .insert({
        ...transactionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log payment transaction:', error);
    }
  }
}
