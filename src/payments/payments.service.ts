import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { OrdersService } from '../orders/orders.service';
import { WalletsService } from '../wallets/wallets.service';
import { PaymentTransaction } from '../common/types/database.types';
import { ZarinPalService } from './zarinpal.service';
import { ID, Query } from 'node-appwrite';
import { TransactionType } from '../wallets/dto/wallet.dto';
import {
  PaymentRequestDto,
  PaymentVerifyDto,
  PaymentRefundDto,
  PaymentCancelDto,
} from './dto/payment.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { EmailService } from '../email/email.service';
import { CreateInvoiceDto, InvoiceStatus } from '../invoices/dto/invoice.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private configService: ConfigService,
    private appwriteService: AppwriteService,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private walletsService: WalletsService,
    private zarinPalService: ZarinPalService,
    private invoicesService: InvoicesService,
    private emailService: EmailService,
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
      
      // Validate callback URL
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const requestedCallback = paymentRequestDto.callback_url || `${frontendUrl}/payment/callback`;
      try {
        const url = new URL(requestedCallback);
        const allowed = [new URL(frontendUrl).host];
        if (!allowed.includes(url.host)) {
          throw new Error('Callback URL host not allowed');
        }
      } catch (_) {
        throw new BadRequestException('Invalid callback URL');
      }

      // Create payment request using ZarinPal service
      const paymentResponse = await this.zarinPalService.createPayment({
        amount: paymentRequestDto.amount,
        description: paymentRequestDto.description,
        callback_url: requestedCallback,
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
  ): Promise<{ success: boolean; refId: string; amount: number; authority?: string; orderId?: string; invoiceId?: string; receiptId?: string }> {
    const loggerPrefix = `[PaymentsService.verifyPayment] user=${user_id} authority=${paymentVerifyDto.authority}`;
    // Validate
    if (!paymentVerifyDto?.authority || !Number.isFinite(paymentVerifyDto.amount)) {
      throw new BadRequestException('Invalid verification payload');
    }

    // Idempotency: if a transaction for this authority already completed, return cached result
    const existing = await this.getPaymentTransactionByAuthority(paymentVerifyDto.authority);
    if (existing && existing.status === 'completed') {
      console.log(`${loggerPrefix} already completed; returning cached result`);
      return {
        success: true,
        refId: existing.zarinpal_ref_id,
        amount: existing.amount,
        authority: paymentVerifyDto.authority,
        orderId: existing.order_id,
      };
    }

    // Attempt verify with gateway
    console.log(`${loggerPrefix} verifying with gateway...`);
    const paymentResponse = await this.zarinPalService.verifyPayment(paymentVerifyDto.authority, paymentVerifyDto.amount);

    if (!(paymentResponse.data.code === 100 || paymentResponse.data.code === 101)) {
      console.error(`${loggerPrefix} gateway verification failed: ${paymentResponse.data.message}`);
      throw new BadRequestException(`Payment verification failed: ${paymentResponse.data.message}`);
    }

    const refId = paymentResponse.data.ref_id.toString();
    let orderId: string | null = null;
    let invoiceId: string | null = null;
    let receiptId: string | null = null;

    // Get critical services/collections
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const paymentsCollection = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS') || 'payments';
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES') || 'invoices';
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS') || 'orders';
    const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS') || 'receipts';

    try {
      // 1) Locate the payment transaction by authority to get order_id
      const paymentTransaction = existing || await databases.listDocuments(
        databaseId,
        paymentsCollection,
        [Query.equal('zarinpal_authority', paymentVerifyDto.authority), Query.limit(1)]
      ).then(res => res.documents?.[0]);
      
      orderId = paymentTransaction?.order_id;
      console.log(`${loggerPrefix} found payment transaction for order: ${orderId}`);
      
      if (!orderId || orderId === 'unknown') {
        console.warn(`${loggerPrefix} no valid order_id in payment transaction; cannot link invoice/receipt`);
      } else {
        // 2) Update the order payment status and ref_id
        try {
          // Also auto-transition status to in_progress if it was pending
          try {
            const existingOrder: any = await databases.getDocument(databaseId, ordersCollection, orderId);
            const nextStatus = existingOrder?.status === 'pending' ? 'in_progress' : existingOrder?.status;
            await databases.updateDocument(databaseId, ordersCollection, orderId, {
              payment_status: 'succeeded',
              status: nextStatus,
              zarinpal_ref_id: refId,
              updated_at: new Date().toISOString(),
            });
          } catch (_) {
            await databases.updateDocument(databaseId, ordersCollection, orderId, {
              payment_status: 'succeeded',
              zarinpal_ref_id: refId,
              updated_at: new Date().toISOString(),
            });
          }
          console.log(`${loggerPrefix} updated order ${orderId} payment_status=succeeded`);
        } catch (e) {
          console.warn(`${loggerPrefix} failed to update order ${orderId}:`, (e as any)?.message || e);
        }

        // 3) Find or create invoice for this order
        try {
          const invoiceRes = await databases.listDocuments(databaseId, invoicesCollection, [
            Query.equal('order_id', orderId),
            Query.limit(1),
          ]);
          
          if (invoiceRes.documents?.length) {
            const invoice = invoiceRes.documents[0] as any;
            invoiceId = invoice.$id;
            
            // Mark invoice as paid if still pending
            if (invoice.status === 'pending') {
              await this.invoicesService.updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);
              console.log(`${loggerPrefix} marked invoice ${invoiceId} as paid`);
            }
          } else {
            // No invoice exists - create one from the order then mark it paid
            console.warn(`${loggerPrefix} no invoice found for order ${orderId}; creating one`);
            const order = await databases.getDocument(databaseId, ordersCollection, orderId);
            const invoice = await databases.createDocument(databaseId, invoicesCollection, ID.unique(), {
              user_id: (order as any).user_id,
              order_id: orderId,
              amount: paymentVerifyDto.amount,
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'paid',
              description: `Invoice for order ${orderId} (created during payment verification)`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            invoiceId = (invoice as any).$id;
            console.log(`${loggerPrefix} created and marked invoice ${invoiceId} as paid`);
          }

          // 4) Generate receipt if we have an invoice
          if (invoiceId) {
            receiptId = await this.invoicesService.generateReceipt(invoiceId, refId, paymentVerifyDto.amount);
            console.log(`${loggerPrefix} generated receipt ${receiptId}`);
            
            // Send confirmation email
            try {
              await this.emailService.sendInvoicePaidEmail(user_id, invoiceId, paymentVerifyDto.amount);
            } catch (e) {
              console.warn(`${loggerPrefix} failed to send invoice paid email:`, (e as any)?.message || e);
            }
          }
        } catch (e) {
          console.warn(`${loggerPrefix} failed to process invoice/receipt:`, (e as any)?.message || e);
        }
      }

      // 5) Update/create payment transaction record
      if (paymentTransaction) {
        await databases.updateDocument(databaseId, paymentsCollection, (paymentTransaction as any).$id, {
          status: 'completed',
          zarinpal_ref_id: refId,
          amount: paymentVerifyDto.amount,
          updated_at: new Date().toISOString(),
        });
      } else {
        await databases.createDocument(databaseId, paymentsCollection, ID.unique(), {
          order_id: orderId || 'unknown',
          user_id,
          transaction_type: 'payment_verification',
          zarinpal_authority: paymentVerifyDto.authority,
          zarinpal_ref_id: refId,
          amount: paymentVerifyDto.amount,
          status: 'completed',
          gateway_response: JSON.stringify(paymentResponse),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      
      console.log(`${loggerPrefix} verification completed successfully. refId=${refId}, orderId=${orderId}, invoiceId=${invoiceId}, receiptId=${receiptId}`);
      return {
        success: true,
        refId,
        amount: paymentVerifyDto.amount,
        authority: paymentVerifyDto.authority,
        orderId: orderId || undefined,
        invoiceId: invoiceId || undefined,
        receiptId: receiptId || undefined,
      };
      
    } catch (error) {
      console.error(`${loggerPrefix} verification failed:`, (error as any)?.message || error);
      throw new BadRequestException(`Payment verification processing failed: ${(error as any)?.message || error}`);
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
        amount: paymentRefundDto.amount || order.total_amount,
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
              amount: order.total_amount,
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

  async getOrderPayments(order_id: string, user_id: string, page: number = 1, limit: number = 20, from?: string, to?: string): Promise<{ items: PaymentTransaction[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    // Verify order ownership
    await this.ordersService.getOrder(order_id, user_id);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS');
    const offset = (page - 1) * limit;
    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal('order_id', order_id),
        Query.orderDesc('created_at'),
        ...(from ? [Query.greaterThanEqual('created_at', from)] : []),
        ...(to ? [Query.lessThanEqual('created_at', to)] : []),
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
        await this.walletsService.createTransaction(user_id, {
          type: TransactionType.CREDIT,
          amount: transaction.amount,
          description: 'Wallet deposit',
          referenceType: 'wallet_deposit',
          referenceId: authority,
          metadata: { refId, source: 'zarinpal' },
        });

        // Send wallet top-up confirmation email
        try {
          await this.emailService.sendWalletTopUpEmail(user_id, transaction.amount, refId);
        } catch (e) {
          console.warn(`Failed to send wallet top-up email:`, (e as any)?.message || e);
        }

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
    // Normalize to unified users collection with graceful fallback to legacy profiles
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_USERS')
      || this.configService.get<string>('APPWRITE_COLLECTION_USER_PROFILES');
    
    if (!databaseId || !collectionId) return {};

    try {
      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );
      return res.documents[0] || {};
    } catch (error) {
      return {};
    }
  }

  private async logPaymentTransaction(transactionData: Partial<PaymentTransaction>): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS');
    
    // Stringify metadata and gateway_response for Appwrite storage
    const processedData = {
      ...transactionData,
      metadata: transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      gateway_response: transactionData.gateway_response ? JSON.stringify(transactionData.gateway_response) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      processedData as any,
    );
  }

  /**
   * Get payment transaction by authority (exposed for internal services)
   */
  async getPaymentTransactionByAuthority(authority: string): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS') || 'payments';
    
    try {
      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('zarinpal_authority', authority),
          Query.limit(1),
        ],
      );
      return res.documents[0] || null;
    } catch (error) {
      return null;
    }
  }
}
