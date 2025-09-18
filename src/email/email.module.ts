import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { AppwriteModule } from '../appwrite/appwrite.module';

import { EmailOutboxService } from './email-outbox.service';

@Module({
  imports: [AppwriteModule],
  providers: [EmailService, EmailOutboxService],
  controllers: [EmailController],
  exports: [EmailService, EmailOutboxService],
})
export class EmailModule {}
