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

  @Post('upload/:bucketId')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file',
    description: 'Upload a file to the specified bucket',
  })
  @ApiParam({ name: 'bucketId', description: 'Bucket ID' })
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
        fileId: { type: 'string', example: 'unique-file-id' },
        message: { type: 'string', example: 'File uploaded successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @Param('bucketId') bucketId: string,
    @UploadedFile() file: any,
    @Body('orderId') orderId?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      } as any;
    }

    // Use underlying UploadsService implementation which handles Storage + DB mapping
    // Resolve to uploads service by delegating through AppwriteService storage APIs
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const userId = req?.user?.id || req?.user?.userId;
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
        userId ? `read("user:${userId}")` : undefined,
        userId ? `write("user:${userId}")` : undefined,
        adminTeamId ? `read("team:${adminTeamId}")` : undefined,
        adminTeamId ? `write("team:${adminTeamId}")` : undefined,
      ].filter(Boolean) as string[];

      const uploaded = await storage.createFile(bucketId, id, stream, permissions);

      // Persist metadata to project_files collection
      try {
        const databases = this.appwriteService.getDatabases();
        const config = this.appwriteService.getConfig();
        const databaseId = config.databaseId;
        const collectionId = process.env.APPWRITE_COLLECTION_PROJECT_FILES || 'project_files';
        const now = new Date().toISOString();

        await databases.createDocument(
          databaseId,
          collectionId,
          ID.unique(),
          {
            file_id: uploaded.$id,
            user_id: userId || null,
            order_id: orderId || null,
            bucket_id: uploaded.bucketId,
            original_name: uploaded.name,
            mime_type: uploaded.mimeType,
            size: uploaded.size,
            created_at: now,
            updated_at: now,
            // camelCase mirrors for legacy schemas
            fileId: uploaded.$id,
            userId: userId || null,
            orderId: orderId || null,
            bucketId: uploaded.bucketId,
            originalName: uploaded.name,
            mimeType: uploaded.mimeType,
            createdAt: now,
            updatedAt: now,
          } as any,
          permissions,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to create project_files record:', (e as any)?.message);
      }

      return {
        success: true,
        fileId: uploaded.$id,
        name: uploaded.name,
        bucketId: uploaded.bucketId,
        permissions,
        orderId: orderId || null,
        userId: userId || null,
      } as any;
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  @Get(':bucketId/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get file',
    description: 'Retrieve file information by ID from the specified bucket',
  })
  @ApiParam({ name: 'bucketId', description: 'Bucket ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File retrieved successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('bucketId') bucketId: string,
    @Param('fileId') fileId: string,
  ): Promise<FileResponseDto> {
    const file = await this.appwriteService.getFile(bucketId, fileId);
    return {
      $id: file.$id,
      bucketId: file.bucketId,
      name: file.name,
      mimeType: file.mimeType,
      $createdAt: file.$createdAt,
      $updatedAt: file.$updatedAt,
      $permissions: file.$permissions,
    } as FileResponseDto;
  }

  @Delete(':bucketId/:fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete file',
    description: 'Delete a file from the specified bucket',
  })
  @ApiParam({ name: 'bucketId', description: 'Bucket ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
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
    @Param('bucketId') bucketId: string,
    @Param('fileId') fileId: string,
  ): Promise<{ success: boolean }> {
    return await this.appwriteService.deleteFile(bucketId, fileId);
  }

  @Get(':bucketId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List files',
    description: 'List files from the specified bucket with optional queries',
  })
  @ApiParam({ name: 'bucketId', description: 'Bucket ID' })
  @ApiQuery({ name: 'queries', required: false, type: [String] })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    type: ListFilesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listFiles(
    @Param('bucketId') bucketId: string,
    @Query() query: ListFilesDto,
  ): Promise<ListFilesResponseDto> {
    const response = await this.appwriteService.listFiles(
      bucketId,
      query.queries || [],
    );
    return {
      total: response.total,
      files: response.files.map(file => ({
        $id: file.$id,
        bucketId: file.bucketId,
        name: file.name,
        mimeType: file.mimeType,
        $createdAt: file.$createdAt,
        $updatedAt: file.$updatedAt,
        $permissions: file.$permissions,
      })) as FileResponseDto[],
    };
  }

  @Get(':bucketId/:fileId/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get file URL',
    description: 'Get a viewable URL for the specified file',
  })
  @ApiParam({ name: 'bucketId', description: 'Bucket ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'File URL retrieved successfully',
    type: FileUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileUrl(
    @Param('bucketId') bucketId: string,
    @Param('fileId') fileId: string,
  ): Promise<FileUrlResponseDto> {
    const config = this.appwriteService.getConfig();
    const url = `${config.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${config.projectId}`;
    
    return {
      url,
      fileId,
    };
  }
}
