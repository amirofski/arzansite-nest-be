import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppwriteService } from './appwrite.service';
import { AppwriteConfig } from './appwrite.config';
import { AppwriteFunctionsController } from './functions.controller';
import { DatabaseController } from './database.controller';
// import removed: StorageController (moved to src/storage)
import { MessagingController } from './messaging.controller';

@Module({
  imports: [ConfigModule],
  providers: [AppwriteService, AppwriteConfig],
  controllers: [
    AppwriteFunctionsController,
    DatabaseController,
    // StorageController moved to StorageModule
    MessagingController,
  ],
  exports: [AppwriteService, AppwriteConfig],
})
export class AppwriteModule {}


