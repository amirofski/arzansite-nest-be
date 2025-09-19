import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { WalletsModule } from '../wallets/wallets.module';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AppwriteModule,
    WalletsModule,
    EmailModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => InvoicesModule),
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
