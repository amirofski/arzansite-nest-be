import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';
import { Order } from '../common/types/database.types';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BaseAppwriteService } from '../common/services/base-appwrite.service';

@Injectable()
export class OrdersService extends BaseAppwriteService {
  protected readonly collectionId = 'orders';

  constructor(
    appwriteService: AppwriteService,
    configService: ConfigService,
  ) {
    super(appwriteService, configService);
  }

  async getOrders(userId: string, isAdmin: boolean = false): Promise<Order[]> {
    const queries: string[] = [Query.orderDesc('created_at')];
    
    if (!isAdmin) {
      queries.push(Query.equal('user_id', userId));
    }

    const result = await this.listDocuments<Order>(queries);
    return result.documents;
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
    // Extract title and description from the payload
    const title = createOrderDto.title || `Order for ${createOrderDto.site_type || 'website'}`;
    const description = createOrderDto.description || `Website order from wizard session ${createOrderDto.session_id}`;
    const price = createOrderDto.price || createOrderDto.wizard_data?.pricing?.totalPrice || 0;

    // Consolidate all wizard data into one field
    const wizardData = {
      site_type: createOrderDto.site_type,
      website_framework: createOrderDto.wizard_data?.website_framework,
      branding: createOrderDto.wizard_data?.branding,
      additional_services: createOrderDto.wizard_data?.additional_services,
      domains: createOrderDto.wizard_data?.domains,
      pricing: createOrderDto.wizard_data?.pricing,
      session_id: createOrderDto.session_id
    };

    const orderData = {
      // Basic order fields
      title,
      description,
      price,
      userId,
      status: 'pending',
      payment_status: createOrderDto.payment_status || 'pending',
      comments: createOrderDto.comments,
      total_pages: createOrderDto.total_pages || createOrderDto.wizard_data?.website_framework?.dynamicDesign?.pages?.length || 0,
      total_sections: createOrderDto.total_sections || 
        createOrderDto.wizard_data?.website_framework?.dynamicDesign?.pages?.reduce((total, page) => total + (page.sections?.length || 0), 0) || 0,
      
      // Consolidated wizard data
      wizard_data: JSON.stringify(wizardData),
      
      // Payment fields
      payment_gateway: createOrderDto.payment_gateway,
      callback_url: createOrderDto.callback_url,
      return_url: createOrderDto.return_url,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.createDocument<Order>(orderData);
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
    if (updateOrderDto.price !== undefined) updateData.price = updateOrderDto.price;
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
}
