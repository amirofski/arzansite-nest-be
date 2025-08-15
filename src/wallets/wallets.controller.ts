import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBody, 
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateTransactionDto, RefundOrderDto, TransactionType } from './dto/wallet.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { PaymentsService } from '../payments/payments.service';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('wallets')
@UseGuards(JwtGuard)
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get user wallet',
    description: 'Retrieves the authenticated user\'s wallet information including balance and details.'
  })
  @ApiOkResponse({
    description: 'Wallet information retrieved successfully',
    schema: {
      example: {
        $id: 'wallet_123',
        user_id: 'user_456',
        balance: 2500000,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-12-01T10:00:00.000Z'
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getMyWallet(@User() user: UserPayload) {
    return this.walletsService.getWallet(user.id);
  }

  @Get('me/balance')
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieves the current balance of the authenticated user\'s wallet.'
  })
  @ApiOkResponse({
    description: 'Wallet balance retrieved successfully',
    schema: {
      example: {
        balance: 2500000
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getMyBalance(@User() user: UserPayload) {
    return this.walletsService.getBalance(user.id);
  }

  @Get('balance')
  @ApiOperation({
    summary: 'Get wallet balance (alternative endpoint)',
    description: 'Alternative endpoint to retrieve the current balance of the authenticated user\'s wallet.'
  })
  @ApiOkResponse({
    description: 'Wallet balance retrieved successfully',
    schema: {
      example: {
        balance: 2500000
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getWalletBalance(@User() user: UserPayload) {
    return this.walletsService.getBalance(user.id);
  }

  @Get('me/transactions')
  @ApiOperation({
    summary: 'Get wallet transactions',
    description: 'Retrieves a paginated list of transactions for the authenticated user\'s wallet.'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: 'Maximum number of transactions to return (default: 50)',
    example: '50'
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: String,
    description: 'Number of transactions to skip (default: 0)',
    example: '0'
  })
  @ApiOkResponse({
    description: 'Transactions retrieved successfully',
    schema: {
      example: [
        {
          $id: 'transaction_123',
          type: 'credit',
          amount: 1000000,
          balance_before: 1500000,
          balance_after: 2500000,
          description: 'Wallet top-up',
          created_at: '2024-12-01T10:00:00.000Z'
        }
      ]
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
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
  @ApiOperation({
    summary: 'Create wallet transaction',
    description: 'Creates a new transaction in the authenticated user\'s wallet.'
  })
  @ApiBody({
    type: CreateTransactionDto,
    description: 'Transaction creation data'
  })
  @ApiCreatedResponse({
    description: 'Transaction created successfully'
  })
  @ApiBadRequestResponse({
    description: 'Invalid transaction data'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async createTransaction(
    @User() user: UserPayload,
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.walletsService.createTransaction(user.id, createTransactionDto);
  }

  @Post('me/deposit')
  @ApiOperation({
    summary: 'Request wallet deposit',
    description: 'Initiates a deposit request to the wallet through the payment gateway. Minimum amount is 1,000,000 Rials.'
  })
  @ApiBody({
    description: 'Deposit request data',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount to deposit (minimum 1,000,000 Rials)',
          example: 1000000
        },
        description: {
          type: 'string',
          description: 'Optional description for the deposit',
          example: 'Wallet top-up'
        }
      },
      required: ['amount']
    }
  })
  @ApiCreatedResponse({
    description: 'Deposit request created successfully',
    schema: {
      example: {
        success: true,
        paymentUrl: 'https://www.zarinpal.com/pg/StartPay/123456789',
        authority: '123456789',
        orderId: 'deposit_user123_1701436800000_1000000',
        message: 'Payment request created successfully. Redirect to payment gateway.'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Amount below minimum requirement'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
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
  @ApiOperation({
    summary: 'Verify wallet deposit',
    description: 'Verifies a completed payment and credits the wallet with the deposited amount.'
  })
  @ApiBody({
    description: 'Payment verification data',
    schema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'Order ID from the deposit request',
          example: 'deposit_user123_1701436800000_1000000'
        },
        authority: {
          type: 'string',
          description: 'Payment authority from Zarinpal',
          example: '123456789'
        }
      },
      required: ['orderId', 'authority']
    }
  })
  @ApiOkResponse({
    description: 'Deposit verified and wallet credited successfully',
    schema: {
      example: {
        success: true,
        message: 'Wallet deposit successful!',
        amount: 1000000,
        refId: '987654321',
        newBalance: 3500000
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Payment verification failed'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
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

  @Post('me/topup')
  @ApiOperation({
    summary: 'Top up wallet with RefId',
    description: 'Credits the wallet using a verified payment reference ID. This endpoint is used after payment gateway verification.'
  })
  @ApiBody({
    description: 'Wallet top-up data',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount to credit (minimum 1,000,000 Rials)',
          example: 1000000
        },
        refId: {
          type: 'string',
          description: 'Payment reference ID from payment gateway',
          example: 'PAY_REF_123456'
        }
      },
      required: ['amount', 'refId']
    }
  })
  @ApiCreatedResponse({
    description: 'Wallet top-up successful',
    schema: {
      example: {
        success: true,
        message: 'Wallet top-up successful!',
        transactionId: 'transaction_789',
        newBalance: 3500000
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid amount or RefId already used'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async topUpWallet(
    @User() user: UserPayload,
    @Body() body: { amount: number; refId: string },
  ) {
    try {
      const result = await this.walletsService.topUpWallet(user.id, body.amount, body.refId);
      return {
        success: true,
        message: 'Wallet top-up successful!',
        transactionId: result.transactionId,
        newBalance: (await this.walletsService.getBalance(user.id)).balance,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'Top-up failed',
      };
    }
  }

  @Post('refund-order')
  @ApiOperation({
    summary: 'Refund order',
    description: 'Processes a refund for an order and credits the user\'s wallet.'
  })
  @ApiBody({
    type: RefundOrderDto,
    description: 'Refund request data'
  })
  @ApiCreatedResponse({
    description: 'Refund processed successfully'
  })
  @ApiBadRequestResponse({
    description: 'Invalid refund request'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async refundOrder(@Body() refundOrderDto: RefundOrderDto) {
    return this.walletsService.refundOrder(refundOrderDto);
  }

  // Admin endpoints
  @Post(':userId/credit')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Credit user wallet (Admin only)',
    description: 'Allows administrators to credit a user\'s wallet. Requires admin role.'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to credit',
    example: 'user_123'
  })
  @ApiBody({
    description: 'Credit data',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount to credit',
          example: 1000000
        },
        description: {
          type: 'string',
          description: 'Optional description for the credit',
          example: 'Customer service compensation'
        }
      },
      required: ['amount']
    }
  })
  @ApiCreatedResponse({
    description: 'Wallet credited successfully'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async creditWallet(
    @Param('userId') userId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.walletsService.creditWallet(userId, body.amount, body.description);
  }

  @Post(':userId/debit')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Debit user wallet (Admin only)',
    description: 'Allows administrators to debit a user\'s wallet. Requires admin role.'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to debit',
    example: 'user_123'
  })
  @ApiBody({
    description: 'Debit data',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount to debit',
          example: 500000
        },
        description: {
          type: 'string',
          description: 'Optional description for the debit',
          example: 'Service charge'
        }
      },
      required: ['amount']
    }
  })
  @ApiCreatedResponse({
    description: 'Wallet debited successfully'
  })
  @ApiBadRequestResponse({
    description: 'Insufficient balance for debit'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async debitWallet(
    @Param('userId') userId: string,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.walletsService.debitWallet(userId, body.amount, body.description);
  }

  @Get(':userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Get user wallet (Admin only)',
    description: 'Allows administrators to view any user\'s wallet. Requires admin role.'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to view wallet',
    example: 'user_123'
  })
  @ApiOkResponse({
    description: 'User wallet retrieved successfully'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getWallet(@Param('userId') userId: string) {
    return this.walletsService.getWallet(userId);
  }

  @Get(':userId/transactions')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Get user transactions (Admin only)',
    description: 'Allows administrators to view any user\'s wallet transactions. Requires admin role.'
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to view transactions',
    example: 'user_123'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: 'Maximum number of transactions to return (default: 50)',
    example: '50'
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: String,
    description: 'Number of transactions to skip (default: 0)',
    example: '0'
  })
  @ApiOkResponse({
    description: 'User transactions retrieved successfully'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
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
