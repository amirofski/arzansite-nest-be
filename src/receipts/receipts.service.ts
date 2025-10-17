import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { Query } from 'node-appwrite';
import { ReceiptResponseDto, ReceiptFormat } from './dto/receipt.dto';
import * as PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';

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
  ): Promise<{ items: ReceiptResponseDto[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
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
      return {
        items: all.documents.map(doc => this.mapToResponseDto(doc)),
        pagination: {
          page,
          limit,
          total: all.total,
          pages: Math.max(1, Math.ceil(all.total / limit)),
        },
      };
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

    return {
      items: paged.map(doc => this.mapToResponseDto(doc)),
      pagination: {
        page,
        limit,
        total: merged.length,
        pages: Math.max(1, Math.ceil(merged.length / limit)),
      },
    };
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
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // Load Persian-capable font if available
    try {
      const customFont = this.configService.get<string>('PDF_PERSIAN_FONT_PATH');
      const fallback = path.join(process.cwd(), 'assets', 'fonts', 'Vazirmatn-Regular.ttf');
      const fontPath = customFont && fs.existsSync(customFont) ? customFont : (fs.existsSync(fallback) ? fallback : null);
      if (fontPath) {
        doc.font(fontPath);
      }
    } catch (_) {}

    // Header
    doc.fontSize(20).text('رسید پرداخت', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`شناسه رسید: ${receipt.id}`);
    if (receipt.invoiceId) doc.text(`شناسه فاکتور: ${receipt.invoiceId}`);
    doc.text(`کد پیگیری: ${receipt.refId}`);
    doc.text(`مبلغ: ${Number(receipt.amount).toLocaleString('fa-IR')} ریال`);
    doc.text(`تاریخ: ${new Date(receipt.created_at).toLocaleDateString('fa-IR')}`);

    // Optional: order details block (if resolvable from invoice)
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
      const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
      if (receipt.invoiceId && databaseId && invoicesCollection && ordersCollection) {
        const inv: any = await databases.getDocument(databaseId, invoicesCollection, receipt.invoiceId);
        const orderId = inv?.order_id;
        if (orderId) {
          const order: any = await databases.getDocument(databaseId, ordersCollection, orderId);
          const wd = typeof order?.wizard_data === 'string' ? JSON.parse(order.wizard_data) : order?.wizard_data;
          const domains = wd?.domains?.selectedDomains || wd?.domains || [];
          const totalPages = order?.total_pages || wd?.website_framework?.dynamicDesign?.pages?.length || 0;
          const modules = wd?.additional_services || wd?.modules || {};
          doc.moveDown();
          doc.fontSize(14).text('جزئیات سفارش');
          doc.moveDown(0.5);
          if (Array.isArray(domains) && domains.length) doc.fontSize(12).text(`دامنه‌ها: ${domains.map((d: any)=> (d?.domain || d)).join(', ')}`);
          if (totalPages) doc.fontSize(12).text(`تعداد صفحات: ${totalPages}`);
          if (modules && typeof modules === 'object') {
            const enabled = Object.keys(modules).filter(k => !!modules[k]);
            if (enabled.length) doc.fontSize(12).text(`ماژول‌ها: ${enabled.join(', ')}`);
          }
          const cycle = wd?.paymentCycle || order?.payment_cycle || 'one_time';
          const cycleFa = cycle === 'annual' ? 'سالانه' : cycle === 'monthly' ? 'ماهانه' : 'یک‌باره';
          doc.fontSize(12).text(`نوع پرداخت: ${cycleFa}`);
        }
      }
    } catch (_) {}

    doc.moveDown(1);
    doc.text('با تشکر از پرداخت شما', { align: 'center' });

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
