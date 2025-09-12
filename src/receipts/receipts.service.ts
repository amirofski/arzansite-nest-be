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

  async getReceipts(
    user_id: string,
    isAdmin: boolean = false,
    page: number = 1,
    limit: number = 20,
    from?: string,
    to?: string,
  ): Promise<ReceiptResponseDto[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    if (isAdmin) {
      const queries: string[] = [Query.orderDesc('created_at')];
      if (from) queries.push(Query.greaterThanEqual('created_at', from));
      if (to) queries.push(Query.lessThanEqual('created_at', to));
      const offset = (page - 1) * limit;
      queries.push(Query.offset(offset));
      queries.push(Query.limit(limit));
      const all = await databases.listDocuments(databaseId, receiptsCollection, queries);
      return all.documents.map(doc => this.mapToResponseDto(doc));
    }

    // Query wallet receipts directly by user_id (if field exists)
    const walletQueries: string[] = [Query.orderDesc('created_at')];
    if (from) walletQueries.push(Query.greaterThanEqual('created_at', from));
    if (to) walletQueries.push(Query.lessThanEqual('created_at', to));
    let walletReceipts: any = { documents: [] };
    try {
      walletReceipts = await databases.listDocuments(
        databaseId,
        receiptsCollection,
        [Query.equal('user_id', user_id), ...walletQueries],
      );
    } catch (_) {
      // user_id may not exist on receipts; ignore
      walletReceipts = { documents: [] };
    }

    // Include receipts linked to user's invoices
    const invQueries: string[] = [Query.equal('user_id', user_id), Query.limit(1000)];
    if (from) invQueries.push(Query.greaterThanEqual('created_at', from));
    if (to) invQueries.push(Query.lessThanEqual('created_at', to));
    const userInvoices = await databases.listDocuments(
      databaseId,
      invoicesCollection,
      invQueries,
    );
    const invoiceIds = userInvoices.documents.map(inv => inv.$id);

    let invoiceReceipts: any[] = [];
    if (invoiceIds.length > 0) {
      const recQueries: string[] = [Query.equal('invoice_id', invoiceIds), Query.orderDesc('created_at')];
      if (from) recQueries.push(Query.greaterThanEqual('created_at', from));
      if (to) recQueries.push(Query.lessThanEqual('created_at', to));
      const res = await databases.listDocuments(
        databaseId,
        receiptsCollection,
        recQueries,
      );
      invoiceReceipts = res.documents as any[];
    }

    // Merge and de-duplicate by $id
    const map: Record<string, any> = {};
    for (const doc of [...(walletReceipts.documents as any[]), ...invoiceReceipts]) {
      map[(doc as any).$id] = doc;
    }
    const merged = Object.values(map);

    // Apply pagination on merged results
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = merged.slice(start, end);

    return paged.map(doc => this.mapToResponseDto(doc));
  }

  async getReceipt(receiptId: string, user_id: string, isAdmin: boolean = false): Promise<ReceiptResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    const receipt = await databases.getDocument(
      databaseId,
      receiptsCollection,
      receiptId,
    );
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Check access rights
    if (!isAdmin) {
      if (receipt.user_id && receipt.user_id === user_id) {
        // direct user-owned wallet receipt
      } else if (receipt.invoice_id) {
        const invoice = await databases.getDocument(
          databaseId,
          invoicesCollection,
          receipt.invoice_id,
        );
        if (invoice.user_id !== user_id) {
          throw new BadRequestException('Access denied');
        }
      } else {
        throw new BadRequestException('Access denied');
      }
    }

    return this.mapToResponseDto(receipt);
  }

  async downloadReceipt(receiptId: string, user_id: string, format: ReceiptFormat): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const receipt = await this.getReceipt(receiptId, user_id);
    
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
    if (receipt.invoiceId) {
      doc.text(`Invoice ID: ${receipt.invoiceId}`);
    }
    doc.text(`Reference ID: ${receipt.refId}`);
    doc.text(`Amount: ${receipt.amount.toLocaleString()} Rials`);
    doc.text(`Date: ${new Date(receipt.created_at).toLocaleDateString()}`);
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
          ${receipt.invoiceId ? `<p><strong>Invoice ID:</strong> ${receipt.invoiceId}</p>` : ''}
          <p><strong>Reference ID:</strong> ${receipt.refId}</p>
          <p class="amount">Amount: ${receipt.amount.toLocaleString()} Rials</p>
          <p><strong>Date:</strong> ${new Date(receipt.created_at).toLocaleDateString()}</p>
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
      invoiceId: receipt.invoice_id || undefined,
      refId: receipt.ref_id,
      amount: receipt.amount,
      format: receipt.format,
      created_at: receipt.created_at,
      updated_at: receipt.updated_at,
    };
  }
}
