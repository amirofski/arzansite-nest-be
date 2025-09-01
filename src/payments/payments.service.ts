import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { OrdersService } from '../orders/orders.service';
import { WalletsService } from '../wallets/wallets.service';
import { PaymentTransaction } from '../common/types/database.types';
import { ZarinPalService } from './zarinpal.service';
import {
  PaymentRequestDto,
  PaymentVerifyDto,
  PaymentRefundDto,
  PaymentCancelDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private configService: ConfigService,
    private appwriteService: AppwriteService,
    private ordersService: OrdersService,
    private walletsService: WalletsService,
    private zarinPalService: ZarinPalService,
  ) {}

  async requestPayment(
    user_id: string,
    paymentRequestDto: PaymentRequestDto,
  ): Promise<{ success: boolean; authority: string; paymentUrl: string; invoiceId?: string }> {
    // Check if this is a wallet deposit (order_id starts with 'deposit_')
    const isWalletDeposit = paymentRequestDto.order_id.startsWith('deposit_');
    
    if (!isWalletDeposit) {
      // Verify order ownership for regular orders
      const order = await this.ordersService.getOrder(paymentRequestDto.order_id, user_id);
    }

    try {
      // Get user profile for payment details
      const userProfile = await this.getUserProfile(user_id);
      
      // Create payment request using ZarinPal service
      const paymentResponse = await this.zarinPalService.createPayment({
        amount: paymentRequestDto.amount,
        description: paymentRequestDto.description,
        callback_url: paymentRequestDto.callback_url || `${this.configService.get('FRONTEND_URL')}/payment/callback`,
        mobile: paymentRequestDto.mobile || userProfile.phone || '',
        email: paymentRequestDto.email || userProfile.email,
        order_id: paymentRequestDto.order_id,
      });

      // Log payment transaction
      await this.logPaymentTransaction({
        order_id: paymentRequestDto.order_id,
        user_id: user_id,
        transaction_type: 'payment_request',
        zarinpal_authority: paymentResponse.data.authority,
        amount: paymentRequestDto.amount,
        status: 'pending',
        gateway_response: paymentResponse,
      });

      return {
        success: true,
        authority: paymentResponse.data.authority,
        paymentUrl: this.zarinPalService.getPaymentUrl(paymentResponse.data.authority),
        invoiceId: paymentResponse.data.authority,
      };
    } catch (error) {
      throw new BadRequestException(`Payment request failed: ${error.message}`);
    }
  }

  async verifyPayment(
    user_id: string,
    paymentVerifyDto: PaymentVerifyDto,
  ): Promise<{ success: boolean; refId: string; amount: number }> {
    // Check if this is a wallet deposit
    const isWalletDeposit = paymentVerifyDto.order_id.startsWith('deposit_');
    
    let orderAmount = 0;
    
    if (!isWalletDeposit) {
      // Verify order ownership for regular orders
      const order = await this.ordersService.getOrder(paymentVerifyDto.order_id, user_id);

      if (order.payment_status === 'paid') {
        throw new BadRequestException('Payment already verified');
      }
      
      orderAmount = order.price;
    } else {
      // For wallet deposits, extract amount from order_id
      // Format: deposit_userId_timestamp_amount
      const parts = paymentVerifyDto.order_id.split('_');
      if (parts.length >= 4) {
        orderAmount = parseInt(parts[3]);
      } else {
        throw new BadRequestException('Invalid wallet deposit order ID format');
      }
    }

    try {
      // Verify payment with ZarinPal
      const paymentResponse = await this.zarinPalService.verifyPayment(paymentVerifyDto.authority, orderAmount);

      if (paymentResponse.data.code === 100 || paymentResponse.data.code === 101) {
        const refId = paymentResponse.data.ref_id.toString();

        // Update order payment status (only for regular orders)
        if (!isWalletDeposit) {
          await this.ordersService.updateOrderPayment(
            paymentVerifyDto.order_id,
            'paid',
            paymentVerifyDto.authority,
            refId,
          );
          // Notify user for successful order payment
          try {
            await this.appwriteService.sendUserPush(
              user_id,
              'پرداخت سفارش موفق بود',
              `پرداخت سفارش شما با موفقیت انجام شد. کد رهگیری: ${refId}`,
              {
                type: 'order_payment_success',
                order_id: paymentVerifyDto.order_id,
                refId,
                amount: orderAmount,
              },
            );
          } catch (_) {}
        } else {
          // For wallet deposits, top up the wallet
          await this.walletsService.topUpWallet(user_id, orderAmount, refId);
          // Notify user for successful wallet deposit
          try {
            await this.appwriteService.sendUserPush(
              user_id,
              'شارژ کیف پول موفق بود',
              `کیف پول شما به مبلغ ${orderAmount} ریال شارژ شد. کد رهگیری: ${refId}`,
              {
                type: 'wallet_deposit_success',
                refId,
                amount: orderAmount,
              },
            );
          } catch (_) {}
        }

        // Log payment transaction
        await this.logPaymentTransaction({
          order_id: paymentVerifyDto.order_id,
          user_id: user_id,
          transaction_type: 'payment_verification',
          zarinpal_authority: paymentVerifyDto.authority,
          zarinpal_ref_id: refId,
          amount: orderAmount, // Use the original order amount
          status: 'completed',
          gateway_response: paymentResponse,
        });

        return {
          success: true,
          refId: refId,
          amount: orderAmount,
        };
      } else {
        throw new BadRequestException(`Payment verification failed: ${paymentResponse.data.message}`);
      }
    } catch (error) {
      throw new BadRequestException(`Payment verification failed: ${error.message}`);
    }
  }

  async refundPayment(
    user_id: string,
    paymentRefundDto: PaymentRefundDto,
  ): Promise<{ success: boolean }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentRefundDto.order_id, user_id);

    if (order.payment_status !== 'paid') {
      throw new BadRequestException('Order is not paid');
    }

    try {
      // Log refund transaction (ZarinPal refund API not implemented yet)
      await this.logPaymentTransaction({
        order_id: paymentRefundDto.order_id,
        user_id: user_id,
        transaction_type: 'refund',
        zarinpal_ref_id: order.zarinpal_ref_id,
        amount: paymentRefundDto.amount || order.price,
        status: 'completed',
        gateway_response: { message: 'Refund logged - ZarinPal refund API not implemented' },
        metadata: { refund_reason: 'user_requested' },
      });

      // Update order status
      await this.ordersService.updateOrderPayment(
        paymentRefundDto.order_id,
        'refunded',
      );

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async cancelPayment(
    user_id: string,
    paymentCancelDto: PaymentCancelDto,
  ): Promise<{ success: boolean }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentCancelDto.order_id, user_id);

    // Log cancellation transaction
    await this.logPaymentTransaction({
      order_id: paymentCancelDto.order_id,
      user_id: user_id,
      transaction_type: 'cancellation',
      zarinpal_authority: order.zarinpal_authority,
      amount: order.price,
      status: 'cancelled',
      metadata: { cancellation_reason: 'user_cancelled' },
    });

    // Update order status
    await this.ordersService.updateOrderPayment(
      paymentCancelDto.order_id,
      'cancelled',
    );

    return { success: true };
  }

  async getOrderPayments(order_id: string, user_id: string): Promise<PaymentTransaction[]> {
    // Verify order ownership
    await this.ordersService.getOrder(order_id, user_id);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_TRANSACTIONS');
    const { Query } = await import('node-appwrite');
    const res = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('order_id', order_id),
      Query.orderDesc('created_at'),
    ]);
    return (res.documents as any) || [];
  }

  /**
   * Create wallet deposit payment request
   */
  async createWalletDeposit(
    user_id: string,
    amount: number,
    description: string,
    callbackUrlOverride?: string,
  ): Promise<{ success: boolean; authority: string; paymentUrl: string; invoiceId: string; order_id: string; message: string }> {
    // Validate minimum amount (1,000,000 Rials = 1,000,000)
    if (amount < 1000000) {
      throw new BadRequestException('Minimum deposit amount is 1,000,000 Rials');
    }

    // Create unique order ID for wallet deposit
    const timestamp = Date.now();
    const order_id = `deposit_${user_id}_${timestamp}_${amount}`;

    // Get user profile
    const userProfile = await this.getUserProfile(user_id);

    try {
      // Create payment request using the updated ZarinPal service
      const fallbackCallback = `${this.configService.get('FRONTEND_URL')}/wallet/deposit/callback`;
      const callback_url = callbackUrlOverride || fallbackCallback;
      const paymentResponse = await this.zarinPalService.createPayment({
        amount: amount,
        description: description,
        callback_url,
        mobile: userProfile.phone || '',
        email: userProfile.email,
        order_id: order_id,
        currency: 'IRR', // Use Rials as default
      });

      // Log payment transaction
      await this.logPaymentTransaction({
        order_id: order_id,
        user_id: user_id,
        transaction_type: 'wallet_deposit_request',
        zarinpal_authority: paymentResponse.data.authority,
        amount: amount,
        status: 'pending',
        gateway_response: paymentResponse,
      });

      return {
        success: true,
        paymentUrl: this.zarinPalService.getPaymentUrl(paymentResponse.data.authority),
        authority: paymentResponse.data.authority,
        invoiceId: paymentResponse.data.authority, // Use authority as invoice ID for compatibility
        order_id: order_id,
        message: 'Payment request created successfully. Redirect to payment gateway.',
      };
    } catch (error) {
      throw new BadRequestException(`Wallet deposit request failed: ${error.message}`);
    }
  }

  /**
   * Verify wallet deposit payment
   */
  async verifyWalletDeposit(
    user_id: string,
    authority: string,
  ): Promise<{ success: boolean; refId: string; amount: number }> {
    try {
      // Get the original deposit amount from the transaction log
      const transaction = await this.getPaymentTransactionByAuthority(authority);
      if (!transaction) {
        throw new BadRequestException('Payment transaction not found');
      }

      // Verify payment with ZarinPal using the correct amount
      const paymentResponse = await this.zarinPalService.verifyPayment(authority, transaction.amount);

      if (paymentResponse.data.code === 100 || paymentResponse.data.code === 101) {
        const refId = paymentResponse.data.ref_id.toString();

        // Top up the wallet
        await this.walletsService.topUpWallet(user_id, transaction.amount, refId);

        // Log payment transaction
        await this.logPaymentTransaction({
          order_id: `deposit_${user_id}_${Date.now()}_${transaction.amount}`,
          user_id: user_id,
          transaction_type: 'wallet_deposit_verification',
          zarinpal_authority: authority,
          zarinpal_ref_id: refId,
          amount: transaction.amount,
          status: 'completed',
          gateway_response: paymentResponse,
        });

        return {
          success: true,
          refId: refId,
          amount: transaction.amount,
        };
      } else {
        throw new BadRequestException(`Payment verification failed: ${paymentResponse.data.message}`);
      }
    } catch (error) {
      throw new BadRequestException(`Wallet deposit verification failed: ${error.message}`);
    }
  }

  private async getUserProfile(user_id: string): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
    const { Query } = await import('node-appwrite');
    
    try {
      const res = await databases.listDocuments(databaseId, collectionId, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);
      return res.documents[0] || {};
    } catch (error) {
      return {};
    }
  }

  private async logPaymentTransaction(transactionData: Partial<PaymentTransaction>): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_TRANSACTIONS');
    const { ID } = await import('node-appwrite');
    
    // Stringify metadata and gateway_response for Appwrite storage
    const processedData = {
      ...transactionData,
      metadata: transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      gateway_response: transactionData.gateway_response ? JSON.stringify(transactionData.gateway_response) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await databases.createDocument(databaseId, collectionId, ID.unique(), processedData as any);
  }

  /**
   * Get payment transaction by authority
   */
  private async getPaymentTransactionByAuthority(authority: string): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_TRANSACTIONS');
    const { Query } = await import('node-appwrite');
    
    try {
      const res = await databases.listDocuments(databaseId, collectionId, [
        Query.equal('zarinpal_authority', authority),
        Query.limit(1),
      ]);
      return res.documents[0] || null;
    } catch (error) {
      return null;
    }
  }
}
