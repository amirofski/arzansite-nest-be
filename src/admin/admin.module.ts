import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { WalletsModule } from '../wallets/wallets.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AppwriteModule, WalletsModule, InvoicesModule, ReceiptsModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
