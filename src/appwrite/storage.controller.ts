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
import { AppwriteService } from './appwrite.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { UploadsService } from '../common/services/uploads.service';
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
  constructor(private readonly appwriteService: AppwriteService, private readonly uploadsService: UploadsService) {}

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
        order_id: {
          type: 'string',
          description: 'Optional order ID to associate the file with',
        },
      },
      required: ['file']
    },
    examples: {
      default: {
        summary: 'Upload file linked to an order',
        value: {
          file: '(binary)',
          order_id: 'ord_abc123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      example: {
        success: true,
        file_id: 'file_abc123',
        name: 'contract.pdf',
        bucket_id: 'project-files',
        order_id: 'ord_abc123',
        user_id: 'user_123',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: { example: { statusCode: 400, message: 'No file provided' } },
  })
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

    // Enforce bucket allowlist (support modern storage.* and legacy buckets.*)
    const config = this.appwriteService.getConfig() as any;
    const modern = [config.storage?.projectFiles, config.storage?.userAvatars, config.storage?.designAssets].filter(Boolean);
    const legacy = config.buckets ? Object.values(config.buckets).filter(Boolean) : [];
    const allowedBuckets = new Set<string>([...modern as string[], ...legacy as string[]]);
    if (allowedBuckets.size > 0 && !allowedBuckets.has(bucket_id)) {
      throw new BadRequestException('Bucket not allowed');
    }

    // Delegate to shared storage service to handle upload + DB record
    const user_id = req?.user?.id || req?.user?.user_id || null;
    return await this.uploadsService.uploadFile(bucket_id, file, order_id, user_id);
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
  @ApiResponse({ status: 200, description: 'File deleted successfully',
    schema: { example: { success: true } },
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
    schema: { example: { url: 'https://<endpoint>/storage/buckets/project-files/files/file_abc123/view?project=<projectId>', file_id: 'file_abc123' } },
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
