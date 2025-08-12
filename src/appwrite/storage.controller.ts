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
  ) {
    // For now, return a placeholder since file upload is not fully implemented
    return {
      fileId: 'placeholder-file-id',
      message: 'File upload endpoint created. Implementation pending due to InputFile limitations.',
    };
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
