import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { SupabaseModule } from './supabase/supabase.module';
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
    SupabaseModule,
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
