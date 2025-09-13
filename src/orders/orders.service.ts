import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';
import { Order } from '../common/types/database.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BaseAppwriteService } from '../common/services/base-appwrite.service';
import { WalletsService } from '../wallets/wallets.service';
import { EmailService } from '../email/email.service';
import { TransactionType } from '../wallets/dto/wallet.dto';
import { PaymentStatus } from './dto/order.dto';

@Injectable()
export class OrdersService extends BaseAppwriteService {
  protected readonly collectionId = 'orders';
  private readonly logger = new Logger(OrdersService.name);

  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `ORD-${dateStr}-${randomNum}`;
  }

  constructor(
    appwriteService: AppwriteService,
    configService: ConfigService,
    private readonly walletsService: WalletsService,
    private readonly emailService: EmailService,
  ) {
    super(appwriteService, configService);
  }

  async getOrders(
    userId: string,
    isAdmin: boolean = false,
    page: number = 1,
    limit: number = 20,
    from?: string,
    to?: string,
  ): Promise<{ items: Order[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const queries: string[] = [Query.orderDesc('created_at')];

    if (!isAdmin) {
      queries.push(Query.equal('user_id', userId));
    }
    if (from) {
      queries.push(Query.greaterThanEqual('created_at', from));
    }
    if (to) {
      queries.push(Query.lessThanEqual('created_at', to));
    }
    const offset = (page - 1) * limit;
    queries.push(Query.offset(offset));
    queries.push(Query.limit(limit));

    const result = await this.listDocuments<Order>(queries);
    return {
      items: result.documents,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.max(1, Math.ceil(result.total / limit)),
      },
    };
  }

  async getOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<Order> {
    const data = await this.getDocument<Order>(orderId);

    if (!data) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership or admin access
    if (!isAdmin && data.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return data;
  }

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order for user ${userId}`);

    // Extract title and description from the payload
    const title = createOrderDto.title || `Order for ${createOrderDto.site_type || 'website'}`;
    const description = createOrderDto.description || `Website order from wizard session ${createOrderDto.session_id}`;
    const wiz = (createOrderDto.wizard_data || {}) as Record<string, any>;
    const totalAmount = createOrderDto.total_amount || Number(wiz?.pricing?.totalPrice) || 0;

    // Consolidate all wizard data into one field
    const wizardData = {
      site_type: createOrderDto.site_type,
      website_framework: wiz?.website_framework,
      branding: wiz?.branding,
      additional_services: wiz?.additional_services,
      domains: wiz?.domains,
      pricing: wiz?.pricing,
      session_id: createOrderDto.session_id
    };

    const orderData = {
      // Basic order fields
      order_number: this.generateOrderNumber(),
      title,
      description,
      total_amount: totalAmount,
      user_id: userId,
      status: 'pending',
      payment_status: createOrderDto.payment_status || 'pending',
      site_type: createOrderDto.site_type || (wiz?.site_type as string) || 'personal',
      comments: createOrderDto.comments,
      total_pages: createOrderDto.total_pages || (Array.isArray(wiz?.website_framework?.dynamicDesign?.pages) ? wiz.website_framework.dynamicDesign.pages.length : 0),
      total_sections: createOrderDto.total_sections ||
        (Array.isArray(wiz?.website_framework?.dynamicDesign?.pages)
          ? wiz.website_framework.dynamicDesign.pages.reduce((total: number, page: any) => total + (Array.isArray(page?.sections) ? page.sections.length : 0), 0)
          : 0),
      
      // Consolidated wizard data
      wizard_data: JSON.stringify(wizardData),
      
      // Payment fields
      payment_gateway: createOrderDto.payment_gateway,
      callback_url: createOrderDto.callback_url,
      return_url: createOrderDto.return_url,

      // Session and currency
      session_id: createOrderDto.session_id,
      currency: 'IRR',
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const order = await this.createDocument<Order>(orderData);

      // Auto-create invoice for the order
      try {
        const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
        if (invoicesCollection) {
          const now = Date.now();
          const invoice = await this.databases.createDocument(
            this.databaseId,
            invoicesCollection,
            ID.unique(),
            {
              user_id: userId,
              order_id: order.id,
              amount: totalAmount,
              due_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
              description: `Invoice for order ${order.id}`,
              created_at: new Date(now).toISOString(),
              updated_at: new Date(now).toISOString(),
            } as any,
          );
          // Notify user
          await this.emailService.sendInvoiceCreatedEmail(userId, (invoice as any).$id, totalAmount);
        }
      } catch (e: any) {
        this.logger.warn(`Auto-invoice creation failed for order ${order.id}: ${e?.message || e}`);
      }
      
      // Initialize order progress
      await this.initializeOrderProgress(order.id);
      
      // Send order confirmation email
      await this.sendOrderConfirmationEmail(userId, order);
      
      this.logger.log(`Order created successfully: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to create order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async createEnhancedOrder(userId: string, createOrderDto: any): Promise<Order> {
    this.logger.log(`Creating enhanced order for user ${userId}`);

    // Validate order data
    await this.validateOrderData(createOrderDto);

    // Calculate pricing if not provided
    if (!createOrderDto.total_amount || createOrderDto.total_amount <= 0) {
      createOrderDto.total_amount = await this.calculateOrderPrice(createOrderDto.wizard_data);
    }

    const orderData = {
      order_number: this.generateOrderNumber(),
      user_id: userId,
      title: createOrderDto.title,
      description: createOrderDto.description,
      total_amount: createOrderDto.total_amount,
      status: createOrderDto.status || 'pending',
      payment_status: createOrderDto.payment_status || 'pending',
      site_type: createOrderDto.site_type,
      wizard_data: createOrderDto.wizard_data,
      session_id: createOrderDto.session_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const order = await this.createDocument<Order>(orderData);

      // Auto-create invoice for the order
      try {
        const invoicesCollection = this.configService.get<string>('APPWRITE_COLLECTION_INVOICES');
        if (invoicesCollection) {
          const now = Date.now();
          const invoice = await this.databases.createDocument(
            this.databaseId,
            invoicesCollection,
            ID.unique(),
            {
              user_id: userId,
              order_id: order.id,
              amount: createOrderDto.total_amount,
              due_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
              description: `Invoice for order ${order.id}`,
              created_at: new Date(now).toISOString(),
              updated_at: new Date(now).toISOString(),
            } as any,
          );
          await this.emailService.sendInvoiceCreatedEmail(userId, (invoice as any).$id, createOrderDto.total_amount);
        }
      } catch (e: any) {
        this.logger.warn(`Auto-invoice creation failed for enhanced order ${order.id}: ${e?.message || e}`);
      }
      
      // Initialize order progress
      await this.initializeOrderProgress(order.id);
      
      // Send order confirmation email
      await this.sendOrderConfirmationEmail(userId, order);
      
      this.logger.log(`Enhanced order created successfully: ${order.id}`);
      return order;
    } catch (error) {
      this.logger.error(`Failed to create enhanced order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async updateOrder(
    orderId: string,
    userId: string,
    updateOrderDto: UpdateOrderDto,
    isAdmin: boolean = false
  ): Promise<Order> {
    // Verify order exists and user has access
    const existingOrder = await this.getOrder(orderId, userId, isAdmin);
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update fields if provided
    if (updateOrderDto.title !== undefined) updateData.title = updateOrderDto.title;
    if (updateOrderDto.description !== undefined) updateData.description = updateOrderDto.description;
    if (updateOrderDto.status !== undefined) updateData.status = updateOrderDto.status;
    if (updateOrderDto.total_amount !== undefined) updateData.total_amount = updateOrderDto.total_amount;
    if (updateOrderDto.comments !== undefined) updateData.comments = updateOrderDto.comments;
    if (updateOrderDto.payment_status !== undefined) updateData.payment_status = updateOrderDto.payment_status;

    return this.updateDocument<Order>(orderId, updateData);
  }

  async updateOrderPayment(
    orderId: string,
    userId: string,
    zarinpal_authority?: string,
    zarinpal_ref_id?: string,
    isAdmin: boolean = false
  ): Promise<Order> {
    // Verify order exists and user has access
    await this.getOrder(orderId, userId, isAdmin);
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (zarinpal_authority) {
      updateData.zarinpal_authority = zarinpal_authority;
    }

    if (zarinpal_ref_id) {
      updateData.zarinpal_ref_id = zarinpal_ref_id;
    }

    return this.updateDocument<Order>(orderId, updateData);
  }

  async deleteOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    // Verify order exists and user has access
    await this.getOrder(orderId, userId, isAdmin);
    
    await this.deleteDocument(orderId);
  }

  // Enhanced functionality methods
  async getEnhancedOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<any> {
    this.logger.log(`Getting enhanced order ${orderId} for user ${userId}`);

    const order = await this.getOrder(orderId, userId, isAdmin);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get wallet balance
    let walletBalance = 0;
    let canPayWithWallet = false;
    try {
      const wallet = await this.walletsService.getWallet(userId);
      walletBalance = wallet.balance || 0;
      canPayWithWallet = walletBalance >= order.total_amount;
    } catch (error) {
      this.logger.warn(`Could not get wallet balance for user ${userId}: ${error.message}`);
    }

    // Get order progress
    const progress = await this.getOrderProgress(orderId);

    return {
      ...order,
      progress,
      walletBalance,
      canPayWithWallet,
    };
  }

  async payWithWallet(orderId: string, userId: string): Promise<any> {
    this.logger.log(`Processing wallet payment for order ${orderId}`);

    const order = await this.getOrder(orderId, userId);
    if (order.payment_status === 'succeeded') {
      throw new BadRequestException('Order is already paid');
    }

    // Check wallet balance
    const walletBalance = await this.walletsService.getWallet(userId);
    if (walletBalance.balance < order.total_amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    try {
      // Process wallet payment
      const transaction = await this.walletsService.createTransaction(userId, {
        type: TransactionType.PAYMENT,
        amount: order.total_amount,
        description: `Payment for order ${orderId}`,
        referenceId: orderId,
        referenceType: 'order',
      });

      // Update order payment status
      await this.updateOrder(orderId, userId, { payment_status: PaymentStatus.SUCCEEDED });

      // Send payment confirmation email
      await this.sendPaymentStatusNotification(userId, order, 'succeeded');

      this.logger.log(`Wallet payment processed successfully for order ${orderId}`);
      return { success: true, transactionId: transaction.transactionId };
    } catch (error) {
      this.logger.error(`Failed to process wallet payment: ${error.message}`);
      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  private async validateOrderData(createOrderDto: any): Promise<void> {
    if (!createOrderDto.title || !createOrderDto.description) {
      throw new BadRequestException('Title and description are required');
    }
    
    if (!createOrderDto.wizard_data) {
      throw new BadRequestException('Wizard data is required');
    }
  }

  private async calculateOrderPrice(wizardData: any): Promise<number> {
    // Basic price calculation logic
    let basePrice = 1000000; // 1,000,000 Rials base price
    
    if (wizardData.website_framework?.dynamicDesign?.pages) {
      basePrice += wizardData.website_framework.dynamicDesign.pages.length * 500000; // 500,000 per page
    }
    
    if (wizardData.additional_services) {
      if (wizardData.additional_services.seoOptimization) basePrice += 300000;
      if (wizardData.additional_services.analyticsSetup) basePrice += 200000;
      if (wizardData.additional_services.maintenancePlan) basePrice += 500000;
    }
    
    return basePrice;
  }

  private async initializeOrderProgress(orderId: string): Promise<void> {
    // Initialize order progress tracking
    // This would typically create a progress record in a separate collection
    this.logger.log(`Initialized progress tracking for order ${orderId}`);
  }

  private async getOrderProgress(orderId: string): Promise<any> {
    // Get order progress information
    // This would typically fetch from a progress collection
    return {
      order_id: orderId,
      currentStep: 'pending',
      completedSteps: [],
      remainingSteps: ['confirmed', 'in_progress', 'completed'],
      progressPercentage: 0,
      estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      lastUpdate: new Date().toISOString(),
      nextMilestone: 'Order Confirmation',
      timeline: []
    };
  }

  private async sendOrderConfirmationEmail(userId: string, order: Order): Promise<void> {
    try {
      await this.emailService.sendOrderNotification(userId, {
        orderId: order.id,
        orderTitle: order.title,
        totalAmount: order.total_amount,
        status: order.status,
      });
    } catch (error) {
      this.logger.warn(`Failed to send order confirmation email: ${error.message}`);
    }
  }

  private async sendPaymentStatusNotification(userId: string, order: Order, status: string): Promise<void> {
    try {
      await this.emailService.sendPaymentNotification(userId, {
        orderId: order.id,
        orderTitle: order.title,
        totalAmount: order.total_amount,
        status,
      });
    } catch (error) {
      this.logger.warn(`Failed to send payment status notification: ${error.message}`);
    }
  }
}
