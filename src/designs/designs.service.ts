import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { OrdersService } from '../orders/orders.service';
import { SaveDesignDto, UpdateDesignOptionsDto, UpdatePreviewUrlDto } from './dto/design.dto';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';

@Injectable()
export class DesignsService {
  constructor(
    private appwriteService: AppwriteService,
    private ordersService: OrdersService,
    private configService: ConfigService,
  ) {}

  async saveDesign(
    orderId: string,
    userId: string,
    saveDesignDto: SaveDesignDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    // Upsert design document in Appwrite
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');

    const existing = await databases.listDocuments(databaseId, designsCollection, [
      Query.equal('order_id', orderId),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      await databases.updateDocument(databaseId, designsCollection, existing.documents[0].$id, {
        design: saveDesignDto.design,
        updated_at: new Date().toISOString(),
      } as any);
    } else {
      await databases.createDocument(databaseId, designsCollection, ID.unique(), {
        order_id: orderId,
        design: saveDesignDto.design,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    // Update design options if provided
    if (saveDesignDto.options) {
      await this.updateDesignOptions(orderId, userId, { options: saveDesignDto.options }, isAdmin);
    }

    return { ok: true };
  }

  async getDesign(
    orderId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ design: any }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');
    const existing = await databases.listDocuments(databaseId, designsCollection, [
      Query.equal('order_id', orderId),
      Query.limit(1),
    ]);
    const doc: any = existing.documents[0] || null;
    return { design: doc?.design || null };
  }

  async getDesignOptions(
    orderId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ options: any }> {
    // Check order ownership or admin access
    const order = await this.ordersService.getOrder(orderId, userId, isAdmin);

    return { options: order.design_options || null };
  }

  async updateDesignOptions(
    orderId: string,
    userId: string,
    updateDesignOptionsDto: UpdateDesignOptionsDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    await databases.updateDocument(databaseId, ordersCollection, orderId, {
      design_options: updateDesignOptionsDto.options,
      updated_at: new Date().toISOString(),
    } as any);

    return { ok: true };
  }

  async updatePreviewUrl(
    orderId: string,
    userId: string,
    updatePreviewUrlDto: UpdatePreviewUrlDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    await databases.updateDocument(databaseId, ordersCollection, orderId, {
      design_preview_url: updatePreviewUrlDto.previewUrl,
      updated_at: new Date().toISOString(),
    } as any);

    return { ok: true };
  }
}
