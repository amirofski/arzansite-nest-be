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
import { ZarinPalService } from '../payments/zarinpal.service';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('wallets')
@UseGuards(JwtGuard)
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly paymentsService: PaymentsService,
    private readonly zarinPalService: ZarinPalService,
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
    description: 'Initiates a deposit request to the wallet through ZarinPal payment gateway. Minimum amount is 1,000,000 Rials.'
  })
  @ApiBody({
    description: 'Deposit request data',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount to deposit (minimum 1,000,000 Rials)',
          example: 3000000
        },
        description: {
          type: 'string',
          description: 'Optional description for the deposit',
          example: 'شارژ کیف پول - ۳۰٬۰۰۰٬۰۰۰ تومان'
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
        paymentUrl: 'https://zarinp.al/invoice/123456789',
        authority: '123456789',
        invoiceId: '123456789',
        orderId: 'deposit_user123_1701436800000_3000000',
        message: 'Payment request created successfully. Redirect to payment gateway.'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Amount below minimum requirement or payment gateway error'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async depositToWallet(
    @User() user: UserPayload,
    @Body() body: { amount: number; description?: string; callbackUrl?: string },
  ) {
    try {
      // Create wallet deposit using the new payment service
      const depositResult = await this.paymentsService.createWalletDeposit(
        user.id,
        body.amount,
        body.description || `شارژ کیف پول - ${body.amount.toLocaleString()} ریال`,
        body.callbackUrl
      );

      return {
        success: true,
        paymentUrl: depositResult.paymentUrl,
        authority: depositResult.authority,
        invoiceId: depositResult.invoiceId,
        orderId: `deposit_${user.id}_${Date.now()}_${body.amount}`,
        message: 'Payment request created successfully. Redirect to payment gateway.',
      };
    } catch (error) {
      throw new Error(`Deposit request failed: ${error.message}`);
    }
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
        authority: {
          type: 'string',
          description: 'Payment authority from ZarinPal',
          example: '123456789'
        }
      },
      required: ['authority']
    }
  })
  @ApiOkResponse({
    description: 'Deposit verified and wallet credited successfully',
    schema: {
      example: {
        success: true,
        message: 'Wallet deposit successful!',
        amount: 3000000,
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
    @Body() body: { authority: string },
  ) {
    try {
      // Verify the wallet deposit payment
      const verificationResult = await this.paymentsService.verifyWalletDeposit(
        user.id,
        body.authority
      );

      // Get updated wallet balance
      const wallet = await this.walletsService.getWallet(user.id);

      return {
        success: true,
        message: 'Wallet deposit successful!',
        amount: verificationResult.amount,
        refId: verificationResult.refId,
        newBalance: wallet.balance,
      };
    } catch (error) {
      throw new Error(`Deposit verification failed: ${error.message}`);
    }
  }

  @Post('deposit/callback')
  @ApiOperation({
    summary: 'Wallet deposit callback (Payment Gateway)',
    description: 'Handles payment gateway callback for wallet deposits with idempotency checks to prevent duplicate credits.'
  })
  @ApiBody({
    description: 'Payment callback data',
    schema: {
      type: 'object',
      properties: {
        authority: {
          type: 'string',
          description: 'Payment authority from ZarinPal',
          example: '123456789'
        },
        refId: {
          type: 'string',
          description: 'Payment reference ID from ZarinPal',
          example: '987654321'
        },
        amount: {
          type: 'number',
          description: 'Payment amount in Rials',
          example: 3000000
        },
        userId: {
          type: 'string',
          description: 'User ID for the deposit',
          example: 'user_123'
        },
        orderId: {
          type: 'string',
          description: 'Optional order ID',
          example: 'deposit_user123_1701436800000_3000000'
        }
      },
      required: ['authority', 'refId', 'amount', 'userId']
    }
  })
  @ApiOkResponse({
    description: 'Deposit processed successfully (with idempotency)',
    schema: {
      example: {
        success: true,
        message: 'Payment verified and wallet credited successfully',
        refId: '987654321',
        transactionId: 'transaction_789',
        balanceAfter: 3500000
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Payment verification failed or invalid data'
  })
  async handleWalletDepositCallback(
    @Body() body: { 
      authority: string; 
      refId: string; 
      amount: number; 
      userId: string; 
      orderId?: string; 
    },
  ) {
    try {
      // Use the new idempotent verification method
      const result = await this.walletsService.handleWalletDepositVerification({
        authority: body.authority,
        refId: body.refId,
        amount: body.amount,
        userId: body.userId,
        orderId: body.orderId,
      });

      return result;

    } catch (error) {
      return {
        success: false,
        message: 'Callback processing failed',
        error: error.message || 'Unknown error'
      };
    }
  }

  @Post('deposit/verify-with-gateway')
  @ApiOperation({
    summary: 'Verify wallet deposit with payment gateway',
    description: 'Verifies a payment with ZarinPal and credits the wallet with idempotency checks.'
  })
  @ApiBody({
    description: 'Payment verification data',
    schema: {
      type: 'object',
      properties: {
        authority: {
          type: 'string',
          description: 'Payment authority from ZarinPal',
          example: '123456789'
        },
        amount: {
          type: 'number',
          description: 'Expected payment amount in Rials',
          example: 3000000
        },
        userId: {
          type: 'string',
          description: 'User ID for the deposit',
          example: 'user_123'
        },
        orderId: {
          type: 'string',
          description: 'Optional order ID',
          example: 'deposit_user123_1701436800000_3000000'
        }
      },
      required: ['authority', 'amount', 'userId']
    }
  })
  @ApiOkResponse({
    description: 'Payment verified and wallet credited successfully',
    schema: {
      example: {
        success: true,
        message: 'Payment verified and wallet credited successfully',
        refId: '987654321',
        transactionId: 'transaction_789',
        balanceAfter: 3500000
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Payment verification failed or invalid data'
  })
  async verifyWalletDepositWithGateway(
    @Body() body: { 
      authority: string; 
      amount: number; 
      userId: string; 
      orderId?: string; 
    },
  ) {
    try {
      // First verify the payment with ZarinPal
      const verificationResult = await this.zarinPalService.verifySimplePayment({
        authority: body.authority,
        amount: body.amount,
      });

      if (!verificationResult.success) {
        return {
          success: false,
          message: 'Payment verification failed',
          error: verificationResult.error
        };
      }

      // Then handle the wallet deposit with idempotency checks
      const result = await this.walletsService.handleWalletDepositVerification({
        authority: body.authority,
        refId: verificationResult.refId!,
        amount: body.amount,
        userId: body.userId,
        orderId: body.orderId,
      });

      return result;

    } catch (error) {
      return {
        success: false,
        message: 'Verification process failed',
        error: error.message || 'Unknown error'
      };
    }
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
