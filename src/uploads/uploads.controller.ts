import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Query, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles,
  Body, 
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody, 
  ApiBearerAuth, 
  ApiConsumes,
  ApiQuery 
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { User, UserPayload } from '../common/decorators/user.decorator';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtGuard)
@UseInterceptors(TransformInterceptor)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // Accept common image, document, archive mime types
  private static readonly ALLOWED_MIME_TYPES: readonly string[] = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'application/x-7z-compressed',
    // Fallback some providers use
    'application/octet-stream',
  ] as const;

  private static isAllowedMimeType(mime: string): boolean {
    if (!mime || typeof mime !== 'string') return false;
    // exact match first
    if (UploadsController.ALLOWED_MIME_TYPES.includes(mime as any)) return true;
    // allow generic image/*
    if (mime.startsWith('image/')) return true;
    return false;
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to verify routing' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  async testEndpoint() {
    return {
      success: true,
      data: { message: 'Uploads route is working!' },
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all uploaded files' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'orderId', required: false, description: 'Filter by order ID' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUploads(
    @Query('userId') userId?: string,
    @Query('orderId') orderId?: string,
    @Request() req?: any,
  ) {
    // If no userId provided, use the authenticated user's ID
    const currentUserId = userId || req.user?.userId || req.user?.id;
    return this.uploadsService.getAllUploads(currentUserId, orderId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all files for a specific order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order files retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getFilesByOrder(@Param('orderId') orderId: string) {
    return this.uploadsService.getFilesByOrder(orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'bucketType', required: false, description: 'Specific bucket type (document, design, avatar)' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getUploadById(
    @Param('id') id: string,
    @Query('bucketType') bucketType?: 'document' | 'design' | 'avatar',
  ) {
    return this.uploadsService.getUploadById(id, bucketType);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a new file' })
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
        orderId: {
          type: 'string',
          description: 'Order ID (optional)',
        },
        fileType: {
          type: 'string',
          enum: ['document', 'design', 'avatar'],
          description: 'Type of file (defaults to document)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (UploadsController.isAllowedMimeType(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`) as any, false);
      }
    },
  }))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }), // 30MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('orderId') orderId?: string,
    @Body('fileType') fileType: 'document' | 'design' | 'avatar' = 'document',
    @Request() req?: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.uploadsService.uploadFile(file, userId, orderId, fileType);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple files to upload',
        },
        orderId: {
          type: 'string',
          description: 'Order ID (optional)',
        },
        fileType: {
          type: 'string',
          description: 'Category (e.g., general | design | logo)',
        },
        description: { type: 'string', description: 'Description (optional)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid files' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FilesInterceptor('files', undefined, {
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (UploadsController.isAllowedMimeType(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`) as any, false);
      }
    },
  }))
  async uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }), // 30MB
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
    @Body('orderId') orderId?: string,
    @Body('fileType') fileType?: string,
    @Body('description') description?: string,
    @User() user?: UserPayload,
  ) {
    const userId = user?.id;

    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    // Map external categories to internal bucket types
    const bucketType = this.uploadsService.resolveBucketType(fileType);
    const uploadPromises = files.map(file =>
      this.uploadsService.uploadFile(file, userId!, orderId, bucketType, description)
    );

    const results = await Promise.allSettled(uploadPromises);
    
    const successful = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    const failed = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    return {
      success: true,
      files: successful.map(item => ({
        id: item.data.id,
        url: item.data.url,
        name: item.data.name,
        size: item.data.size,
        type: item.data.mimeType,
      })),
      uploaded: successful.length,
      failed: failed.length,
      errors: failed.map(error => error.message),
    } as any;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiQuery({ name: 'bucketType', required: false, description: 'Specific bucket type (document, design, avatar)' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUpload(
    @Param('id') id: string,
    @Query('bucketType') bucketType?: 'document' | 'design' | 'avatar',
  ) {
    return this.uploadsService.deleteUpload(id, bucketType);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete multiple files' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of file IDs to delete',
        },
        bucketType: {
          type: 'string',
          enum: ['document', 'design', 'avatar'],
          description: 'Specific bucket type (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Files deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMultipleFiles(
    @Body('fileIds') fileIds: string[],
    @Body('bucketType') bucketType?: 'document' | 'design' | 'avatar',
  ) {
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      throw new Error('File IDs array is required and must not be empty');
    }

    const deletePromises = fileIds.map(id => 
      this.uploadsService.deleteUpload(id, bucketType)
    );

    const results = await Promise.allSettled(deletePromises);
    
    const successful = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);
    
    const failed = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason);

    return {
      success: true,
      data: {
        deleted: successful.length,
        failed: failed.length,
        successful,
        failedErrors: failed.map(error => error.message),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
