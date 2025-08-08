import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Profile } from '../common/types/database.types';
import { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private supabaseService: SupabaseService) {}

  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profile not found');
    }

    return data;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .update({
        ...updateProfileDto,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Profile not found or update failed');
    }

    return data;
  }

  async createProfileIfNotExists(userId: string, email: string): Promise<Profile> {
    // Check if profile exists
    const { data: existingProfile } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    // Create new profile
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .insert({
        user_id: userId,
        email,
        full_name: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create profile');
    }

    return data;
  }

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch profiles');
    }

    return data || [];
  }
}
