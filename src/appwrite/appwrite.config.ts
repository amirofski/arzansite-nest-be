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

  // Collection IDs
  get collections() {
    return {
      orders: this.configService.get<string>('APPWRITE_COLLECTION_ORDERS'),
      designs: this.configService.get<string>('APPWRITE_COLLECTION_DESIGNS'),
      wallets: this.configService.get<string>('APPWRITE_COLLECTION_WALLETS'),
      transactions: this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS'),
      paymentTransactions: this.configService.get<string>('APPWRITE_COLLECTION_PAYMENT_TRANSACTIONS'),
      profiles: this.configService.get<string>('APPWRITE_COLLECTION_PROFILES'),
      userRoles: this.configService.get<string>('APPWRITE_COLLECTION_USER_ROLES'),
      emailLogs: this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_LOGS'),
      siteConfig: this.configService.get<string>('APPWRITE_COLLECTION_SITE_CONFIG'),
    };
  }

  // Bucket IDs
  get buckets() {
    return {
      designs: this.configService.get<string>('APPWRITE_BUCKET_DESIGNS') || 'designs',
      avatars: this.configService.get<string>('APPWRITE_BUCKET_AVATARS') || 'avatars',
      documents: this.configService.get<string>('APPWRITE_BUCKET_DOCUMENTS') || 'documents',
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
