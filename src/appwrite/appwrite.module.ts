import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppwriteService } from './appwrite.service';

@Module({
  imports: [ConfigModule],
  providers: [AppwriteService],
  exports: [AppwriteService],
})
export class AppwriteModule {}


