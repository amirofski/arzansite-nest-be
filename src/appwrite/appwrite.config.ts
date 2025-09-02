import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppwriteConfig {
  constructor(private readonly configService: ConfigService) {}

  get endpoint(): string {
    return this.configService.get<string>('APPWRITE_ENDPOINT');
  }

  get projectId(): string {
    return this.configService.get<string>('APPWRITE_PROJECT_ID');
  }

  get apiKey(): string {
    return this.configService.get<string>('APPWRITE_API_KEY');
  }

  get databaseId(): string {
    return this.configService.get<string>('APPWRITE_DATABASE_ID');
  }

  get webhookSecret(): string {
    return this.configService.get<string>('APPWRITE_WEBHOOK_SECRET');
  }

  // NEW OPTIMIZED COLLECTIONS
  get collections() {
    return {
      users: this.configService.get<string>('APPWRITE_COLLECTION_USERS'),
      orders: this.configService.get<string>('APPWRITE_COLLECTION_ORDERS'),
      payments: this.configService.get<string>('APPWRITE_COLLECTION_PAYMENTS'),
      wizardSessions: this.configService.get<string>('APPWRITE_COLLECTION_WIZARD_SESSIONS'),
      projectFiles: this.configService.get<string>('APPWRITE_COLLECTION_PROJECT_FILES'),
      notifications: this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS'),
      userProfiles: this.configService.get<string>('APPWRITE_COLLECTION_USER_PROFILES'),
      supportTickets: this.configService.get<string>('APPWRITE_COLLECTION_SUPPORT_TICKETS'),
      auditLogs: this.configService.get<string>('APPWRITE_COLLECTION_AUDIT_LOGS'),
      systemSettings: this.configService.get<string>('APPWRITE_COLLECTION_SYSTEM_SETTINGS'),
      authTokens: this.configService.get<string>('APPWRITE_COLLECTION_AUTH_TOKENS'),
      // Additional collections for compatibility
      wallets: this.configService.get<string>('APPWRITE_COLLECTION_WALLETS'),
      transactions: this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS'),
      designs: this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS'),
    };
  }

  // NEW STORAGE BUCKETS
  get storage() {
    return {
      projectFiles: this.configService.get<string>('APPWRITE_STORAGE_PROJECT_FILES'),
      userAvatars: this.configService.get<string>('APPWRITE_STORAGE_USER_AVATARS'),
      designAssets: this.configService.get<string>('APPWRITE_STORAGE_DESIGN_ASSETS'),
    };
  }

  // Legacy buckets (keeping for backward compatibility during transition)
  get buckets() {
    return {
      designs: this.configService.get<string>('APPWRITE_BUCKET_DESIGNS') || 'designs',
      avatars: this.configService.get<string>('APPWRITE_BUCKET_AVATARS') || 'avatars',
      documents: this.configService.get<string>('APPWRITE_BUCKET_DOCUMENTS') || 'documents',
      uploads: this.configService.get<string>('APPWRITE_BUCKET_UPLOADS') || 'uploads',
      files: this.configService.get<string>('APPWRITE_BUCKET_FILES') || 'files',
      images: this.configService.get<string>('APPWRITE_BUCKET_IMAGES') || 'images',
      videos: this.configService.get<string>('APPWRITE_BUCKET_VIDEOS') || 'videos',
      audios: this.configService.get<string>('APPWRITE_BUCKET_AUDIOS') || 'audios',
      general: this.configService.get<string>('APPWRITE_BUCKET_GENERAL') || 'general',
      other: this.configService.get<string>('APPWRITE_BUCKET_OTHER') || 'other',
    };
  }

  validate(): void {
    const required = ['endpoint', 'projectId', 'apiKey', 'databaseId'];
    const missing = required.filter(key => !this[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required Appwrite configuration: ${missing.join(', ')}`);
    }
  }
}
