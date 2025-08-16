import { Module } from '@nestjs/common';
import { WizardController } from './wizard.controller';
import { WizardService } from './wizard.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { StorageModule } from '../storage/storage.module';
import { DomainsModule } from '../domains/domains.module';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    AppwriteModule,
    StorageModule,
    DomainsModule,
    EmailModule,
    PaymentsModule,
  ],
  controllers: [WizardController],
  providers: [WizardService],
  exports: [WizardService],
})
export class WizardModule {}
