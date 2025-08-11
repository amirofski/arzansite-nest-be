import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from './dto/auth.dto';
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
    // Create the user in Appwrite via admin key
    const { Users } = await import('node-appwrite');
    const users = new Users(this.appwriteService.getClient());
    let created: any;
    try {
      created = await users.create(ID.unique(), signUpDto.email, undefined, signUpDto.password, signUpDto.metadata?.name);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to create user');
    }

    // Create an email verification token via Appwrite magic URL (use createEmailToken + custom URL)
    // Appwrite email verification should be done from frontend using Account APIs

    const userName = signUpDto.metadata?.first_name || signUpDto.metadata?.name || 'there';
    await this.emailService.sendWelcomeEmail(signUpDto.email, userName);

    return { message: 'User created successfully.' };
  }

  async verifyEmail(token: string, email?: string) {
    // In Appwrite, verification flows are handled by built-in endpoints.
    // Expose a simple endpoint that frontend will call via Appwrite SDK directly.
    return { message: 'Use Appwrite account.createVerification() and account.updateVerification() on frontend.' };
  }

  async signIn(signInDto: SignInDto) {
    // Appwrite creates sessions; here we issue our own JWT for backend auth
    // Login should be done from frontend using Appwrite Account to obtain a JWT.
    // Backend does not issue tokens anymore.
    throw new BadRequestException('Use Appwrite account.createEmailSession() on frontend, then send the Appwrite JWT to backend.');
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    throw new BadRequestException('Use Appwrite sessions; no backend refresh.');
  }

  async signOut(accessToken: string) {
    // Appwrite session management happens client-side; server tokens are stateless JWT
    return { message: 'Signed out (client should delete Appwrite and backend tokens)' };
  }

  async getMe(userId: string) {
    // With our JWT, we only store email; for richer profile, query Appwrite Users by email via Functions or pre-index
    return { id: userId } as any;
  }

  async sendPasswordResetEmail(email: string) {
    // Ask frontend to use Appwrite account.createRecovery() and account.updateRecovery()
    return { message: 'Use Appwrite account.createRecovery() and account.updateRecovery() on frontend.' };
  }

  async sendWelcomeEmail(userId: string) {
    return { message: 'Welcome email is sent on sign up.' };
  }
}
