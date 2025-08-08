import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';
import { SaveDesignDto, UpdateDesignOptionsDto, UpdatePreviewUrlDto } from './dto/design.dto';

@Injectable()
export class DesignsService {
  constructor(
    private supabaseService: SupabaseService,
    private ordersService: OrdersService,
  ) {}

  async saveDesign(
    orderId: string,
    userId: string,
    saveDesignDto: SaveDesignDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    // Call the existing RPC function
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('save_design_data', {
        p_order_id: orderId,
        p_design_data: saveDesignDto.design,
      });

    if (error) {
      throw new Error(`Failed to save design: ${error.message}`);
    }

    // Update design options if provided
    if (saveDesignDto.options) {
      await this.updateDesignOptions(orderId, userId, { options: saveDesignDto.options }, isAdmin);
    }

    return { ok: true };
  }

  async getDesign(
    orderId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ design: any }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    // Call the existing RPC function
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('get_design_data', {
        p_order_id: orderId,
      });

    if (error) {
      throw new Error(`Failed to get design: ${error.message}`);
    }

    return { design: data };
  }

  async getDesignOptions(
    orderId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<{ options: any }> {
    // Check order ownership or admin access
    const order = await this.ordersService.getOrder(orderId, userId, isAdmin);

    return { options: order.design_options || null };
  }

  async updateDesignOptions(
    orderId: string,
    userId: string,
    updateDesignOptionsDto: UpdateDesignOptionsDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({
        design_options: updateDesignOptionsDto.options,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      throw new Error('Failed to update design options');
    }

    return { ok: true };
  }

  async updatePreviewUrl(
    orderId: string,
    userId: string,
    updatePreviewUrlDto: UpdatePreviewUrlDto,
    isAdmin: boolean = false,
  ): Promise<{ ok: boolean }> {
    // Check order ownership or admin access
    await this.ordersService.getOrder(orderId, userId, isAdmin);

    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({
        design_preview_url: updatePreviewUrlDto.previewUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      throw new Error('Failed to update preview URL');
    }

    return { ok: true };
  }
}
