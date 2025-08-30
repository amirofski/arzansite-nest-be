import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ZarinPalService } from './zarinpal.service';
import { EmailService } from '../email/email.service';
import { ID } from 'node-appwrite';

export interface EnhancedZarinPalPaymentRequest {
  orderId: string;
  amount: number;
  description: string;
  callbackUrl: string;
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
  orderId: string;
  expiresAt: string;
  qrCode?: string;
}

export interface EnhancedPaymentVerificationResponse {
  success: boolean;
  refId: string;
  orderId: string;
  amount: number;
  description: string;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  retryable: boolean;
  supportRequired: boolean;
}

export interface EnhancedRefundRequest {
  orderId: string;
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
  orderId: string;
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
  orderId: string;
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
  orderId: string;
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
    userId: string,
    paymentRequest: EnhancedZarinPalPaymentRequest
  ): Promise<EnhancedZarinPalPaymentResponse> {
    this.logger.log(`Requesting enhanced ZarinPal payment for order ${paymentRequest.orderId}, user ${userId}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(userId, paymentRequest.orderId);

      // Create payment request with ZarinPal using simplified method
      const zarinPalResponse = await this.zarinPalService.createSimplePaymentRequest({
        amount: paymentRequest.amount,
        description: paymentRequest.description,
        callbackUrl: paymentRequest.callbackUrl,
        mobile: paymentRequest.userData.mobile,
        email: paymentRequest.userData.email,
        orderId: paymentRequest.orderId,
      });

      if (!zarinPalResponse.success || !zarinPalResponse.authority) {
        throw new BadRequestException(`ZarinPal payment request failed: ${zarinPalResponse.error}`);
      }

      // Store enhanced payment request
      const paymentRequestId = await this.storeEnhancedPaymentRequest(
        userId,
        paymentRequest,
        zarinPalResponse.authority
      );

      // Calculate expiration (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Generate QR code for payment
      const qrCode = await this.generatePaymentQRCode(zarinPalResponse.paymentUrl);

      // Send payment request notification
      await this.sendPaymentRequestNotification(userId, paymentRequest);

      this.logger.log(`Enhanced ZarinPal payment request created successfully for order ${paymentRequest.orderId}`);

      return {
        paymentUrl: zarinPalResponse.paymentUrl,
        authority: zarinPalResponse.authority,
        orderId: paymentRequest.orderId,
        expiresAt,
        qrCode,
      };
    } catch (error) {
      this.logger.error(`Failed to create enhanced ZarinPal payment request: ${error.message}`);
      throw new BadRequestException(`Payment request failed: ${error.message}`);
    }
  }

  async verifyEnhancedZarinPalPayment(
    userId: string,
    verificationData: {
      authority: string;
      orderId: string;
      amount: number;
      userIp?: string;
      userAgent?: string;
    }
  ): Promise<EnhancedPaymentVerificationResponse> {
    this.logger.log(`Verifying enhanced ZarinPal payment for order ${verificationData.orderId}, user ${userId}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(userId, verificationData.orderId);

      // Verify payment with ZarinPal using simplified method
      const verificationResult = await this.zarinPalService.verifySimplePayment({
        authority: verificationData.authority,
        amount: verificationData.amount
      });

      if (!verificationResult.success) {
        return {
          success: false,
          refId: '',
          orderId: verificationData.orderId,
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
        userId,
        verificationData.orderId,
        verificationData.authority,
        verificationData.userIp,
        verificationData.userAgent
      );

      // Update order payment status
      await this.updateOrderPaymentStatus(
        verificationData.orderId,
        'succeeded',
        'zarinpal',
        verificationResult.refId,
        verificationData.authority
      );

      // Send success notification
      await this.sendPaymentSuccessNotification(userId, verificationData.orderId, verificationData.amount);

      this.logger.log(`Enhanced ZarinPal payment verified successfully for order ${verificationData.orderId}`);

      return {
        success: true,
        refId: verificationResult.refId,
        orderId: verificationData.orderId,
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
        orderId: verificationData.orderId,
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
    userId: string,
    verificationData: {
      orderId: string;
      authority: string;
      userIp?: string;
      userAgent?: string;
    }
  ): Promise<EnhancedPaymentVerificationResponse> {
    this.logger.log(`Verifying enhanced wallet deposit for order ${verificationData.orderId}, user ${userId}`);

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
          orderId: verificationData.orderId,
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
      const depositAmount = await this.getDepositAmount(verificationData.orderId);

      // Log verification metadata
      await this.logPaymentVerification(
        userId,
        verificationData.orderId,
        verificationData.authority,
        verificationData.userIp,
        verificationData.userAgent
      );

      // Update wallet balance
      await this.updateWalletBalance(userId, depositAmount);

      // Send success notification
      await this.sendDepositSuccessNotification(userId, depositAmount, verificationResult.refId);

      this.logger.log(`Enhanced wallet deposit verified successfully for order ${verificationData.orderId}`);

      return {
        success: true,
        refId: verificationResult.refId,
        orderId: verificationData.orderId,
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
        orderId: verificationData.orderId,
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
    userId: string,
    refundRequest: EnhancedRefundRequest
  ): Promise<EnhancedRefundResponse> {
    this.logger.log(`Requesting enhanced refund for order ${refundRequest.orderId}, user ${userId}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(userId, refundRequest.orderId);

      // Validate transaction exists
      await this.validateTransactionExists(refundRequest.transactionId);

      // Create refund request
      const refundId = await this.createRefundRequest(userId, refundRequest);

      // Send refund request notification
      await this.sendRefundRequestNotification(userId, refundRequest.orderId, refundRequest.amount);

      this.logger.log(`Enhanced refund request created successfully for order ${refundRequest.orderId}`);

      return {
        success: true,
        refundId,
        orderId: refundRequest.orderId,
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
    userId: string,
    cancellationRequest: EnhancedCancellationRequest
  ): Promise<EnhancedCancellationResponse> {
    this.logger.log(`Cancelling enhanced payment for order ${cancellationRequest.orderId}, user ${userId}`);

    try {
      // Validate order exists and belongs to user
      await this.validateOrderOwnership(userId, cancellationRequest.orderId);

      // Validate transaction exists
      await this.validateTransactionExists(cancellationRequest.transactionId);

      // Create cancellation request
      const cancellationId = await this.createCancellationRequest(userId, cancellationRequest);

      // Update order payment status
      await this.updateOrderPaymentStatus(
        cancellationRequest.orderId,
        'cancelled',
        'system',
        null,
        null
      );

      // Send cancellation notification
      await this.sendCancellationNotification(userId, cancellationRequest.orderId);

      this.logger.log(`Enhanced payment cancellation processed successfully for order ${cancellationRequest.orderId}`);

      return {
        success: true,
        cancellationId,
        orderId: cancellationRequest.orderId,
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
    orderId: string;
    status: string;
    timestamp: string;
    signature?: string;
  }) {
    this.logger.log(`Processing enhanced ZarinPal webhook for order ${webhookData.orderId}`);

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

      this.logger.log(`Enhanced ZarinPal webhook processed successfully for order ${webhookData.orderId}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        orderId: webhookData.orderId,
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
    orderId: string;
    amount: number;
    status: string;
    refId: string;
    timestamp: string;
    signature?: string;
  }) {
    this.logger.log(`Processing enhanced wallet webhook for order ${webhookData.orderId}`);

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

      this.logger.log(`Enhanced wallet webhook processed successfully for order ${webhookData.orderId}`);

      return {
        success: true,
        message: 'Wallet webhook processed successfully',
        orderId: webhookData.orderId,
        transactionId: webhookData.transactionId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to process enhanced wallet webhook: ${error.message}`);
      throw new BadRequestException(`Webhook processing failed: ${error.message}`);
    }
  }

  // Private helper methods
  private async validateOrderOwnership(userId: string, orderId: string): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, ordersCollection, [
        Query.equal('$id', orderId),
        Query.equal('user_id', userId),
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
    userId: string,
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
          user_id: userId,
          order_id: paymentRequest.orderId,
          authority,
          amount: paymentRequest.amount,
          description: paymentRequest.description,
          callback_url: paymentRequest.callbackUrl,
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
    userId: string,
    orderId: string,
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
          user_id: userId,
          order_id: orderId,
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
    orderId: string,
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
        Query.equal('$id', orderId),
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

  private async getDepositAmount(orderId: string): Promise<number> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const depositOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_DEPOSIT_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      const result = await databases.listDocuments(databaseId, depositOrdersCollection, [
        Query.equal('$id', orderId),
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

  private async updateWalletBalance(userId: string, amount: number): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const walletsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLETS');
    const { Query } = await import('node-appwrite');

    try {
      const wallet = await databases.listDocuments(databaseId, walletsCollection, [
        Query.equal('user_id', userId),
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
    userId: string,
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
          user_id: userId,
          order_id: refundRequest.orderId,
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
    userId: string,
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
          user_id: userId,
          order_id: cancellationRequest.orderId,
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
    this.logger.log(`Processing successful payment webhook for order ${webhookData.orderId}`);
  }

  private async processFailedPaymentWebhook(webhookData: any): Promise<void> {
    // Process failed payment webhook
    this.logger.log(`Processing failed payment webhook for order ${webhookData.orderId}`);
  }

  private async processSuccessfulWalletWebhook(webhookData: any): Promise<void> {
    // Process successful wallet webhook
    this.logger.log(`Processing successful wallet webhook for order ${webhookData.orderId}`);
  }

  private async processFailedWalletWebhook(webhookData: any): Promise<void> {
    // Process failed wallet webhook
    this.logger.log(`Processing failed wallet webhook for order ${webhookData.orderId}`);
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
    userId: string,
    paymentRequest: EnhancedZarinPalPaymentRequest
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: paymentRequest.orderId,
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
    userId: string,
    orderId: string,
    amount: number
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: orderId,
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
    userId: string,
    amount: number,
    refId: string
  ): Promise<void> {
    try {
      await this.emailService.sendWalletTopUpEmail(userId, amount, refId);
    } catch (error) {
      this.logger.warn(`Failed to send deposit success notification: ${error.message}`);
    }
  }

  private async sendRefundRequestNotification(
    userId: string,
    orderId: string,
    amount: number
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        // This would send a refund request notification email
        this.logger.log(`Refund request notification sent to ${email} for order ${orderId}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send refund request notification: ${error.message}`);
    }
  }

  private async sendCancellationNotification(
    userId: string,
    orderId: string
  ): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        // This would send a cancellation notification email
        this.logger.log(`Cancellation notification sent to ${email} for order ${orderId}`);
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
