import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { CreateInvoiceDto, InvoiceStatus } from '../invoices/dto/invoice.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private configService: ConfigService,
    private appwriteService: AppwriteService,
    private ordersService: OrdersService,
    private walletsService: WalletsService,
    private zarinPalService: ZarinPalService,
    private invoicesService: InvoicesService,
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
      
      orderAmount = order.total_amount;
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
      // Idempotency: if we already logged a completed verification for this authority, short-circuit
      const existing = await this.getPaymentTransactionByAuthority(paymentVerifyDto.authority);
      if (existing && existing.status === 'completed') {
        return { success: true, refId: existing.zarinpal_ref_id, amount: existing.amount };
      }
      // Verify payment with ZarinPal
      const paymentResponse = await this.zarinPalService.verifyPayment(paymentVerifyDto.authority, orderAmount);

      if (paymentResponse.data.code === 100 || paymentResponse.data.code === 101) {
        const refId = paymentResponse.data.ref_id.toString();

        // Update order payment status (only for regular orders)
        if (!isWalletDeposit) {
          // Fix: pass the authenticated user_id, not a status string
          await this.ordersService.updateOrderPayment(
            paymentVerifyDto.order_id,
            user_id,
            paymentVerifyDto.authority,
            refId,
          );

          // Ensure an invoice exists, mark it PAID, and generate a receipt
          let createdInvoiceId: string | undefined;
          try {
            // Try to find an existing invoice by order_id
            const databases = this.appwriteService.getDatabases();
            const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
            const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
            const existing = await databases.listDocuments(
              databaseId,
              invoicesCollection,
              [Query.equal('order_id', paymentVerifyDto.order_id), Query.limit(1)],
            );

            if (existing.documents && existing.documents.length > 0) {
              createdInvoiceId = (existing.documents[0] as any).$id;
            } else {
              // Create a new invoice if missing
              const dueDate = new Date().toISOString();
              const created = await this.invoicesService.createInvoice(user_id, {
                order_id: paymentVerifyDto.order_id!,
                amount: orderAmount,
                dueDate,
                description: `Auto-generated invoice for order ${paymentVerifyDto.order_id}`,
              } as CreateInvoiceDto);
              createdInvoiceId = created.id;
            }

            // Mark invoice paid and generate receipt
            if (createdInvoiceId) {
              await this.invoicesService.updateInvoiceStatus(createdInvoiceId, InvoiceStatus.PAID);
              await this.invoicesService.generateReceipt(createdInvoiceId, refId, orderAmount);
            }
          } catch (e) {
            // Non-fatal: continue even if invoice/receipt handling fails
          }

          // Log a read-only audit transaction for this order payment (no wallet change)
          try {
            const databases = this.appwriteService.getDatabases();
            const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
            const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');

            // Idempotency guard: check if an order payment with same refId already exists
            const existingTx = await databases.listDocuments(
              databaseId,
              transactionsCollection,
              [
                Query.equal('reference_id', paymentVerifyDto.order_id),
                Query.equal('type', TransactionType.PAYMENT),
                Query.limit(25),
                Query.orderDesc('created_at'),
              ],
            );
            let duplicate = false;
            for (const doc of (existingTx.documents || [])) {
              const meta = (doc as any).metadata;
              if (meta) {
                try {
                  const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
                  if (parsed?.zarinpal_ref_id === refId || parsed?.zarinpal_authority === paymentVerifyDto.authority) {
                    duplicate = true;
                    break;
                  }
                } catch {}
              }
            }

            if (!duplicate) {
              const now = new Date().toISOString();
              await databases.createDocument(
                databaseId,
                transactionsCollection,
                ID.unique(),
                {
                  user_id,
                  type: TransactionType.PAYMENT,
                  status: 'completed',
                  amount: orderAmount,
                  description: 'Order payment via ZarinPal',
                  reference_type: 'order',
                  reference_id: paymentVerifyDto.order_id,
                  metadata: JSON.stringify({
                    zarinpal_authority: paymentVerifyDto.authority,
                    zarinpal_ref_id: refId,
                    invoice_id: typeof createdInvoiceId !== 'undefined' ? createdInvoiceId : undefined,
                    gateway: 'zarinpal',
                  }),
                  created_at: now,
                  updated_at: now,
                } as any,
              );
            }
          } catch (_) {}

          // Notify user for successful order payment
          try {
            await (this.appwriteService as any).sendUserPush(
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
          await this.walletsService.createTransaction(user_id, {
            type: TransactionType.CREDIT,
            amount: orderAmount,
            description: 'Wallet deposit',
            referenceType: 'wallet_deposit',
            referenceId: paymentVerifyDto.authority,
            metadata: { refId, source: 'zarinpal' },
          });
          // Create a receipt for the wallet deposit (no invoice)
          try {
            const databases = this.appwriteService.getDatabases();
            const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
            const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS');
            await databases.createDocument(
              databaseId,
              receiptsCollection,
              ID.unique(),
              {
                user_id,
                invoice_id: null,
                ref_id: refId,
                reference_type: 'wallet_deposit',
                reference_id: paymentVerifyDto.authority,
                amount: orderAmount,
                format: 'pdf',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as any,
            );
          } catch (_) {}
          // Notify user for successful wallet deposit
          try {
            await (this.appwriteService as any).sendUserPush(
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

  async getOrderPayments(order_id: string, user_id: string): Promise<PaymentTransaction[]> {
    // Verify order ownership
    await this.ordersService.getOrder(order_id, user_id);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS');
    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal('order_id', order_id),
        Query.orderDesc('created_at'),
      ],
    );
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
        await this.walletsService.createTransaction(user_id, {
          type: TransactionType.CREDIT,
          amount: transaction.amount,
          description: 'Wallet deposit',
          referenceType: 'wallet_deposit',
          referenceId: authority,
          metadata: { refId, source: 'zarinpal' },
        });

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
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_USER_PROFILES');
    
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
   * Get payment transaction by authority
   */
  private async getPaymentTransactionByAuthority(authority: string): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS');
    
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
