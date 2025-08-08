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
import { CreateTransactionDto, RefundOrderDto } from './dto/wallet.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('wallets')
@UseGuards(JwtGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

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
