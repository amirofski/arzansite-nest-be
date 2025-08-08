import { Module } from '@nestjs/common';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [SupabaseModule, OrdersModule],
  controllers: [DesignsController],
  providers: [DesignsService],
  exports: [DesignsService],
})
export class DesignsModule {}
