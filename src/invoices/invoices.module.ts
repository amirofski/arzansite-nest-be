import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { WalletsModule } from '../wallets/wallets.module';
import { EmailModule } from '../email/email.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AppwriteModule, WalletsModule, EmailModule, OrdersModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
