import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { AppwriteModule } from '../appwrite/appwrite.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 30 * 1024 * 1024, // 30MB limit
        files: 10, // Max 10 files per request
        fieldSize: 1024 * 1024, // 1MB for form fields
      },
      fileFilter: (req, file, cb) => {
        // Allow specific file types
        const allowedMimes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'application/zip', 'application/x-rar-compressed'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
      },
    }),
    AppwriteModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
