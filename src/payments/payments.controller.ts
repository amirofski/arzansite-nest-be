import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ZarinPalService } from './zarinpal.service';
import {
  PaymentRequestDto,
  PaymentVerifyDto,
  PaymentRefundDto,
  PaymentCancelDto,
} from './dto/payment.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Query, Param as RouteParam } from '@nestjs/common';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly zarinPalService: ZarinPalService,
  ) {}

  @Get('test-connection')
  @ApiOperation({ summary: 'Test ZarinPal connection' })
  @ApiResponse({ status: 200, description: 'Connection tested' })
  async testZarinPalConnection() {
    this.logger.log('Testing ZarinPal connection...');
    return this.zarinPalService.testConnection();
  }

  @Post('request')
  @ApiOperation({ summary: 'Create payment request' })
  @ApiBody({
    description: 'Create a payment request',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 250000 },
        description: { type: 'string', example: 'Order payment for #123' },
        callback_url: { type: 'string', example: 'https://example.com/callback?order_id=123' },
        order_id: { type: 'string', example: 'ord_123' },
        mobile: { type: 'string', example: '09120000000' },
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['amount', 'description']
    }
  })
  @ApiResponse({ status: 201, description: 'Payment request created', schema: { example: { success: true, authority: 'A00000000000000000000000000123456789', paymentUrl: 'https://sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789', amount: 250000, description: 'Order payment for #123', order_id: 'ord_123', details: { gateway: 'ZarinPal', sandbox: true } } } })
  async requestPayment(
    @User() user: UserPayload,
    @Body() paymentRequestDto: PaymentRequestDto,
  ) {
    this.logger.log(`Payment request from user ${user.id}: ${JSON.stringify({
      amount: paymentRequestDto.amount,
      order_id: paymentRequestDto.order_id || 'N/A'
    })}`);

    // Validate ZarinPal configuration
    if (!this.zarinPalService.isConfigured()) {
      this.logger.error('ZarinPal payment gateway not configured');
      throw new BadRequestException('Payment gateway not configured');
    }

    // Validate amount (minimum 1000 Rials = 100 Tomans)
    if (!Number.isFinite(paymentRequestDto.amount) || paymentRequestDto.amount < 1000) {
      this.logger.error(`Invalid amount: ${paymentRequestDto.amount} Rials`);
      throw new BadRequestException('Minimum payment amount is 1,000 Rials');
    }

    // Validate maximum amount (1 billion Rials)
    if (paymentRequestDto.amount > 1000000000) {
      this.logger.error(`Amount too high: ${paymentRequestDto.amount} Rials`);
      throw new BadRequestException('Maximum payment amount is 1,000,000,000 Rials');
    }

    // Validate description
    if (!paymentRequestDto.description || paymentRequestDto.description.trim().length < 3) {
      throw new BadRequestException('Description must be at least 3 characters long');
    }

    if (paymentRequestDto.description.length > 255) {
      throw new BadRequestException('Description is too long (maximum 255 characters)');
    }

    try {
          // Use the simplified payment request method
    const result = await this.zarinPalService.createSimplePaymentRequest({
      amount: paymentRequestDto.amount,
      description: paymentRequestDto.description,
      callback_url: paymentRequestDto.callback_url || `${process.env.ZARINPAL_CALLBACK_URL || 'https://example.com/callback'}?order_id=${encodeURIComponent(paymentRequestDto.order_id || '')}`,
      order_id: paymentRequestDto.order_id,
      mobile: paymentRequestDto.mobile,
      email: paymentRequestDto.email,
    });

      if (!result.success) {
        this.logger.error(`Payment request failed: ${result.error}`);
        throw new BadRequestException(result.error || 'Payment request failed');
      }

      this.logger.log(`Payment request created successfully for user ${user.id}. Authority: ${result.authority}`);

      // Return the payment information
      return {
        success: true,
        authority: result.authority,
        paymentUrl: result.paymentUrl,
        amount: paymentRequestDto.amount,
        description: paymentRequestDto.description,
        order_id: paymentRequestDto.order_id,
        details: result.details,
      };

    } catch (error) {
      this.logger.error(`Payment request failed for user ${user.id}:`, error.message);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Payment request failed. Please try again.');
    }
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify payment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        authority: { type: 'string', example: 'A00000000000000000000000000123456789' },
        amount: { type: 'number', example: 250000 },
      },
      required: ['authority', 'amount']
    }
  })
  @ApiResponse({ status: 200, description: 'Payment verified', schema: { example: { success: true, refId: 123456789, authority: 'A00000000000000000000000000123456789', amount: 250000, details: { cardHash: 'XXXX-XXXX-XXXX-1234' } } } })
  async verifyPayment(
    @User() user: UserPayload,
    @Body() paymentVerifyDto: PaymentVerifyDto,
  ) {
    this.logger.log(`Payment verification from user ${user.id}: ${JSON.stringify({
      authority: paymentVerifyDto.authority,
      amount: paymentVerifyDto.amount
    })}`);

    // Validate ZarinPal configuration
    if (!this.zarinPalService.isConfigured()) {
      this.logger.error('ZarinPal payment gateway not configured');
      throw new BadRequestException('Payment gateway not configured');
    }

    // Validate authority
    if (!paymentVerifyDto.authority || paymentVerifyDto.authority.trim().length === 0) {
      throw new BadRequestException('Invalid payment authority');
    }

    // Validate amount
    if (!Number.isFinite(paymentVerifyDto.amount) || paymentVerifyDto.amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    try {
      // Use the simplified verification method
      const result = await this.zarinPalService.verifySimplePayment({
        authority: paymentVerifyDto.authority,
        amount: paymentVerifyDto.amount,
      });

      if (!result.success) {
        this.logger.error(`Payment verification failed: ${result.error}`);
        throw new BadRequestException(result.error || 'Payment verification failed');
      }

      this.logger.log(`Payment verified successfully for user ${user.id}. Ref ID: ${result.refId}`);

      // Return the verification result
      return {
        success: true,
        refId: result.refId,
        authority: paymentVerifyDto.authority,
        amount: paymentVerifyDto.amount,
        details: result.details,
      };

    } catch (error) {
      this.logger.error(`Payment verification failed for user ${user.id}:`, error.message);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Payment verification failed. Please try again.');
    }
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund order payment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', example: 'ord_123' },
        amount: { type: 'number', example: 250000 },
      },
      required: ['order_id', 'amount']
    }
  })
  @ApiResponse({ status: 200, description: 'Refund logged', schema: { example: { success: true, message: 'Refund requested', order_id: 'ord_123', amount: 250000 } } })
  async refundPayment(
    @User() user: UserPayload,
    @Body() paymentRefundDto: PaymentRefundDto,
  ) {
    this.logger.log(`Payment refund request from user ${user.id}: ${JSON.stringify({
      order_id: paymentRefundDto.order_id,
      amount: paymentRefundDto.amount
    })}`);

    // For now, delegate to the existing payments service
    // You can enhance this later with ZarinPal refund functionality if needed
    return this.paymentsService.refundPayment(user.id, paymentRefundDto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', example: 'ord_123' },
      },
      required: ['order_id']
    }
  })
  @ApiResponse({ status: 200, description: 'Cancellation logged', schema: { example: { success: true, message: 'Cancellation requested', order_id: 'ord_123' } } })
  async cancelPayment(
    @User() user: UserPayload,
    @Body() paymentCancelDto: PaymentCancelDto,
  ) {
    this.logger.log(`Payment cancellation request from user ${user.id}: ${JSON.stringify({
      order_id: paymentCancelDto.order_id
    })}`);

    // For now, delegate to the existing payments service
    // You can enhance this later with ZarinPal cancellation functionality if needed
    return this.paymentsService.cancelPayment(user.id, paymentCancelDto);
  }

  @Get('orders/:order_id')
  @ApiOperation({ summary: 'Get payments for an order' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 20)' })
  @ApiQuery({ name: 'from', required: false, description: 'Created-at from (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Created-at to (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Payments retrieved', schema: { example: { total: 1, page: 1, items: [{ id: 'pay_1', order_id: 'ord_123', amount: 250000, status: 'verified', created_at: '2024-01-01T00:00:00.000Z' }] } } })
  async getOrderPayments(
    @User() user: UserPayload,
    @RouteParam('order_id') order_id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.logger.log(`Getting payments for order ${order_id} by user ${user.id}`);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.paymentsService.getOrderPayments(order_id, user.id, pageNum, limitNum, from, to);
  }

  @Get('status')
  @ApiOperation({ summary: 'Payment gateway status' })
  @ApiResponse({ status: 200, description: 'Status retrieved', schema: { example: { configured: true, merchantId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', gateway: 'ZarinPal', mode: 'sandbox' } } })
  async getPaymentGatewayStatus() {
    this.logger.log('Getting payment gateway status');
    
    const isConfigured = this.zarinPalService.isConfigured();
    const merchantId = this.zarinPalService.getMerchantId();
    
    return {
      configured: isConfigured,
      merchantId: isConfigured ? merchantId : null,
      gateway: 'ZarinPal',
      mode: process.env.NODE_ENV === 'development' ? 'sandbox' : 'production',
    };
  }
}
