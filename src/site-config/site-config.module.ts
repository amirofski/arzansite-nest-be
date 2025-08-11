import { Module } from '@nestjs/common';
import { SiteConfigController } from './site-config.controller';
import { SiteConfigService } from './site-config.service';
import { SiteConfigGateway } from './site-config.gateway';
import { AppwriteModule } from '../appwrite/appwrite.module';

@Module({
  imports: [AppwriteModule],
  controllers: [SiteConfigController],
  providers: [SiteConfigService, SiteConfigGateway],
  exports: [SiteConfigService, SiteConfigGateway],
})
export class SiteConfigModule {}
