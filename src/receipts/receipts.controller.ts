import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  Res,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { Response } from 'express';
import { ReceiptsService } from './receipts.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { ReceiptResponseDto, ReceiptFormat } from './dto/receipt.dto';

@Controller('receipts')
@UseGuards(JwtGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  async getReceipts(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ): Promise<ReceiptResponseDto[]> {
    return this.receiptsService.getReceipts(req.user.userId, req.user.role === 'admin');
  }

  @Get(':id')
  async getReceipt(
    @Param('id') id: string,
    @Request() req
  ): Promise<ReceiptResponseDto> {
    return this.receiptsService.getReceipt(id, req.user.userId, req.user.role === 'admin');
  }

  @Get(':id/download')
  async downloadReceipt(
    @Param('id') id: string,
    @Request() req,
    @Query('format', new DefaultValuePipe(ReceiptFormat.PDF)) format: ReceiptFormat,
    @Res() res: Response
  ): Promise<void> {
    const receipt = await this.receiptsService.downloadReceipt(id, req.user.userId, format);
    
    res.setHeader('Content-Type', receipt.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.filename}"`);
    res.send(receipt.data);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllReceipts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ): Promise<ReceiptResponseDto[]> {
    // Admin endpoint to get all receipts
    return this.receiptsService.getReceipts('', true);
  }
}
