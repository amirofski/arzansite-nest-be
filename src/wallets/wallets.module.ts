import { Module, forwardRef } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AppwriteModule, forwardRef(() => PaymentsModule)],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
