import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AppwriteModule, EmailModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
