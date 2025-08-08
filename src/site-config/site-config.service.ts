import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SiteConfig } from '../common/types/database.types';
import { UpdateSiteConfigDto, SiteMode } from './dto/site-config.dto';
import { SiteConfigGateway } from './site-config.gateway';

@Injectable()
export class SiteConfigService {
  constructor(
    private supabaseService: SupabaseService,
    private siteConfigGateway: SiteConfigGateway,
  ) {}

  async getCurrentConfig(): Promise<{ mode: SiteMode }> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('site_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Return default config if none exists
      return { mode: SiteMode.NORMAL };
    }

    return { mode: data.mode };
  }

  async updateConfig(updateSiteConfigDto: UpdateSiteConfigDto): Promise<{ mode: SiteMode }> {
    // Insert new config row (keeping history)
    const { data, error } = await this.supabaseService
      .getClient()
      .from('site_config')
      .insert({
        mode: updateSiteConfigDto.mode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update site config');
    }

    // Broadcast the change via WebSocket
    this.siteConfigGateway.broadcastModeUpdate(updateSiteConfigDto.mode);

    return { mode: data.mode };
  }

  async getConfigHistory(limit: number = 10): Promise<SiteConfig[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('site_config')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch config history');
    }

    return data || [];
  }
}
