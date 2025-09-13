import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AppwriteModule, StorageModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
