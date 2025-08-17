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
  mimeType: string;
  bucketId: string;
  bucketName: string;
  uploadedAt: string;
  url?: string;
  userId?: string;
  orderId?: string;
  fileType: 'document' | 'design' | 'avatar';
}

// Extended Appwrite File interface with custom properties
interface AppwriteFileWithMetadata {
  $id: string;
  name: string;
  size: number;
  mimeType: string;
  $createdAt: string;
  userId?: string;
  orderId?: string;
  bucketId?: string;
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

  private getBucketId(fileType: 'document' | 'design' | 'avatar'): string {
    switch (fileType) {
      case 'document':
        return this.configService.get<string>('APPWRITE_BUCKET_DOCUMENTS') || '689ee991001e4f3cb8e5';
      case 'design':
        return this.configService.get<string>('APPWRITE_BUCKET_DESIGNS') || '689ee97c0039e19e0e2f';
      case 'avatar':
        return this.configService.get<string>('APPWRITE_BUCKET_AVATARS') || '689ee98a0019563fff62';
      default:
        throw new BadRequestException('Invalid file type');
    }
  }

  private getBucketName(fileType: 'document' | 'design' | 'avatar'): string {
    switch (fileType) {
      case 'document':
        return 'documents';
      case 'design':
        return 'designs';
      case 'avatar':
        return 'avatars';
      default:
        return 'documents';
    }
  }

  async getAllUploads(userId?: string, orderId?: string): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();
      const allFiles: FileMetadata[] = [];

      // Get files from all buckets
      const bucketTypes: Array<'document' | 'design' | 'avatar'> = ['document', 'design', 'avatar'];

      for (const bucketType of bucketTypes) {
        try {
          const bucketId = this.getBucketId(bucketType);
          const bucketName = this.getBucketName(bucketType);
          
          const files = await storage.listFiles(bucketId);
          
          for (const file of files.files) {
            // Cast to our extended interface
            const fileWithMetadata = file as unknown as AppwriteFileWithMetadata;
            
            const fileMetadata: FileMetadata = {
              id: fileWithMetadata.$id,
              name: fileWithMetadata.name,
              size: fileWithMetadata.size,
              mimeType: fileWithMetadata.mimeType,
              bucketId: bucketId,
              bucketName: bucketName,
              uploadedAt: fileWithMetadata.$createdAt,
              url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucketId}/files/${fileWithMetadata.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
              userId: fileWithMetadata.userId,
              orderId: fileWithMetadata.orderId,
              fileType: bucketType,
            };
            
            // Filter by userId if provided
            if (!userId || fileWithMetadata.userId === userId) {
              // Filter by orderId if provided
              if (!orderId || fileWithMetadata.orderId === orderId) {
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

  async getUploadById(id: string, bucketType?: 'document' | 'design' | 'avatar'): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();
      let file: AppwriteFileWithMetadata | null = null;

      if (bucketType) {
        // Search in specific bucket
        const bucketId = this.getBucketId(bucketType);
        try {
          const rawFile = await storage.getFile(bucketId, id);
          file = rawFile as unknown as AppwriteFileWithMetadata;
        } catch (error) {
          if (error.code === 404) {
            throw new NotFoundException('File not found in specified bucket');
          }
          throw error;
        }
      } else {
        // Search in all buckets
        const bucketTypes: Array<'document' | 'design' | 'avatar'> = ['document', 'design', 'avatar'];
        
        for (const bucketType of bucketTypes) {
          try {
            const bucketId = this.getBucketId(bucketType);
            const rawFile = await storage.getFile(bucketId, id);
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

      const bucketId = file.bucketId || this.getBucketId(bucketType || 'document');
      const bucketName = this.getBucketName(bucketType || 'document');

      const fileMetadata: FileMetadata = {
        id: file.$id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        bucketId: bucketId,
        bucketName: bucketName,
        uploadedAt: file.$createdAt,
        url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
        userId: file.userId,
        orderId: file.orderId,
        fileType: bucketType || 'document',
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
    userId: string,
    orderId?: string,
    fileType: 'document' | 'design' | 'avatar' = 'document',
  ): Promise<FileUploadResponse> {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      const storage = this.getStorage();
      const bucketId = this.getBucketId(fileType);
      const bucketName = this.getBucketName(fileType);

      // Create unique file ID
      const fileId = ID.unique();

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
      const tempFilePath = path.join(tempDir, `${fileId}_${file.originalname}`);
      
      try {
        // Write the buffer to temp file
        fs.writeFileSync(tempFilePath, fileData);
        
        // Create a readable stream from the temp file
        const fileStream = fs.createReadStream(tempFilePath);
        
        // Upload file to Appwrite storage
        const rawUploadedFile = await storage.createFile(
          bucketId,
          fileId,
          fileStream
        );
        
        const uploadedFile = rawUploadedFile as unknown as AppwriteFileWithMetadata;

        const fileMetadata: FileMetadata = {
          id: uploadedFile.$id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          bucketId: bucketId,
          bucketName: bucketName,
          uploadedAt: uploadedFile.$createdAt,
          url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
          userId,
          orderId,
          fileType,
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

  async deleteUpload(id: string, bucketType?: 'document' | 'design' | 'avatar'): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();

      if (bucketType) {
        // Delete from specific bucket
        const bucketId = this.getBucketId(bucketType);
        await storage.deleteFile(bucketId, id);
      } else {
        // Try to delete from all buckets
        const bucketTypes: Array<'document' | 'design' | 'avatar'> = ['document', 'design', 'avatar'];
        let deleted = false;

        for (const bucketType of bucketTypes) {
          try {
            const bucketId = this.getBucketId(bucketType);
            await storage.deleteFile(bucketId, id);
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
        data: { message: 'File deleted successfully', fileId: id },
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

  async getFilesByOrder(orderId: string): Promise<FileUploadResponse> {
    try {
      const storage = this.getStorage();
      const allFiles: FileMetadata[] = [];

      // Get files from all buckets for specific order
      const bucketTypes: Array<'document' | 'design' | 'avatar'> = ['document', 'design', 'avatar'];

      for (const bucketType of bucketTypes) {
        try {
          const bucketId = this.getBucketId(bucketType);
          const bucketName = this.getBucketName(bucketType);
          
          const files = await storage.listFiles(bucketId);
          
          for (const file of files.files) {
            // Cast to our extended interface
            const fileWithMetadata = file as unknown as AppwriteFileWithMetadata;
            
            if (fileWithMetadata.orderId === orderId) {
              const fileMetadata: FileMetadata = {
                id: fileWithMetadata.$id,
                name: fileWithMetadata.name,
                size: fileWithMetadata.size,
                mimeType: fileWithMetadata.mimeType,
                bucketId: bucketId,
                bucketName: bucketName,
                uploadedAt: fileWithMetadata.$createdAt,
                url: `${this.configService.get('APPWRITE_ENDPOINT')}/storage/buckets/${bucketId}/files/${fileWithMetadata.$id}/view?project=${this.configService.get('APPWRITE_PROJECT_ID')}`,
                userId: fileWithMetadata.userId,
                orderId: fileWithMetadata.orderId,
                fileType: bucketType,
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
