import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async signUp(signUpDto: SignUpDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
        options: {
          data: signUpDto.metadata,
        },
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Verification email sent. Please check your email to confirm your account.',
      user: data.user,
    };
  }

  async signIn(signInDto: SignInDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.signInWithPassword({
        email: signInDto.email,
        password: signInDto.password,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.refreshSession({
        refresh_token: refreshTokenDto.refresh_token,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }

  async signOut(accessToken: string) {
    const { error } = await this.supabaseService
      .getClient()
      .auth.signOut({
        scope: 'local',
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Successfully signed out' };
  }

  async getMe(userId: string) {
    const { data: user, error } = await this.supabaseService
      .getClient()
      .auth.admin.getUserById(userId);

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    // Get user role
    const { data: userRole } = await this.supabaseService
      .getClient()
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    return {
      id: user.user.id,
      email: user.user.email,
      role: userRole?.role || 'user',
    };
  }
}
