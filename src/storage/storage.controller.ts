import { Controller, Post, Body, Get, Query, UseGuards, UseInterceptors, UploadedFile, Delete, Param } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  async createUploadUrl(@Body() body: { bucketId: string; fileName: string }) {
    return this.storageService.createUploadUrl(body.bucketId, body.fileName);
  }

  @Get('file-url')
  async getFileUrl(@Query('bucketId') bucketId: string, @Query('fileId') fileId: string) {
    return this.storageService.getFileViewUrl(bucketId, fileId);
  }

  // Alias required endpoints
  @UseInterceptors(FileInterceptor('file'))
  @Post('/uploads')
  async uploadMultipart(@Query('bucketId') bucketId: string, @UploadedFile() file: any) {
    return this.storageService.uploadMultipart(bucketId, file);
  }

  @Get('/uploads')
  async listUploads(@Query('bucketId') bucketId: string) {
    return this.storageService.listFiles(bucketId);
  }

  @Delete('/uploads/:id')
  async deleteUpload(@Query('bucketId') bucketId: string, @Param('id') id: string) {
    return this.storageService.deleteFile(bucketId, id);
  }

  @Get('/uploads/signed-url')
  async signedUrl(
    @Query('path') path?: string,
    @Query('bucketId') bucketId?: string,
    @Query('fileId') fileId?: string,
  ) {
    if (path && !bucketId && !fileId) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        bucketId = parts[0];
        fileId = parts.slice(1).join('/');
      }
    }
    return this.storageService.getFileViewUrl(bucketId as string, fileId as string);
  }
}


