import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { WalletsService } from '../wallets/wallets.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import { TransactionType } from '../wallets/dto/wallet.dto';
import { ID, Query } from 'node-appwrite';
import {
  CreateEnhancedOrderDto,
  UpdateEnhancedOrderDto,
  EnhancedOrderResponseDto,
  EnhancedOrderDetails,
  OrderProgress,
  ProgressTimeline,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  SiteType
} from './dto/enhanced-order.dto';



@Injectable()
export class EnhancedOrdersService {
  private readonly logger = new Logger(EnhancedOrdersService.name);

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
    private readonly paymentsService: PaymentsService,
    private readonly emailService: EmailService,
  ) {}

  async createEnhancedOrder(
    userId: string,
    createOrderDto: CreateEnhancedOrderDto
  ): Promise<EnhancedOrderResponseDto> {
    this.logger.log(`Creating enhanced order for user ${userId}`);

    // Validate order data
    await this.validateOrderData(createOrderDto);

    // Calculate pricing if not provided
    if (!createOrderDto.price || createOrderDto.price <= 0) {
      createOrderDto.price = await this.calculateOrderPrice(createOrderDto.wizardData);
    }

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');

    try {
      // Create order document
      const orderDocument = await databases.createDocument(
        databaseId,
        ordersCollectionId,
        ID.unique(),
        {
          user_id: userId,
          title: createOrderDto.title,
          description: createOrderDto.description,
          price: createOrderDto.price,
          status: createOrderDto.status || OrderStatus.PENDING,
          payment_status: createOrderDto.payment_status || PaymentStatus.PENDING,
          site_type: createOrderDto.siteType,
          wizard_data: createOrderDto.wizardData,
          session_id: createOrderDto.sessionId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );

      // Initialize order progress
      await this.initializeOrderProgress(orderDocument.$id);

      // Send order confirmation email
      await this.sendOrderConfirmationEmail(userId, orderDocument);

      this.logger.log(`Enhanced order created successfully: ${orderDocument.$id}`);

      return this.mapToEnhancedOrderResponse(orderDocument);
    } catch (error) {
      this.logger.error(`Failed to create enhanced order: ${error.message}`);
      throw new BadRequestException(`Failed to create order: ${error.message}`);
    }
  }

  async getEnhancedOrder(
    orderId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<EnhancedOrderDetails> {
    this.logger.log(`Getting enhanced order ${orderId} for user ${userId}`);

    const order = await this.getOrderById(orderId, userId, isAdmin);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get order progress
    const progress = await this.getOrderProgress(orderId);

    // Get wallet balance
    const walletBalance = await this.walletsService.getBalance(userId);
    const canPayWithWallet = walletBalance.balance >= order.price;

    return {
      ...this.mapToEnhancedOrderResponse(order),
      progress,
      walletBalance: walletBalance.balance,
      canPayWithWallet,
    };
  }

  async updateEnhancedOrder(
    orderId: string,
    userId: string,
    updateOrderDto: UpdateEnhancedOrderDto,
    isAdmin: boolean = false
  ): Promise<EnhancedOrderResponseDto> {
    this.logger.log(`Updating enhanced order ${orderId} for user ${userId}`);

    // Verify order ownership or admin access
    const existingOrder = await this.getOrderById(orderId, userId, isAdmin);
    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');

    try {
      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateOrderDto.title !== undefined) updateData.title = updateOrderDto.title;
      if (updateOrderDto.description !== undefined) updateData.description = updateOrderDto.description;
      if (updateOrderDto.price !== undefined) updateData.price = updateOrderDto.price;
      if (updateOrderDto.status !== undefined) updateData.status = updateOrderDto.status;
      if (updateOrderDto.payment_status !== undefined) updateData.payment_status = updateOrderDto.payment_status;
      if (updateOrderDto.payment_method !== undefined) updateData.payment_method = updateOrderDto.payment_method;
      if (updateOrderDto.transaction_id !== undefined) updateData.transaction_id = updateOrderDto.transaction_id;
              if (updateOrderDto.payment_metadata !== undefined) updateData.payment_metadata = updateOrderDto.payment_metadata;
      if (updateOrderDto.wizardData !== undefined) updateData.wizard_data = updateOrderDto.wizardData;

      // Update order
      const updatedOrder = await databases.updateDocument(
        databaseId,
        ordersCollectionId,
        orderId,
        updateData
      );

      // Update progress if status changed
      if (updateOrderDto.status && updateOrderDto.status !== existingOrder.status) {
        await this.updateOrderProgress(orderId, updateOrderDto.status);
      }

      // Send notification if payment status changed
      if (updateOrderDto.payment_status && updateOrderDto.payment_status !== existingOrder.payment_status) {
        await this.sendPaymentStatusNotification(userId, updatedOrder);
      }

      this.logger.log(`Enhanced order ${orderId} updated successfully`);

      return this.mapToEnhancedOrderResponse(updatedOrder);
    } catch (error) {
      this.logger.error(`Failed to update enhanced order: ${error.message}`);
      throw new BadRequestException(`Failed to update order: ${error.message}`);
    }
  }

  async getUserOrders(
    userId: string,
    filters: {
      status?: string;
      payment_status?: string;
      page?: number;
      limit?: number;
      from_date?: string;
      to_date?: string;
    } = {}
  ): Promise<{
    orders: EnhancedOrderResponseDto[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    this.logger.log(`Getting orders for user ${userId} with filters: ${JSON.stringify(filters)}`);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      // Build query filters
      const queryFilters = [Query.equal('user_id', userId)];
      
      if (filters.status) {
        queryFilters.push(Query.equal('status', filters.status));
      }
      
      if (filters.payment_status) {
        queryFilters.push(Query.equal('payment_status', filters.payment_status));
      }
      
      if (filters.from_date) {
        queryFilters.push(Query.greaterThanEqual('created_at', filters.from_date));
      }
      
      if (filters.to_date) {
        queryFilters.push(Query.lessThanEqual('created_at', filters.to_date));
      }

      // Add pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      queryFilters.push(Query.orderDesc('created_at'));
      queryFilters.push(Query.limit(limit));
      queryFilters.push(Query.offset(offset));

      // Get orders
      const result = await databases.listDocuments(databaseId, ordersCollectionId, queryFilters);

      // Get total count for pagination
      const totalResult = await databases.listDocuments(databaseId, ordersCollectionId, [
        Query.equal('user_id', userId)
      ]);

      const orders = result.documents.map(doc => this.mapToEnhancedOrderResponse(doc));
      const total = totalResult.total;
      const totalPages = Math.ceil(total / limit);

      return {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user orders: ${error.message}`);
      throw new BadRequestException(`Failed to get orders: ${error.message}`);
    }
  }

  async processWalletPayment(
    orderId: string,
    userId: string,
    amount: number
  ): Promise<{
    success: boolean;
    transactionId: string;
    newBalance: number;
    paymentDetails: {
      amount: number;
      description: string;
      timestamp: string;
      referenceId: string;
    };
  }> {
    this.logger.log(`Processing wallet payment for order ${orderId}, user ${userId}, amount ${amount}`);

    // Verify order exists and belongs to user
    const order = await this.getOrderById(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if order is already paid
    if (order.payment_status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Order is already paid');
    }

    // Check wallet balance
    const walletBalance = await this.walletsService.getBalance(userId);
    if (walletBalance.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    try {
      // Process wallet payment
      const paymentResult = await this.walletsService.createTransaction(userId, {
        type: TransactionType.PAYMENT,
        amount: amount,
        description: `Payment for order ${orderId}`,
        referenceId: orderId,
        referenceType: 'order',
      });

      // Update order payment status
      await this.updateEnhancedOrder(orderId, userId, {
        payment_status: PaymentStatus.SUCCEEDED,
        payment_method: PaymentMethod.WALLET,
        transaction_id: paymentResult.transactionId,
      });

      // Update order status to confirmed
      await this.updateEnhancedOrder(orderId, userId, {
        status: OrderStatus.CONFIRMED,
      });

      // Send payment success notification
      await this.sendPaymentSuccessNotification(userId, order, amount);

      this.logger.log(`Wallet payment processed successfully for order ${orderId}`);

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        newBalance: paymentResult.balanceAfter,
        paymentDetails: {
          amount,
          description: `Payment for order ${orderId}`,
          timestamp: new Date().toISOString(),
          referenceId: orderId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to process wallet payment: ${error.message}`);
      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }
  }

  async getOrderProgress(orderId: string): Promise<OrderProgress> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const progressCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDER_PROGRESS');

    try {
      const progressDoc = await databases.listDocuments(databaseId, progressCollectionId, [
        Query.equal('order_id', orderId),
        Query.limit(1),
      ]);

      if (progressDoc.documents.length === 0) {
        // Return default progress if none exists
        return this.getDefaultOrderProgress(orderId);
      }

      const progress = progressDoc.documents[0];
      return {
        orderId: progress.order_id,
        currentStep: progress.current_step,
        completedSteps: progress.completed_steps || [],
        remainingSteps: progress.remaining_steps || [],
        progressPercentage: progress.progress_percentage || 0,
        estimatedDelivery: progress.estimated_delivery,
        lastUpdate: progress.updated_at,
        nextMilestone: progress.next_milestone,
        timeline: progress.timeline || [],
      };
    } catch (error) {
      this.logger.warn(`Failed to get order progress, returning default: ${error.message}`);
      return this.getDefaultOrderProgress(orderId);
    }
  }

  async updateOrderProgress(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    attachments?: Array<{ filename: string; url: string; type: string }>
  ): Promise<{
    success: boolean;
    updatedStep: string;
    progressPercentage: number;
    nextStep: string;
  }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const progressCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDER_PROGRESS');

    try {
      // Get current progress
      const currentProgress = await this.getOrderProgress(orderId);
      
      // Calculate new progress
      const stepMapping = this.getStepMapping(newStatus);
      const newProgressPercentage = this.calculateProgressPercentage(newStatus);
      const nextStep = this.getNextStep(newStatus);

      // Update progress
      const progressData: any = {
        current_step: stepMapping.step,
        progress_percentage: newProgressPercentage,
        next_step: nextStep,
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        progressData.notes = notes;
      }

      if (attachments && attachments.length > 0) {
        progressData.attachments = attachments;
      }

      // Update or create progress document
      const existingProgress = await databases.listDocuments(databaseId, progressCollectionId, [
        Query.equal('order_id', orderId),
        Query.limit(1),
      ]);

      if (existingProgress.documents.length > 0) {
        await databases.updateDocument(
          databaseId,
          progressCollectionId,
          existingProgress.documents[0].$id,
          progressData
        );
      } else {
        await databases.createDocument(
          databaseId,
          progressCollectionId,
          ID.unique(),
          {
            order_id: orderId,
            ...progressData,
            created_at: new Date().toISOString(),
          }
        );
      }

      return {
        success: true,
        updatedStep: stepMapping.step,
        progressPercentage: newProgressPercentage,
        nextStep,
      };
    } catch (error) {
      this.logger.error(`Failed to update order progress: ${error.message}`);
      throw new BadRequestException(`Failed to update progress: ${error.message}`);
    }
  }

  private async validateOrderData(createOrderDto: CreateEnhancedOrderDto): Promise<void> {
    if (!createOrderDto.wizardData) {
      throw new BadRequestException('Wizard data is required');
    }

    if (!createOrderDto.wizardData.websiteFramework) {
      throw new BadRequestException('Website framework is required');
    }

    if (!createOrderDto.wizardData.pricing) {
      throw new BadRequestException('Pricing information is required');
    }

    if (createOrderDto.price && createOrderDto.price <= 0) {
      throw new BadRequestException('Order price must be greater than 0');
    }
  }

  private async calculateOrderPrice(wizardData: any): Promise<number> {
    // This is a simplified calculation - you can implement more complex pricing logic
    let totalPrice = wizardData.pricing?.basePrice || 0;
    
    if (wizardData.wizardData?.websiteFramework?.dynamicDesign?.pages) {
      const pagesCount = wizardData.wizardData.websiteFramework.dynamicDesign.pages.length;
      totalPrice += (pagesCount * (wizardData.pricing?.pagesCost || 0));
    }

    if (wizardData.wizardData?.additionalServices) {
      const services = wizardData.wizardData.additionalServices;
      if (services.seoOptimization) totalPrice += 500000; // 500,000 Rials
      if (services.socialMediaIntegration) totalPrice += 300000; // 300,000 Rials
      if (services.analyticsSetup) totalPrice += 200000; // 200,000 Rials
      if (services.backupService) totalPrice += 150000; // 150,000 Rials
      if (services.maintenancePlan) totalPrice += 400000; // 400,000 Rials
      if (services.rushDelivery) totalPrice += 1000000; // 1,000,000 Rials
    }

    return totalPrice;
  }

  private async initializeOrderProgress(orderId: string): Promise<void> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const progressCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDER_PROGRESS');

    try {
      const defaultProgress = this.getDefaultOrderProgress(orderId);
      
      await databases.createDocument(
        databaseId,
        progressCollectionId,
        ID.unique(),
        {
          order_id: orderId,
          current_step: defaultProgress.currentStep,
          completed_steps: defaultProgress.completedSteps,
          remaining_steps: defaultProgress.remainingSteps,
          progress_percentage: defaultProgress.progressPercentage,
          estimated_delivery: defaultProgress.estimatedDelivery,
          next_milestone: defaultProgress.nextMilestone,
          timeline: defaultProgress.timeline,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      this.logger.warn(`Failed to initialize order progress: ${error.message}`);
    }
  }

  private getDefaultOrderProgress(orderId: string): OrderProgress {
    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    return {
      orderId,
      currentStep: 'order_created',
      completedSteps: ['order_created'],
      remainingSteps: ['payment_confirmation', 'design_start', 'design_review', 'development', 'testing', 'deployment'],
      progressPercentage: 10,
      estimatedDelivery: estimatedDelivery.toISOString(),
      lastUpdate: now.toISOString(),
      nextMilestone: 'payment_confirmation',
      timeline: [
        {
          step: 'order_created',
          status: 'completed',
          completedAt: now.toISOString(),
          estimatedDuration: '1 day',
          description: 'Order has been created and is awaiting payment confirmation',
        },
        {
          step: 'payment_confirmation',
          status: 'pending',
          estimatedDuration: '1-2 days',
          description: 'Payment verification and order confirmation',
        },
        {
          step: 'design_start',
          status: 'pending',
          estimatedDuration: '2-3 days',
          description: 'Initial design concepts and wireframes',
        },
        {
          step: 'design_review',
          status: 'pending',
          estimatedDuration: '1-2 days',
          description: 'Design review and client feedback',
        },
        {
          step: 'development',
          status: 'pending',
          estimatedDuration: '3-5 days',
          description: 'Website development and implementation',
        },
        {
          step: 'testing',
          status: 'pending',
          estimatedDuration: '1-2 days',
          description: 'Quality assurance and testing',
        },
        {
          step: 'deployment',
          status: 'pending',
          estimatedDuration: '1 day',
          description: 'Final deployment and launch',
        },
      ],
    };
  }

  private getStepMapping(status: OrderStatus): { step: string; description: string } {
    const stepMappings = {
      [OrderStatus.PENDING]: { step: 'order_created', description: 'Order has been created' },
      [OrderStatus.CONFIRMED]: { step: 'payment_confirmation', description: 'Payment confirmed' },
      [OrderStatus.IN_PROGRESS]: { step: 'design_start', description: 'Design work in progress' },
      [OrderStatus.COMPLETED]: { step: 'deployment', description: 'Website deployed successfully' },
      [OrderStatus.CANCELLED]: { step: 'order_cancelled', description: 'Order has been cancelled' },
    };

    return stepMappings[status] || { step: 'unknown', description: 'Unknown status' };
  }

  private calculateProgressPercentage(status: OrderStatus): number {
    const progressMappings = {
      [OrderStatus.PENDING]: 10,
      [OrderStatus.CONFIRMED]: 20,
      [OrderStatus.IN_PROGRESS]: 50,
      [OrderStatus.COMPLETED]: 100,
      [OrderStatus.CANCELLED]: 0,
    };

    return progressMappings[status] || 0;
  }

  private getNextStep(status: OrderStatus): string {
    const nextStepMappings = {
      [OrderStatus.PENDING]: 'payment_confirmation',
      [OrderStatus.CONFIRMED]: 'design_start',
      [OrderStatus.IN_PROGRESS]: 'design_review',
      [OrderStatus.COMPLETED]: 'completed',
      [OrderStatus.CANCELLED]: 'none',
    };

    return nextStepMappings[status] || 'unknown';
  }

  private async getOrderById(
    orderId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollectionId = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const { Query } = await import('node-appwrite');

    try {
      if (isAdmin) {
        return await databases.getDocument(databaseId, ordersCollectionId, orderId);
      } else {
        const result = await databases.listDocuments(databaseId, ordersCollectionId, [
          Query.equal('$id', orderId),
          Query.equal('user_id', userId),
          Query.limit(1),
        ]);
        return result.documents[0] || null;
      }
    } catch (error) {
      this.logger.error(`Failed to get order by ID: ${error.message}`);
      return null;
    }
  }

  private mapToEnhancedOrderResponse(order: any): EnhancedOrderResponseDto {
    return {
      id: order.$id,
      title: order.title,
      description: order.description,
      price: order.price,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      transaction_id: order.transaction_id,
                          payment_metadata: order.payment_metadata,
      user_id: order.user_id,
      wizard_data: order.wizard_data,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  private async sendOrderConfirmationEmail(userId: string, order: any): Promise<void> {
    try {
      // Get user profile for email
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendOrderNotification(email, {
          id: order.$id,
          title: order.title,
          price: order.price,
          status: order.status,
          description: order.description,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send order confirmation email: ${error.message}`);
    }
  }

  private async sendPaymentStatusNotification(userId: string, order: any): Promise<void> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: order.$id,
          amount: order.price,
          status: order.payment_status,
          order_title: order.title,
          created_at: order.created_at,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send payment status notification: ${error.message}`);
    }
  }

  private async sendPaymentSuccessNotification(userId: string, order: any, amount: number): Promise<void> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      if (userProfile.documents.length > 0) {
        const email = userProfile.documents[0].email;
        await this.emailService.sendPaymentNotification(email, {
          id: order.$id,
          amount: amount,
          status: 'completed',
          order_title: order.title,
          created_at: order.created_at,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to send payment success notification: ${error.message}`);
    }
  }
}