import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Delete,
  Param, 
  Body, 
  Query, 
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe
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
  ApiForbiddenResponse,
  ApiNotFoundResponse
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { 
  WalletAdjustmentDto, 
  WalletAdjustmentResponseDto,
  AdminDashboardStatsDto,
  DeleteUserResponseDto,
  DomainExtensionDto,
  CreateDomainExtensionDto,
  UpdateDomainExtensionDto,
  CheckDomainAvailabilityDto,
  DomainAvailabilityResponseDto,
  SystemMetricsDto,
  WalletAdjustmentHistoryResponseDto,
  EmailServiceTestDto,
  EmailServiceTestResponseDto
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('wallets')
  @ApiOperation({
    summary: 'Get all user wallets',
    description: 'Retrieves all user wallets in the system with pagination and search functionality. Requires admin role.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 50)',
    example: 50
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by user email or name',
    example: 'john@example.com'
  })
  @ApiOkResponse({
    description: 'All wallets retrieved successfully',
    schema: {
      example: [
        {
          $id: 'wallet_123',
          user_id: 'user_456',
          balance: 2500000,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-12-01T10:00:00.000Z',
          userProfile: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+989123456789'
          }
        }
      ]
    }
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getAllWallets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ): Promise<any[]> {
    return this.adminService.getAllWallets(page, limit, search);
  }

  @Post('wallets/:id/adjust')
  @ApiOperation({
    summary: 'Adjust wallet balance',
    description: 'Allows administrators to adjust user wallet balances (credit, debit, or correction). Creates an audit trail of the adjustment.'
  })
  @ApiParam({
    name: 'id',
    description: 'Wallet ID to adjust',
    example: 'wallet_123'
  })
  @ApiBody({
    type: WalletAdjustmentDto,
    description: 'Wallet adjustment data',
    examples: {
      credit: {
        summary: 'Credit adjustment',
        value: {
          amount: 1000000,
          type: 'credit',
          reason: 'Customer service compensation',
          notes: 'Resolved billing dispute'
        }
      },
      debit: {
        summary: 'Debit adjustment',
        value: {
          amount: 500000,
          type: 'debit',
          reason: 'Service charge',
          notes: 'Monthly maintenance fee'
        }
      },
      correction: {
        summary: 'Balance correction',
        value: {
          amount: 2000000,
          type: 'correction',
          reason: 'System error correction',
          notes: 'Fixed incorrect balance calculation'
        }
      }
    }
  })
  @ApiCreatedResponse({
    description: 'Wallet balance adjusted successfully',
    type: WalletAdjustmentResponseDto,
    schema: {
      example: {
        id: 'adjustment_789',
        walletId: 'wallet_123',
        adminId: 'admin_456',
        amount: 1000000,
        type: 'credit',
        reason: 'Customer service compensation',
        notes: 'Resolved billing dispute',
        balanceBefore: 1500000,
        balanceAfter: 2500000,
        createdAt: '2024-12-01T10:00:00.000Z'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid adjustment data or insufficient balance for debit'
  })
  @ApiNotFoundResponse({
    description: 'Wallet not found'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async adjustWalletBalance(
    @Param('id') walletId: string,
    @Body() adjustmentDto: WalletAdjustmentDto,
    @Body('adminId') adminId: string
  ): Promise<WalletAdjustmentResponseDto> {
    return this.adminService.adjustWalletBalance(walletId, adminId, adjustmentDto);
  }

  @Get('invoices')
  @ApiOperation({
    summary: 'Get all invoices',
    description: 'Retrieves all invoices in the system with filtering options. Requires admin role.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 50)',
    example: 50
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by invoice status',
    example: 'pending'
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
    example: 'user_456'
  })
  @ApiOkResponse({
    description: 'All invoices retrieved successfully',
    schema: {
      example: [
        {
          $id: 'invoice_123',
          user_id: 'user_456',
          order_id: 'order_789',
          amount: 5000000,
          due_date: '2024-12-31T23:59:59.000Z',
          status: 'pending',
          description: 'Website design services',
          created_at: '2024-12-01T10:00:00.000Z',
          updated_at: '2024-12-01T10:00:00.000Z',
          userProfile: {
            full_name: 'John Doe',
            email: 'john@example.com'
          }
        }
      ]
    }
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getAllInvoices(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ): Promise<any[]> {
    return this.adminService.getAllInvoices(page, limit, status, userId);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'Get all payment transactions',
    description: 'Retrieves all payment transactions in the system with filtering options. Requires admin role.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 50)',
    example: 50
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by transaction status',
    example: 'completed'
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
    example: 'user_456'
  })
  @ApiOkResponse({
    description: 'All payment transactions retrieved successfully',
    schema: {
      example: [
        {
          $id: 'transaction_123',
          user_id: 'user_456',
          type: 'debit',
          status: 'completed',
          amount: 5000000,
          balance_before: 10000000,
          balance_after: 5000000,
          description: 'Payment for invoice INV_123',
          created_at: '2024-12-01T10:00:00.000Z',
          userProfile: {
            full_name: 'John Doe',
            email: 'john@example.com'
          }
        }
      ]
    }
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getAllPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ): Promise<any[]> {
    return this.adminService.getAllPayments(page, limit, status, userId);
  }

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Retrieves key dashboard statistics including total users, revenue, pending invoices, and transaction counts. Requires admin role.'
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    type: AdminDashboardStatsDto,
    schema: {
      example: {
        totalUsers: 150,
        totalRevenue: 75000000,
        pendingInvoices: 25,
        overdueInvoices: 5,
        totalTransactions: 450
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }

  // User Management Endpoint
  @Delete('users/:userId')
  @ApiOperation({
    summary: 'Delete user account',
    description: 'Deletes a user account from the system. Requires admin role.'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to delete',
    example: 'user_123'
  })
  @ApiOkResponse({
    description: 'User deleted successfully',
    type: DeleteUserResponseDto
  })
  @ApiNotFoundResponse({
    description: 'User not found'
  })
  @ApiBadRequestResponse({
    description: 'Cannot delete user with active orders'
  })
  async deleteUser(@Param('userId') userId: string): Promise<DeleteUserResponseDto> {
    return this.adminService.deleteUser(userId);
  }

  // Domain Management Endpoints
  @Get('domains/prices')
  @ApiOperation({
    summary: 'Get all domain extension prices',
    description: 'Retrieves all domain extension prices and availability. Requires admin role.'
  })
  @ApiOkResponse({
    description: 'Domain extensions retrieved successfully',
    type: [DomainExtensionDto]
  })
  async getDomainPrices(): Promise<DomainExtensionDto[]> {
    return this.adminService.getDomainPrices();
  }

  @Put('domains/prices/:extensionId')
  @ApiOperation({
    summary: 'Update domain extension price',
    description: 'Updates the price and availability of a domain extension. Requires admin role.'
  })
  @ApiParam({
    name: 'extensionId',
    description: 'ID of the domain extension to update',
    example: 'ext_1'
  })
  @ApiBody({ type: UpdateDomainExtensionDto })
  @ApiOkResponse({
    description: 'Domain extension updated successfully',
    type: DomainExtensionDto
  })
  async updateDomainPrice(
    @Param('extensionId') extensionId: string,
    @Body() updateData: UpdateDomainExtensionDto
  ): Promise<DomainExtensionDto> {
    return this.adminService.updateDomainPrice(extensionId, updateData);
  }

  @Post('domains/extensions')
  @ApiOperation({
    summary: 'Add new domain extension',
    description: 'Adds a new domain extension to the system. Requires admin role.'
  })
  @ApiBody({ type: CreateDomainExtensionDto })
  @ApiCreatedResponse({
    description: 'Domain extension created successfully',
    type: DomainExtensionDto
  })
  async createDomainExtension(
    @Body() createData: CreateDomainExtensionDto
  ): Promise<DomainExtensionDto> {
    return this.adminService.createDomainExtension(createData);
  }

  @Post('domains/check-availability')
  @ApiOperation({
    summary: 'Check domain availability',
    description: 'Checks the availability of a domain for admin purposes. Requires admin role.'
  })
  @ApiBody({ type: CheckDomainAvailabilityDto })
  @ApiOkResponse({
    description: 'Domain availability checked successfully',
    type: DomainAvailabilityResponseDto
  })
  async checkDomainAvailability(
    @Body() checkData: CheckDomainAvailabilityDto
  ): Promise<DomainAvailabilityResponseDto> {
    return this.adminService.checkDomainAvailability(checkData);
  }

  // System Health Metrics Endpoint
  @Get('system/metrics')
  @ApiOperation({
    summary: 'Get system health metrics',
    description: 'Retrieves detailed system health metrics including system, database, and service status. Requires admin role.'
  })
  @ApiOkResponse({
    description: 'System metrics retrieved successfully',
    type: SystemMetricsDto
  })
  async getSystemMetrics(): Promise<SystemMetricsDto> {
    return this.adminService.getSystemMetrics();
  }

  // Wallet Adjustment History Endpoint
  @Get('wallets/:walletId/adjustments')
  @ApiOperation({
    summary: 'Get wallet adjustment history',
    description: 'Retrieves the history of wallet adjustments for a specific wallet. Requires admin role.'
  })
  @ApiParam({
    name: 'walletId',
    description: 'ID of the wallet',
    example: 'wallet_123'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20)',
    example: 20
  })
  @ApiOkResponse({
    description: 'Wallet adjustment history retrieved successfully',
    type: WalletAdjustmentHistoryResponseDto
  })
  async getWalletAdjustmentHistory(
    @Param('walletId') walletId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ): Promise<WalletAdjustmentHistoryResponseDto> {
    return this.adminService.getWalletAdjustmentHistory(walletId, page, limit);
  }

  // Enhanced Email Service Test Endpoint
  @Post('emails/test-service')
  @ApiOperation({
    summary: 'Test email service functionality',
    description: 'Tests the functionality of the email service. Requires admin role.'
  })
  @ApiBody({ type: EmailServiceTestDto })
  @ApiOkResponse({
    description: 'Email service test completed successfully',
    type: EmailServiceTestResponseDto
  })
  async testEmailService(
    @Body() testData: EmailServiceTestDto
  ): Promise<EmailServiceTestResponseDto> {
    return this.adminService.testEmailService(testData);
  }
}
