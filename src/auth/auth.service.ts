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
    // Create the user in Appwrite via admin key
    const { Users } = await import('node-appwrite');
    const users = new Users(this.appwriteService.getClient());
    let created: any;
    try {
      created = await users.create(ID.unique(), signUpDto.email, undefined, signUpDto.password, signUpDto.metadata?.name);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to create user');
    }

    // Do NOT send welcome email here. Ask frontend to trigger Appwrite email verification.

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

  async loginWithJwt(dto: LoginWithJwtDto) {
    const endpoint = this.configService.get<string>('APPWRITE_ENDPOINT');
    const projectId = this.configService.get<string>('APPWRITE_PROJECT_ID');
    if (!endpoint || !projectId) throw new BadRequestException('Appwrite not configured');
    const { Account, Client } = await import('node-appwrite');
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(dto.jwt);
    const account = new Account(client);
    let me: any;
    try {
      me = await account.get();
    } catch (e: any) {
      throw new UnauthorizedException('Invalid Appwrite JWT');
    }
    if (!me?.emailVerification || me.email !== dto.email) {
      throw new UnauthorizedException('Email not verified or email mismatch');
    }

    // Issue backend JWT (stateless) with basic claims
    const payload = { sub: me.$id, email: me.email };
    const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
    const accessToken = jwt.sign(payload, secret, { expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h') });
    const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' });

    return { access_token: accessToken, refresh_token: refreshToken, user: { id: me.$id, email: me.email } };
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
