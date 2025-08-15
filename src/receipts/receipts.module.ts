import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AppwriteModule, EmailModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
