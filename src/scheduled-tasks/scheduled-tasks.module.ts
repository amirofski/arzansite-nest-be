import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { EmailModule } from '../email/email.module';

import { EmailOutboxProcessor } from './email-outbox.processor';

@Module({
  imports: [ScheduleModule.forRoot(), InvoicesModule, EmailModule],
  providers: [ScheduledTasksService, EmailOutboxProcessor],
  exports: [ScheduledTasksService, EmailOutboxProcessor],
})
export class ScheduledTasksModule {}
