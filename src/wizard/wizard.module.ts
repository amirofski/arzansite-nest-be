import { Module } from '@nestjs/common';
import { WizardController } from './wizard.controller';
import { WizardService } from './wizard.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { DomainsModule } from '../domains/domains.module';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    AppwriteModule,
    DomainsModule,
    EmailModule,
    PaymentsModule,
    StorageModule,
  ],
  controllers: [WizardController],
  providers: [WizardService],
  exports: [WizardService],
})
export class WizardModule {}
