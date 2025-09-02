import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { WalletsModule } from '../wallets/wallets.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AppwriteModule, WalletsModule, EmailModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
