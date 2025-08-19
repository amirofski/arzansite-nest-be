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
    userId: string,
    paymentRequestDto: PaymentRequestDto,
  ): Promise<{ success: boolean; authority: string; paymentUrl: string; invoiceId?: string }> {
    // Check if this is a wallet deposit (orderId starts with 'deposit_')
    const isWalletDeposit = paymentRequestDto.orderId.startsWith('deposit_');
    
    if (!isWalletDeposit) {
      // Verify order ownership for regular orders
      const order = await this.ordersService.getOrder(paymentRequestDto.orderId, userId);
    }

    try {
      // Get user profile for payment details
      const userProfile = await this.getUserProfile(userId);
      
      // Create payment request using ZarinPal service
      const paymentResponse = await this.zarinPalService.createPayment({
        amount: paymentRequestDto.amount,
        description: paymentRequestDto.description,
        callbackUrl: paymentRequestDto.callbackUrl || `${this.configService.get('FRONTEND_URL')}/payment/callback`,
        mobile: paymentRequestDto.mobile || userProfile.phone || '',
        email: paymentRequestDto.email || userProfile.email,
        orderId: paymentRequestDto.orderId,
      });

      // Log payment transaction
      await this.logPaymentTransaction({
        order_id: paymentRequestDto.orderId,
        user_id: userId,
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
    userId: string,
    paymentVerifyDto: PaymentVerifyDto,
  ): Promise<{ success: boolean; refId: string; amount: number }> {
    // Check if this is a wallet deposit
    const isWalletDeposit = paymentVerifyDto.orderId.startsWith('deposit_');
    
    let orderAmount = 0;
    
    if (!isWalletDeposit) {
      // Verify order ownership for regular orders
      const order = await this.ordersService.getOrder(paymentVerifyDto.orderId, userId);

      if (order.payment_status === 'paid') {
        throw new BadRequestException('Payment already verified');
      }
      
      orderAmount = order.price;
    } else {
      // For wallet deposits, extract amount from orderId
      // Format: deposit_userId_timestamp_amount
      const parts = paymentVerifyDto.orderId.split('_');
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
          await this.ordersService.updateOrderPaymentStatus(
            paymentVerifyDto.orderId,
            'paid',
            paymentVerifyDto.authority,
            refId,
          );
        } else {
          // For wallet deposits, top up the wallet
          await this.walletsService.topUpWallet(userId, orderAmount, refId);
        }

        // Log payment transaction
        await this.logPaymentTransaction({
          order_id: paymentVerifyDto.orderId,
          user_id: userId,
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
    userId: string,
    paymentRefundDto: PaymentRefundDto,
  ): Promise<{ success: boolean }> {
    // Verify order ownership
    const order = await this.ordersService.getOrder(paymentRefundDto.orderId, userId);

    if (order.payment_status !== 'paid') {
      throw new BadRequestException('Order is not paid');
    }

    try {
      // Log refund transaction (ZarinPal refund API not implemented yet)
      await this.logPaymentTransaction({
        order_id: paymentRefundDto.orderId,
        user_id: userId,
        transaction_type: 'refund',
        zarinpal_ref_id: order.zarinpal_ref_id,
        amount: paymentRefundDto.amount || order.price,
        status: 'completed',
        gateway_response: { message: 'Refund logged - ZarinPal refund API not implemented' },
        metadata: { refund_reason: 'user_requested' },
      });

      // Update order status
      await this.ordersService.updateOrderPaymentStatus(
        paymentRefundDto.orderId,
        'refunded',
      );

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
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

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_TRANSACTIONS');
    const { Query } = await import('node-appwrite');
    const res = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('order_id', orderId),
      Query.orderDesc('created_at'),
    ]);
    return (res.documents as any) || [];
  }

  /**
   * Create wallet deposit payment request
   */
  async createWalletDeposit(
    userId: string,
    amount: number,
    description: string,
    callbackUrlOverride?: string,
  ): Promise<{ success: boolean; authority: string; paymentUrl: string; invoiceId: string; orderId: string; message: string }> {
    // Validate minimum amount (1,000,000 Rials = 1,000,000)
    if (amount < 1000000) {
      throw new BadRequestException('Minimum deposit amount is 1,000,000 Rials');
    }

    // Create unique order ID for wallet deposit
    const timestamp = Date.now();
    const orderId = `deposit_${userId}_${timestamp}_${amount}`;

    // Get user profile
    const userProfile = await this.getUserProfile(userId);

    try {
      // Create payment request using the updated ZarinPal service
      const fallbackCallback = `${this.configService.get('FRONTEND_URL')}/wallet/deposit/callback`;
      const callbackUrl = callbackUrlOverride || fallbackCallback;
      const paymentResponse = await this.zarinPalService.createPayment({
        amount: amount,
        description: description,
        callbackUrl,
        mobile: userProfile.phone || '',
        email: userProfile.email,
        orderId: orderId,
        currency: 'IRR', // Use Rials as default
      });

      // Log payment transaction
      await this.logPaymentTransaction({
        order_id: orderId,
        user_id: userId,
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
        orderId: orderId,
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
    userId: string,
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
        await this.walletsService.topUpWallet(userId, transaction.amount, refId);

        // Log payment transaction
        await this.logPaymentTransaction({
          order_id: `deposit_${userId}_${Date.now()}_${transaction.amount}`,
          user_id: userId,
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

  private async getUserProfile(userId: string): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
    const { Query } = await import('node-appwrite');
    
    try {
      const res = await databases.listDocuments(databaseId, collectionId, [
        Query.equal('user_id', userId),
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
