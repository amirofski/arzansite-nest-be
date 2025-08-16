import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppwriteModule } from './appwrite/appwrite.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { OrdersModule } from './orders/orders.module';
import { DesignsModule } from './designs/designs.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentsModule } from './payments/payments.module';
import { SiteConfigModule } from './site-config/site-config.module';
import { DomainsModule } from './domains/domains.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { StorageModule } from './storage/storage.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { AdminModule } from './admin/admin.module';
import { ScheduledTasksModule } from './scheduled-tasks/scheduled-tasks.module';
import { WizardModule } from './wizard/wizard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60'),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
      },
    ]),
    AppwriteModule,
    AuthModule,
    ProfilesModule,
    OrdersModule,
    DesignsModule,
    WalletsModule,
    TransactionsModule,
    PaymentsModule,
    SiteConfigModule,
    DomainsModule,
    EmailModule,
    StorageModule,
    InvoicesModule,
    ReceiptsModule,
    AdminModule,
    ScheduledTasksModule,
    WizardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
