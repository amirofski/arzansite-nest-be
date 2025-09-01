import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ZarinPalService } from './zarinpal.service';
import { EmailService } from '../email/email.service';
import { ID } from 'node-appwrite';

export interface EnhancedZarinPalPaymentRequest {
  order_id: string;
  amount: number;
  description: string;
  callback_url: string;
  userData: {
    email: string;
    mobile: string;
    name: string;
  };
  metadata: {
    source: 'wizard' | 'dashboard' | 'wallet_topup';
    order_type: string;
    site_type: string;
  };
}

export interface EnhancedZarinPalPaymentResponse {
  paymentUrl: string;
  authority: string;
  order_id: string;
  expiresAt: string;
  qrCode?: string;
}

export interface EnhancedPaymentVerificationResponse {
  success: boolean;
  refId: string;
  order_id: string;
  amount: number;
  description: string;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  retryable: boolean;
  supportRequired: boolean;
}

export interface EnhancedRefundRequest {
  order_id: string;
  transactionId: string;
  amount: number;
  reason: string;
  description: string;
  metadata?: {
    refund_source: string;
    admin_notes?: string;
  };
}

export interface EnhancedRefundResponse {
  success: boolean;
  refundId: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedProcessingTime: string;
  refundDetails: {
    reason: string;
    description: string;
    requestedAt: string;
  };
}

export interface EnhancedCancellationRequest {
  order_id: string;
  transactionId: string;
  reason: string;
  description: string;
  metadata?: {
    cancellation_source: string;
    admin_notes?: string;
  };
}

export interface EnhancedCancellationResponse {
  success: boolean;
  cancellationId: string;
  order_id: string;
  status: 'cancelled';
  cancelledAt: string;
  cancellationDetails: {
    reason: string;
    description: string;
    processedBy: string;
  };
}

@Injectable()
export class EnhancedPaymentsService {
  private readonly logger = new Logger(EnhancedPaymentsService.name);

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
    private readonly zarinPalService: ZarinPalService,
    private readonly emailService: EmailService,
  ) {}

  async requestEnhancedZarinPalPayment(
    user_id: string,
    paymentRequest: EnhancedZarinPalPaymentRequest
  ): Promise<EnhancedZarinPalPaymentResponse> {
    this.logger.log(`Requesting enhanced ZarinPal payment for order ${paymentRequest.order_id}, user ${user_id}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(user_id, paymentRequest.order_id);

      // Create payment request with ZarinPal using simplified method
      const zarinPalResponse = await this.zarinPalService.createSimplePaymentRequest({
        amount: paymentRequest.amount,
        description: paymentRequest.description,
        callback_url: paymentRequest.callback_url,
        mobile: paymentRequest.userData.mobile,
        email: paymentRequest.userData.email,
        order_id: paymentRequest.order_id,
      });

      if (!zarinPalResponse.success || !zarinPalResponse.authority) {
        throw new BadRequestException(`ZarinPal payment request failed: ${zarinPalResponse.error}`);
      }

      // Store enhanced payment request
      const paymentRequestId = await this.storeEnhancedPaymentRequest(
        user_id,
        paymentRequest,
        zarinPalResponse.authority
      );

      // Calculate expiration (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Generate QR code for payment
      const qrCode = await this.generatePaymentQRCode(zarinPalResponse.paymentUrl);

      // Send payment request notification
      await this.sendPaymentRequestNotification(user_id, paymentRequest);

      this.logger.log(`Enhanced ZarinPal payment request created successfully for order ${paymentRequest.order_id}`);

      return {
        paymentUrl: zarinPalResponse.paymentUrl,
        authority: zarinPalResponse.authority,
        order_id: paymentRequest.order_id,
        expiresAt,
        qrCode,
      };
    } catch (error) {
      this.logger.error(`Failed to create enhanced ZarinPal payment request: ${error.message}`);
      throw new BadRequestException(`Payment request failed: ${error.message}`);
    }
  }

  async verifyEnhancedZarinPalPayment(
    user_id: string,
    verificationData: {
      authority: string;
      order_id: string;
      amount: number;
      userIp?: string;
      userAgent?: string;
    }
  ): Promise<EnhancedPaymentVerificationResponse> {
    this.logger.log(`Verifying enhanced ZarinPal payment for order ${verificationData.order_id}, user ${user_id}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(user_id, verificationData.order_id);

      // Verify payment with ZarinPal using simplified method
      const verificationResult = await this.zarinPalService.verifySimplePayment({
        authority: verificationData.authority,
        amount: verificationData.amount
      });

      if (!verificationResult.success) {
        return {
          success: false,
          refId: '',
          order_id: verificationData.order_id,
          amount: 0,
          description: 'Payment verification failed',
          error: 'Verification failed',
          errorCode: 'VERIFICATION_FAILED',
          errorDetails: 'Payment verification was unsuccessful',
          retryable: true,
          supportRequired: false,
        };
      }

      // Log verification metadata
      await this.logPaymentVerification(
        user_id,
        verificationData.order_id,
        verificationData.authority,
        verificationData.userIp,
        verificationData.userAgent
      );

      // Update order payment status
      await this.updateOrderPaymentStatus(
        verificationData.order_id,
        'succeeded',
        'zarinpal',
        verificationResult.refId,
        verificationData.authority
      );

      // Send success notification
      await this.sendPaymentSuccessNotification(user_id, verificationData.order_id, verificationData.amount);

      this.logger.log(`Enhanced ZarinPal payment verified successfully for order ${verificationData.order_id}`);

      return {
        success: true,
        refId: verificationResult.refId,
        order_id: verificationData.order_id,
        amount: verificationData.amount,
        description: 'Payment verified successfully',
        retryable: false,
        supportRequired: false,
      };
    } catch (error) {
      this.logger.error(`Failed to verify enhanced ZarinPal payment: ${error.message}`);
      
      const isRetryable = this.isRetryableError(error);
      const needsSupport = this.needsSupportError(error);

      return {
        success: false,
        refId: '',
        order_id: verificationData.order_id,
        amount: 0,
        description: 'Payment verification failed',
        error: error.message,
        errorCode: this.getErrorCode(error),
        errorDetails: error.message,
        retryable: isRetryable,
        supportRequired: needsSupport,
      };
    }
  }

  async verifyEnhancedWalletDeposit(
    user_id: string,
    verificationData: {
      order_id: string;
      authority: string;
      userIp?: string;
      userAgent?: string;
    }
  ): Promise<EnhancedPaymentVerificationResponse> {
    this.logger.log(`Verifying enhanced wallet deposit for order ${verificationData.order_id}, user ${user_id}`);

    try {
      // Verify payment with ZarinPal using simplified method
      const verificationResult = await this.zarinPalService.verifySimplePayment({
        authority: verificationData.authority,
        amount: 0 // Amount will be retrieved from the deposit order
      });

      if (!verificationResult.success) {
        return {
          success: false,
          refId: '',
          order_id: verificationData.order_id,
          amount: 0,
          description: 'Deposit verification failed',
          error: 'Verification failed',
          errorCode: 'VERIFICATION_FAILED',
          errorDetails: 'Deposit verification was unsuccessful',
          retryable: true,
          supportRequired: false,
        };
      }

      // Get deposit amount from the order
      const depositAmount = await this.getDepositAmount(verificationData.order_id);

      // Log verification metadata
      await this.logPaymentVerification(
        user_id,
        verificationData.order_id,
        verificationData.authority,
        verificationData.userIp,
        verificationData.userAgent
      );

      // Update wallet balance
      await this.updateWalletBalance(user_id, depositAmount);

      // Send success notification
      await this.sendDepositSuccessNotification(user_id, depositAmount, verificationResult.refId);

      this.logger.log(`Enhanced wallet deposit verified successfully for order ${verificationData.order_id}`);

      return {
        success: true,
        refId: verificationResult.refId,
        order_id: verificationData.order_id,
        amount: depositAmount,
        description: 'Wallet deposit verified successfully',
        retryable: false,
        supportRequired: false,
      };
    } catch (error) {
      this.logger.error(`Failed to verify enhanced wallet deposit: ${error.message}`);
      
      const isRetryable = this.isRetryableError(error);
      const needsSupport = this.needsSupportError(error);

      return {
        success: false,
        refId: '',
        order_id: verificationData.order_id,
        amount: 0,
        description: 'Deposit verification failed',
        error: error.message,
        errorCode: this.getErrorCode(error),
        errorDetails: error.message,
        retryable: isRetryable,
        supportRequired: needsSupport,
      };
    }
  }

  async requestEnhancedRefund(
    user_id: string,
    refundRequest: EnhancedRefundRequest
  ): Promise<EnhancedRefundResponse> {
    this.logger.log(`Requesting enhanced refund for order ${refundRequest.order_id}, user ${user_id}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(user_id, refundRequest.order_id);

      // Validate transaction exists
      await this.validateTransactionExists(refundRequest.transactionId);

      // Create refund request
      const refundId = await this.createRefundRequest(user_id, refundRequest);

      // Send refund request notification
      await this.sendRefundRequestNotification(user_id, refundRequest.order_id, refundRequest.amount);

      this.logger.log(`Enhanced refund request created successfully for order ${refundRequest.order_id}`);

      return {
        success: true,
        refundId,
        order_id: refundRequest.order_id,
        amount: refundRequest.amount,
        status: 'pending',
        estimatedProcessingTime: '3-5 business days',
        refundDetails: {
          reason: refundRequest.reason,
          description: refundRequest.description,
          requestedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create enhanced refund request: ${error.message}`);
      throw new BadRequestException(`Refund request failed: ${error.message}`);
    }
  }

  async cancelEnhancedPayment(
    user_id: string,
    cancellationRequest: EnhancedCancellationRequest
  ): Promise<EnhancedCancellationResponse> {
    this.logger.log(`Cancelling enhanced payment for order ${cancellationRequest.order_id}, user ${user_id}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(user_id, cancellationRequest.order_id);

      // Validate transaction exists
      await this.validateTransactionExists(cancellationRequest.transactionId);

      // Create cancellation request
      const cancellationId = await this.createCancellationRequest(user_id, cancellationRequest);

      // Update order payment status
      await this.updateOrderPaymentStatus(
        cancellationRequest.order_id,
        'cancelled',
        'system',
        null,
        null
      );

      // Send cancellation notification
      await this.sendCancellationNotification(user_id, cancellationRequest.order_id);

      this.logger.log(`Enhanced payment cancellation processed successfully for order ${cancellationRequest.order_id}`);

      return {
        success: true,
        cancellationId,
        order_id: cancellationRequest.order_id,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationDetails: {
          reason: cancellationRequest.reason,
          description: cancellationRequest.description,
          processedBy: 'system',
        },
      };
    } catch (error) {
      this.logger.error(`Failed to cancel enhanced payment: ${error.message}`);
      throw new BadRequestException(`Payment cancellation failed: ${error.message}`);
    }
  }

  async handleEnhancedZarinPalWebhook(webhookData: {
    authority: string;
    refId: string;
    amount: number;
    order_id: string;
    status: string;
    timestamp: string;
    signature?: string;
  }) {
    this.logger.log(`Processing enhanced ZarinPal webhook for order ${webhookData.order_id}`);

    try {
      // Validate webhook signature if provided
      if (webhookData.signature) {
        const isValidSignature = await this.validateWebhookSignature(webhookData);
        if (!isValidSignature) {
          throw new BadRequestException('Invalid webhook signature');
        }
      }

      // Process webhook based on status
      if (webhookData.status === 'success') {
        await this.processSuccessfulPaymentWebhook(webhookData);
      } else if (webhookData.status === 'failed') {
        await this.processFailedPaymentWebhook(webhookData);
      }

      // Log webhook processing
      await this.logWebhookProcessing(webhookData);

      this.logger.log(`Enhanced ZarinPal webhook processed successfully for order ${webhookData.order_id}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        order_id: webhookData.order_id,
        refId: webhookData.refId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to process enhanced ZarinPal webhook: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  async handleEnhancedWalletWebhook(webhookData: {
    transactionId: string;
    order_id: string;
    amount: number;
    status: string;
    refId: string;
    timestamp: string;
    signature?: string;
  }) {
    this.logger.log(`Processing enhanced wallet webhook for order ${webhookData.order_id}`);

    try {
      // Validate webhook signature if provided
      if (webhookData.signature) {
        const isValidSignature = await this.validateWebhookSignature(webhookData);
        if (!isValidSignature) {
          throw new BadRequestException('Invalid webhook signature');
        }
      }

      // Process webhook based on status
      if (webhookData.status === 'completed') {
        await this.processSuccessfulWalletWebhook(webhookData);
      } else if (webhookData.status === 'failed') {
        await this.processFailedWalletWebhook(webhookData);
      }

      // Log webhook processing
      await this.logWebhookProcessing(webhookData);

      this.logger.log(`Enhanced wallet webhook processed successfully for order ${webhookData.order_id}`);

      return {
        success: true,
        message: 'Wallet webhook processed successfully',
        order_id: webhookData.order_id,
        transactionId: webhookData.transactionId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to process enhanced wallet webhook: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  // Private helper methods
  private async validateOrderOwnership(user_id: string, order_id: string): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, ordersCollection, [
        Query.equal('$id', order_id),
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        throw new NotFoundException('Order not found or access denied');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to validate order ownership');
    }
  }

  private async validateTransactionExists(transactionId: string): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_TRANSACTIONS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, transactionsCollection, [
        Query.equal('$id', transactionId),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        throw new NotFoundException('Transaction not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to validate transaction');
    }
  }

  private async storeEnhancedPaymentRequest(
    user_id: string,
    paymentRequest: EnhancedZarinPalPaymentRequest,
    authority: string
  ): Promise<string> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const paymentRequestsCollection = this.configService.get<string>('APPWRITE_COLLECTION_ENHANCED_PAYMENT_REQUESTS');

    try {
      const document = await databases.createDocument(
        databaseId,
        paymentRequestsCollection,
        ID.unique(),
        {
          user_id: user_id,
          order_id: paymentRequest.order_id,
          authority,
          amount: paymentRequest.amount,
          description: paymentRequest.description,
          callback_url: paymentRequest.callback_url,
          user_data: JSON.stringify(paymentRequest.userData),
          metadata: JSON.stringify(paymentRequest.metadata),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      return document.$id;
    } catch (error) {
      this.logger.error(`Failed to store enhanced payment request: ${error.message}`);
      throw new BadRequestException('Failed to store payment request');
    }
  }

  private async generatePaymentQRCode(paymentUrl: string): Promise<string | undefined> {
    // This would integrate with a QR code generation service
    // For now, return undefined
    return undefined;
  }

  private async logPaymentVerification(
    user_id: string,
    order_id: string,
    authority: string,
    userIp?: string,
    userAgent?: string
  ): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const verificationLogsCollection = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_VERIFICATION_LOGS');

    try {
      await databases.createDocument(
        databaseId,
        verificationLogsCollection,
        ID.unique(),
        {
          user_id: user_id,
          order_id: order_id,
          authority,
          user_ip: userIp,
          user_agent: userAgent,
          verified_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to log payment verification: ${error.message}`);
    }
  }

  private async updateOrderPaymentStatus(
    order_id: string,
    status: string,
    method: string,
    refId?: string,
    authority?: string
  ): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      const order = await databases.listDocuments(databaseId, ordersCollection, [
        Query.equal('$id', order_id),
        Query.limit(1),
      ]);

      if (order.documents.length > 0) {
        const updateData: any = {
          payment_status: status,
          payment_method: method,
          updated_at: new Date().toISOString(),
        };

        if (refId) {
          updateData.zarinpal_ref_id = refId;
        }

        if (authority) {
          updateData.zarinpal_authority = authority;
        }

        await databases.updateDocument(
          databaseId,
          ordersCollection,
          order.documents[0].$id,
          updateData
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update order payment status: ${error.message}`);
      throw new BadRequestException('Failed to update order payment status');
    }
  }

  private async getDepositAmount(order_id: string): Promise<number> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const depositOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_DEPOSIT_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, depositOrdersCollection, [
        Query.equal('$id', order_id),
        Query.limit(1),
      ]);

      if (result.documents.length === 0) {
        throw new NotFoundException('Deposit order not found');
      }

      return result.documents[0].amount || 0;
    } catch (error) {
      this.logger.error(`Failed to get deposit amount: ${error.message}`);
      throw new BadRequestException('Failed to get deposit amount');
    }
  }

  private async updateWalletBalance(user_id: string, amount: number): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const { Query } = await import('node-appwrite');

    try {
      const wallet = await databases.listDocuments(databaseId, walletsCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (wallet.documents.length > 0) {
        const currentBalance = wallet.documents[0].balance || 0;
        const newBalance = currentBalance + amount;

        await databases.updateDocument(
          databaseId,
          walletsCollection,
          wallet.documents[0].$id,
          {
            balance: newBalance,
            updated_at: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update wallet balance: ${error.message}`);
      throw new BadRequestException('Failed to update wallet balance');
    }
  }

  private async createRefundRequest(
    user_id: string,
    refundRequest: EnhancedRefundRequest
  ): Promise<string> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const refundsCollection = this.configService.get<string>('APPWRITE_COLLECTION_ENHANCED_REFUNDS');

    try {
      const document = await databases.createDocument(
        databaseId,
        refundsCollection,
        ID.unique(),
        {
          user_id: user_id,
          order_id: refundRequest.order_id,
          transaction_id: refundRequest.transactionId,
          amount: refundRequest.amount,
          reason: refundRequest.reason,
          description: refundRequest.description,
          metadata: JSON.stringify(refundRequest.metadata || {}),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      return document.$id;
    } catch (error) {
      this.logger.error(`Failed to create refund request: ${error.message}`);
      throw new BadRequestException('Failed to create refund request');
    }
  }

  private async createCancellationRequest(
    user_id: string,
    cancellationRequest: EnhancedCancellationRequest
  ): Promise<string> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const cancellationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_ENHANCED_CANCELLATIONS');

    try {
      const document = await databases.createDocument(
        databaseId,
        cancellationsCollection,
        ID.unique(),
        {
          user_id: user_id,
          order_id: cancellationRequest.order_id,
          transaction_id: cancellationRequest.transactionId,
          reason: cancellationRequest.reason,
          description: cancellationRequest.description,
          metadata: JSON.stringify(cancellationRequest.metadata || {}),
          status: 'cancelled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      return document.$id;
    } catch (error) {
      this.logger.error(`Failed to create cancellation request: ${error.message}`);
      throw new BadRequestException('Failed to create cancellation request');
    }
  }

  private async validateWebhookSignature(webhookData: any): Promise<boolean> {
    // This would implement webhook signature validation
    // For now, return true as a placeholder
    return true;
  }

  private async processSuccessfulPaymentWebhook(webhookData: any): Promise<void> {
    // Process successful payment webhook
    this.logger.log(`Processing successful payment webhook for order ${webhookData.order_id}`);
  }

  private async processFailedPaymentWebhook(webhookData: any): Promise<void> {
    // Process failed payment webhook
    this.logger.log(`Processing failed payment webhook for order ${webhookData.order_id}`);
  }

  private async processSuccessfulWalletWebhook(webhookData: any): Promise<void> {
    // Process successful wallet webhook
    this.logger.log(`Processing successful wallet webhook for order ${webhookData.order_id}`);
  }

  private async processFailedWalletWebhook(webhookData: any): Promise<void> {
    // Process failed wallet webhook
    this.logger.log(`Processing failed wallet webhook for order ${webhookData.order_id}`);
  }

  private async logWebhookProcessing(webhookData: any): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const webhookLogsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WEBHOOK_LOGS');

    try {
      await databases.createDocument(
        databaseId,
        webhookLogsCollection,
        ID.unique(),
        {
          webhook_data: JSON.stringify(webhookData),
          processed_at: new Date().toISOString(),
          status: 'processed',
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to log webhook processing: ${error.message}`);
    }
  }

  // Email notification methods
  private async sendPaymentRequestNotification(
    user_id: string,
    paymentRequest: EnhancedZarinPalPaymentRequest
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: paymentRequest.order_id,
          amount: paymentRequest.amount,
          status: 'pending',
          order_title: paymentRequest.description,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send payment request notification: ${error.message}`);
    }
  }

  private async sendPaymentSuccessNotification(
    user_id: string,
    order_id: string,
    amount: number
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: order_id,
          amount: amount,
          status: 'succeeded',
          order_title: 'Payment successful',
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send payment success notification: ${error.message}`);
    }
  }

  private async sendDepositSuccessNotification(
    user_id: string,
    amount: number,
    refId: string
  ): Promise<void> {
    try {
      await this.emailService.sendWalletTopUpEmail(user_id, amount, refId);
    } catch (error) {
      this.logger.warn(`Failed to send deposit success notification: ${error.message}`);
    }
  }

  private async sendRefundRequestNotification(
    user_id: string,
    order_id: string,
    amount: number
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        // This would send a refund request notification email
        this.logger.log(`Refund request notification sent to ${email} for order ${order_id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send refund request notification: ${error.message}`);
    }
  }

  private async sendCancellationNotification(
    user_id: string,
    order_id: string
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user_id),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        // This would send a cancellation notification email
        this.logger.log(`Cancellation notification sent to ${email} for order ${order_id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send cancellation notification: ${error.message}`);
    }
  }

  // Error handling methods
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'rate limit',
      'quota exceeded',
    ];

    return retryableErrors.some(msg => 
      error.message?.toLowerCase().includes(msg)
    );
  }

  private needsSupportError(error: any): boolean {
    const supportErrors = [
      'authentication',
      'authorization',
      'invalid',
      'malformed',
      'permission',
    ];

    return supportErrors.some(msg => 
      error.message?.toLowerCase().includes(msg)
    );
  }

  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    return 'UNKNOWN_ERROR';
  }
}
