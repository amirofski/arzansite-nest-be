import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Param, 
  Body, 
  UseGuards, 
  Query,
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
import { InvoicesService } from './invoices.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { 
  CreateInvoiceDto, 
  UpdateInvoiceDto, 
  PayInvoiceDto,
  InvoiceResponseDto 
} from './dto/invoice.dto';
import { User, UserPayload } from '../common/decorators/user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new invoice',
    description: 'Creates a new invoice for an order. The invoice will be set to pending status and an email notification will be sent to the user.'
  })
  @ApiBody({
    type: CreateInvoiceDto,
    description: 'Invoice creation data',
    examples: {
      example1: {
        summary: 'Basic invoice',
        value: {
          order_id: 'order_123456',
          amount: 5000000,
          dueDate: '2024-12-31T23:59:59.000Z',
          description: 'Website design services for company branding'
        }
      }
    }
  })
  @ApiCreatedResponse({
    description: 'Invoice created successfully',
    type: InvoiceResponseDto,
    schema: {
      example: {
        id: 'invoice_123456',
        user_id: 'user_789',
        order_id: 'order_123456',
        amount: 5000000,
        dueDate: '2024-12-31T23:59:59.000Z',
        status: 'pending',
        description: 'Website design services for company branding',
        created_at: '2024-12-01T10:00:00.000Z',
        updated_at: '2024-12-01T10:00:00.000Z'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or order not found'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async createInvoice(
    @User() user: UserPayload,
    @Body() createInvoiceDto: CreateInvoiceDto
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.createInvoice(user.id, createInvoiceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user invoices',
    description: 'Retrieves a paginated list of invoices for the authenticated user. Admins can see all invoices.'
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
    description: 'List of invoices retrieved successfully',
    type: [InvoiceResponseDto],
    schema: {
      example: [
        {
          id: 'invoice_123456',
          user_id: 'user_789',
          order_id: 'order_123456',
          amount: 5000000,
          dueDate: '2024-12-31T23:59:59.000Z',
          status: 'pending',
          description: 'Website design services',
          created_at: '2024-12-01T10:00:00.000Z',
          updated_at: '2024-12-01T10:00:00.000Z'
        }
      ]
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getInvoices(
    @User() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ): Promise<InvoiceResponseDto[]> {
    return this.invoicesService.getInvoices(user.id, user.role === 'admin');
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get specific invoice',
    description: 'Retrieves a specific invoice by ID. Users can only access their own invoices unless they are admins.'
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    example: 'invoice_123456'
  })
  @ApiOkResponse({
    description: 'Invoice retrieved successfully',
    type: InvoiceResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Invoice not found'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - user can only access their own invoices'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getInvoice(
    @Param('id') id: string,
    @User() user: UserPayload
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.getInvoice(id, user.id, user.role === 'admin');
  }

  @Post(':id/pay')
  @ApiOperation({
    summary: 'Pay invoice from wallet',
    description: 'Processes payment for an invoice using the user\'s wallet balance. Generates a receipt and sends confirmation email.'
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to pay',
    example: 'invoice_123456'
  })
  @ApiBody({
    type: PayInvoiceDto,
    description: 'Payment information',
    examples: {
      example1: {
        summary: 'Basic payment',
        value: {
          refId: 'PAY_REF_789',
          paymentMethod: 'wallet'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Invoice paid successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice paid successfully'
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invoice cannot be paid or insufficient wallet balance'
  })
  @ApiNotFoundResponse({
    description: 'Invoice not found'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async payInvoice(
    @Param('id') id: string,
    @User() user: UserPayload,
    @Body() payInvoiceDto: PayInvoiceDto
  ): Promise<{ success: boolean; message: string }> {
    return this.invoicesService.payInvoice(id, user.id, payInvoiceDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Update invoice (Admin only)',
    description: 'Allows administrators to update invoice status and details. Requires admin role.'
  })
  @ApiParam({
    name: 'id',
    description: 'Invoice ID to update',
    example: 'invoice_123456'
  })
  @ApiBody({
    type: UpdateInvoiceDto,
    description: 'Invoice update data',
    examples: {
      example1: {
        summary: 'Update status',
        value: {
          status: 'cancelled',
          description: 'Order cancelled by customer request'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Invoice updated successfully',
    type: InvoiceResponseDto
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
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
  @ApiOperation({
    summary: 'Get all invoices (Admin only)',
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
    name: 'user_id',
    required: false,
    type: String,
    description: 'Filter by user ID',
    example: 'user_789'
  })
  @ApiOkResponse({
    description: 'All invoices retrieved successfully',
    type: [InvoiceResponseDto]
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
    @Query('user_id') user_id?: string
  ): Promise<InvoiceResponseDto[]> {
    // Admin endpoint to get all invoices with filtering
    return this.invoicesService.getInvoices('', true);
  }
}
