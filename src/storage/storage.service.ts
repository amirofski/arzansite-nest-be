import { Injectable, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { ID } from 'node-appwrite';

@Injectable()
export class StorageService {
  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
  ) {}

  async createUploadUrl(bucketId: string, fileName: string) {
    const storage = this.appwriteService.getStorage();
    if (!bucketId || !fileName) throw new BadRequestException('bucketId and fileName required');
    // Backend cannot generate signed upload URL with Appwrite; provide fileId to upload via client SDK
    const { InputFile } = (await import('node-appwrite')) as any;
    const created = await storage.createFile(bucketId, ID.unique(), InputFile.fromBuffer(Buffer.from(' '), fileName));
    return { fileId: created.$id };
  }

  async getFileViewUrl(bucketId: string, fileId: string) {
    const endpoint = this.configService.get<string>('APPWRITE_ENDPOINT');
    const projectId = this.configService.get<string>('APPWRITE_PROJECT_ID');
    if (!endpoint || !projectId) throw new BadRequestException('Appwrite not configured');
    // Signed URLs require client SDK; backend can proxy if needed
    return { url: `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}` };
  }

  async uploadMultipart(bucketId: string, file: any) {
    const storage = this.appwriteService.getStorage();
    if (!bucketId || !file) throw new BadRequestException('bucketId and file are required');
    const { InputFile } = (await import('node-appwrite')) as any;
    const created = await storage.createFile(bucketId, ID.unique(), InputFile.fromBuffer(file.buffer, file.originalname));
    return { fileId: created.$id };
  }

  async listFiles(bucketId: string, queries: any[] = []) {
    const storage = this.appwriteService.getStorage();
    const res = await storage.listFiles(bucketId, queries);
    return { files: res.files, total: res.total }; // shape depends on SDK version
  }

  async deleteFile(bucketId: string, fileId: string) {
    const storage = this.appwriteService.getStorage();
    await storage.deleteFile(bucketId, fileId);
    return { ok: true };
  }
}


