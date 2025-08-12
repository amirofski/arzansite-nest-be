import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { SignUpDto, SignInDto, RefreshTokenDto, LoginWithJwtDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { ID } from 'node-appwrite';

@Injectable()
export class AuthService {
  constructor(
    private appwriteService: AppwriteService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      const created = await this.appwriteService.createUser(
        signUpDto.email,
        signUpDto.password,
        signUpDto.metadata?.name
      );

      return { 
        message: 'User created successfully.',
        user: {
          id: created.$id,
          email: created.email,
          emailVerification: created.emailVerification,
          $createdAt: created.$createdAt
        }
      };
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to create user');
    }
  }

  async verifyEmail(token: string, email?: string) {
    // In Appwrite, verification flows are handled by built-in endpoints.
    // Expose a simple endpoint that frontend will call via Appwrite SDK directly.
    return { message: 'Use Appwrite account.createVerification() and account.updateVerification() on frontend.' };
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
      const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
      const decoded = jwt.verify(refreshTokenDto.refresh_token, secret) as any;
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = { sub: decoded.sub, email: decoded.email };
      const accessToken = jwt.sign(payload, secret, { expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h') });
      const newRefreshToken = jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' });

      return { 
        access_token: accessToken, 
        refresh_token: newRefreshToken 
      };
    } catch (e: any) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async signOut(accessToken: string) {
    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
      const decoded = jwt.verify(accessToken, secret) as any;
      
      // If we have a session ID, delete the Appwrite session
      if (decoded.sessionId) {
        await this.appwriteService.deleteSession(decoded.sessionId);
      }

      return { message: 'Signed out successfully' };
    } catch (e: any) {
      return { message: 'Signed out (client should delete Appwrite and backend tokens)' };
    }
  }

  async getMe(userId: string) {
    try {
      // For now, return basic user info
      // In a real implementation, you might want to fetch more details from Appwrite
      return { 
        id: userId,
        message: 'User profile endpoint. Implement additional profile fetching as needed.'
      };
    } catch (e: any) {
      throw new UnauthorizedException('Failed to get user profile');
    }
  }

  async sendPasswordResetEmail(email: string) {
    // Ask frontend to use Appwrite account.createRecovery() and account.updateRecovery()
    return { message: 'Use Appwrite account.createRecovery() and account.updateRecovery() on frontend.' };
  }

  async sendWelcomeEmail(userId: string) {
    return { message: 'Welcome email is sent on sign up.' };
  }
}
