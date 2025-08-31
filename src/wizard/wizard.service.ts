import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';
import { DomainsService } from '../domains/domains.service';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/payments.service';
import { ID, Query } from 'node-appwrite';
import {
  WizardOrderDto,
  SaveProgressDto,
  CompleteOrderDto,
  UpdateOrderDto,
  CalculatePriceDto,
  OrderStatus,
  SiteType,
  PaymentCycle,
  SaveDesignDto,
  OrderDto,
} from './dto/wizard.dto';

@Injectable()
export class WizardService {
  private readonly pricingConfig = {
    basePrice: {
      [SiteType.PERSONAL]: 500000, // 500,000 Toman
      [SiteType.BUSINESS]: 800000, // 800,000 Toman
    },
    pageCost: 100000, // 100,000 Toman per page
    sectionCost: 50000, // 50,000 Toman per section
    additionalServices: {
      seoOptimization: 200000,
      socialMediaIntegration: 150000,
      analyticsSetup: 100000,
      backupService: 80000,
      maintenancePlan: 120000,
      rushDelivery: 300000,
    },
    annualDiscount: 0.15, // 15% discount for annual payments
  };

  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
    private storageService: StorageService,
    private domainsService: DomainsService,
    private emailService: EmailService,
    private paymentsService: PaymentsService,
  ) {}

  async saveProgress(saveProgressDto: SaveProgressDto): Promise<WizardOrderDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_ORDERS');

    // Check if progress already exists
    const existingProgress = await databases.listDocuments(databaseId, wizardOrdersCollection, [
      Query.equal('sessionId', saveProgressDto.sessionId),
      Query.limit(1),
    ]);

    if (existingProgress.documents && existingProgress.documents.length > 0) {
      // Update existing progress
      const existingDoc = existingProgress.documents[0];
      const updated = await databases.updateDocument(
        databaseId,
        wizardOrdersCollection,
        existingDoc.$id,
        {
          ...saveProgressDto,
          updatedAt: new Date().toISOString(),
        }
      );
      return updated as any;
    } else {
      // Create new progress
      const newDoc = await databases.createDocument(
        databaseId,
        wizardOrdersCollection,
        ID.unique(),
        {
          ...saveProgressDto,
          status: OrderStatus.DRAFT,
          projectFiles: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      return newDoc as any;
    }
  }

  async getProgress(sessionId: string, userId?: string): Promise<WizardOrderDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_ORDERS');

    const result = await databases.listDocuments(databaseId, wizardOrdersCollection, [
      Query.equal('sessionId', sessionId),
      Query.limit(1),
    ]);

    if (!result.documents || result.documents.length === 0) {
      throw new NotFoundException('Progress not found');
    }

    const progress = result.documents[0] as any;

    // Check if user has access to this progress
    if (userId && progress.userId && progress.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return progress;
  }

  async getUserProgress(userId: string): Promise<WizardOrderDto[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_ORDERS');

    const result = await databases.listDocuments(databaseId, wizardOrdersCollection, [
      Query.equal('userId', userId),
      Query.orderDesc('updatedAt'),
    ]);

    return (result.documents as any) || [];
  }

  async completeOrder(completeOrderDto: CompleteOrderDto): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');

    try {
      // 1. Convert price from Tomans to Rials (1 Toman = 10 Rials)
      const priceRials = Math.round(completeOrderDto.order.priceTomans * 10);

      // 2. Create the order with pending status
      const orderData = {
        title: completeOrderDto.order.title,
        description: completeOrderDto.order.description,
        price: priceRials,
        status: 'pending',
        payment_status: 'pending',
        userId: completeOrderDto.userId || completeOrderDto.sessionId, // Use real userId if available, fallback to sessionId
        sessionId: completeOrderDto.sessionId, // Also store sessionId for reference
        siteType: completeOrderDto.order.siteType || 'personal',
        comments: completeOrderDto.order.comments,
        design_snapshot: completeOrderDto.designSnapshot, // Store the entire design as JSON
        total_pages: this.extractPageCount(completeOrderDto.designSnapshot),
        total_sections: this.extractSectionCount(completeOrderDto.designSnapshot),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const orderDoc = await databases.createDocument(
        databaseId,
        ordersCollection,
        ID.unique(),
        orderData
      );

      // 3. Create invoice for the order
      const invoiceData = {
        orderId: orderDoc.$id,
        userId: completeOrderDto.userId || completeOrderDto.sessionId, // Use real userId if available, fallback to sessionId
        amount: priceRials,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        status: 'pending',
        description: `Invoice for ${completeOrderDto.order.title}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const invoiceDoc = await databases.createDocument(
        databaseId,
        invoicesCollection,
        ID.unique(),
        invoiceData
      );

      // 4. Generate preview URL (async - we'll set a placeholder for now)
      const previewUrl = await this.generatePreviewUrl(orderDoc.$id, completeOrderDto.designSnapshot);

      // 5. Send confirmation emails (async)
      this.sendOrderConfirmationEmails(orderDoc, invoiceDoc, completeOrderDto).catch(error => {
        console.error('Failed to send confirmation emails:', error);
      });

      // 6. Return the created order with all necessary data
      return {
        success: true,
        data: {
          id: orderDoc.$id,
          status: orderDoc.status,
          payment_status: orderDoc.payment_status,
          preview_url: previewUrl,
          invoice_id: invoiceDoc.$id,
          amount: priceRials,
          title: orderDoc.title,
          description: orderDoc.description,
          created_at: orderDoc.created_at,
        },
        message: 'Order completed successfully',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error completing order:', error);
      throw new BadRequestException(`Failed to complete order: ${error.message}`);
    }
  }

  async updateOrder(
    orderId: string,
    updateOrderDto: UpdateOrderDto,
    userId: string,
    isAdmin: boolean = false
  ): Promise<WizardOrderDto> {
    // Check ownership or admin access
    const existingOrder = await this.getOrder(orderId, userId, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_ORDERS');

    const updated = await databases.updateDocument(
      databaseId,
      wizardOrdersCollection,
      orderId,
      {
        ...updateOrderDto,
        updatedAt: new Date().toISOString(),
      }
    );

    return updated as any;
  }

  async getOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<WizardOrderDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_ORDERS');

    const data = await databases.getDocument(databaseId, wizardOrdersCollection, orderId).catch(() => null);

    if (!data) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership or admin access
    if (!isAdmin && data.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return data as any;
  }

  async listUserOrders(userId: string): Promise<WizardOrderDto[]> {
    return this.getUserProgress(userId);
  }

  async listAllOrders(
    status?: OrderStatus,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ orders: WizardOrderDto[]; total: number; page: number; totalPages: number }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardOrdersCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_ORDERS');

    const queries: string[] = [Query.orderDesc('updatedAt')];

    if (status) {
      queries.push(Query.equal('status', status));
    }

    if (search) {
      queries.push(Query.search('primaryDomain', search));
    }

    const offset = (page - 1) * limit;
    queries.push(Query.offset(offset));
    queries.push(Query.limit(limit));

    const result = await databases.listDocuments(databaseId, wizardOrdersCollection, queries);
    const total = result.total;

    return {
      orders: (result.documents as any) || [],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async uploadFiles(
    orderId: string,
    sessionId: string,
    files: Express.Multer.File[]
  ): Promise<{ uploadedFiles: any[]; errors: string[] }> {
    // Verify order exists and user has access
    const order = await this.getOrder(orderId, sessionId, true); // Allow session-based access

    const uploadedFiles: any[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate file
        if (!this.isValidFile(file)) {
          errors.push(`Invalid file: ${file.originalname}`);
          continue;
        }

        // Upload to storage
        const bucketId = this.configService.get<string>('APPWRITE_BUCKET_PROJECT_FILES');
        const uploadResult = await this.storageService.uploadMultipart(bucketId, file);

        if (uploadResult.fileId === 'placeholder-file-id') {
          // Handle case where storage service is not fully implemented
          errors.push(`File upload not implemented: ${file.originalname}`);
          continue;
        }

        // Create file record
        const fileRecord = {
          id: uploadResult.fileId,
          filename: file.filename || file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: uploadResult.fileId, // This should be the actual URL
          uploadedAt: new Date(),
        };

        // Update order with new file
        await this.updateOrder(
          orderId,
          { projectFiles: [...order.projectFiles, fileRecord] },
          order.userId || sessionId,
          false
        );

        uploadedFiles.push(fileRecord);
      } catch (error) {
        errors.push(`Failed to upload ${file.originalname}: ${error.message}`);
      }
    }

    return { uploadedFiles, errors };
  }

  async deleteFile(orderId: string, fileId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const order = await this.getOrder(orderId, userId, isAdmin);

    // Find and remove file from order
    const updatedFiles = order.projectFiles.filter((file: any) => file.id !== fileId);
    
    if (updatedFiles.length === order.projectFiles.length) {
      throw new NotFoundException('File not found in order');
    }

    // Update order
    await this.updateOrder(
      orderId,
      { projectFiles: updatedFiles },
      userId,
      isAdmin
    );

    // Delete from storage
    try {
      const bucketId = this.configService.get<string>('APPWRITE_BUCKET_PROJECT_FILES');
      await this.storageService.deleteFile(bucketId, fileId);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
    }
  }

  async listOrderFiles(orderId: string, userId: string, isAdmin: boolean = false): Promise<any[]> {
    const order = await this.getOrder(orderId, userId, isAdmin);
    return order.projectFiles || [];
  }

  async getAvailableDomainExtensions(): Promise<any[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');

    try {
      const result = await databases.listDocuments(databaseId, domainExtensionsCollection, [
        Query.equal('available', true),
        Query.orderAsc('price'),
      ]);
      return (result.documents as any) || [];
    } catch (error) {
      // Return default extensions if collection doesn't exist
      return [
        { extension: '.ir', name: 'Iran', price: 50000, available: true, category: 'country' },
        { extension: '.com', name: 'Commercial', price: 80000, available: true, category: 'international' },
        { extension: '.net', name: 'Network', price: 75000, available: true, category: 'international' },
        { extension: '.org', name: 'Organization', price: 70000, available: true, category: 'international' },
      ];
    }
  }

  async checkDomainAvailability(domain: string, extension: string): Promise<{ available: boolean; domain: string; reason?: string }> {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }

  async getDomainPrices(): Promise<any[]> {
    return this.getAvailableDomainExtensions();
  }

  async updateDomainPrices(extensionId: string, price: number, available: boolean): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');

    const updated = await databases.updateDocument(
      databaseId,
      domainExtensionsCollection,
      extensionId,
      {
        price,
        available,
        updatedAt: new Date().toISOString(),
      }
    );

    return updated;
  }

  async calculatePricing(calculatePriceDto: CalculatePriceDto): Promise<any> {
    let basePrice = 0;
    let pagesCost = 0;
    let sectionsCost = 0;
    let additionalServicesCost = 0;
    let domainCost = 0;

    // Base price based on site type
    if (calculatePriceDto.siteType) {
      basePrice = this.pricingConfig.basePrice[calculatePriceDto.siteType];
    }

    // Pages and sections cost
    if (calculatePriceDto.websiteFramework?.dynamicDesign) {
      const pages = calculatePriceDto.websiteFramework.dynamicDesign.pages;
      pagesCost = pages.length * this.pricingConfig.pageCost;
      
      const totalSections = pages.reduce((total, page) => total + page.sections.length, 0);
      sectionsCost = totalSections * this.pricingConfig.sectionCost;
    }

    // Additional services cost
    if (calculatePriceDto.additionalServices) {
      Object.entries(calculatePriceDto.additionalServices).forEach(([service, enabled]) => {
        if (enabled && this.pricingConfig.additionalServices[service]) {
          additionalServicesCost += this.pricingConfig.additionalServices[service];
        }
      });
    }

    // Domain cost (simplified - would need actual domain pricing)
    if (calculatePriceDto.domains) {
      domainCost = 50000; // Base domain cost
      if (calculatePriceDto.domains.additionalDomains) {
        domainCost += calculatePriceDto.domains.additionalDomains.length * 50000;
      }
    }

    const subtotal = basePrice + pagesCost + sectionsCost + additionalServicesCost + domainCost;
    const annualDiscount = calculatePriceDto.paymentCycle === PaymentCycle.ANNUAL 
      ? subtotal * this.pricingConfig.annualDiscount 
      : 0;

    const totalPrice = subtotal - annualDiscount;
    const monthlyPrice = totalPrice;
    const annualPrice = totalPrice * 12;

    return {
      basePrice,
      pagesCost,
      sectionsCost,
      additionalServicesCost,
      domainCost,
      totalPrice,
      monthlyPrice,
      annualPrice,
      annualDiscount,
    };
  }

  async getPricingConfiguration(): Promise<any> {
    return this.pricingConfig;
  }

  async saveDesign(saveDesignDto: SaveDesignDto, userId: string): Promise<any> {
    // First verify the order exists and user has access
    const order = await this.getOrder(saveDesignDto.orderId, userId, false);
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Save the dynamic design structure
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');

    // Check if design already exists for this order
    const existing = await databases.listDocuments(databaseId, designsCollection, [
      Query.equal('order_id', saveDesignDto.orderId),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      // Update existing design
      await databases.updateDocument(
        databaseId, 
        designsCollection, 
        existing.documents[0].$id, 
        {
          dynamic_design: saveDesignDto.dynamicDesign,
          options: saveDesignDto.options,
          updated_at: new Date().toISOString(),
        } as any
      );
    } else {
      // Create new design
      await databases.createDocument(
        databaseId, 
        designsCollection, 
        ID.unique(), 
        {
          order_id: saveDesignDto.orderId,
          user_id: userId,
          dynamic_design: saveDesignDto.dynamicDesign,
          options: saveDesignDto.options,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any
      );
    }

    return { success: true, message: 'Design saved successfully' };
  }

  async getDesign(orderId: string, userId: string): Promise<any> {
    // First verify the order exists and user has access
    const order = await this.getOrder(orderId, userId, false);
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get the design data
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');

    const design = await databases.listDocuments(databaseId, designsCollection, [
      Query.equal('order_id', orderId),
      Query.limit(1),
    ]);

    if (design.documents.length === 0) {
      return { dynamicDesign: null, options: null };
    }

    const designDoc = design.documents[0] as any;
    return {
      dynamicDesign: designDoc.dynamic_design || null,
      options: designDoc.options || null,
    };
  }

  private isValidFile(file: Express.Multer.File): boolean {
    const maxSize = parseInt(this.configService.get<string>('MAX_FILE_SIZE') || '10485760'); // 10MB default
    const allowedTypes = (this.configService.get<string>('ALLOWED_FILE_TYPES') || 'image/*,application/pdf,text/*').split(',');

    if (file.size > maxSize) {
      return false;
    }

    // Check if file type is allowed
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.replace('/*', '');
        return file.mimetype.startsWith(baseType);
      }
      return file.mimetype === type;
    });
  }

  private extractPageCount(designSnapshot: Record<string, unknown>): number {
    try {
      const websiteFramework = designSnapshot.websiteFramework as any;
      if (websiteFramework?.dynamicDesign?.pages) {
        return (websiteFramework.dynamicDesign.pages as any[]).length;
      }
      return 1; // Default to 1 page
    } catch {
      return 1;
    }
  }

  private extractSectionCount(designSnapshot: Record<string, unknown>): number {
    try {
      const websiteFramework = designSnapshot.websiteFramework as any;
      if (websiteFramework?.dynamicDesign?.pages) {
        const pages = websiteFramework.dynamicDesign.pages as any[];
        return pages.reduce((total, page) => {
          return total + (page.sections?.length || 0);
        }, 0);
      }
      return 1; // Default to 1 section
    } catch {
      return 1;
    }
  }

  private async generatePreviewUrl(orderId: string, designSnapshot: Record<string, unknown>): Promise<string> {
    // For now, return a placeholder URL
    // In production, this would trigger an async job to generate the actual preview
    return `https://preview.arzansite.com/orders/${orderId}/preview`;
  }

  private async sendOrderConfirmationEmails(orderDoc: any, invoiceDoc: any, completeOrderDto: CompleteOrderDto): Promise<void> {
    try {
      // Send order confirmation to user
      await this.emailService.sendOrderNotification(
        completeOrderDto.userId || completeOrderDto.sessionId, // Use real userId if available, fallback to sessionId
        {
          orderId: orderDoc.$id,
          title: orderDoc.title,
          amount: orderDoc.price,
          status: orderDoc.status,
        }
      );

      // Send invoice notification
      await this.emailService.sendInvoiceCreatedEmail(
        completeOrderDto.userId || completeOrderDto.sessionId, // Use real userId if available, fallback to sessionId
        invoiceDoc.$id,
        invoiceDoc.amount
      );

      // TODO: Send admin notification
      console.log('Order confirmation emails sent successfully');
    } catch (error) {
      console.error('Failed to send confirmation emails:', error);
    }
  }
}
