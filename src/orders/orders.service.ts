import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { ID } from 'node-appwrite';
import { Order } from '../common/types/database.types';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async getOrders(userId: string, isAdmin: boolean = false): Promise<Order[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const { Query } = await import('node-appwrite');

    const queries: string[] = [Query.orderDesc('created_at')];
    if (!isAdmin) queries.push(Query.equal('user_id', userId));

    const result = await databases.listDocuments(databaseId, ordersCollection, queries);
    return (result.documents as any) || [];
  }

  async getOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<Order> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const data = await databases.getDocument(databaseId, ordersCollection, orderId).catch(() => null);

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
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');

    const orderDoc = await databases.createDocument(databaseId, ordersCollection, ID.unique(), {
      ...createOrderDto,
      user_id: userId,
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    return orderDoc as any;
  }

  async updateOrder(
    orderId: string,
    userId: string,
    updateOrderDto: UpdateOrderDto,
    isAdmin: boolean = false,
  ): Promise<Order> {
    // Check ownership or admin access
    await this.getOrder(orderId, userId, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');

    const updated = await databases.updateDocument(databaseId, ordersCollection, orderId, {
      ...updateOrderDto,
      updated_at: new Date().toISOString(),
    } as any);

    return updated as any;
  }

  async deleteOrder(orderId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    // Check ownership or admin access
    await this.getOrder(orderId, userId, isAdmin);
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    await databases.deleteDocument(databaseId, ordersCollection, orderId);
  }

  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: string,
    zarinpalAuthority?: string,
    zarinpalRefId?: string,
  ): Promise<Order> {
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (zarinpalAuthority) {
      updateData.zarinpal_authority = zarinpalAuthority;
    }

    if (zarinpalRefId) {
      updateData.zarinpal_ref_id = zarinpalRefId;
    }

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    const updated = await databases.updateDocument(databaseId, ordersCollection, orderId, updateData as any);
    return updated as any;
  }
}
