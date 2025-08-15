import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Body, 
  Query, 
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { 
  WalletAdjustmentDto, 
  WalletAdjustmentResponseDto,
  AdminDashboardStatsDto 
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('wallets')
  async getAllWallets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string
  ): Promise<any[]> {
    return this.adminService.getAllWallets(page, limit, search);
  }

  @Post('wallets/:id/adjust')
  async adjustWalletBalance(
    @Param('id') walletId: string,
    @Body() adjustmentDto: WalletAdjustmentDto,
    @Body('adminId') adminId: string
  ): Promise<WalletAdjustmentResponseDto> {
    return this.adminService.adjustWalletBalance(walletId, adminId, adjustmentDto);
  }

  @Get('invoices')
  async getAllInvoices(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ): Promise<any[]> {
    return this.adminService.getAllInvoices(page, limit, status, userId);
  }

  @Get('payments')
  async getAllPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ): Promise<any[]> {
    return this.adminService.getAllPayments(page, limit, status, userId);
  }

  @Get('dashboard/stats')
  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
    return this.adminService.getDashboardStats();
  }
}
