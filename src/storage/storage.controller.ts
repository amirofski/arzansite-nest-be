import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Post,
  Body,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../common/guards/jwt.guard';
import { StorageService } from './storage.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Query as AWQuery } from 'node-appwrite';
import {
  ListFilesDto,
  ListFilesResponseDto,
  FileResponseDto,
  FileUrlResponseDto,
} from '../appwrite/dto/storage.dto';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly storageService: StorageService,
  ) {}

  @Post('upload/:bucket_id')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ALLOWED_MIME_TYPES = new Set([
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/pdf',
        'text/plain'
      ]);
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new BadRequestException('Invalid file type'), false);
      }
      cb(null, true);
    },
  }))
  @ApiOperation({ summary: 'Upload file', description: 'Upload a file to the specified bucket' })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload' },
        order_id: { type: 'string', description: 'Optional order ID to associate the file with' },
        description: { type: 'string', description: 'Optional description for the file' },
      },
      required: ['file']
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @Param('bucket_id') bucket_id: string,
    @UploadedFile() file: any,
    @Body('order_id') order_id?: string,
    @Body('description') description?: string,
    @Request() req?: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    // Enforce bucket allowlist
    const config = this.appwriteService.getConfig() as any;
    const modern = [config.storage?.projectFiles, config.storage?.userAvatars, config.storage?.designAssets].filter(Boolean);
    const legacy = config.buckets ? Object.values(config.buckets).filter(Boolean) : [];
    const allowedBuckets = new Set<string>([...modern as string[], ...legacy as string[]]);
    if (allowedBuckets.size > 0 && !allowedBuckets.has(bucket_id)) {
      throw new BadRequestException('Bucket not allowed');
    }

    const user_id = req?.user?.id || req?.user?.user_id || null;
    return await this.storageService.uploadFile(bucket_id, file, order_id, user_id, description || null);
  }

  @Get(':bucket_id/:file_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get file', description: 'Retrieve file information by ID from the specified bucket' })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully', type: FileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('bucket_id') bucket_id: string,
    @Param('file_id') file_id: string,
  ): Promise<FileResponseDto> {
    const file = await this.appwriteService.getFile(bucket_id, file_id);
    return {
      $id: file.$id,
      bucket_id: file.bucketId,
      name: file.name,
      mime_type: file.mimeType,
      $createdAt: file.$createdAt,
      $updatedAt: file.$updatedAt,
      $permissions: file.$permissions,
    };
  }

  @Delete(':bucket_id/:file_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file', description: 'Delete a file from the specified bucket' })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully', schema: { example: { success: true } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('bucket_id') bucket_id: string,
    @Param('file_id') file_id: string,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    // Authorization: allow admin or owner only
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.appwriteService.getConfig().databaseId;
    const collectionId = process.env.APPWRITE_COLLECTION_PROJECT_FILES || 'project_files';

    const found = await databases.listDocuments(
      databaseId,
      collectionId,
      [AWQuery.equal('file_id', file_id), AWQuery.limit(1)],
    );
    const doc: any = found.documents?.[0];
    if (!doc) {
      // If no record, still attempt delete but warn
      // eslint-disable-next-line no-console
      console.warn('project_files record not found for file:', file_id);
    } else {
      const user_id = req?.user?.id || req?.user?.user_id || null;
      const isAdmin = (req?.user?.role || req?.user?.labels)?.includes?.('admin') || req?.user?.role === 'admin';
      if (!isAdmin && doc.user_id !== user_id) {
        throw new BadRequestException('You do not have permission to delete this file');
      }
    }

    const result = await this.appwriteService.deleteFile(bucket_id, file_id);

    // Mark project_files record as deleted if exists
    try {
      if (doc) {
        await databases.updateDocument(
          databaseId,
          collectionId,
          doc.$id,
          { status: 'deleted', updated_at: new Date().toISOString() } as any,
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to mark project_files record as deleted:', (e as any)?.message || e);
    }

    return result;
  }

  @Get(':bucket_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List files', description: 'List files from the specified bucket with optional queries' })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiQuery({ name: 'queries', required: false, type: [String] })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully', type: ListFilesResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listFiles(
    @Param('bucket_id') bucket_id: string,
    @Query() query: ListFilesDto,
  ): Promise<ListFilesResponseDto> {
    const response = await this.appwriteService.listFiles(bucket_id, query.queries || []);
    return {
      total: response.total,
      files: response.files.map(file => ({
        $id: file.$id,
        bucket_id: file.bucketId,
        name: file.name,
        mime_type: file.mimeType,
        $createdAt: file.$createdAt,
        $updatedAt: file.$updatedAt,
        $permissions: file.$permissions,
      })),
    };
  }

  @Get('projects/:order_id/files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List project files by order', description: 'Lists files associated with a specific order from the project_files collection' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order files retrieved successfully', schema: { example: { files: [{ id: 'file_abc123', bucket_id: 'project-files', filename: 'contract.pdf', original_name: 'contract.pdf', mime_type: 'application/pdf', size: 12345, url: 'https://<endpoint>/storage/buckets/project-files/files/file_abc123/view?project=<projectId>', description: null, created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z', status: 'active' }], total: 1 } } })
  async listProjectFiles(
    @Param('order_id') order_id: string,
    @Request() req: any,
  ) {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.appwriteService.getConfig().databaseId;
    const collectionId = process.env.APPWRITE_COLLECTION_PROJECT_FILES || 'project_files';

    const user_id = req?.user?.id || req?.user?.user_id || null;
    const isAdmin = (req?.user?.role || req?.user?.labels)?.includes?.('admin') || req?.user?.role === 'admin';

    const filters: string[] = [
      AWQuery.equal('order_id', order_id),
      AWQuery.equal('status', 'active'),
      AWQuery.orderDesc('created_at'),
    ];
    if (!isAdmin && user_id) {
      filters.unshift(AWQuery.equal('user_id', user_id));
    }

    const res = await databases.listDocuments(
      databaseId,
      collectionId,
      filters,
    );

    const files = (res.documents || []).map((doc: any) => ({
      id: doc.file_id,
      bucket_id: doc.bucket_id || doc.storage_bucket,
      filename: doc.file_name || doc.original_name,
      original_name: doc.original_name,
      mime_type: doc.mime_type,
      size: doc.size || doc.file_size,
      url: doc.file_path,
      description: doc.description || null,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      status: doc.status,
    }));

    return { files, total: res.total };
  }

  @Get(':bucket_id/:file_id/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get file URL', description: 'Get a viewable URL for the specified file' })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File URL retrieved successfully', schema: { example: { url: 'https://<endpoint>/storage/buckets/project-files/files/file_abc123/view?project=<projectId>', file_id: 'file_abc123' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileUrl(
    @Param('bucket_id') bucket_id: string,
    @Param('file_id') file_id: string,
  ): Promise<FileUrlResponseDto> {
    const config = this.appwriteService.getConfig();
    const url = `${config.endpoint}/storage/buckets/${bucket_id}/files/${file_id}/view?project=${config.projectId}`;
    return { url, file_id };
  }
}


