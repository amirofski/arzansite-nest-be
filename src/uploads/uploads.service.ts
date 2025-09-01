import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { ID } from 'node-appwrite';

export interface FileUploadResponse {
  success: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
  timestamp: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  bucket_id: string;
  bucketName: string;
  uploadedAt: string;
  url?: string;
  user_id?: string;
  order_id?: string;
  fileType: string;
}

// Extended Appwrite File interface with custom properties
interface AppwriteFileWithMetadata {
  $id: string;
  name: string;
  size: number;
  mime_type: string;
  $created_at: string;
  user_id?: string;
  order_id?: string;
  bucket_id?: string;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
  ) {}

  private getStorage() {
    return this.appwriteService.getStorage();
  }

  private getBucketId(bucketKey?: string): string {
    const config = this.appwriteService.getConfig();
    const buckets = (config as any).buckets as Record<string, string>;
    const keys = Object.keys(buckets);
    if (!keys.length) throw new BadRequestException('No buckets configured');
    if (!bucketKey) return buckets[keys[0]];
    const key = String(bucketKey).toLowerCase();
    if (buckets[key]) return buckets[key];
    // simple pluralization attempts without hardcoding names
    if (buckets[`${key}s`]) return buckets[`${key}s`];
    if (buckets[`${key}es`]) return buckets[`${key}es`];
    return buckets[keys[0]];
  }

  private getBucketName(bucketKey?: string): string {
    if (!bucketKey) {
      const config = this.appwriteService.getConfig();
      const buckets = (config as any).buckets as Record<string, string>;
      const keys = Object.keys(buckets);
      return keys[0];
    }
    return String(bucketKey).toLowerCase();
  }

  /**
   * Map external category names to internal bucket types
   */
  public resolveBucketType(category?: string): string {
    const key = (category || '').toLowerCase();
    const config = this.appwriteService.getConfig();
    const buckets = (config as any).buckets as Record<string, string>;
    if (!key) return Object.keys(buckets)[0];
    if (buckets[key]) return key;
    if (buckets[`${key}s`]) return `${key}s`;
    if (buckets[`${key}es`]) return `${key}es`;
    return Object.keys(buckets)[0];
  }

  async getAllUploads(user_id?: string, order_id?: string): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();
      const allFiles: FileMetadata[] = [];

      // Get files from all configured buckets
      const buckets = (this.appwriteService.getConfig() as any).buckets as Record<string, string>;
      const bucketTypes: string[] = Object.keys(buckets);

      for (const bucketType of bucketTypes) {
        try {
          const bucketName = this.getBucketName(bucketType);
          const bucket_id = this.getBucketId(bucketName);
          
          const files = await storage.listFiles(bucket_id);
          
          for (const file of files.files) {
            // Cast to our extended interface
            const fileWithMetadata = file as unknown as AppwriteFileWithMetadata;
            
            const fileMetadata: FileMetadata = {
              id: fileWithMetadata.$id,
              name: fileWithMetadata.name,
              size: fileWithMetadata.size,
              mime_type: fileWithMetadata.mime_type,
              bucket_id: bucket_id,
              bucketName: bucketName,
              uploadedAt: fileWithMetadata.$created_at,
              url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucket_id}/files/${fileWithMetadata.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
              user_id: fileWithMetadata.user_id,
              order_id: fileWithMetadata.order_id,
              fileType: bucketName,
            };
            
            // Filter by user_id if provided
            if (!user_id || fileWithMetadata.user_id === user_id) {
              // Filter by order_id if provided
              if (!order_id || fileWithMetadata.order_id === order_id) {
                allFiles.push(fileMetadata);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch files from ${bucketType} bucket:`, error.message);
        }
      }

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      return {
        success: true,
        data: allFiles,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch uploads',
        errorCode: 'UPLOADS_FETCH_ERROR',
        errorDetails: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUploadById(id: string, bucketType?: string): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();
      let file: AppwriteFileWithMetadata | null = null;

      if (bucketType) {
        // Search in specific bucket
        const bucket_id = this.getBucketId(bucketType);
        try {
          const rawFile = await storage.getFile(bucket_id, id);
          file = rawFile as unknown as AppwriteFileWithMetadata;
        } catch (error) {
          if (error.code === 404) {
            throw new NotFoundException('File not found in specified bucket');
          }
          throw error;
        }
      } else {
        // Search in all buckets
        const buckets = (this.appwriteService.getConfig() as any).buckets as Record<string, string>;
        const bucketTypes: string[] = Object.keys(buckets);
        
        for (const bucketType of bucketTypes) {
          try {
            const bucket_id = this.getBucketId(bucketType);
            const rawFile = await storage.getFile(bucket_id, id);
            file = rawFile as unknown as AppwriteFileWithMetadata;
            break; // Found the file
          } catch (error) {
            if (error.code === 404) {
              continue; // Try next bucket
            }
            throw error;
          }
        }

        if (!file) {
          throw new NotFoundException('File not found in any bucket');
        }
      }

      const bucketName = this.getBucketName(bucketType);
      const bucket_id = file.bucket_id || this.getBucketId(bucketName);

      const fileMetadata: FileMetadata = {
        id: file.$id,
        name: file.name,
        size: file.size,
        mime_type: file.mime_type,
        bucket_id: bucket_id,
        bucketName: bucketName,
        uploadedAt: file.$created_at,
        url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucket_id}/files/${file.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
        user_id: file.user_id,
        order_id: file.order_id,
        fileType: bucketName,
      };

      return {
        success: true,
        data: fileMetadata,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          error: 'File not found',
          errorCode: 'FILE_NOT_FOUND',
          errorDetails: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        error: 'Failed to fetch file',
        errorCode: 'FILE_FETCH_ERROR',
        errorDetails: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    user_id: string,
    order_id?: string,
    fileType?: string,
    description?: string,
  ): Promise<FileUploadResponse> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      const storage = this.getStorage();
      const bucketName = this.getBucketName(fileType);
      const bucket_id = this.getBucketId(bucketName);

      // Create unique file ID
      const file_id = ID.unique();

      // Prepare file data for Appwrite
      let fileData: Buffer;
      if (file.buffer) {
        fileData = file.buffer;
      } else if (file.path) {
        // If we have a file path, we need to read it as a buffer
        const fs = require('fs');
        fileData = fs.readFileSync(file.path);
      } else {
        throw new BadRequestException('Invalid file data');
      }

      // For node-appwrite v13, we need to use a different approach
      // The createFile method expects a File object, not a Buffer
      // We'll need to create a temporary file and use its path
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      
      // Create a temporary file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `${file_id}_${file.originalname}`);
      
      try {
        // Write the buffer to temp file
        fs.writeFileSync(tempFilePath, fileData);
        
        // Create a readable stream from the temp file
        const fileStream = fs.createReadStream(tempFilePath);
        
        // Upload file to Appwrite storage
        const rawUploadedFile = await storage.createFile(
          bucket_id,
          file_id,
          fileStream
        );
        
        const uploadedFile = rawUploadedFile as unknown as AppwriteFileWithMetadata;

        // Persist mapping to database for fast queries
        try {
          const databases = this.appwriteService.getDatabases();
          const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
          const mappingCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROJECT_FILES') || 'project_files';
          await databases.createDocument(
            databaseId,
            mappingCollection,
            ID.unique(),
            {
              file_id: uploadedFile.$id,
              user_id: user_id,
              order_id: order_id || null,
              bucket_id: bucket_id,
              original_name: uploadedFile.name,
              mime_type: uploadedFile.mime_type,
              size: uploadedFile.size,
              description: description || null,
              created_at: new Date().toISOString(),
            } as any,
          );
        } catch (e) {
          // Log but do not fail the upload if mapping write fails
          console.warn('Failed to persist file mapping:', (e as any)?.message);
        }

        const fileMetadata: FileMetadata = {
          id: uploadedFile.$id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          mime_type: uploadedFile.mime_type,
          bucket_id: bucket_id,
          bucketName: bucketName,
          uploadedAt: uploadedFile.$created_at,
          url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucket_id}/files/${uploadedFile.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
          user_id,
          order_id,
          fileType: bucketName,
        };

        return {
          success: true,
          data: fileMetadata,
          timestamp: new Date().toISOString(),
        };
      } finally {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError.message);
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to upload file',
        errorCode: 'UPLOAD_FAILED',
        errorDetails: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteUpload(id: string, bucketType?: string): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();

      if (bucketType) {
        // Delete from specific bucket
        const bucket_id = this.getBucketId(bucketType);
        await storage.deleteFile(bucket_id, id);
      } else {
        // Try to delete from all buckets
        const buckets = (this.appwriteService.getConfig() as any).buckets as Record<string, string>;
        const bucketTypes: string[] = Object.keys(buckets);
        let deleted = false;

        for (const bucketType of bucketTypes) {
          try {
            const bucket_id = this.getBucketId(bucketType);
            await storage.deleteFile(bucket_id, id);
            deleted = true;
            break;
          } catch (error) {
            if (error.code === 404) {
              continue; // Try next bucket
            }
            throw error;
          }
        }

        if (!deleted) {
          throw new NotFoundException('File not found in any bucket');
        }
      }

      return {
        success: true,
        data: { message: 'File deleted successfully', file_id: id },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          error: 'File not found',
          errorCode: 'FILE_NOT_FOUND',
          errorDetails: error.message,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: false,
        error: 'Failed to delete file',
        errorCode: 'DELETE_FAILED',
        errorDetails: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getFilesByOrder(order_id: string): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();
      const allFiles: FileMetadata[] = [];

      // Get files from all configured buckets for specific order
      const buckets = (this.appwriteService.getConfig() as any).buckets as Record<string, string>;
      const bucketTypes: string[] = Object.keys(buckets);

      for (const bucketType of bucketTypes) {
        try {
          const bucketName = this.getBucketName(bucketType);
          const bucket_id = this.getBucketId(bucketName);
          
          const files = await storage.listFiles(bucket_id);
          
          for (const file of files.files) {
            // Cast to our extended interface
            const fileWithMetadata = file as unknown as AppwriteFileWithMetadata;
            
            if (fileWithMetadata.order_id === order_id) {
              const fileMetadata: FileMetadata = {
                id: fileWithMetadata.$id,
                name: fileWithMetadata.name,
                size: fileWithMetadata.size,
                mime_type: fileWithMetadata.mime_type,
                bucket_id: bucket_id,
                bucketName: bucketName,
                uploadedAt: fileWithMetadata.$created_at,
                url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucket_id}/files/${fileWithMetadata.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
                user_id: fileWithMetadata.user_id,
                order_id: fileWithMetadata.order_id,
                fileType: bucketName,
              };
              
              allFiles.push(fileMetadata);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch files from ${bucketType} bucket:`, error.message);
        }
      }

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      return {
        success: true,
        data: allFiles,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch order files',
        errorCode: 'ORDER_FILES_FETCH_ERROR',
        errorDetails: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
