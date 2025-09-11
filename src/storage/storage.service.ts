import { Injectable, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService {
  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeKey(key: string): string {
    return key.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
  }

  private resolveBucketId(input?: string): string {
    // Accept direct bucket ID or friendly bucket key
    const cfg = this.appwriteService.getConfig() as any;
    const storage = (cfg.storage || {}) as { projectFiles?: string; userAvatars?: string; designAssets?: string };
    const legacy = (cfg.buckets || {}) as Record<string, string>;

    // If input looks like an ID and not a key we know, return it
    if (input && input.length > 0) {
      const key = this.normalizeKey(input);
      // Map common friendly names to configured buckets
      const map: Record<string, string | undefined> = {
        // modern
        'project-files': storage.projectFiles,
        'project_files': storage.projectFiles,
        'project': storage.projectFiles,
        'documents': legacy.documents || undefined,
        'uploads': legacy.uploads || storage.projectFiles,
        'design-assets': storage.designAssets,
        'design_assets': storage.designAssets,
        'design': storage.designAssets || legacy.designs,
        'users-avatars': storage.userAvatars,
        'user-avatars': storage.userAvatars,
        'users_avatars': storage.userAvatars,
        'user_avatars': storage.userAvatars,
        'avatars': legacy.avatars || storage.userAvatars,
      };

      if (map[key]) return map[key] as string;

      // Try exact match against legacy keys
      if (legacy[key]) return legacy[key];

      // As a last resort, assume caller passed an actual bucket ID
      return input;
    }

    // Default preference order
    return storage.projectFiles || legacy.uploads || legacy.documents || legacy.files || 'uploads';
  }

  async createUploadUrl(bucket_id: string, file_name: string) {
    if (!file_name) throw new BadRequestException('file_name required');
    const resolvedBucket = this.resolveBucketId(bucket_id);
    // Not implemented: Signed upload URLs. Provide guidance response
    return {
      bucket_id: resolvedBucket,
      message: 'Use POST /api/storage/uploads with multipart form-data (file) and optional bucket/bucketType',
    };
  }

  async getFileViewUrl(bucket_id: string, file_id: string) {
    const resolvedBucket = this.resolveBucketId(bucket_id);
    const config = this.appwriteService.getConfig();
    const url = `${config.endpoint}/storage/buckets/${resolvedBucket}/files/${file_id}/view?project=${config.projectId}`;
    
    return { url };
  }

  async uploadMultipart(bucketNameOrId: string | undefined, file: any) {
    if (!file) throw new BadRequestException('file is required');
    const bucket_id = this.resolveBucketId(bucketNameOrId);

    const storage = this.appwriteService.getStorage();

    // Prepare buffer/stream
    let fileData: Buffer;
    if (file.buffer) {
      fileData = file.buffer;
    } else if (file.path) {
      const fs = require('fs');
      fileData = fs.readFileSync(file.path);
    } else {
      throw new BadRequestException('Invalid file data');
    }

    const { ID } = await import('node-appwrite');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const file_id = ID.unique();
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${file_id}_${file.originalname || 'upload.bin'}`);

    try {
      fs.writeFileSync(tempFilePath, fileData);
      const fileStream = fs.createReadStream(tempFilePath);
      const uploaded = await storage.createFile(bucket_id, file_id, fileStream);
      const config = this.appwriteService.getConfig();
      const url = `${config.endpoint}/storage/buckets/${bucket_id}/files/${(uploaded as any).$id}/view?project=${config.projectId}`;
      return { file_id: (uploaded as any).$id, url };
    } finally {
      try { fs.unlinkSync(tempFilePath); } catch {}
    }
  }

  async listFiles(bucketNameOrId?: string, queries: any[] = []) {
    const bucket_id = this.resolveBucketId(bucketNameOrId);
    const res = await this.appwriteService.listFiles(bucket_id, queries);
    return { files: res.files, total: res.total };
  }

  async deleteFile(bucketNameOrId: string, file_id: string) {
    const bucket_id = this.resolveBucketId(bucketNameOrId);
    await this.appwriteService.deleteFile(bucket_id, file_id);
    return { ok: true };
  }
}


