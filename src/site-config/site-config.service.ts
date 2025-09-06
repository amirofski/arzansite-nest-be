import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { SiteConfig } from '../common/types/database.types';
import { UpdateSiteConfigDto, SiteMode } from './dto/site-config.dto';
import { SiteConfigGateway } from './site-config.gateway';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';

@Injectable()
export class SiteConfigService {
  constructor(
    private appwriteService: AppwriteService,
    private siteConfigGateway: SiteConfigGateway,
    private configService: ConfigService,
  ) {}

  async getCurrentConfig(): Promise<{ mode: SiteMode }> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_SITE_CONFIG');
      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.orderDesc('created_at'),
          Query.limit(1),
        ],
      );
      const doc: any = res.documents[0];
      if (!doc) return { mode: SiteMode.NORMAL };
      return { mode: doc.mode };
    } catch (error) {
      // If collection is missing or any error occurs, default to NORMAL mode
      return { mode: SiteMode.NORMAL };
    }
  }

  async updateConfig(updateSiteConfigDto: UpdateSiteConfigDto): Promise<{ mode: SiteMode }> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_SITE_CONFIG');
    const data = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      {
        mode: updateSiteConfigDto.mode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
    );

    // Broadcast the change via WebSocket
    this.siteConfigGateway.broadcastModeUpdate(updateSiteConfigDto.mode);

    return { mode: (data as any).mode };
  }

  async getConfigHistory(limit: number = 10): Promise<SiteConfig[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_SITE_CONFIG');
    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.orderDesc('created_at'),
        Query.limit(limit),
      ],
    );
    return (res.documents as any) || [];
  }
}
