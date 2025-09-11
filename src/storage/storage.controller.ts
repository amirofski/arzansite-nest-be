import { Controller, Post, Body, Get, Query, UseGuards, UseInterceptors, UploadedFile, Delete, Param } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  async createUploadUrl(@Body() body: { bucket_id: string; file_name: string }) {
    return this.storageService.createUploadUrl(body.bucket_id, body.file_name);
  }

  @Get('file-url')
  async getFileUrl(@Query('bucket_id') bucket_id: string, @Query('file_id') file_id: string) {
    return this.storageService.getFileViewUrl(bucket_id, file_id);
  }

  // Alias required endpoints
  @UseInterceptors(FileInterceptor('file'))
  @Post('/uploads')
  async uploadMultipart(
    @Query('bucket_id') bucket_id?: string,
    @Query('bucket') bucket?: string,
    @Query('bucketType') bucketType?: string,
    @UploadedFile() file?: any,
  ) {
    const selected = bucket_id || bucket || bucketType; // accept id or friendly name
    return this.storageService.uploadMultipart(selected, file);
  }

  @Get('/uploads')
  async listUploads(
    @Query('bucket_id') bucket_id?: string,
    @Query('bucket') bucket?: string,
    @Query('bucketType') bucketType?: string,
  ) {
    const selected = bucket_id || bucket || bucketType;
    return this.storageService.listFiles(selected);
  }

  @Delete('/uploads/:id')
  async deleteUpload(
    @Query('bucket_id') bucket_id?: string,
    @Query('bucket') bucket?: string,
    @Query('bucketType') bucketType?: string,
    @Param('id') id?: string,
  ) {
    const selected = bucket_id || bucket || bucketType;
    return this.storageService.deleteFile(selected as string, id as string);
  }

  @Get('/uploads/signed-url')
  async signedUrl(
    @Query('path') path?: string,
    @Query('bucket_id') bucket_id?: string,
    @Query('file_id') file_id?: string,
  ) {
    if (path && !bucket_id && !file_id) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        bucket_id = parts[0];
        file_id = parts.slice(1).join('/');
      }
    }
    return this.storageService.getFileViewUrl(bucket_id as string, file_id as string);
  }
}


