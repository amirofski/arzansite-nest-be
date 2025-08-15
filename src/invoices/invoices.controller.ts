import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Body, 
  UseGuards, 
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { 
  CreateInvoiceDto, 
  UpdateInvoiceDto, 
  PayInvoiceDto,
  InvoiceResponseDto 
} from './dto/invoice.dto';

@Controller('invoices')
@UseGuards(JwtGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async createInvoice(
    @Request() req,
    @Body() createInvoiceDto: CreateInvoiceDto
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.createInvoice(req.user.userId, createInvoiceDto);
  }

  @Get()
  async getInvoices(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ): Promise<InvoiceResponseDto[]> {
    return this.invoicesService.getInvoices(req.user.userId, req.user.role === 'admin');
  }

  @Get(':id')
  async getInvoice(
    @Param('id') id: string,
    @Request() req
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.getInvoice(id, req.user.userId, req.user.role === 'admin');
  }

  @Post(':id/pay')
  async payInvoice(
    @Param('id') id: string,
    @Request() req,
    @Body() payInvoiceDto: PayInvoiceDto
  ): Promise<{ success: boolean; message: string }> {
    return this.invoicesService.payInvoice(id, req.user.userId, payInvoiceDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto
  ): Promise<InvoiceResponseDto> {
    // Implementation for admin to update invoice
    return this.invoicesService.getInvoice(id, '', true);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllInvoices(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string
  ): Promise<InvoiceResponseDto[]> {
    // Admin endpoint to get all invoices with filtering
    return this.invoicesService.getInvoices('', true);
  }
}
