import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { SignUpDto, SignInDto, RefreshTokenDto, LoginWithJwtDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ID, Client, Account } from 'node-appwrite';

@Injectable()
export class AuthService {
  constructor(
    private appwriteService: AppwriteService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      // Create user via Appwrite
      const created = await this.appwriteService.createUser(
        signUpDto.email,
        signUpDto.password,
        signUpDto.metadata?.name
      );

      // Generate verification link via Appwrite
      try {
        // Create verification using the new method that handles user authentication
        const verification = await this.appwriteService.createVerificationWithUserSession(
          signUpDto.email,
          signUpDto.password,
          `${this.configService.get('FRONTEND_URL', 'https://arzansite.com')}/auth/verify`
        );
        
        // Extract verification URL from Appwrite response
        const verificationUrl = this.buildVerificationUrl(verification, created.$id);
        
        // Send confirmation email via custom SMTP
        const emailSent = await this.emailService.sendConfirmationEmail(
          signUpDto.email,
          verificationUrl,
          signUpDto.metadata?.name
        );

        if (!emailSent) {
          // Log warning but don't fail the signup
          console.warn(`Failed to send confirmation email to ${signUpDto.email}`);
        }

        return { 
          message: 'User created successfully. Please check your email to verify your account.',
          user: {
            id: created.$id,
            email: created.email,
            emailVerification: created.emailVerification,
            $createdAt: created.$createdAt
          },
          verificationEmailSent: emailSent
        };
      } catch (verificationError) {
        // If verification creation fails, still return success but log the error
        console.error('Failed to create verification:', verificationError);
        return { 
          message: 'User created successfully, but verification email could not be sent. Please contact support.',
          user: {
            id: created.$id,
            email: created.email,
            emailVerification: created.emailVerification,
            $createdAt: created.$createdAt
          },
          verificationEmailSent: false
        };
      }
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to create user');
    }
  }

  private buildVerificationUrl(verification: any, userId: string): string {
    // Appwrite returns a verification object, we need to construct the full URL
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://arzansite.com');
    const token = verification.$id; // This is the verification token
    
    // Return the frontend URL with token and user ID as query parameters
    return `${frontendUrl}/auth/verify?token=${token}&userId=${userId}`;
  }

  async verifyEmail(token: string, userId: string) {
    try {
      // Call Appwrite to update verification status
      const result = await this.appwriteService.getAccount().updateVerification(userId, token);
      
      // Get user details to send welcome email
      const user = await this.appwriteService.getUsers().get(userId);
      
      // Send welcome email via custom SMTP
      const welcomeEmailSent = await this.emailService.sendWelcomeEmail(
        user.email,
        user.name || user.email
      );

      if (!welcomeEmailSent) {
        console.warn(`Failed to send welcome email to ${user.email}`);
      }

      return { 
        message: 'Email verified successfully! Welcome email sent.',
        user: {
          id: user.$id,
          email: user.email,
          name: user.name,
          emailVerification: user.emailVerification
        },
        welcomeEmailSent
      };
    } catch (error) {
      throw new BadRequestException(`Email verification failed: ${error.message}`);
    }
  }

  async sendPasswordReset(email: string, password: string) {
    try {
      // Generate password recovery link via Appwrite using user session
      const recovery = await this.appwriteService.createRecoveryWithUserSession(
        email,
        password,
        `${this.configService.get('FRONTEND_URL', 'https://arzansite.com')}/auth/reset-password`
      );
      
      // Extract recovery URL from Appwrite response
      const recoveryUrl = this.buildRecoveryUrl(recovery, email);
      
      // Send password reset email via custom SMTP
      const emailSent = await this.emailService.sendPasswordResetEmail(
        email,
        recoveryUrl
      );

      if (!emailSent) {
        throw new BadRequestException('Failed to send password reset email');
      }

      return { 
        message: 'Password reset email sent successfully. Please check your email.',
        emailSent: true
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send password reset email: ${error.message}`);
    }
  }

  private buildRecoveryUrl(recovery: any, email: string): string {
    // Appwrite returns a recovery object, we need to construct the full URL
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://arzansite.com');
    const token = recovery.$id; // This is the recovery token
    
    // Return the frontend URL with token and email as query parameters
    return `${frontendUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  }

  async signIn(signInDto: SignInDto) {
    try {
      const session = await this.appwriteService.createSession(
        signInDto.email,
        signInDto.password
      );

      // Issue backend JWT for backend operations
      const payload = { 
        sub: session.userId, 
        email: signInDto.email,
        sessionId: session.$id 
      };
      const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
      const accessToken = jwt.sign(payload, secret, { expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h') });
      const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' });

      return { 
        access_token: accessToken, 
        refresh_token: refreshToken, 
        user: { 
          id: session.userId, 
          email: signInDto.email 
        },
        session: session
      };
    } catch (e: any) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async loginWithJwt(dto: LoginWithJwtDto) {
    try {
      const user = await this.appwriteService.getCurrentUser(dto.jwt);
      
      if (!user?.emailVerification || user.email !== dto.email) {
        throw new UnauthorizedException('Email not verified or email mismatch');
      }

      // Issue backend JWT (stateless) with basic claims
      const payload = { sub: user.$id, email: user.email };
      const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
      const accessToken = jwt.sign(payload, secret, { expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h') });
      const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' });

      return { 
        access_token: accessToken, 
        refresh_token: refreshToken, 
        user: { 
          id: user.$id, 
          email: user.email 
        } 
      };
    } catch (e: any) {
      throw new UnauthorizedException('Invalid Appwrite JWT');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const decoded = jwt.verify(refreshTokenDto.refresh_token, this.configService.get<string>('JWT_SECRET', 'change_me')) as any;
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      // Issue new access token
      const payload = { sub: decoded.sub, email: decoded.email, sessionId: decoded.sessionId };
      const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
      const accessToken = jwt.sign(payload, secret, { expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h') });

      return { 
        access_token: accessToken,
        user: { 
          id: decoded.sub, 
          email: decoded.email 
        }
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOut(accessToken: string) {
    try {
      const decoded = jwt.verify(accessToken, this.configService.get<string>('JWT_SECRET', 'change_me')) as any;
      
      // If we have a session ID, delete the Appwrite session
      if (decoded.sessionId) {
        try {
          await this.appwriteService.deleteSession(decoded.sessionId);
        } catch (sessionError) {
          // Log error but don't fail the signout
          console.warn('Failed to delete Appwrite session:', sessionError);
        }
      }

      return { message: 'Successfully signed out' };
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async getMe(userId: string) {
    return {
      id: userId,
      message: 'User profile endpoint. Implement additional profile fetching as needed.'
    };
  }
}
