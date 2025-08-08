import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private emailService: EmailService,
  ) {}

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

    // Generate a verification token
    const verificationToken = this.generateVerificationToken();

    // Store the verification token in user metadata for later verification
    if (data.user) {
      await this.supabaseService
        .getClient()
        .auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            ...data.user.user_metadata,
            verificationToken,
            verificationTokenCreatedAt: new Date().toISOString(),
          },
        });

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      const userName = signUpDto.metadata?.first_name || signUpDto.metadata?.name || 'there';
      
      await this.emailService.sendEmailVerification(
        signUpDto.email,
        verificationUrl,
        userName,
      );
    }

    return {
      message: 'User created successfully',
      user: data.user,
      verificationToken,
    };
  }

  private generateVerificationToken(): string {
    // Generate a secure random token
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  async verifyEmail(token: string) {
    try {
      // Find user by verification token in metadata
      const { data: users, error: searchError } = await this.supabaseService
        .getClient()
        .auth.admin.listUsers();

      if (searchError) {
        throw new BadRequestException('Error searching for user');
      }

      // Find user with matching verification token
      const user = users.users.find((u: any) => 
        u.user_metadata?.verificationToken === token
      );

      if (!user) {
        throw new BadRequestException('Invalid verification token');
      }

      // Check if token is expired (24 hours)
      const tokenCreatedAt = new Date(user.user_metadata?.verificationTokenCreatedAt);
      const now = new Date();
      const tokenAge = now.getTime() - tokenCreatedAt.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (tokenAge > maxAge) {
        throw new BadRequestException('Verification token has expired');
      }

      // If user is already confirmed, return success
      if (user.email_confirmed_at) {
        return {
          message: 'Email verified successfully',
        };
      }

      // Confirm the user's email and remove the verification token
      const { data: adminData, error: adminError } = await this.supabaseService
        .getClient()
        .auth.admin.updateUserById(user.id, {
          email_confirm: true,
          user_metadata: {
            ...user.user_metadata,
            verificationToken: null,
            verificationTokenCreatedAt: null,
            emailVerifiedAt: new Date().toISOString(),
          },
        });

      if (adminError) {
        throw new BadRequestException(adminError.message);
      }

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid verification token');
    }
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

  async sendPasswordResetEmail(email: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Send custom password reset email
    // Note: resetPasswordForEmail doesn't return user data, so we use a generic token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?email=${encodeURIComponent(email)}`;
    await this.emailService.sendPasswordResetEmail(email, resetUrl);

    return {
      message: 'Password reset email sent. Please check your email.',
    };
  }

  async sendWelcomeEmail(userId: string) {
    const { data: user, error } = await this.supabaseService
      .getClient()
      .auth.admin.getUserById(userId);

    if (error || !user) {
      throw new BadRequestException('User not found');
    }

    const userName = user.user.user_metadata?.first_name || 
                    user.user.user_metadata?.name || 
                    user.user.email?.split('@')[0] || 
                    'there';

    await this.emailService.sendWelcomeEmail(user.user.email!, userName);

    return {
      message: 'Welcome email sent successfully.',
    };
  }
}
