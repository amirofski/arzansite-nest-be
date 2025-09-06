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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';

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
  @ApiBody({ type: PaymentRequestDto })
  @ApiResponse({ status: 201, description: 'Payment request created' })
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
  @ApiBody({ type: PaymentVerifyDto })
  @ApiResponse({ status: 200, description: 'Payment verified' })
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
  @ApiBody({ type: PaymentRefundDto })
  @ApiResponse({ status: 200, description: 'Refund logged' })
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
  @ApiBody({ type: PaymentCancelDto })
  @ApiResponse({ status: 200, description: 'Cancellation logged' })
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
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async getOrderPayments(
    @User() user: UserPayload,
    @Param('order_id') order_id: string,
  ) {
    this.logger.log(`Getting payments for order ${order_id} by user ${user.id}`);
    return this.paymentsService.getOrderPayments(order_id, user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Payment gateway status' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
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
