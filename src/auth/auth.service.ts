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
    // 1) Create the user via Admin API (so Supabase doesn't send its own email)
    const { data: signUpData, error: signUpError } = await this.supabaseService
      .getClient()
      .auth.admin.createUser({
        email: signUpDto.email,
        password: signUpDto.password,
        user_metadata: signUpDto.metadata,
        email_confirm: false,
      });

    if (signUpError) {
      throw new BadRequestException(signUpError.message);
    }

    // 2) Generate a verification action link/token via Admin API
    const { data: linkData, error: linkError } = await this.supabaseService
      .getClient()
      .auth.admin.generateLink({
        type: 'signup',
        email: signUpDto.email,
        password: signUpDto.password,
        options: {
          redirectTo: `${process.env.FRONTEND_URL}/verify-email`,
        },
      });

    if (linkError) {
      throw new BadRequestException(linkError.message);
    }

    const actionLink = (linkData as any)?.properties?.action_link as string | undefined;
    const userName =
      signUpDto.metadata?.first_name || signUpDto.metadata?.name || 'there';

    // 3) Send custom verification email using our SMTP service
    if (actionLink) {
      await this.emailService.sendEmailVerification(
        signUpDto.email,
        actionLink,
        userName,
      );
    }

    return {
      message: 'User created successfully. Verification email sent.',
      user: signUpData.user,
    };
  }

  async verifyEmail(token: string, email?: string) {
    try {
      // First try token_hash flow (from action_link redirects)
      const { error: hashError } = await this.supabaseService
        .getClient()
        .auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

      if (!hashError) {
        return { message: 'Email verified successfully' };
      }

      // If token_hash failed, try code + email flow (if email provided)
      if (email) {
        const { error: codeError } = await this.supabaseService
          .getClient()
          .auth.verifyOtp({
            email,
            token,
            type: 'signup',
          });

        if (!codeError) {
          return { message: 'Email verified successfully' };
        }
      }

      throw new BadRequestException('Invalid verification token');
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
    // Generate a password recovery action link via Admin API
    const { data, error } = await this.supabaseService
      .getClient()
      .auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        },
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const resetUrl = (data as any)?.properties?.action_link as string | undefined;
    if (!resetUrl) {
      throw new BadRequestException('Failed to generate reset link');
    }

    await this.emailService.sendPasswordResetEmail(email, resetUrl);

    return { message: 'Password reset email sent. Please check your email.' };
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
