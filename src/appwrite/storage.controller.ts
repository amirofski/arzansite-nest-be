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
import { ID } from 'node-appwrite';
import { AppwriteService } from './appwrite.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import {
  ListFilesDto,
  ListFilesResponseDto,
  FileResponseDto,
  FileUrlResponseDto,
} from './dto/storage.dto';

@ApiTags('storage')
@Controller('storage')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly appwriteService: AppwriteService) {}

  @Post('upload/:bucket_id')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
  @ApiOperation({
    summary: 'Upload file',
    description: 'Upload a file to the specified bucket',
  })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        file_id: { type: 'string', example: 'unique-file-id' },
        message: { type: 'string', example: 'File uploaded successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @Param('bucket_id') bucket_id: string,
    @UploadedFile() file: any,
    @Body('order_id') order_id?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Enforce bucket allowlist
    const config = this.appwriteService.getConfig();
    const allowedBuckets = new Set([
      config.storage.projectFiles,
      config.storage.userAvatars,
      config.storage.designAssets,
    ].filter(Boolean));
    if (!allowedBuckets.has(bucket_id)) {
      throw new BadRequestException('Bucket not allowed');
    }

    // Use underlying UploadsService implementation which handles Storage + DB mapping
    // Resolve to uploads service by delegating through AppwriteService storage APIs
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const user_id = req?.user?.id || req?.user?.user_id;
    const adminTeamId = process.env.APPWRITE_ADMIN_TEAM_ID;
    const id = ID.unique();
    const tmp = path.join(os.tmpdir(), `${id}_${file.originalname}`);

    try {
      // Write buffer to temp file then stream (SDK expects a stream/file handle server-side)
      const buffer = file.buffer ?? fs.readFileSync(file.path);
      fs.writeFileSync(tmp, buffer);
      const stream = fs.createReadStream(tmp);

      const storage = this.appwriteService.getStorage();
      const permissions = [
        user_id ? `read("user:${user_id}")` : undefined,
        user_id ? `write("user:${user_id}")` : undefined,
        adminTeamId ? `read("team:${adminTeamId}")` : undefined,
        adminTeamId ? `write("team:${adminTeamId}")` : undefined,
      ].filter(Boolean) as string[];

      const uploaded = await storage.createFile(bucket_id, id, stream, permissions);

      // Persist metadata to project_files collection
      try {
        const databases = this.appwriteService.getDatabases();
        const databaseId = this.appwriteService.getConfig().databaseId;
        const collectionId = process.env.APPWRITE_COLLECTION_PROJECT_FILES || 'project_files';
        const now = new Date().toISOString();

        await databases.createDocument(
          databaseId,
          collectionId,
          ID.unique(),
          {
            file_id: uploaded.$id,
            user_id: user_id || null,
            order_id: order_id || null,
            bucket_id: uploaded.bucketId,
            original_name: uploaded.name,
            mime_type: uploaded.mimeType,
            size: uploaded.sizeOriginal,
            created_at: now,
            updated_at: now,
          },
          permissions,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to create project_files record:', (e as any)?.message);
      }

      return {
        success: true,
        file_id: uploaded.$id,
        name: uploaded.name,
        bucket_id: uploaded.bucketId,
        permissions,
        order_id: order_id || null,
        user_id: user_id || null,
      };
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  @Get(':bucket_id/:file_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get file',
    description: 'Retrieve file information by ID from the specified bucket',
  })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File retrieved successfully',
    type: FileResponseDto,
  })
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
  @ApiOperation({
    summary: 'Delete file',
    description: 'Delete a file from the specified bucket',
  })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('bucket_id') bucket_id: string,
    @Param('file_id') file_id: string,
  ): Promise<{ success: boolean }> {
    return await this.appwriteService.deleteFile(bucket_id, file_id);
  }

  @Get(':bucket_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List files',
    description: 'List files from the specified bucket with optional queries',
  })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiQuery({ name: 'queries', required: false, type: [String] })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    type: ListFilesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listFiles(
    @Param('bucket_id') bucket_id: string,
    @Query() query: ListFilesDto,
  ): Promise<ListFilesResponseDto> {
    const response = await this.appwriteService.listFiles(
      bucket_id,
      query.queries || [],
    );
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

  @Get(':bucket_id/:file_id/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get file URL',
    description: 'Get a viewable URL for the specified file',
  })
  @ApiParam({ name: 'bucket_id', description: 'Bucket ID' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File URL retrieved successfully',
    type: FileUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileUrl(
    @Param('bucket_id') bucket_id: string,
    @Param('file_id') file_id: string,
  ): Promise<FileUrlResponseDto> {
    const config = this.appwriteService.getConfig();
    const url = `${config.endpoint}/storage/buckets/${bucket_id}/files/${file_id}/view?project=${config.projectId}`;
    
    return {
      url,
      file_id: file_id,
    };
  }
}
