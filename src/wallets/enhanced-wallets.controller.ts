import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    BadRequestException,
    Param,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiBearerAuth,
    ApiBody,
    ApiParam,
  } from '@nestjs/swagger';
  import { EnhancedWalletsService } from './enhanced-wallets.service';
  import { JwtGuard } from '../common/guards/jwt.guard';
  import { User, UserPayload } from '../common/decorators/user.decorator';
  
  @ApiTags('Enhanced Wallets')
  @ApiBearerAuth()
  @Controller('wallets')
  @UseGuards(JwtGuard)
  export class EnhancedWalletsController {
    constructor(private readonly enhancedWalletsService: EnhancedWalletsService) {}
  
    @Get('me/enhanced-balance')
    @ApiOperation({
      summary: 'Get Enhanced Wallet Balance',
      description: 'Retrieves comprehensive wallet information including balance, transactions, and statistics',
    })
    @ApiResponse({
      status: 200,
      description: 'Enhanced wallet balance retrieved successfully',
      schema: {
        example: {
          balance: 5000000,
          currency: 'IRR',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          recentTransactions: [
            {
              id: 'txn_123',
              type: 'deposit',
              amount: 10000000,
              description: 'Wallet top-up',
              status: 'completed',
              balance_before: 0,
              balance_after: 10000000,
              created_at: '2024-01-01T00:00:00.000Z',
            },
          ],
          statistics: {
            totalDeposits: 10000000,
            totalWithdrawals: 0,
            totalPayments: 0,
            totalRefunds: 0,
          },
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getEnhancedWalletBalance(@User() user: UserPayload) {
      return this.enhancedWalletsService.getEnhancedWalletBalance(user.id);
    }
  
    @Get('me/transactions/enhanced')
    @ApiOperation({
      summary: 'Get Enhanced Wallet Transactions',
      description: 'Retrieves detailed wallet transactions with filtering and analytics',
    })
    @ApiQuery({ name: 'type', required: false, description: 'Transaction type filter' })
    @ApiQuery({ name: 'status', required: false, description: 'Transaction status filter' })
    @ApiQuery({ name: 'from_date', required: false, description: 'Start date filter' })
    @ApiQuery({ name: 'to_date', required: false, description: 'End date filter' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
    @ApiQuery({ name: 'reference_type', required: false, description: 'Reference type filter' })
    @ApiQuery({ name: 'reference_id', required: false, description: 'Reference ID filter' })
    @ApiResponse({
      status: 200,
      description: 'Enhanced wallet transactions retrieved successfully',
      schema: {
        example: {
          transactions: [
            {
              id: 'txn_123',
              type: 'deposit',
              amount: 10000000,
              description: 'Wallet top-up',
              status: 'completed',
              balance_before: 0,
              balance_after: 10000000,
              created_at: '2024-01-01T00:00:00.000Z',
              reference_id: 'deposit_123',
              reference_type: 'wallet_topup',
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
          summary: {
            total_amount: 10000000,
            transactionCount: 1,
            averageAmount: 10000000,
          },
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getEnhancedWalletTransactions(
      @User() user: UserPayload,
      @Query('type') type?: string,
      @Query('status') status?: string,
      @Query('from_date') from_date?: string,
      @Query('to_date') to_date?: string,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
      @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
      @Query('reference_type') reference_type?: string,
      @Query('reference_id') reference_id?: string,
    ) {
      return this.enhancedWalletsService.getEnhancedWalletTransactions(user.id, {
        type,
        status,
        from_date,
        to_date,
        page,
        limit,
        reference_type,
        reference_id,
      });
    }
  
    @Post('me/pay-order')
    @ApiOperation({
      summary: 'Process Wallet Payment for Order',
      description: 'Processes payment for an order using wallet balance',
    })
    @ApiBody({
      schema: {
        example: {
          order_id: 'order_123',
          amount: 5000000,
          description: 'Payment for website design order',
          referenceData: {
            order_title: 'Website Design - Business',
            site_type: 'business',
            domain: 'example.com',
          },
        },
      },
    })
    @ApiResponse({
      status: 200,
      description: 'Wallet payment processed successfully',
      schema: {
        example: {
          success: true,
          transactionId: 'txn_123',
          newBalance: 1000000,
          paymentDetails: {
            amount: 5000000,
            description: 'Payment for order order_123',
            timestamp: '2024-01-01T00:00:00.000Z',
            referenceId: 'order_123',
          },
        },
      },
    })
    @ApiResponse({ status: 400, description: 'Insufficient wallet balance or invalid order' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async processWalletPaymentForOrder(
      @User() user: UserPayload,
      @Body() body: {
        order_id: string;
        amount: number;
        description: string;
        referenceData?: {
          order_title: string;
          site_type: string;
          domain: string;
        };
      },
    ) {
      if (!body.order_id || !body.amount || !body.description) {
        throw new BadRequestException('order_id, amount, and description are required');
      }
  
      if (body.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }
  
      return this.enhancedWalletsService.processWalletPaymentForOrder(
        user.id,
        body.order_id,
        body.amount,
        body.description,
        body.referenceData,
      );
    }
  
    @Post('me/deposit/enhanced')
    @ApiOperation({
      summary: 'Request Enhanced Wallet Deposit',
      description: 'Creates an enhanced wallet deposit request with additional metadata',
    })
    @ApiBody({
      schema: {
        example: {
          amount: 10000000,
          description: 'Wallet top-up for future orders',
          callback_url: 'https://example.com/callback',
          metadata: {
            source: 'dashboard',
            user_agent: 'Mozilla/5.0...',
            ip_address: '192.168.1.1',
            referrer: 'https://example.com/wallet',
          },
          preferredPaymentMethod: 'zarinpal',
        },
      },
    })
    @ApiResponse({
      status: 201,
      description: 'Enhanced wallet deposit request created successfully',
      schema: {
        example: {
          paymentUrl: 'https://payment.zarinpal.com/pg/StartPay/authority_123',
          order_id: 'deposit_user_123_1704067200000_10000000',
          depositId: 'authority_123',
          expiresAt: '2024-01-02T00:00:00.000Z',
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        },
      },
    })
    @ApiResponse({ status: 400, description: 'Invalid deposit request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async requestEnhancedWalletDeposit(
      @User() user: UserPayload,
      @Body() depositRequest: {
        amount: number;
        description: string;
        callback_url?: string;
        metadata?: {
          source?: 'dashboard' | 'order_flow' | 'wallet_page';
          user_agent?: string;
          ip_address?: string;
          referrer?: string;
        };
        preferredPaymentMethod?: 'zarinpal' | 'other';
      },
    ) {
      if (!depositRequest.amount || !depositRequest.description) {
        throw new BadRequestException('Amount and description are required');
      }
  
      if (depositRequest.amount < 1000000) {
        throw new BadRequestException('Minimum deposit amount is 1,000,000 Rials');
      }
  
      return this.enhancedWalletsService.requestEnhancedWalletDeposit(
        user.id,
        depositRequest,
      );
    }
  
    @Post('me/deposit/verify')
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
  
      return this.enhancedWalletsService.verifyEnhancedWalletDeposit(
        user.id,
        body.order_id,
        body.authority,
        body.userIp,
        body.userAgent,
      );
    }
  
    @Get('me/analytics/transactions')
    @ApiOperation({
      summary: 'Get Wallet Transaction Analytics',
      description: 'Retrieves comprehensive wallet transaction analytics and trends',
    })
    @ApiQuery({ name: 'period', required: false, description: 'Time period (7d, 30d, 90d, 1y, all)' })
    @ApiQuery({ name: 'type', required: false, description: 'Transaction type filter' })
    @ApiResponse({
      status: 200,
      description: 'Wallet transaction analytics retrieved successfully',
      schema: {
        example: {
          totalTransactions: 10,
          totalVolume: 50000000,
          averageTransactionValue: 5000000,
          transactionTypeDistribution: {
            deposit: 5,
            payment: 3,
            refund: 2,
          },
          monthlyTrends: [
            {
              month: '2024-01',
              transactions: 10,
              volume: 50000000,
            },
          ],
          topTransactionSources: [
            {
              source: 'dashboard',
              count: 5,
              volume: 25000000,
            },
          ],
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getWalletTransactionAnalytics(
      @User() user: UserPayload,
      @Query('period') period?: string,
      @Query('type') type?: string,
    ) {
      // This would be implemented to provide comprehensive analytics
      // For now, return a placeholder response
      return {
        totalTransactions: 0,
        totalVolume: 0,
        averageTransactionValue: 0,
        transactionTypeDistribution: {},
        monthlyTrends: [],
        topTransactionSources: [],
      };
    }
  
    @Get('me/statistics')
    @ApiOperation({
      summary: 'Get Wallet Statistics',
      description: 'Retrieves comprehensive wallet statistics and summary information',
    })
    @ApiResponse({
      status: 200,
      description: 'Wallet statistics retrieved successfully',
      schema: {
        example: {
          totalDeposits: 10000000,
          totalWithdrawals: 0,
          totalPayments: 5000000,
          totalRefunds: 0,
          averageTransactionValue: 7500000,
          mostActiveMonth: '2024-01',
          transactionCount: 2,
          lastTransactionDate: '2024-01-01T00:00:00.000Z',
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getWalletStatistics(@User() user: UserPayload) {
      // This would be implemented to provide comprehensive statistics
      // For now, return a placeholder response
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalPayments: 0,
        totalRefunds: 0,
        averageTransactionValue: 0,
        mostActiveMonth: null,
        transactionCount: 0,
        lastTransactionDate: null,
      };
    }
  
    @Get('me/quick-actions')
    @ApiOperation({
      summary: 'Get Quick Actions',
      description: 'Retrieves available quick actions for the wallet',
    })
    @ApiResponse({
      status: 200,
      description: 'Quick actions retrieved successfully',
      schema: {
        example: {
          canDeposit: true,
          canWithdraw: false,
          canPayOrder: true,
          canRequestRefund: false,
          suggestedActions: [
            {
              action: 'deposit',
              description: 'Top up your wallet',
              amount: 10000000,
              icon: 'wallet-plus',
            },
          ],
        },
      },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getQuickActions(@User() user: UserPayload) {
      // This would be implemented to provide quick action suggestions
      // For now, return a placeholder response
      return {
        canDeposit: true,
        canWithdraw: false,
        canPayOrder: true,
        canRequestRefund: false,
        suggestedActions: [
          {
            action: 'deposit',
            description: 'Top up your wallet',
            amount: 10000000,
            icon: 'wallet-plus',
          },
        ],
      };
    }
  }