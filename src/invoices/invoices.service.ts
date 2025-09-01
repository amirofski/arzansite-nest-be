import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { WalletsService } from '../wallets/wallets.service';
import { EmailService } from '../email/email.service';
import { OrdersService } from '../orders/orders.service';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';
import { 
  CreateInvoiceDto, 
  UpdateInvoiceDto, 
  PayInvoiceDto, 
  InvoiceStatus,
  InvoiceResponseDto 
} from './dto/invoice.dto';
import { TransactionType } from '../wallets/dto/wallet.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private appwriteService: AppwriteService,
    private walletsService: WalletsService,
    private emailService: EmailService,
    private ordersService: OrdersService,
    private configService: ConfigService,
  ) {}

  async createInvoice(user_id: string, createInvoiceDto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    // Verify order exists and belongs to user
    const order = await this.ordersService.getOrder(createInvoiceDto.order_id, user_id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const invoice = await databases.createDocument(databaseId, invoicesCollection, ID.unique(), {
      user_id: user_id,
      order_id: createInvoiceDto.order_id,
      amount: createInvoiceDto.amount,
      due_date: createInvoiceDto.dueDate,
      status: InvoiceStatus.PENDING,
      description: createInvoiceDto.description || `Invoice for order ${createInvoiceDto.order_id}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Send email notification
    await this.emailService.sendInvoiceCreatedEmail(user_id, invoice.$id, createInvoiceDto.amount);

    return this.mapToResponseDto(invoice);
  }

  async getInvoices(user_id: string, isAdmin: boolean = false): Promise<InvoiceResponseDto[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    const queries = [Query.orderDesc('created_at')];
    if (!isAdmin) {
      queries.push(Query.equal('user_id', user_id));
    }

    const result = await databases.listDocuments(databaseId, invoicesCollection, queries);
    return result.documents.map(doc => this.mapToResponseDto(doc));
  }

  async getInvoice(invoiceId: string, user_id: string, isAdmin: boolean = false): Promise<InvoiceResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    const invoice = await databases.getDocument(databaseId, invoicesCollection, invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access rights
    if (!isAdmin && invoice.user_id !== user_id) {
      throw new BadRequestException('Access denied');
    }

    return this.mapToResponseDto(invoice);
  }

  async payInvoice(invoiceId: string, user_id: string, payInvoiceDto: PayInvoiceDto): Promise<{ success: boolean; message: string }> {
    const invoice = await this.getInvoice(invoiceId, user_id);
    
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Invoice cannot be paid in current status');
    }

    // Check wallet balance
    const wallet = await this.walletsService.getWallet(user_id);
    if (wallet.balance < invoice.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Process payment from wallet
    await this.walletsService.createTransaction(user_id, {
      type: TransactionType.DEBIT,
      amount: invoice.amount,
      description: `Payment for invoice ${invoiceId}`,
      metadata: {
        invoiceId,
        refId: payInvoiceDto.refId,
        paymentMethod: payInvoiceDto.paymentMethod || 'wallet',
      },
    });

    // Update invoice status
    await this.updateInvoiceStatus(invoiceId, InvoiceStatus.PAID);

    // Generate receipt
    await this.generateReceipt(invoiceId, payInvoiceDto.refId, invoice.amount);

    // Send success email
    await this.emailService.sendInvoicePaidEmail(user_id, invoiceId, invoice.amount);

    return { success: true, message: 'Invoice paid successfully' };
  }

  async updateInvoiceStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    await databases.updateDocument(databaseId, invoicesCollection, invoiceId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async generateReceipt(invoiceId: string, refId: string, amount: number): Promise<string> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const receiptsCollection = this.configService.get<string>('APPWRITE_COLLECTION_RECEIPTS');

    const receipt = await databases.createDocument(databaseId, receiptsCollection, ID.unique(), {
      invoice_id: invoiceId,
      ref_id: refId,
      amount,
      format: 'pdf',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return receipt.$id;
  }

  async checkOverdueInvoices(): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    const today = new Date().toISOString();
    const overdueInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('status', InvoiceStatus.PENDING),
      Query.lessThan('due_date', today),
    ]);

    for (const invoice of overdueInvoices.documents) {
      await this.updateInvoiceStatus(invoice.$id, InvoiceStatus.OVERDUE);
      
      // Send overdue notification
      await this.emailService.sendInvoiceOverdueEmail(invoice.user_id, invoice.$id, invoice.amount);
    }
  }

  async autoPayInvoices(): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    const pendingInvoices = await databases.listDocuments(databaseId, invoicesCollection, [
      Query.equal('status', InvoiceStatus.PENDING),
    ]);

    for (const invoice of pendingInvoices.documents) {
      try {
        const wallet = await this.walletsService.getWallet(invoice.user_id);
        if (wallet.balance >= invoice.amount) {
          // Auto-pay invoice
          await this.payInvoice(invoice.$id, invoice.user_id, {
            refId: `AUTO_${Date.now()}`,
            paymentMethod: 'auto_wallet',
          });
        }
      } catch (error) {
        console.error(`Failed to auto-pay invoice ${invoice.$id}:`, error);
      }
    }
  }

  private mapToResponseDto(invoice: any): InvoiceResponseDto {
    return {
      id: invoice.$id,
      user_id: invoice.user_id,
      order_id: invoice.order_id,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      status: invoice.status,
      description: invoice.description,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
    };
  }
}
