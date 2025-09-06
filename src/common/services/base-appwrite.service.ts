import { Injectable } from '@nestjs/common';
import { AppwriteService } from '../../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import {
  mapAppwriteToDatabase,
  mapDatabaseToAppwrite,
  getDatabaseField,
  getAppwriteField,
  validateSnakeCaseFields,
} from '../utils/field-mapper.util';
import { ID, Query } from 'node-appwrite';

@Injectable()
export abstract class BaseAppwriteService {
  protected abstract readonly collectionId: string;

  constructor(
    protected readonly appwriteService: AppwriteService,
    protected readonly configService: ConfigService,
  ) {}

  protected get databases() {
    return this.appwriteService.getDatabases();
  }

  protected get databaseId(): string {
    return this.configService.get<string>('APPWRITE_DATABASE_ID');
  }

  // Create a document with automatic field mapping
  protected async createDocument<T = any>(
    data: Record<string, any>,
    documentId?: string,
  ): Promise<T> {
    const mappedData = mapAppwriteToDatabase(data);
    const doc = await this.databases.createDocument(
      this.databaseId,
      this.collectionId,
      documentId || ID.unique(),
      mappedData,
    );
    return mapDatabaseToAppwrite(doc) as T;
  }

  // Get a document by ID with automatic field mapping
  protected async getDocument<T = any>(documentId: string): Promise<T | null> {
    try {
      const doc = await this.databases.getDocument(
        this.databaseId,
        this.collectionId,
        documentId,
      );
      return mapDatabaseToAppwrite(doc) as T;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  // Update a document with automatic field mapping
  protected async updateDocument<T = any>(
    documentId: string,
    data: Record<string, any>,
  ): Promise<T> {
    const mappedData = mapAppwriteToDatabase(data);
    const doc = await this.databases.updateDocument(
      this.databaseId,
      this.collectionId,
      documentId,
      mappedData,
    );
    return mapDatabaseToAppwrite(doc) as T;
  }

  // Delete a document
  protected async deleteDocument(documentId: string): Promise<void> {
    await this.databases.deleteDocument(
      this.databaseId,
      this.collectionId,
      documentId,
    );
  }

  // List documents with automatic field mapping
  protected async listDocuments<T = any>(
    queries: string[] = [],
    _limit: number = 25,
    _offset: number = 0,
  ): Promise<{ documents: T[]; total: number }> {
    const result = await this.databases.listDocuments(
      this.databaseId,
      this.collectionId,
      queries,
    );

    const mappedDocuments = result.documents.map((doc: any) =>
      mapDatabaseToAppwrite(doc),
    ) as T[];

    return { documents: mappedDocuments, total: result.total };
  }

  // Find documents by field with automatic mapping
  protected async findDocuments<T = any>(
    field: string,
    value: any,
    limit: number = 25,
    offset: number = 0,
  ): Promise<{ documents: T[]; total: number }> {
    const databaseField = getDatabaseField(field);
    const queries = [Query.equal(databaseField, value), Query.limit(limit), Query.offset(offset)];
    return this.listDocuments<T>(queries, limit, offset);
  }

  // Find single document
  protected async findDocument<T = any>(field: string, value: any): Promise<T | null> {
    const result = await this.findDocuments<T>(field, value, 1, 0);
    return result.documents.length > 0 ? result.documents[0] : null;
  }

  protected validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = validateSnakeCaseFields(data, requiredFields);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  protected toDatabaseField(field: string): string {
    return getDatabaseField(field);
  }

  protected toAppwriteField(field: string): string {
    return getAppwriteField(field);
  }
}
