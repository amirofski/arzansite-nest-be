import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Profile } from '../common/types/database.types';
import { UpdateProfileDto } from './dto/profile.dto';
import { ConfigService } from '@nestjs/config';
import { ID } from 'node-appwrite';

@Injectable()
export class ProfilesService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async getProfile(userId: string): Promise<Profile> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
    const { Query } = await import('node-appwrite');
    const existing = await databases.listDocuments(databaseId, profilesCollection, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);
    const doc: any = existing.documents[0];
    if (!doc) throw new NotFoundException('Profile not found');
    return doc as any;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
    const { Query } = await import('node-appwrite');
    const existing = await databases.listDocuments(databaseId, profilesCollection, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);
    const doc: any = existing.documents[0];
    if (!doc) throw new NotFoundException('Profile not found');
    const updated = await databases.updateDocument(databaseId, profilesCollection, doc.$id, {
      ...updateProfileDto,
      updated_at: new Date().toISOString(),
    } as any);
    return updated as any;
  }

  async createProfileIfNotExists(userId: string, email: string): Promise<Profile> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
    const { Query } = await import('node-appwrite');
    const existing = await databases.listDocuments(databaseId, profilesCollection, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);
    if (existing.documents[0]) return existing.documents[0] as any;
    const now = new Date().toISOString();
    const doc = await databases.createDocument(databaseId, profilesCollection, ID.unique(), {
      user_id: userId,
      userId: userId, // legacy/camelCase compatibility
      email,
      full_name: '',
      created_at: now,
      updated_at: now,
      createdAt: now,
      updatedAt: now,
    } as any);
    return doc as any;
  }

  async getAllProfiles(): Promise<Profile[]> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
    const { Query } = await import('node-appwrite');
    const res = await databases.listDocuments(databaseId, profilesCollection, [Query.orderDesc('created_at')]);
    return (res.documents as any) || [];
  }
}
