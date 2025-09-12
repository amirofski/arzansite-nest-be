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
  OrderResponseDto,
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
    additional_services: {
      seoOptimization: 200000,
      socialMediaIntegration: 150000,
      analyticsSetup: 100000,
      backupService: 80000,
      maintenancePlan: 120000,
      rushDelivery: 300000,
    },
    annualDiscount: 0.15, // 15% discount for annual payments
  };

  /**
   * Generates a unique order number
   * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20250831-12345)
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `ORD-${dateStr}-${randomNum}`;
  }

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
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS') || 'wizard_sessions';

    // Build payload with ONLY allowed attributes for wizard_sessions schema
    const now = new Date().toISOString();
    const payload: any = {
      session_id: saveProgressDto.session_id,
      user_id: saveProgressDto.user_id || undefined,
      current_step: saveProgressDto.current_step || 'start',
      is_completed: typeof saveProgressDto.is_completed === 'boolean' ? saveProgressDto.is_completed : false,
      updated_at: now,
    };
    if (saveProgressDto.wizard_data !== undefined) {
      payload.wizard_data = JSON.stringify(saveProgressDto.wizard_data);
    }

    // Check if progress already exists
    const existingProgress = await databases.listDocuments(
      databaseId,
      wizardSessionsCollection,
      [
        Query.equal('session_id', saveProgressDto.session_id),
        Query.limit(1),
      ],
    );

    if (existingProgress.documents && existingProgress.documents.length > 0) {
      // Update existing progress
      const existingDoc = existingProgress.documents[0];
      try {
        const updated = await databases.updateDocument(
          databaseId,
          wizardSessionsCollection,
          (existingDoc as any).$id,
          payload,
        );
        return updated as any;
      } catch (e: any) {
        console.error('[WizardService.saveProgress] update failed:', e?.response?.message || e?.message || e);
        throw new BadRequestException('Failed to save progress');
      }
    } else {
      // Create new progress
      const base: any = {
        ...payload,
        status: OrderStatus.DRAFT,
        project_files: JSON.stringify([]), // store as JSON string to match schema
        created_at: now,
      };
      try {
        const newDoc = await databases.createDocument(
          databaseId,
          wizardSessionsCollection,
          ID.unique(),
          base,
        );
        return newDoc as any;
      } catch (e: any) {
        console.error('[WizardService.saveProgress] create failed:', e?.response?.message || e?.message || e);
        throw new BadRequestException('Failed to create progress');
      }
    }
  }

  async saveSession(session_id: string, wizard_data: Record<string, unknown>, user_id?: string): Promise<{ success: boolean }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS') || 'wizard_sessions';

    const existing = await databases.listDocuments(
      databaseId,
      wizardSessionsCollection,
      [Query.equal('session_id', session_id), Query.limit(1)],
    );

    const now = new Date().toISOString();
    const payload: any = {
      session_id,
      user_id: user_id || undefined,
      current_step: 'start',
      is_completed: false,
      wizard_data: JSON.stringify(wizard_data || {}),
      updated_at: now,
    };

    if (existing.documents?.[0]) {
      try {
        await databases.updateDocument(
          databaseId,
          wizardSessionsCollection,
          (existing.documents[0] as any).$id,
          payload,
        );
      } catch (e: any) {
        console.error('[WizardService.saveSession] update failed:', e?.response?.message || e?.message || e);
        throw new BadRequestException('Failed to save session');
      }
    } else {
      try {
        await databases.createDocument(
          databaseId,
          wizardSessionsCollection,
          ID.unique(),
          {
            ...payload,
            status: OrderStatus.DRAFT,
            project_files: JSON.stringify([]),
            created_at: now,
          },
        );
      } catch (e: any) {
        console.error('[WizardService.saveSession] create failed:', e?.response?.message || e?.message || e);
        throw new BadRequestException('Failed to create session');
      }
    }

    return { success: true };
  }

  // Non-breaking session wrapper methods (aliases)
  async getSession(session_id: string, user_id?: string): Promise<WizardOrderDto> {
    return this.getProgress(session_id, user_id);
  }

  async updateSession(session_id: string, wizard_data: Record<string, unknown>, user_id?: string): Promise<{ success: boolean }> {
    return this.saveSession(session_id, wizard_data, user_id);
  }

  async listSessions(
    status?: OrderStatus,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ sessions: WizardOrderDto[]; total: number; page: number; totalPages: number }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS');

    const queries: string[] = [Query.orderDesc('updated_at')];
    if (status) queries.push(Query.equal('status', status));
    if (search) queries.push(Query.search('primaryDomain', search));
    const offset = (page - 1) * limit;
    queries.push(Query.offset(offset));
    queries.push(Query.limit(limit));

    const result = await databases.listDocuments(databaseId, wizardSessionsCollection, queries);
    const total = result.total;
    return { sessions: (result.documents as any) || [], total, page, totalPages: Math.ceil(total / limit) };
  }

  async getProgress(session_id: string, user_id?: string): Promise<WizardOrderDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS') || 'wizard_sessions';

    const result = await databases.listDocuments(
      databaseId,
      wizardSessionsCollection,
      [
        Query.equal('session_id', session_id),
        Query.limit(1),
      ],
    );

    if (!result.documents || result.documents.length === 0) {
      throw new NotFoundException('Progress not found');
    }

    const progress = result.documents[0] as any;

    // Check if user has access to this progress
    if (user_id && progress.user_id && progress.user_id !== user_id) {
      throw new ForbiddenException('Access denied');
    }

    // If wizard_data exists as string, parse for consumers
    if (typeof progress.wizard_data === 'string') {
      try { progress.wizard_data = JSON.parse(progress.wizard_data); } catch {}
    }

    return progress;
  }

  async loadProgress(session_id: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const doc = await this.getProgress(session_id);
    const data = doc && (doc as any).wizard_data ? (doc as any).wizard_data : {};
    return { success: true, data: data as any };
  }

  async getUserProgress(user_id: string): Promise<WizardOrderDto[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS');

    const result = await databases.listDocuments(
      databaseId,
      wizardSessionsCollection,
      [
        Query.equal('user_id', user_id),
        Query.orderDesc('updated_at'),
      ],
    );

    return (result.documents as any) || [];
  }

  async completeOrder(completeOrderDto: CompleteOrderDto, user_id: string): Promise<OrderResponseDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const paymentsCollection = this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS');
    const { ID } = await import('node-appwrite');

    try {
      // 1. Calculate total price from design snapshot
      const design_snapshot = completeOrderDto.design_snapshot;
      const pricing = design_snapshot.pricing as any;
      const priceRials = pricing.totalPrice || 0;

      // 2. Create the order with pending status
      // Use the authenticated user's ID from the JWT token
      const mapped_user_id = user_id;
      
      // Debug logging to see what we're getting
      console.log('Debug - completeOrderDto:', {
        session_id: completeOrderDto.session_id,
        mapped_user_id: mapped_user_id
      });

      // Create orderData with ONLY fields that exist in the orders collection
      // Based on the actual schema, only include fields that are defined
      const orderData = {
        order_number: this.generateOrderNumber(),
        user_id: mapped_user_id, // Required field - exists in schema
        title: completeOrderDto.order.title, // Required field - exists in schema
        description: completeOrderDto.order.description, // Required field - exists in schema
        total_amount: priceRials, // Required field - exists in schema
        status: 'pending', // Required field - exists in schema
        payment_status: 'pending', // Required field - exists in schema
        comments: completeOrderDto.order.comments, // Optional field - exists in schema
        session_id: completeOrderDto.session_id, // Optional field - exists in schema
        site_type: completeOrderDto.order.site_type, // Optional field - exists in schema
        wizard_data: JSON.stringify(design_snapshot), // Optional field - exists in schema (large JSON field)
        created_at: new Date().toISOString(), // Required field - exists in schema
        updated_at: new Date().toISOString(), // Required field - exists in schema
      };

      console.log('Debug - orderData being sent to Appwrite:', orderData);

      // Note: design_snapshot is NOT sent to the orders collection
      // It should be saved separately in a designs collection or uploaded to storage
      const orderDoc = await databases.createDocument(
        databaseId,
        ordersCollection,
        ID.unique(),
        orderData,
      );

      // 3. Create payment record for the order
      const paymentData = {
        order_id: orderDoc.$id,
        user_id: mapped_user_id, // Use the same mapped user_id
        amount: priceRials,
        currency: 'IRR',
        status: 'pending',
        payment_gateway: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const paymentDoc = await databases.createDocument(
        databaseId,
        paymentsCollection,
        ID.unique(),
        paymentData,
      );

      // 4. Update wizard session with completed status
      const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS');
      const existingWizardSession = await databases.listDocuments(
        databaseId,
        wizardSessionsCollection,
        [
          Query.equal('session_id', completeOrderDto.session_id),
          Query.limit(1),
        ],
      );

      if (existingWizardSession.documents.length > 0) {
        const updated = await databases.updateDocument(
          databaseId,
          wizardSessionsCollection,
          existingWizardSession.documents[0].$id,
          {
            is_completed: true,
            updated_at: new Date().toISOString(),
          },
        );
      }

      // 5. Send confirmation emails
      await this.sendOrderConfirmationEmails(orderDoc, paymentDoc, completeOrderDto);

      // 6. Return success response
      return {
        success: true,
        order_id: orderDoc.$id,
        paymentId: paymentDoc.$id,
        message: 'Order completed successfully',
        order: {
          id: orderDoc.$id,
          title: orderDoc.title,
          description: orderDoc.description,
          total_amount: orderDoc.total_amount,
          status: orderDoc.status,
          user_id: orderDoc.user_id,
          created_at: orderDoc.created_at,
          updated_at: orderDoc.updated_at,
        },
        payment: {
          id: paymentDoc.$id,
          order_id: paymentDoc.order_id,
          user_id: paymentDoc.user_id,
          amount: paymentDoc.amount,
          status: paymentDoc.status,
          created_at: paymentDoc.created_at,
          updated_at: paymentDoc.updated_at,
        },
      };

    } catch (error) {
      console.error('Error completing order:', error);
      throw new Error(`Failed to complete order: ${error.message}`);
    }
  }

  async updateOrder(
    order_id: string,
    updateOrderDto: UpdateOrderDto,
    user_id: string,
    isAdmin: boolean = false
  ): Promise<WizardOrderDto> {
    // Check ownership or admin access
    const existingOrder = await this.getOrder(order_id, user_id, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS') || 'wizard_sessions';

    const updated = await databases.updateDocument(
      databaseId,
      wizardSessionsCollection,
      order_id,
      {
        ...updateOrderDto,
        updated_at: new Date().toISOString(),
      },
    );

    return updated as any;
  }

  async getOrder(order_id: string, user_id: string, isAdmin: boolean = false): Promise<WizardOrderDto> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS');

    let data = null as any;
    try {
      data = await databases.getDocument(
        databaseId,
        wizardSessionsCollection,
        order_id,
      );
    } catch (_) {
      data = null;
    }

    if (!data) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership or admin access
    if (!isAdmin && data.user_id !== user_id) {
      throw new ForbiddenException('Access denied');
    }

    return data as any;
  }

  async listUserOrders(user_id: string): Promise<WizardOrderDto[]> {
    return this.getUserProgress(user_id);
  }

  async listAllOrders(
    status?: OrderStatus,
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ orders: WizardOrderDto[]; total: number; page: number; totalPages: number }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const wizardSessionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS') || 'wizard_sessions';

    const queries: string[] = [Query.orderDesc('updated_at')];

    if (status) {
      queries.push(Query.equal('status', status));
    }

    if (search) {
      queries.push(Query.search('primaryDomain', search));
    }

    const offset = (page - 1) * limit;
    queries.push(Query.offset(offset));
    queries.push(Query.limit(limit));

    const result = await databases.listDocuments(
      databaseId,
      wizardSessionsCollection,
      queries,
    );
    const total = result.total;

    return {
      orders: (result.documents as any) || [],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async uploadFiles(
    order_id: string,
    session_id: string,
    files: Express.Multer.File[]
  ): Promise<{ uploadedFiles: any[]; errors: string[] }> {
    // Verify order exists and user has access
    const order = await this.getOrder(order_id, session_id, true); // Allow session-based access

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
        const bucket_id = this.configService.get<string>('APPWRITE_STORAGE_PROJECT_FILES');
        const uploadResult = await this.storageService.uploadMultipart(bucket_id, file);

        if (uploadResult.file_id === 'placeholder-file-id') {
          // Handle case where storage service is not fully implemented
          errors.push(`File upload not implemented: ${file.originalname}`);
          continue;
        }

        // Create file record
        const fileRecord = {
          id: uploadResult.file_id,
          filename: file.filename || file.originalname,
          original_name: file.originalname,
          mime_type: file.mimetype,
          size: file.size,
          url: uploadResult.file_id, // This should be the actual URL
          uploadedAt: new Date(),
        };

        // Update order with new file
        await this.updateOrder(
          order_id,
          { project_files: [...order.project_files, fileRecord] },
          order.user_id || session_id,
          false
        );

        uploadedFiles.push(fileRecord);
      } catch (error) {
        errors.push(`Failed to upload ${file.originalname}: ${error.message}`);
      }
    }

    return { uploadedFiles, errors };
  }

  async deleteFile(order_id: string, file_id: string, user_id: string, isAdmin: boolean = false): Promise<void> {
    const order = await this.getOrder(order_id, user_id, isAdmin);

    // Find and remove file from order
    const updatedFiles = order.project_files.filter((file: any) => file.id !== file_id);
    
    if (updatedFiles.length === order.project_files.length) {
      throw new NotFoundException('File not found in order');
    }

    // Update order
    await this.updateOrder(
      order_id,
      { project_files: updatedFiles },
      user_id,
      isAdmin
    );

    // Delete from storage
    try {
      const bucket_id = this.configService.get<string>('APPWRITE_STORAGE_PROJECT_FILES');
      await this.storageService.deleteFile(bucket_id, file_id);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
    }
  }

  async listOrderFiles(order_id: string, user_id: string, isAdmin: boolean = false): Promise<any[]> {
    const order = await this.getOrder(order_id, user_id, isAdmin);
    return order.project_files || [];
  }

  async getAvailableDomainExtensions(): Promise<any[]> {
    // Domain extensions collection not available in new structure
    // Return default extensions
    return [
      { extension: '.ir', name: 'Iran', price: 50000, available: true, category: 'country' },
      { extension: '.com', name: 'Commercial', price: 80000, available: true, category: 'international' },
      { extension: '.net', name: 'Network', price: 75000, available: true, category: 'international' },
      { extension: '.org', name: 'Organization', price: 70000, available: true, category: 'international' },
    ];
  }

  async checkDomainAvailability(domain: string, extension: string): Promise<{ available: boolean; domain: string; reason?: string }> {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }

  async getDomainPrices(): Promise<any[]> {
    return this.getAvailableDomainExtensions();
  }

  async updateDomainPrices(extensionId: string, price: number, available: boolean): Promise<any> {
    // Domain extensions collection not available in new structure
    // This method is not functional in the new database structure
    throw new Error('Domain price updates not supported in new database structure');
  }

  async calculatePricing(calculatePriceDto: CalculatePriceDto): Promise<any> {
    let basePrice = 0;
    let pagesCost = 0;
    let sectionsCost = 0;
    let additionalServicesCost = 0;
    let domainCost = 0;

    // Base price based on site type
    if (calculatePriceDto.site_type) {
      basePrice = this.pricingConfig.basePrice[calculatePriceDto.site_type];
    }

    // Pages and sections cost
    if (calculatePriceDto.website_framework?.dynamicDesign) {
      const pages = calculatePriceDto.website_framework.dynamicDesign.pages;
      pagesCost = pages.length * this.pricingConfig.pageCost;
      
      const totalSections = pages.reduce((total, page) => total + page.sections.length, 0);
      sectionsCost = totalSections * this.pricingConfig.sectionCost;
    }

    // Additional services cost
    if (calculatePriceDto.additional_services) {
      Object.entries(calculatePriceDto.additional_services).forEach(([service, enabled]) => {
        if (enabled && this.pricingConfig.additional_services[service]) {
          additionalServicesCost += this.pricingConfig.additional_services[service];
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

  async saveDesign(saveDesignDto: SaveDesignDto, user_id: string): Promise<any> {
    // First verify the order exists and user has access
    const order = await this.getOrder(saveDesignDto.order_id, user_id, false);
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Save the dynamic design structure
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');

    // Check if design already exists for this order
    const existing = await databases.listDocuments(
      databaseId,
      designsCollection,
      [
        Query.equal('order_id', saveDesignDto.order_id),
        Query.limit(1),
      ],
    );

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
        } as any,
      );
    } else {
      // Create new design
      await databases.createDocument(
        databaseId,
        designsCollection,
        ID.unique(),
        {
          order_id: saveDesignDto.order_id,
          user_id: user_id,
          dynamic_design: saveDesignDto.dynamicDesign,
          options: saveDesignDto.options,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      );
    }

    return { success: true, message: 'Design saved successfully' };
  }

  async getDesign(order_id: string, user_id: string): Promise<any> {
    // First verify the order exists and user has access
    const order = await this.getOrder(order_id, user_id, false);
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get the design data
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');

    const design = await databases.listDocuments(
      databaseId,
      designsCollection,
      [
        Query.equal('order_id', order_id),
        Query.limit(1),
      ],
    );

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

  private extractPageCount(design_snapshot: Record<string, unknown>): number {
    try {
      const website_framework = design_snapshot.website_framework as any;
      if (website_framework?.dynamicDesign?.pages) {
        return (website_framework.dynamicDesign.pages as any[]).length;
      }
      return 1; // Default to 1 page
    } catch {
      return 1;
    }
  }

  private extractSectionCount(design_snapshot: Record<string, unknown>): number {
    try {
      const website_framework = design_snapshot.website_framework as any;
      if (website_framework?.dynamicDesign?.pages) {
        const pages = website_framework.dynamicDesign.pages as any[];
        return pages.reduce((total, page) => {
          return total + (page.sections?.length || 0);
        }, 0);
      }
      return 1; // Default to 1 section
    } catch {
      return 1;
    }
  }

  private async generatePreviewUrl(order_id: string, design_snapshot: Record<string, unknown>): Promise<string> {
    // For now, return a placeholder URL
    // In production, this would trigger an async job to generate the actual preview
    return `https://preview.arzansite.com/orders/${order_id}/preview`;
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `ORD-${dateStr}-${randomNum}`;
  }

  private async sendOrderConfirmationEmails(orderDoc: any, invoiceDoc: any, completeOrderDto: CompleteOrderDto): Promise<void> {
    try {
      // Use the user_id from the created order document
      const mapped_user_id = orderDoc.user_id;

      // Send order confirmation to user
      await this.emailService.sendOrderNotification(
        mapped_user_id, // Use mapped user_id
        {
          order_id: orderDoc.$id,
          title: orderDoc.title,
          amount: orderDoc.total_amount,
          status: orderDoc.status,
        }
      );

      // Send invoice notification
      await this.emailService.sendInvoiceCreatedEmail(
        mapped_user_id, // Use mapped user_id
        invoiceDoc.$id,
        invoiceDoc.amount
      );

      console.log('Order confirmation emails sent successfully');
    } catch (error) {
      console.error('Failed to send confirmation emails:', error);
    }
  }
}
