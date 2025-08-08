import { Module } from '@nestjs/common';
import { SiteConfigController } from './site-config.controller';
import { SiteConfigService } from './site-config.service';
import { SiteConfigGateway } from './site-config.gateway';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [SiteConfigController],
  providers: [SiteConfigService, SiteConfigGateway],
  exports: [SiteConfigService, SiteConfigGateway],
})
export class SiteConfigModule {}
