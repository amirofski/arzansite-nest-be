import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
@UseGuards(JwtGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all transactions (admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 50)' })
  @ApiQuery({ name: 'from', required: false, description: 'Created-at from (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Created-at to (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.transactionsService.getTransactions(undefined, pageNum, limitNum, from, to);
  }

  @Get('my')
  @ApiOperation({ summary: 'List current user transactions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Created-at from (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Created-at to (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getMyTransactions(
    @User() user: UserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.transactionsService.getTransactions(user.id, pageNum, limitNum, from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getTransaction(@Param('id') id: string) {
    return this.transactionsService.getTransaction(id);
  }

  @Get('order/:order_id')
  @ApiOperation({ summary: 'List transactions for an order' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 20)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getTransactionsByOrder(
    @Param('order_id') order_id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.transactionsService.getTransactionsByOrder(order_id, pageNum, limitNum);
  }
}
