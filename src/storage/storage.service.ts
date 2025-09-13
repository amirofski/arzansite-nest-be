import { Injectable, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ID } from 'node-appwrite';

@Injectable()
export class StorageService {
  constructor(private readonly appwriteService: AppwriteService) {}

  async uploadFile(
    bucket_id: string,
    file: Express.Multer.File,
    order_id?: string | null,
    user_id?: string | null,
    description?: string | null,
  ): Promise<{ success: boolean; file_id: string; name: string; bucket_id: string; order_id?: string | null; user_id?: string | null; url?: string; mime_type?: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const storage = this.appwriteService.getStorage();
    const databases = this.appwriteService.getDatabases();
    const config = this.appwriteService.getConfig();
    let fileUrl: string | undefined;

    const buffer = file.buffer ?? require('fs').readFileSync((file as any).path);
    const { InputFile } = require('node-appwrite/file');
    const inputFile = InputFile.fromBuffer(buffer, file.originalname);

    const uploaded = await storage.createFile(bucket_id, ID.unique(), inputFile);

    // Persist metadata into project_files
    try {
      const databaseId = config.databaseId;
      const collectionId = process.env.APPWRITE_COLLECTION_PROJECT_FILES || 'project_files';
      const now = new Date().toISOString();

      fileUrl = `${config.endpoint}/storage/buckets/${uploaded.bucketId}/files/${uploaded.$id}/view?project=${config.projectId}`;
      await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        {
          file_id: uploaded.$id,
          user_id: user_id || null,
          order_id: order_id || null,
          bucket_id: uploaded.bucketId,
          storage_bucket: uploaded.bucketId,
          original_name: file.originalname,
          file_name: uploaded.name,
          mime_type: uploaded.mimeType,
          file_type: uploaded.mimeType,
          size: uploaded.sizeOriginal,
          file_size: uploaded.sizeOriginal,
          file_path: fileUrl,
          description: description || null,
          status: 'active',
          created_at: now,
          updated_at: now,
        } as any,
      );
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create project_files record:', e?.message || e);
    }

    return {
      success: true,
      file_id: uploaded.$id,
      name: uploaded.name,
      bucket_id: uploaded.bucketId,
      order_id: order_id || null,
      user_id: user_id || null,
      url: fileUrl,
      mime_type: uploaded.mimeType,
    };
  }
}


