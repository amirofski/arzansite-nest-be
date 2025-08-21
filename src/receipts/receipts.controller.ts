import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  Res,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery, 
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiProduces
} from '@nestjs/swagger';
import { Response } from 'express';
import { ReceiptsService } from './receipts.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { ReceiptResponseDto, ReceiptFormat } from './dto/receipt.dto';
import { User, UserPayload } from '../common/decorators/user.decorator';

@ApiTags('Receipts')
@ApiBearerAuth()
@Controller('receipts')
@UseGuards(JwtGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user receipts',
    description: 'Retrieves a paginated list of receipts for the authenticated user. Admins can see all receipts.'
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
    description: 'List of receipts retrieved successfully',
    type: [ReceiptResponseDto],
    schema: {
      example: [
        {
          id: 'receipt_123456',
          invoiceId: 'invoice_789',
          refId: 'PAY_REF_456',
          amount: 5000000,
          format: 'pdf',
          createdAt: '2024-12-01T10:00:00.000Z',
          updatedAt: '2024-12-01T10:00:00.000Z'
        }
      ]
    }
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getReceipts(
    @User() user: UserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ): Promise<ReceiptResponseDto[]> {
    return this.receiptsService.getReceipts(user.id, user.role === 'admin');
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get specific receipt',
    description: 'Retrieves a specific receipt by ID. Users can only access receipts for their own invoices unless they are admins.'
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID',
    example: 'receipt_123456'
  })
  @ApiOkResponse({
    description: 'Receipt retrieved successfully',
    type: ReceiptResponseDto
  })
  @ApiNotFoundResponse({
    description: 'Receipt not found'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - user can only access receipts for their own invoices'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getReceipt(
    @Param('id') id: string,
    @User() user: UserPayload
  ): Promise<ReceiptResponseDto> {
    return this.receiptsService.getReceipt(id, user.id, user.role === 'admin');
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download receipt',
    description: 'Downloads a receipt in the specified format (PDF or HTML). Users can only download receipts for their own invoices.'
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt ID to download',
    example: 'receipt_123456'
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ReceiptFormat,
    description: 'Receipt format (default: PDF)',
    example: 'pdf'
  })
  @ApiOkResponse({
    description: 'Receipt file downloaded successfully',
    schema: {
      type: 'string',
      format: 'binary'
    }
  })
  @ApiProduces('application/pdf', 'text/html')
  @ApiNotFoundResponse({
    description: 'Receipt not found'
  })
  @ApiForbiddenResponse({
    description: 'Access denied - user can only download receipts for their own invoices'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async downloadReceipt(
    @Param('id') id: string,
    @User() user: UserPayload,
    @Query('format', new DefaultValuePipe(ReceiptFormat.PDF)) format: ReceiptFormat,
    @Res() res: Response
  ): Promise<void> {
    const receipt = await this.receiptsService.downloadReceipt(id, user.id, format);
    
    res.setHeader('Content-Type', receipt.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.filename}"`);
    res.send(receipt.data);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Get all receipts (Admin only)',
    description: 'Retrieves all receipts in the system with pagination. Requires admin role.'
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
  @ApiOkResponse({
    description: 'All receipts retrieved successfully',
    type: [ReceiptResponseDto]
  })
  @ApiForbiddenResponse({
    description: 'Access denied - admin role required'
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated'
  })
  async getAllReceipts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ): Promise<ReceiptResponseDto[]> {
    // Admin endpoint to get all receipts
    return this.receiptsService.getReceipts('', true);
  }
}
