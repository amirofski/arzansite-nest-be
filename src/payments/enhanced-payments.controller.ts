import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { EnhancedPaymentsService } from './enhanced-payments.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@ApiTags('Enhanced Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtGuard)
export class EnhancedPaymentsController {
  private readonly logger = new Logger(EnhancedPaymentsController.name);

  constructor(private readonly enhancedPaymentsService: EnhancedPaymentsService) {}

  @Post('zarinpal/request/enhanced')
  @ApiOperation({
    summary: 'Request Enhanced ZarinPal Payment',
    description: 'Creates an enhanced ZarinPal payment request with comprehensive data',
  })
  @ApiBody({
    schema: {
      example: {
        order_id: 'order_123',
        amount: 5000000,
        description: 'Payment for website design order',
        callback_url: 'https://example.com/callback',
        userData: {
          email: 'user@example.com',
          mobile: '09123456789',
          name: 'John Doe',
        },
        metadata: {
          source: 'wizard',
          order_type: 'website_design',
          site_type: 'business',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Enhanced ZarinPal payment request created successfully',
    schema: {
      example: {
        paymentUrl: 'https://payment.zarinpal.com/pg/StartPay/authority_123',
        authority: 'authority_123',
        order_id: 'order_123',
        expiresAt: '2024-01-02T00:00:00.000Z',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestEnhancedZarinPalPayment(
    @User() user: UserPayload,
    @Body() body: {
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
    },
  ) {
    if (!body.order_id || !body.amount || !body.description || !body.callback_url) {
      throw new BadRequestException('order_id, amount, description, and callback_url are required');
    }

    if (body.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (!body.userData?.email || !body.userData?.mobile || !body.userData?.name) {
      throw new BadRequestException('User data (email, mobile, name) is required');
    }

    return this.enhancedPaymentsService.requestEnhancedZarinPalPayment(
      user.id,
      body,
    );
  }

  @Post('zarinpal/verify/enhanced')
  @ApiOperation({
    summary: 'Verify Enhanced ZarinPal Payment',
    description: 'Verifies ZarinPal payment with comprehensive validation',
  })
  @ApiBody({
    schema: {
      example: {
        authority: 'authority_123',
        order_id: 'order_123',
        amount: 5000000,
        userIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced ZarinPal payment verified successfully',
    schema: {
      example: {
        success: true,
        refId: 'ref_123',
        order_id: 'order_123',
        amount: 5000000,
        description: 'Payment verified successfully',
        error: null,
        errorCode: null,
        errorDetails: null,
        retryable: false,
        supportRequired: false,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyEnhancedZarinPalPayment(
    @User() user: UserPayload,
    @Body() body: {
      authority: string;
      order_id: string;
      amount: number;
      userIp?: string;
      userAgent?: string;
    },
  ) {
    if (!body.authority || !body.order_id || !body.amount) {
      throw new BadRequestException('authority, order_id, and amount are required');
    }

    if (body.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.enhancedPaymentsService.verifyEnhancedZarinPalPayment(
      user.id,
      body,
    );
  }

  @Post('wallet/deposit/verify/enhanced')
  @ApiOperation({
    summary: 'Verify Enhanced Wallet Deposit',
    description: 'Verifies wallet deposit payment with enhanced validation',
  })
  @ApiBody({
    schema: {
      example: {
        order_id: 'deposit_user_123_1704067200000_10000000',
        authority: 'authority_123',
        userIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced wallet deposit verified successfully',
    schema: {
      example: {
        success: true,
        refId: 'ref_123',
        order_id: 'deposit_user_123_1704067200000_10000000',
        amount: 10000000,
        description: 'Wallet deposit verified successfully',
        error: null,
        errorCode: null,
        errorDetails: null,
        retryable: false,
        supportRequired: false,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Deposit verification failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyEnhancedWalletDeposit(
    @User() user: UserPayload,
    @Body() body: {
      order_id: string;
      authority: string;
      userIp?: string;
      userAgent?: string;
    },
  ) {
    if (!body.order_id || !body.authority) {
      throw new BadRequestException('order_id and authority are required');
    }

    return this.enhancedPaymentsService.verifyEnhancedWalletDeposit(
      user.id,
      body,
    );
  }

  @Post('refund/enhanced')
  @ApiOperation({
    summary: 'Request Enhanced Payment Refund',
    description: 'Requests a refund for a payment with enhanced validation and tracking',
  })
  @ApiBody({
    schema: {
      example: {
        order_id: 'order_123',
        transactionId: 'txn_123',
        amount: 5000000,
        reason: 'Customer requested cancellation',
        description: 'Refund for cancelled website design order',
        metadata: {
          refund_source: 'customer_request',
          admin_notes: 'Order cancelled by customer',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced refund request processed successfully',
    schema: {
      example: {
        success: true,
        refundId: 'refund_123',
        order_id: 'order_123',
        amount: 5000000,
        status: 'pending',
        estimatedProcessingTime: '3-5 business days',
        refundDetails: {
          reason: 'Customer requested cancellation',
          description: 'Refund for cancelled website design order',
          requestedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestEnhancedRefund(
    @User() user: UserPayload,
    @Body() body: {
      order_id: string;
      transactionId: string;
      amount: number;
      reason: string;
      description: string;
      metadata?: {
        refund_source: string;
        admin_notes?: string;
      };
    },
  ) {
    if (!body.order_id || !body.transactionId || !body.amount || !body.reason || !body.description) {
      throw new BadRequestException('order_id, transactionId, amount, reason, and description are required');
    }

    if (body.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return this.enhancedPaymentsService.requestEnhancedRefund(
      user.id,
      body,
    );
  }

  @Post('cancel/enhanced')
  @ApiOperation({
    summary: 'Cancel Enhanced Payment',
    description: 'Cancels a payment with enhanced validation and tracking',
  })
  @ApiBody({
    schema: {
      example: {
        order_id: 'order_123',
        transactionId: 'txn_123',
        reason: 'Order cancelled by customer',
        description: 'Payment cancelled for cancelled order',
        metadata: {
          cancellation_source: 'customer_request',
          admin_notes: 'Order cancelled by customer before processing',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced payment cancellation processed successfully',
    schema: {
      example: {
        success: true,
        cancellationId: 'cancel_123',
        order_id: 'order_123',
        status: 'cancelled',
        cancelledAt: '2024-01-01T00:00:00.000Z',
        cancellationDetails: {
          reason: 'Order cancelled by customer',
          description: 'Payment cancelled for cancelled order',
          processedBy: 'system',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid cancellation request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelEnhancedPayment(
    @User() user: UserPayload,
    @Body() body: {
      order_id: string;
      transactionId: string;
      reason: string;
      description: string;
      metadata?: {
        cancellation_source: string;
        admin_notes?: string;
      };
    },
  ) {
    if (!body.order_id || !body.transactionId || !body.reason || !body.description) {
      throw new BadRequestException('order_id, transactionId, reason, and description are required');
    }

    return this.enhancedPaymentsService.cancelEnhancedPayment(
      user.id,
      body,
    );
  }

  @Post('webhook/zarinpal/enhanced')
  @ApiOperation({
    summary: 'Enhanced ZarinPal Webhook Handler',
    description: 'Handles enhanced ZarinPal webhook notifications with comprehensive validation',
  })
  @ApiBody({
    schema: {
      example: {
        authority: 'authority_123',
        refId: 'ref_123',
        amount: 5000000,
        order_id: 'order_123',
        status: 'success',
        timestamp: '2024-01-01T00:00:00.000Z',
        signature: 'webhook_signature_hash',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced webhook processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Webhook processed successfully',
        order_id: 'order_123',
        refId: 'ref_123',
        processedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleEnhancedZarinPalWebhook(
    @Body() body: {
      authority: string;
      refId: string;
      amount: number;
      order_id: string;
      status: string;
      timestamp: string;
      signature?: string;
    },
  ) {
    if (!body.authority || !body.refId || !body.amount || !body.order_id || !body.status) {
      throw new BadRequestException('Missing required webhook fields');
    }

    return this.enhancedPaymentsService.handleEnhancedZarinPalWebhook(body);
  }

  @Post('webhook/wallet/enhanced')
  @ApiOperation({
    summary: 'Enhanced Wallet Webhook Handler',
    description: 'Handles enhanced wallet webhook notifications with comprehensive validation',
  })
  @ApiBody({
    schema: {
      example: {
        transactionId: 'txn_123',
        order_id: 'deposit_user_123_1704067200000_10000000',
        amount: 10000000,
        status: 'completed',
        refId: 'ref_123',
        timestamp: '2024-01-01T00:00:00.000Z',
        signature: 'webhook_signature_hash',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced wallet webhook processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Wallet webhook processed successfully',
        order_id: 'deposit_user_123_1704067200000_10000000',
        transactionId: 'txn_123',
        processedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handleEnhancedWalletWebhook(
    @Body() body: {
      transactionId: string;
      order_id: string;
      amount: number;
      status: string;
      refId: string;
      timestamp: string;
      signature?: string;
    },
  ) {
    if (!body.transactionId || !body.order_id || !body.amount || !body.status || !body.refId) {
      throw new BadRequestException('Missing required webhook fields');
    }

    return this.enhancedPaymentsService.handleEnhancedWalletWebhook(body);
  }
}
