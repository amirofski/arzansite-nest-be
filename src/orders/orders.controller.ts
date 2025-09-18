import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateUnifiedOrderDto, SubmitMode } from './dto/create-unified.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders(
    @User() user: UserPayload,
    @Query('mine') mine?: string,
    @Query('admin') admin?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const isAdmin = admin === 'true' && user.role === 'admin';
    const isMine = mine === 'true' || !isAdmin;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return this.ordersService.getOrders(user.id, isAdmin, pageNum, limitNum, from, to);
  }

  @Post()
  async createOrder(
    @User() user: UserPayload,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, createOrderDto);
  }

  // New unified create endpoint expected by frontend
  @Post('create')
  async createUnified(
    @User() user: UserPayload,
    @Body() dto: CreateUnifiedOrderDto,
  ) {
    const res = await this.ordersService.createFromUnified(user.id, dto);
    return res;
  }

  // Admin/webhook status updates
  @Post('update-status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAdmin(dto);
  }

  @Get(':id')
  async getOrder(
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.ordersService.getOrder(id, user.id, isAdmin);
  }

  @Patch(':id')
  async updateOrder(
    @User() user: UserPayload,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.ordersService.updateOrder(id, user.id, updateOrderDto, isAdmin);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.ordersService.deleteOrder(id, user.id, isAdmin);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllOrders() {
    return this.ordersService.getOrders('', true);
  }
}
