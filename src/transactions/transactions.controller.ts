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
  @ApiQuery({ name: 'limit', required: false, description: 'Max items to return (default 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Items to skip (default 0)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllTransactions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.transactionsService.getTransactions(undefined, limitNum, offsetNum);
  }

  @Get('my')
  @ApiOperation({ summary: 'List current user transactions' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getMyTransactions(
    @User() user: UserPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.transactionsService.getTransactions(user.id, limitNum, offsetNum);
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
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getTransactionsByOrder(@Param('order_id') order_id: string) {
    return this.transactionsService.getTransactionsByOrder(order_id);
  }
}
