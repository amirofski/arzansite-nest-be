import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  PaymentRequestDto,
  PaymentVerifyDto,
  PaymentRefundDto,
  PaymentCancelDto,
} from './dto/payment.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('payments')
@UseGuards(JwtGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('request')
  async requestPayment(
    @User() user: UserPayload,
    @Body() paymentRequestDto: PaymentRequestDto,
  ) {
    return this.paymentsService.requestPayment(user.id, paymentRequestDto);
  }

  @Post('verify')
  async verifyPayment(
    @User() user: UserPayload,
    @Body() paymentVerifyDto: PaymentVerifyDto,
  ) {
    return this.paymentsService.verifyPayment(user.id, paymentVerifyDto);
  }

  @Post('refund')
  async refundPayment(
    @User() user: UserPayload,
    @Body() paymentRefundDto: PaymentRefundDto,
  ) {
    return this.paymentsService.refundPayment(user.id, paymentRefundDto);
  }

  @Post('cancel')
  async cancelPayment(
    @User() user: UserPayload,
    @Body() paymentCancelDto: PaymentCancelDto,
  ) {
    return this.paymentsService.cancelPayment(user.id, paymentCancelDto);
  }

  @Get('orders/:orderId')
  async getOrderPayments(
    @User() user: UserPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getOrderPayments(orderId, user.id);
  }
}
