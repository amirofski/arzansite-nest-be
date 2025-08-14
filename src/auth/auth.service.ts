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

      // Try to send verification email immediately after user creation
      try {
        console.log('🔧 Attempting to send verification email during signup...');
        
        // Create a simple verification URL without using Appwrite's verification system
        // This avoids the scope issues while still providing email verification
        const verificationToken = this.generateVerificationToken();
        const verificationUrl = `${this.configService.get('FRONTEND_URL', 'https://arzansite.com')}/verify-email?token=${verificationToken}&userId=${created.$id}`;
        
        console.log('🔗 Verification URL built:', verificationUrl);
        
        // Send confirmation email via custom SMTP
        console.log('📧 Attempting to send email via EmailService...');
        const emailSent = await this.emailService.sendConfirmationEmail(
          signUpDto.email,
          verificationUrl,
          signUpDto.metadata?.name
        );

        console.log('📧 Email sending result:', emailSent);

        if (emailSent) {
          console.log('✅ Verification email sent successfully during signup');
          
          // Store the verification token in the database for later verification
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
      } catch (verificationError) {
        console.error('❌ Failed to send verification email during signup:', verificationError);
        console.error('❌ Error details:', {
          message: verificationError.message,
          stack: verificationError.stack,
          name: verificationError.name
        });
        // Continue with fallback response
      }

      // Fallback: Return success but indicate verification email needs to be requested
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
          Query.equal('token', token),
          Query.equal('used', false),
          Query.greaterThan('expiresAt', new Date().toISOString())
        ]
      );

      if (documents.documents.length > 0) {
        return documents.documents[0].userId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to find userId by token:', error);
      return null;
    }
  }

  private async validateVerificationToken(userId: string, token: string): Promise<boolean> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification validation skipped: Missing database configuration');
        return false;
      }

      // Query for the token
      const { Query } = await import('node-appwrite');
      const documents = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('userId', userId),
          Query.equal('token', token),
          Query.equal('used', false),
          Query.greaterThan('expiresAt', new Date().toISOString())
        ]
      );

      return documents.documents.length > 0;
    } catch (error) {
      console.error('❌ Failed to validate verification token:', error);
      return false;
      return false;
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
      
      // Verify the token from our database
      const isValidToken = await this.validateVerificationToken(targetUserId, token);
      
      if (!isValidToken) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      try {
        // Mark the token as used
        await this.markVerificationTokenAsUsed(targetUserId, token);
        
        console.log('✅ User email verification completed via custom system');
        
        // Get updated user details
        const user = await this.appwriteService.getUsers().get(targetUserId);
        
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
            emailVerification: true
          },
          welcomeEmailSent
        };
      } catch (updateError) {
        console.error('Failed to update user verification status:', updateError);
        // Still return success since the token was valid
        return { 
          message: 'Email verification token validated successfully!',
          user: {
            id: targetUserId,
            emailVerification: true
          },
          welcomeEmailSent: false
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
      const recovery = await this.appwriteService.getAccount().createRecovery(
        email,
        `${this.configService.get('FRONTEND_URL', 'https://arzansite.com')}/reset-password`
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

  async requestEmailVerification(email: string, password: string) {
    try {
      // This method is called after user login to request verification
      // It creates a session and then requests verification
      const verification = await this.appwriteService.createVerificationWithUserSession(
        email,
        password,
        `${this.configService.get('FRONTEND_URL', 'https://arzansite.com')}/verify-email`
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
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_VERIFICATIONS', 'email_verifications');
      
      if (!databaseId || !collectionId) {
        console.warn('Email verification check skipped: Missing database configuration');
        return false;
      }

      // Check if user has any used verification tokens (indicating they completed verification)
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
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://arzansite.com');
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
}
