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
    order_id: string,
    user_id: string,
    saveDesignDto: SaveDesignDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(order_id, user_id, isAdmin);

    // Upsert design document in Appwrite
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');

    const existing = await databases.listDocuments(databaseId, designsCollection, [
      Query.equal('order_id', order_id),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      await databases.updateDocument(databaseId, designsCollection, existing.documents[0].$id, {
        design: saveDesignDto.design,
        updated_at: new Date().toISOString(),
      } as any);
    } else {
      await databases.createDocument(databaseId, designsCollection, ID.unique(), {
        order_id: order_id,
        design: saveDesignDto.design,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    // Update design options if provided
    if (saveDesignDto.options) {
      await this.updateDesignOptions(order_id, user_id, { options: saveDesignDto.options }, isAdmin);
    }

    return { ok: true };
  }

  async getDesign(
    order_id: string,
    user_id: string,
    isAdmin: boolean = false,
  ): Promise<{ design: any }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(order_id, user_id, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const designsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS');
    const existing = await databases.listDocuments(databaseId, designsCollection, [
      Query.equal('order_id', order_id),
      Query.limit(1),
    ]);
    const doc: any = existing.documents[0] || null;
    return { design: doc?.design || null };
  }

  async getDesignOptions(
    order_id: string,
    user_id: string,
    isAdmin: boolean = false,
  ): Promise<{ options: any }> {
    // Check order ownership or admin access
    const order = await this.ordersService.getOrder(order_id, user_id, isAdmin);

    return { options: order.design_options || null };
  }

  async updateDesignOptions(
    order_id: string,
    user_id: string,
    updateDesignOptionsDto: UpdateDesignOptionsDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(order_id, user_id, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    await databases.updateDocument(databaseId, ordersCollection, order_id, {
      design_options: updateDesignOptionsDto.options,
      updated_at: new Date().toISOString(),
    } as any);

    return { ok: true };
  }

  async updatePreviewUrl(
    order_id: string,
    user_id: string,
    updatePreviewUrlDto: UpdatePreviewUrlDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(order_id, user_id, isAdmin);

    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
    await databases.updateDocument(databaseId, ordersCollection, order_id, {
      design_preview_url: updatePreviewUrlDto.previewUrl,
      updated_at: new Date().toISOString(),
    } as any);

    return { ok: true };
  }
}
