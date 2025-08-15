import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { Query } from 'node-appwrite';
import { ReceiptResponseDto, ReceiptFormat } from './dto/receipt.dto';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReceiptsService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async getReceipts(userId: string, isAdmin: boolean = false): Promise<ReceiptResponseDto[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    // Get user's invoices first
    const userInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('user_id', userId),
    ]);

    const invoiceIds = userInvoices.documents.map(inv => inv.$id);
    
    if (invoiceIds.length === 0) {
      return [];
    }

    // Get receipts for user's invoices
    const receipts = await databases.listDocuments(databaseId, receiptsCollection, [
      Query.equal('invoice_id', invoiceIds),
      Query.orderDesc('created_at'),
    ]);

    return receipts.documents.map(doc => this.mapToResponseDto(doc));
  }

  async getReceipt(receiptId: string, userId: string, isAdmin: boolean = false): Promise<ReceiptResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    const receipt = await databases.getDocument(databaseId, receiptsCollection, receiptId);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Check access rights
    if (!isAdmin) {
      const invoice = await databases.getDocument(databaseId, invoicesCollection, receipt.invoice_id);
      if (invoice.user_id !== userId) {
        throw new BadRequestException('Access denied');
      }
    }

    return this.mapToResponseDto(receipt);
  }

  async downloadReceipt(receiptId: string, userId: string, format: ReceiptFormat): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const receipt = await this.getReceipt(receiptId, userId);
    
    if (format === ReceiptFormat.PDF) {
      return this.generatePDFReceipt(receipt);
    } else {
      return this.generateHTMLReceipt(receipt);
    }
  }

  private async generatePDFReceipt(receipt: ReceiptResponseDto): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // Generate PDF content
    doc.fontSize(20).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt ID: ${receipt.id}`);
    doc.text(`Invoice ID: ${receipt.invoiceId}`);
    doc.text(`Reference ID: ${receipt.refId}`);
    doc.text(`Amount: ${receipt.amount.toLocaleString()} Rials`);
    doc.text(`Date: ${new Date(receipt.createdAt).toLocaleDateString()}`);
    doc.moveDown();
    doc.text('Thank you for your payment!', { align: 'center' });

    doc.end();

    const data = Buffer.concat(chunks);
    return {
      data,
      filename: `receipt-${receipt.id}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private async generateHTMLReceipt(receipt: ReceiptResponseDto): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .receipt-info { margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #2c5aa0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Receipt</h1>
        </div>
        <div class="receipt-info">
          <p><strong>Receipt ID:</strong> ${receipt.id}</p>
          <p><strong>Invoice ID:</strong> ${receipt.invoiceId}</p>
          <p><strong>Reference ID:</strong> ${receipt.refId}</p>
          <p class="amount">Amount: ${receipt.amount.toLocaleString()} Rials</p>
          <p><strong>Date:</strong> ${new Date(receipt.createdAt).toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin-top: 40px;">
          <p>Thank you for your payment!</p>
        </div>
      </body>
      </html>
    `;

    return {
      data: Buffer.from(html, 'utf-8'),
      filename: `receipt-${receipt.id}.html`,
      contentType: 'text/html',
    };
  }

  private mapToResponseDto(receipt: any): ReceiptResponseDto {
    return {
      id: receipt.$id,
      invoiceId: receipt.invoice_id,
      refId: receipt.ref_id,
      amount: receipt.amount,
      format: receipt.format,
      createdAt: receipt.created_at,
      updatedAt: receipt.updated_at,
    };
  }
}
