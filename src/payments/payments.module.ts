import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZarinPalService } from './zarinpal.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { OrdersModule } from '../orders/orders.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [ConfigModule, AppwriteModule, OrdersModule, forwardRef(() => WalletsModule)],
  providers: [ZarinPalService, PaymentsService],
  controllers: [PaymentsController],
  exports: [ZarinPalService, PaymentsService],
})
export class PaymentsModule {}
