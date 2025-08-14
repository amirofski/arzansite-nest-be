import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { SignUpDto, SignInDto, LoginWithJwtDto, RefreshTokenDto } from './dto/auth.dto';
import { ProfilesService } from '../profiles/profiles.service';
import * as jwt from 'jsonwebtoken';
import { ID, Client, Account } from 'node-appwrite';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private appwriteService: AppwriteService,
    private emailService: EmailService,
    private configService: ConfigService,
    private profilesService: ProfilesService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      // Create user via Appwrite
      const created = await this.appwriteService.createUser(
        signUpDto.email,
        signUpDto.password,
        signUpDto.metadata?.name
      );

      // Create profile for the new user
      await this.profilesService.createProfileIfNotExists(created.$id, signUpDto.email);

      // Try to send verification email immediately after user creation
      try {
        console.log('🔧 Attempting to send verification email during signup...');
        
        // Use custom verification system (Appwrite native verification requires user session)
        console.log('🔧 Creating custom verification email...');
        
        const verificationToken = this.generateVerificationToken();
        const verificationUrl = `${this.configService.get('FRONTEND_URL', 'https://arzansite.com')}/verify-email?token=${verificationToken}&userId=${created.$id}`;
        
        console.log('🔗 Verification URL built:', verificationUrl);
        
        const emailSent = await this.emailService.sendConfirmationEmail(
          signUpDto.email,
          verificationUrl,
          signUpDto.metadata?.name
        );

        if (emailSent) {
          console.log('✅ Custom verification email sent successfully');
          await this.storeVerificationToken(created.$id, verificationToken);
          
          return { 
            message: 'User created successfully. Please check your email to verify your account.',
            user: {
              id: created.$id,
              email: created.email,
              emailVerification: created.emailVerification,
              $createdAt: created.$createdAt
            },
            verificationEmailSent: true,
            requiresFrontendVerification: false
          };
        } else {
          console.log('❌ EmailService returned false - email not sent');
        }
      } catch (e: any) {
        console.error('❌ Failed to send verification email:', e);
        // Continue without verification email
      }
      
      // Return success response even if email sending failed
      return { 
        message: 'User created successfully. Please sign in to verify your email.',
        user: {
          id: created.$id,
          email: created.email,
          emailVerification: created.emailVerification,
          $createdAt: created.$createdAt
        },
        verificationEmailSent: false,
        requiresFrontendVerification: true
      };
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Failed to create user');
    }
  }

  private generateVerificationToken(): string {
    // Generate a secure random token for email verification
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  private async storeVerificationToken(userId: string, token: string): Promise<void> {
    try {
      // Store the verification token in Appwrite database
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification storage skipped: Missing database configuration');
        return;
      }

      await this.appwriteService.createDocument(collectionId, {
        userId,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        used: false,
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ Verification token stored in database');
    } catch (error) {
      console.error('❌ Failed to store verification token:', error);
      // Don't throw error, just log it
    }
  }

  private async findUserIdByToken(token: string): Promise<string | null> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification lookup skipped: Missing database configuration');
        return null;
      }

      // Query for the token to find the userId
      const { Query } = await import('node-appwrite');
      const documents = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('token', token)
        ]
      );

      if (documents.documents.length > 0) {
        const tokenDoc = documents.documents[0];
        
        // Check if token is already used
        if (tokenDoc.used === true) {
          return null; // Token already used
        }

        // Check if token is expired
        if (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) <= new Date()) {
          return null; // Token expired
        }

        return tokenDoc.userId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to find userId by token:', error);
      return null;
    }
  }

  private async validateVerificationToken(userId: string, token: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification validation skipped: Missing database configuration');
        return { isValid: false, reason: 'Configuration error' };
      }

      // Query for the token
      const { Query } = await import('node-appwrite');
      const documents = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('userId', userId),
          Query.equal('token', token)
        ]
      );

      if (documents.documents.length === 0) {
        return { isValid: false, reason: 'Token not found' };
      }

      const tokenDoc = documents.documents[0];
      
      // Check if token is already used
      if (tokenDoc.used === true) {
        return { isValid: false, reason: 'Token already used' };
      }

      // Check if token is expired
      if (tokenDoc.expiresAt && new Date(tokenDoc.expiresAt) <= new Date()) {
        return { isValid: false, reason: 'Token expired' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('❌ Failed to validate verification token:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }



  private async markVerificationTokenAsUsed(userId: string, token: string): Promise<void> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification update skipped: Missing database configuration');
        return;
      }

      // Find the document first
      const { Query } = await import('node-appwrite');
      const documents = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('userId', userId),
          Query.equal('token', token)
        ]
      );

      if (documents.documents.length > 0) {
        const documentId = documents.documents[0].$id;
        await this.appwriteService.getDatabases().updateDocument(
          databaseId,
          collectionId,
          documentId,
          { used: true }
        );
        console.log('✅ Verification token marked as used');
      }
    } catch (error) {
      console.error('❌ Failed to mark verification token as used:', error);
      // Don't throw error, just log it
    }
  }

  private buildVerificationUrl(verification: any, userId: string): string {
    // Appwrite returns a verification object, we need to construct the full URL
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://arzansite.com');
    const token = verification.$id; // This is the verification token
    
    // Return the frontend URL with token and user ID as query parameters
    return `${frontendUrl}/verify-email?token=${token}&userId=${userId}`;
  }

  async verifyEmail(token: string, userId?: string) {
    try {
      let targetUserId = userId;
      
      // If userId is not provided, try to find it from the token
      if (!targetUserId) {
        targetUserId = await this.findUserIdByToken(token);
        if (!targetUserId) {
          throw new BadRequestException('Invalid or expired verification token');
        }
      }
      
      // Validate the token using our custom system
      const tokenValidation = await this.validateVerificationToken(targetUserId, token);
      
      if (!tokenValidation.isValid) {
        let errorMessage = 'Invalid verification token';
        
        switch (tokenValidation.reason) {
          case 'Token already used':
            errorMessage = 'This verification link has already been used. Please request a new verification email.';
            break;
          case 'Token expired':
            errorMessage = 'This verification link has expired. Please request a new verification email.';
            break;
          case 'Token not found':
            errorMessage = 'Invalid verification link. Please check your email and try again.';
            break;
          default:
            errorMessage = 'Invalid or expired verification token';
        }
        
        throw new BadRequestException(errorMessage);
      }

      // Mark the token as used in our custom system
      await this.markVerificationTokenAsUsed(targetUserId, token);
      
      // Update the user's verification status in Appwrite using service account
      try {
        console.log('🔧 Updating user verification status in Appwrite...');
        const user = await this.appwriteService.updateVerification(targetUserId, token);
        
        console.log('✅ User email verification completed and Appwrite status updated');
        
        // Ensure profile exists after verification
        await this.profilesService.createProfileIfNotExists(user.$id, user.email);
        
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
      } catch (appwriteError) {
        console.error('❌ Failed to update Appwrite verification status:', appwriteError);
        
        // Even if Appwrite update fails, the token was valid and marked as used
        // Get user details and return success
        const user = await this.appwriteService.getUsers().get(targetUserId);
        
        // Ensure profile exists after verification
        await this.profilesService.createProfileIfNotExists(user.$id, user.email);
        
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
            emailVerification: true // Mark as verified since token was valid
          },
          welcomeEmailSent
        };
      }
    } catch (error) {
      throw new BadRequestException(`Email verification failed: ${error.message}`);
    }
  }

  async sendPasswordReset(email: string) {
    try {
      // For password reset, we need to use the service account approach
      // since the user might not remember their password
      const frontendUrl = this.configService.get('FRONTEND_URL', 'https://app.arzansite.com');
      
      // Validate that the frontend URL is allowed by Appwrite
      if (!frontendUrl.includes('localhost') && !frontendUrl.includes('app.arzansite.com')) {
        throw new Error(`Invalid FRONTEND_URL: ${frontendUrl}. Appwrite only allows localhost or app.arzansite.com for password reset URLs.`);
      }
      
      const recovery = await this.appwriteService.getAccount().createRecovery(
        email,
        `${frontendUrl}/reset-password`
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
      // Provide more specific error messages
      if (error.message.includes('Invalid `url` param')) {
        throw new BadRequestException(
          `Password reset URL validation failed. Please ensure FRONTEND_URL is set to localhost or app.arzansite.com. Current value: ${this.configService.get('FRONTEND_URL')}`
        );
      }
      throw new BadRequestException(`Failed to send password reset email: ${error.message}`);
    }
  }

  async requestEmailVerification(email: string, password: string) {
    try {
      // This method is called after user login to request verification
      // It creates a session and then requests verification
      const frontendUrl = this.configService.get('FRONTEND_URL', 'https://app.arzansite.com');
      
      // Validate that the frontend URL is allowed by Appwrite
      if (!frontendUrl.includes('localhost') && !frontendUrl.includes('app.arzansite.com')) {
        throw new Error(`Invalid FRONTEND_URL: ${frontendUrl}. Appwrite only allows localhost or app.arzansite.com for verification URLs.`);
      }
      
      const verification = await this.appwriteService.createVerificationWithUserSession(
        email,
        password,
        `${frontendUrl}/verify-email`
      );
      
      // Extract verification URL from Appwrite response
      const verificationUrl = this.buildVerificationUrl(verification, verification.userId);
      
      // Send confirmation email via custom SMTP
      const emailSent = await this.emailService.sendConfirmationEmail(
        email,
        verificationUrl,
        email // We don't have the name here, so use email
      );

      if (!emailSent) {
        throw new BadRequestException('Failed to send verification email');
      }

      return { 
        message: 'Verification email sent successfully. Please check your email.',
        verificationEmailSent: true
      };
    } catch (error) {
      // Provide more specific error messages
      if (error.message.includes('Invalid `url` param')) {
        throw new BadRequestException(
          `Email verification URL validation failed. Please ensure FRONTEND_URL is set to localhost or app.arzansite.com. Current value: ${this.configService.get('FRONTEND_URL')}`
        );
      }
      throw new BadRequestException(`Failed to send verification email: ${error.message}`);
    }
  }

  async checkEmailVerificationStatus(email: string) {
    try {
      // Get user by email to check verification status
      const { Query } = await import('node-appwrite');
      const users = await this.appwriteService.getUsers().list([Query.equal('email', email)]);
      
      if (users.users.length === 0) {
        throw new BadRequestException('User not found');
      }

      const user = users.users[0];
      
      // Check if user has any valid verification tokens in our system
      const hasValidVerification = await this.checkUserVerificationStatus(user.$id);
      
      return {
        email: user.email,
        emailVerified: hasValidVerification,
        userId: user.$id,
        message: hasValidVerification 
          ? 'Email is verified. You can now log in.'
          : 'Email is not verified. Please check your inbox for verification email.'
      };
    } catch (error) {
      throw new BadRequestException(`Failed to check email verification status: ${error.message}`);
    }
  }

  private async checkUserVerificationStatus(userId: string): Promise<boolean> {
    try {
      // First check Appwrite's native email verification status
      try {
        const user = await this.appwriteService.getUsers().get(userId);
        if (user.emailVerification) {
          return true;
        }
      } catch (appwriteError) {
        console.warn('Failed to check Appwrite verification status:', appwriteError);
      }

      // Fallback: Check if user has any used verification tokens in our database
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification check skipped: Missing database configuration');
        return false;
      }

      const { Query } = await import('node-appwrite');
      const tokenDocs = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('userId', userId),
          Query.equal('used', true)
        ]
      );

      return tokenDocs.documents.length > 0;
    } catch (error) {
      console.error('❌ Failed to check user verification status:', error);
      return false;
    }
  }

  private buildRecoveryUrl(recovery: any, email: string): string {
    // Appwrite returns a recovery object, we need to construct the full URL
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://app.arzansite.com');
    const token = recovery.$id; // This is the recovery token
    
    // Return the frontend URL with token and email as query parameters
    return `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  }

  async signIn(signInDto: SignInDto) {
    try {
      const session = await this.appwriteService.createSession(
        signInDto.email,
        signInDto.password
      );

      // Get user details to check email verification status
      const user = await this.appwriteService.getUsers().get(session.userId);
      
      // Check if email is verified using our custom system
      const isEmailVerified = await this.checkUserVerificationStatus(session.userId);
      if (!isEmailVerified) {
        // Return error indicating email needs verification
        throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification email.');
      }

      // Create profile if it doesn't exist
      await this.profilesService.createProfileIfNotExists(session.userId, signInDto.email);

      // Issue backend JWT for backend operations
      const payload = { 
        sub: session.userId, 
        email: signInDto.email,
        sessionId: session.$id,
        emailVerified: user.emailVerification
      };
      const secret = this.configService.get<string>('JWT_SECRET', 'change_me');
      const accessToken = jwt.sign(payload, secret, { expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h') });
      const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '7d' });

      return { 
        access_token: accessToken, 
        refresh_token: refreshToken, 
        user: { 
          id: session.userId, 
          email: signInDto.email,
          emailVerified: user.emailVerification
        },
        session: session,
        redirect: {
          url: '/dashboard',
          message: 'Login successful! Redirecting to dashboard...'
        }
      };
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e; // Re-throw our custom error
      }
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

  async startOAuth(provider: string, successUrl: string, failureUrl: string) {
    try {
      console.log(`🚀 Starting OAuth flow for provider: ${provider}`);
      
      // Validate provider
      const validProviders = ['github', 'google', 'facebook', 'discord', 'twitch'];
      if (!validProviders.includes(provider.toLowerCase())) {
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
      }

      // Validate URLs
      if (!successUrl || !failureUrl) {
        throw new BadRequestException('Success and failure URLs are required');
      }

      // Create OAuth2 session using Appwrite service
      const redirectUrl = await this.appwriteService.createOAuth2Session(
        provider,
        successUrl,
        failureUrl
      );

      console.log(`✅ OAuth flow initiated for ${provider}, redirect URL generated`);

      return {
        redirectUrl,
        provider,
        message: `Redirecting to ${provider} for authentication...`
      };
    } catch (error) {
      console.error(`❌ Failed to start OAuth flow for ${provider}:`, error);
      throw new BadRequestException(`Failed to start OAuth flow: ${error.message}`);
    }
  }

  async handleOAuthCallback(userId: string, secret: string, res: Response) {
    try {
      console.log(`🔄 Handling OAuth callback for user: ${userId}`);
      
      if (!userId || !secret) {
        console.error('❌ Missing userId or secret in OAuth callback');
        return res.redirect(`${this.configService.get('FRONTEND_URL')}/auth/login?error=oauth_callback_failed`);
      }

      // Create session using Appwrite service
      const session = await this.appwriteService.createSessionFromOAuth(userId, secret);
      
      // Get user information using the session secret
      const user = await this.appwriteService.getCurrentUser(session.secret);
      
      console.log(`✅ OAuth session created for user: ${user.$id}`);

      // Set HTTP-only cookie for session management
      res.cookie('appwrite_session', session.secret, {
        httpOnly: true,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
        domain: this.configService.get('NODE_ENV') === 'production' ? '.arzansite.com' : undefined,
      });

      // Set user info cookie (non-sensitive data)
      res.cookie('user_info', JSON.stringify({
        id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
      }), {
        httpOnly: false, // Allow frontend access
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
        domain: this.configService.get('NODE_ENV') === 'production' ? '.arzansite.com' : undefined,
      });

      // Create profile if it doesn't exist
      try {
        await this.profilesService.createProfileIfNotExists(user.$id, user.email);
      } catch (profileError) {
        console.warn('⚠️ Failed to create profile for OAuth user:', profileError);
      }

      // Redirect to frontend dashboard
      const frontendUrl = this.configService.get('FRONTEND_URL', 'https://arzansite.com');
      console.log(`✅ Redirecting to frontend: ${frontendUrl}/dashboard`);
      
      return res.redirect(`${frontendUrl}/dashboard?oauth_success=true`);
    } catch (error) {
      console.error('❌ Failed to handle OAuth callback:', error);
      const frontendUrl = this.configService.get('FRONTEND_URL', 'https://arzansite.com');
      return res.redirect(`${frontendUrl}/auth/login?error=oauth_callback_failed&message=${encodeURIComponent(error.message)}`);
    }
  }

  async getOAuthProviders() {
    try {
      // Return list of available OAuth providers
      // This could be made configurable via environment variables or database
      const providers = [
        {
          name: 'github',
          displayName: 'GitHub',
          enabled: true,
          description: 'Sign in with your GitHub account'
        },
        {
          name: 'google',
          displayName: 'Google',
          enabled: true,
          description: 'Sign in with your Google account'
        },
        {
          name: 'facebook',
          displayName: 'Facebook',
          enabled: false, // Disabled by default
          description: 'Sign in with your Facebook account'
        },
        {
          name: 'discord',
          displayName: 'Discord',
          enabled: false, // Disabled by default
          description: 'Sign in with your Discord account'
        },
        {
          name: 'twitch',
          displayName: 'Twitch',
          enabled: false, // Disabled by default
          description: 'Sign in with your Twitch account'
        }
      ];

      return {
        providers: providers.filter(p => p.enabled),
        message: 'Available OAuth providers retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Failed to get OAuth providers:', error);
      throw new BadRequestException('Failed to retrieve OAuth providers');
    }
  }

  async getMeFromSession(sessionSecret: string) {
    try {
      if (!sessionSecret) {
        throw new UnauthorizedException('No session provided');
      }

      // Get user info using Appwrite session
      const user = await this.appwriteService.getCurrentUser(sessionSecret);
      
      return {
        id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
        $createdAt: user.$createdAt,
        $updatedAt: user.$updatedAt,
        prefs: user.prefs,
        message: 'User information retrieved from OAuth session'
      };
    } catch (error) {
      console.error('❌ Failed to get user from session:', error);
      throw new UnauthorizedException('Invalid session or user not found');
    }
  }
}
