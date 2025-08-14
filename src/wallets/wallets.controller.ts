import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateTransactionDto, RefundOrderDto, TransactionType } from './dto/wallet.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { PaymentsService } from '../payments/payments.service';

@Controller('wallets')
@UseGuards(JwtGuard)
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('me')
  async getMyWallet(@User() user: UserPayload) {
    return this.walletsService.getWallet(user.id);
  }

  @Get('me/balance')
  async getMyBalance(@User() user: UserPayload) {
    return this.walletsService.getBalance(user.id);
  }

  @Get('me/transactions')
  async getMyTransactions(
    @User() user: UserPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.walletsService.getTransactions(user.id, limitNum, offsetNum);
  }

  @Post('me/transactions')
  async createTransaction(
    @User() user: UserPayload,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.walletsService.createTransaction(user.id, createTransactionDto);
  }

  @Post('me/deposit')
  async depositToWallet(
    @User() user: UserPayload,
    @Body() body: { amount: number; description?: string },
  ) {
    // Validate minimum amount
    if (body.amount < 1000000) {
      throw new Error('Minimum deposit amount is 1,000,000 Rials (10,000 Tomans)');
    }

    // Create a temporary order for the deposit (include amount for verification)
    const orderId = `deposit_${user.id}_${Date.now()}_${body.amount}`;
    
    // Request payment from Zarinpal
    const paymentResult = await this.paymentsService.requestPayment(user.id, {
      orderId,
      amount: body.amount,
      description: body.description || `Wallet deposit - ${body.amount.toLocaleString()} Rials`,
      email: user.email,
    });

    return {
      success: true,
      paymentUrl: paymentResult.paymentUrl,
      authority: paymentResult.authority,
      orderId,
      message: 'Payment request created successfully. Redirect to payment gateway.',
    };
  }

  @Post('me/deposit/verify')
  async verifyWalletDeposit(
    @User() user: UserPayload,
    @Body() body: { orderId: string; authority: string },
  ) {
    // Verify the payment
    const verificationResult = await this.paymentsService.verifyPayment(user.id, {
      orderId: body.orderId,
      authority: body.authority,
    });

    if (verificationResult.success) {
      // Extract amount from orderId
      const parts = body.orderId.split('_');
      const amount = parseInt(parts[3]);

      // Credit the wallet
      await this.walletsService.createTransaction(user.id, {
        type: TransactionType.CREDIT,
        amount: amount,
        description: `Wallet deposit via Zarinpal - Ref ID: ${verificationResult.refId}`,
        referenceId: verificationResult.refId,
        referenceType: 'zarinpal_payment',
        metadata: {
          zarinpal_authority: body.authority,
          zarinpal_ref_id: verificationResult.refId,
          payment_gateway: 'zarinpal',
        },
      });

      return {
        success: true,
        message: 'Wallet deposit successful!',
        amount: amount,
        refId: verificationResult.refId,
        newBalance: (await this.walletsService.getBalance(user.id)).balance,
      };
    }

    return {
      success: false,
      message: 'Payment verification failed',
      error: 'Payment verification failed',
    };
  }

  @Post('refund-order')
  async refundOrder(@Body() refundOrderDto: RefundOrderDto) {
    return this.walletsService.refundOrder(refundOrderDto);
  }

  // Admin endpoints
  @Post(':userId/credit')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async creditWallet(
    @Param('userId') userId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.walletsService.creditWallet(userId, body.amount, body.description);
  }

  @Post(':userId/debit')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async debitWallet(
    @Param('userId') userId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.walletsService.debitWallet(userId, body.amount, body.description);
  }

  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getWallet(@Param('userId') userId: string) {
    return this.walletsService.getWallet(userId);
  }

  @Get(':userId/transactions')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getTransactions(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.walletsService.getTransactions(userId, limitNum, offsetNum);
  }
}
