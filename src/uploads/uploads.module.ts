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
      },
    }),
    AppwriteModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
