import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppwriteService } from './appwrite.service';
import { AppwriteFunctionsController } from './functions.controller';

@Module({
  imports: [ConfigModule],
  providers: [AppwriteService],
  controllers: [AppwriteFunctionsController],
  exports: [AppwriteService],
})
export class AppwriteModule {}


