import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UnauthorizedException,
  BadRequestException,
  Res,
  Redirect,
  Req,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, RefreshTokenDto, VerifyEmailDto, LoginWithJwtDto } from './dto/auth.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { Response } from 'express';
import { AppwriteAuthGuard } from './appwrite-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: '🔐 User Registration',
    description: 'Create a new user account with email verification. The system will automatically send a verification email to the provided email address.',
  })
  @ApiBody({ 
    type: SignUpDto,
    description: 'User registration information including email, password, and optional metadata'
  })
  @ApiResponse({
    status: 201,
    description: '✅ User created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'User created successfully. Please check your email to verify your account.',
          description: 'Success message with next steps'
        },
        user: {
          type: 'object',
          properties: {
            id: { 
              type: 'string', 
              example: '64f8a1b2c3d4e5f6a7b8c9d0',
              description: 'Unique user identifier'
            },
            email: { 
              type: 'string', 
              example: 'user@example.com',
              description: 'User email address'
            },
            emailVerification: { 
              type: 'boolean',
              example: false,
              description: 'Email verification status'
            },
            $created_at: { 
              type: 'string', 
              example: '2024-01-01T00:00:00.000Z',
              description: 'Account creation timestamp'
            },
          },
        },
        verificationEmailSent: { 
          type: 'boolean', 
          example: true,
          description: 'Whether verification email was sent successfully'
        },
        requiresFrontendVerification: { 
          type: 'boolean', 
          example: false,
          description: 'Whether frontend needs to handle verification'
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - validation error or user already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'User with this email already exists' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '❌ Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to create user' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '✅ Email Verification',
    description: 'Verify user email address using verification token from email. Sends welcome email upon successful verification.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { 
          type: 'string', 
          description: 'Verification token from email link',
          example: '64f8a1b2c3d4e5f6a7b8c9d0'
        },
        user_id: { 
          type: 'string', 
          description: 'User ID to verify (optional, will be extracted from token if not provided)',
          example: '64f8a1b2c3d4e5f6a7b8c9d0'
        },
      },
      required: ['token'],
    },
    description: 'Email verification request with token and optional user ID'
  })
  @ApiResponse({
    status: 200,
    description: '✅ Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Email verified successfully! Welcome email sent.',
          description: 'Success message'
        },
        user: {
          type: 'object',
          properties: {
            id: { 
              type: 'string', 
              example: '64f8a1b2c3d4e5f6a7b8c9d0',
              description: 'User ID'
            },
            email: { 
              type: 'string', 
              example: 'user@example.com',
              description: 'User email address'
            },
            name: { 
              type: 'string', 
              example: 'John Doe',
              description: 'User name from metadata'
            },
            emailVerification: { 
              type: 'boolean', 
              example: true,
              description: 'Email verification status (should be true)'
            },
          },
        },
        welcomeEmailSent: { 
          type: 'boolean', 
          example: true,
          description: 'Whether welcome email was sent successfully'
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - invalid or expired verification token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'string', 
          example: 'This verification link has already been used. Please request a new verification email.',
          description: 'Error message explaining the issue'
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async verifyEmail(
    @Body() body: { token: string; user_id?: string },
  ) {
    return this.authService.verifyEmail(body.token, body.user_id);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔑 Password Reset',
    description: 'Request password reset for a user account. Sends a password reset email with recovery link.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          example: 'user@example.com',
          description: 'Email address of the account requesting password reset'
        },
      },
      required: ['email'],
    },
    description: 'Password reset request with user email'
  })
  @ApiResponse({
    status: 200,
    description: '✅ Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'If an account with that email exists, a password reset link has been sent.',
          description: 'Success message with next steps'
        },
        emailSent: { 
          type: 'boolean', 
          example: true,
          description: 'Whether password reset email was sent successfully'
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - email not found or failed to send email',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'string', 
          example: 'Failed to send password reset email',
          description: 'Error message'
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async sendPasswordReset(@Body() body: { email: string }) {
    return this.authService.sendPasswordReset(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔑 Reset Password',
    description: 'Reset user password using the token from password reset email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { 
          type: 'string', 
          example: 'abc123...',
          description: 'Password reset token from email'
        },
        email: { 
          type: 'string', 
          example: 'user@example.com',
          description: 'Email address of the account (optional, can be derived from token)'
        },
        newPassword: { 
          type: 'string', 
          example: 'NewSecurePassword123!',
          description: 'New password for the account'
        },
        new_password: { 
          type: 'string', 
          example: 'NewSecurePassword123!',
          description: 'New password for the account (alternative field name)'
        },
      },
      required: ['token'],
    },
    description: 'Password reset with token and new password'
  })
  async resetPassword(@Body() body: { 
    token: string; 
    email?: string; 
    newPassword?: string; 
    new_password?: string; 
  }) {
    // Handle both field name variations
    const newPassword = body.newPassword || body.new_password;
    if (!newPassword) {
      throw new BadRequestException('New password is required');
    }
    
    return this.authService.resetPassword(body.token, newPassword, body.email);
  }

  @Post('request-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request email verification',
    description: 'Request verification email after user login (requires authentication)',
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Verification email sent successfully. Please check your email.' },
        verificationEmailSent: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - failed to send verification email',
  })
  async requestEmailVerification(@Body() body: { email: string; password: string }) {
    return this.authService.requestEmailVerification(body.email, body.password);
  }

  @Get('check-verification/:email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check email verification status',
    description: 'Check if a user\'s email is verified',
  })
  @ApiParam({ name: 'email', description: 'User email address' })
  @ApiResponse({
    status: 200,
    description: 'Email verification status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        emailVerified: { type: 'boolean', example: false },
        user_id: { type: 'string', example: 'user_id' },
        message: { type: 'string', example: 'Email is not verified. Please check your inbox for verification email.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user not found',
  })
  async checkEmailVerificationStatus(@Param('email') email: string) {
    return this.authService.checkEmailVerificationStatus(email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔑 User Login',
    description: 'Authenticate user with email and password. Returns JWT tokens for API access. Note: Email must be verified before login.',
  })
  @ApiBody({ 
    type: SignInDto,
    description: 'User login credentials'
  })
  @ApiResponse({
    status: 200,
    description: '✅ Login successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { 
          type: 'string', 
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY4YTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzQyNzI4MDAsImV4cCI6MTczNDI3NjQwMH0.example',
          description: 'JWT access token for API authentication'
        },
        refresh_token: { 
          type: 'string', 
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY4YTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTczNDI3MjgwMCwiZXhwIjoxNzM0ODc3NjAwfQ.example',
          description: 'JWT refresh token for getting new access tokens'
        },
        user: {
          type: 'object',
          properties: {
            id: { 
              type: 'string', 
              example: '64f8a1b2c3d4e5f6a7b8c9d0',
              description: 'User ID'
            },
            email: { 
              type: 'string', 
              example: 'user@example.com',
              description: 'User email address'
            },
            emailVerified: { 
              type: 'boolean',
              example: true,
              description: 'Email verification status'
            },
          },
        },
        session: {
          type: 'object',
          properties: {
            $id: { 
              type: 'string', 
              example: '64f8a1b2c3d4e5f6a7b8c9d0',
              description: 'Appwrite session ID'
            },
            user_id: { 
              type: 'string', 
              example: '64f8a1b2c3d4e5f6a7b8c9d0',
              description: 'User ID associated with session'
            },
          },
        },
        redirect: {
          type: 'object',
          properties: {
            url: { 
              type: 'string', 
              example: '/dashboard',
              description: 'Redirect URL after successful login'
            },
            message: { 
              type: 'string', 
              example: 'Login successful! Redirecting to dashboard...',
              description: 'Success message for user'
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - invalid credentials or email not verified',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Please verify your email before logging in. Check your inbox for the verification email.' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid email format' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('login-with-jwt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with Appwrite JWT',
    description: 'Authenticate user using Appwrite session JWT and issue backend JWT',
  })
  @ApiBody({ type: LoginWithJwtDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid Appwrite JWT or email not verified',
  })
  async loginWithJwt(@Body() loginWithJwtDto: LoginWithJwtDto) {
    return this.authService.loginWithJwt(loginWithJwtDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔄 Refresh Access Token',
    description: 'Get a new access token using a valid refresh token. This endpoint is used to maintain user sessions without requiring re-authentication.',
  })
  @ApiBody({ 
    type: RefreshTokenDto,
    description: 'Refresh token request with current refresh token'
  })
  @ApiResponse({
    status: 200,
    description: '✅ Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { 
          type: 'string', 
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY4YTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzQyNzI4MDAsImV4cCI6MTczNDI3NjQwMH0.example',
          description: 'New JWT access token'
        },
        user: {
          type: 'object',
          properties: {
            id: { 
              type: 'string', 
              example: '64f8a1b2c3d4e5f6a7b8c9d0',
              description: 'User ID'
            },
            email: { 
              type: 'string', 
              example: 'user@example.com',
              description: 'User email address'
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - invalid refresh token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid refresh token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🚪 User Logout',
    description: 'Sign out user and invalidate session. This endpoint requires a valid JWT access token in the Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Successfully signed out',
          description: 'Success message'
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - invalid access token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'No access token provided' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async signOut(@Request() req: any) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return this.authService.signOut(token);
    }
    throw new UnauthorizedException('No access token provided');
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '👤 Get Current User',
    description: 'Get information about the currently authenticated user. This endpoint requires a valid JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: '✅ User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          example: '64f8a1b2c3d4e5f6a7b8c9d0',
          description: 'User ID'
        },
        message: { 
          type: 'string', 
          example: 'User profile endpoint. Implement additional profile fetching as needed.',
          description: 'Information message'
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - invalid access token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid access token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async getMe(@User() user: UserPayload) {
    return this.authService.getMe(user.id);
  }

  // Legacy endpoint for backward compatibility
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Email verification (legacy)',
    description: 'Legacy endpoint - use /auth/verify instead',
    deprecated: true,
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Use /auth/verify endpoint instead',
  })
  async verifyEmailLegacy(@Body() verifyEmailDto: VerifyEmailDto & { email?: string }) {
    return { 
      message: 'This endpoint is deprecated. Use /auth/verify with query parameters instead.',
      redirectTo: '/auth/verify'
    };
  }

  @Post('oauth/github/start')
  @ApiOperation({
    summary: '🚀 Initiate GitHub OAuth Flow',
    description: 'Start GitHub OAuth authentication flow. Returns redirect URL to GitHub OAuth provider.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        successUrl: { 
          type: 'string', 
          description: 'URL to redirect after successful OAuth login',
          example: 'https://arzansite.com/auth/oauth/callback'
        },
        failureUrl: { 
          type: 'string', 
          description: 'URL to redirect after failed OAuth login',
          example: 'https://arzansite.com/auth/login?error=oauth_failed'
        },
      },
      required: ['successUrl', 'failureUrl'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '✅ OAuth flow initiated successfully',
    schema: {
      type: 'object',
      properties: {
        redirectUrl: { 
          type: 'string', 
          example: 'https://github.com/login/oauth/authorize?client_id=...',
          description: 'URL to redirect user to OAuth provider'
        },
        provider: { 
          type: 'string', 
          example: 'github',
          description: 'OAuth provider name'
        },
        projectId: { 
          type: 'string', 
          example: '6898b35e003067cd7b43',
          description: 'Appwrite project ID'
        },
        message: { 
          type: 'string', 
          example: 'Redirecting to GitHub for authentication...',
          description: 'Success message'
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - invalid provider or URLs',
  })
  async startGitHubOAuth(
    @Body() body: { successUrl: string; failureUrl: string },
  ) {
    return this.authService.startOAuth('github', body.successUrl, body.failureUrl);
  }

  // Generic OAuth start endpoint to support multiple providers (e.g., google, github)
  @Post('oauth/:provider/start')
  @ApiOperation({
    summary: '🚀 Initiate OAuth Flow (Generic)',
    description: 'Start OAuth authentication flow for supported providers like Google and GitHub.'
  })
  @ApiParam({ name: 'provider', description: 'OAuth provider (e.g., google, github)', example: 'google' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        successUrl: { type: 'string', example: 'https://arzansite.com/auth/oauth/callback' },
        failureUrl: { type: 'string', example: 'https://arzansite.com/auth/login?error=oauth_failed' }
      },
      required: ['successUrl', 'failureUrl']
    }
  })
  async startOAuthGeneric(
    @Param('provider') provider: string,
    @Body() body: { successUrl: string; failureUrl: string },
  ) {
    return this.authService.startOAuth(provider, body.successUrl, body.failureUrl);
  }

  @Post('oauth/github/callback')
  @ApiOperation({
    summary: '🔄 GitHub OAuth Callback Handler',
    description: 'Handle GitHub OAuth callback from Appwrite after successful OAuth authentication.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_id: { 
          type: 'string', 
          description: 'User ID from Appwrite OAuth session',
          example: '64f8a1b2c3d4e5f6a7b8c9d0'
        },
        secret: { 
          type: 'string', 
          description: 'Session secret from Appwrite OAuth session',
          example: 'session_secret_here'
        },
      },
      required: ['user_id', 'secret'],
    },
  })
  @ApiResponse({
    status: 302,
    description: '✅ Redirect to frontend with session cookie set',
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - missing user_id or secret',
  })
  async handleGitHubOAuthCallback(
    @Body() body: { user_id: string; secret: string },
    @Res() res: Response,
  ) {
    return this.authService.handleOAuthCallback(body.user_id, body.secret, res);
  }

  // Generic OAuth callback to support multiple providers
  @Post('oauth/:provider/callback')
  @ApiOperation({
    summary: '🔄 OAuth Callback Handler (Generic)',
    description: 'Handle OAuth callback from Appwrite after successful authentication for supported providers.'
  })
  @ApiParam({ name: 'provider', description: 'OAuth provider (e.g., google, github)', example: 'google' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'User ID from Appwrite OAuth session' },
        secret: { type: 'string', description: 'Session secret from Appwrite OAuth session' }
      },
      required: ['user_id', 'secret']
    }
  })
  async handleOAuthCallbackGeneric(
    @Param('provider') _provider: string,
    @Body() body: { user_id: string; secret: string },
    @Res() res: Response,
  ) {
    // Provider is not used server-side because Appwrite returns user_id/secret; we complete session with those
    return this.authService.handleOAuthCallback(body.user_id, body.secret, res);
  }

  @Get('oauth/providers')
  @ApiOperation({
    summary: '📋 Get Available OAuth Providers',
    description: 'Get list of available OAuth providers configured in the system.',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Available OAuth providers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'github' },
              displayName: { type: 'string', example: 'GitHub' },
              enabled: { type: 'boolean', example: true },
            },
          },
          example: [
            { name: 'github', displayName: 'GitHub', enabled: true },
            { name: 'google', displayName: 'Google', enabled: true },
          ],
        },
      },
    },
  })
  async getOAuthProviders() {
    return this.authService.getOAuthProviders();
  }

  @Get('oauth/me')
  @ApiOperation({
    summary: '👤 Get Current User from OAuth Session',
    description: 'Get information about the currently authenticated user from OAuth session cookie.',
  })
  @ApiResponse({
    status: 200,
    description: '✅ User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '64f8a1b2c3d4e5f6a7b8c9d0' },
        email: { type: 'string', example: 'user@example.com' },
        name: { type: 'string', example: 'John Doe' },
        emailVerification: { type: 'boolean', example: true },
        $created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        $updated_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        prefs: { type: 'object', example: {} },
        message: { type: 'string', example: 'User information retrieved from OAuth session' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - no valid session found',
  })
  async getMeFromOAuthSession(@Request() req: any) {
    const sessionSecret = req.cookies?.appwrite_session;
    if (!sessionSecret) {
      throw new UnauthorizedException('No OAuth session found');
    }
    return this.authService.getMeFromSession(sessionSecret);
  }

  @Post('oauth/logout')
  @ApiOperation({
    summary: '🚪 OAuth User Logout',
    description: 'Sign out OAuth user and clear session cookies.',
  })
  @ApiResponse({
    status: 200,
    description: '✅ OAuth logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Successfully signed out from OAuth session',
          description: 'Success message'
        },
      },
    },
  })
  async oauthLogout(@Request() req: any, @Res() res: Response) {
    // Clear OAuth session cookies
    res.clearCookie('appwrite_session');
    res.clearCookie('user_info');
    // Clear backend session cookie set by /auth/session (match cookie attributes)
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? (process.env.COOKIE_DOMAIN || '.arzansite.com') : undefined;
    res.clearCookie('appwrite_jwt', {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      domain: cookieDomain,
      path: '/',
    });
    
    return res.json({ 
      message: 'Successfully signed out from OAuth session' 
    });
  }

  @Post('session')
  @ApiOperation({
    summary: '🔐 Create Appwrite Session',
    description: 'Create a session by validating an Appwrite JWT token. If valid, sets a server cookie and returns user info.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        jwt: {
          type: 'string',
          description: 'Appwrite JWT token from account.createJWT()',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      required: ['jwt']
    }
  })
  @ApiResponse({
    status: 200,
    description: '✅ Session created successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '64f8a1b2c3d4e5f6a7b8c9d0' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            emailVerification: { type: 'boolean', example: true },
            $created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            $updated_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            prefs: { type: 'object', example: {} }
          }
        },
        message: { type: 'string', example: 'Session created successfully' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - JWT token required',
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - Invalid JWT token',
  })
  async createSession(@Req() req: any, @Res() res: Response) {
    const jwt = req.body?.jwt;
    if (!jwt) {
      return res.status(400).json({ error: 'jwt required' });
    }

    // Verify token and set server cookie for subsequent requests
    // We will call Appwrite to validate the token by using the Guard pattern manually
    const { Client, Account } = require('node-appwrite');
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
      .setProject(process.env.APPWRITE_PROJECT || '')
      .setKey(process.env.APPWRITE_API_KEY || '');
    client.setJWT(jwt);
    const account = new Account(client);

    try {
      const user = await account.get();

      // Set an HttpOnly cookie for backend-managed sessions
      const isProd = process.env.NODE_ENV === 'production';
      const cookieDomain = isProd ? (process.env.COOKIE_DOMAIN || '.arzansite.com') : undefined;
      res.cookie('appwrite_jwt', jwt, {
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        domain: cookieDomain,
        path: '/',
        maxAge: 1000 * 60 * 60, // 1 hour (jwt lifetime may be shorter)
      });

      return res.json({ 
        user,
        message: 'Session created successfully'
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid JWT' });
    }
  }

  @UseGuards(AppwriteAuthGuard)
  @Post('userinfo')
  @ApiOperation({
    summary: '👤 Get User Info (Protected)',
    description: 'Get information about the currently authenticated user using Appwrite JWT.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '✅ User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '64f8a1b2c3d4e5f6a7b8c9d0' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            emailVerification: { type: 'boolean', example: true },
            $created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            $updated_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            prefs: { type: 'object', example: {} }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - Invalid or missing JWT token',
  })
  async userInfo(@Req() req: any) {
    return { user: req.user };
  }

  @Post('exchange-jwt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔄 Exchange Appwrite JWT for Backend JWT',
    description: 'Exchange an Appwrite JWT token for a backend JWT token. This allows frontend to authenticate with the backend using Appwrite credentials.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        appwriteJwt: {
          type: 'string',
          description: 'Appwrite JWT token from account.createJWT()',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      },
      required: ['appwriteJwt']
    }
  })
  @ApiResponse({
    status: 200,
    description: '✅ JWT exchange successful',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Backend JWT access token for API authentication'
        },
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Backend JWT refresh token'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '64f8a1b2c3d4e5f6a7b8c9d0' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            emailVerification: { type: 'boolean', example: true },
          }
        },
        message: {
          type: 'string',
          example: 'JWT exchange successful. Use the access_token for API requests.',
          description: 'Success message'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - Appwrite JWT required',
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - Invalid Appwrite JWT',
  })
  async exchangeJwt(@Body() body: { appwriteJwt: string }) {
    return this.authService.exchangeAppwriteJwt(body.appwriteJwt);
  }

  @Post('session-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Authenticate using Appwrite Session ID',
    description: 'Authenticate with Appwrite session ID or directly with email/password. If email/password is provided, a session is created and used for authentication.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Appwrite session ID from account.createEmailPasswordSession()',
          example: '68a230dc276cc04a4ea9'
        },
        email: {
          type: 'string',
          description: 'User email for verification',
          example: 'user@example.com'
        },
        password: {
          type: 'string',
          description: 'User password (optional alternative to session_id)',
          example: 'password123'
        }
      },
      required: []
    }
  })
  @ApiResponse({
    status: 200,
    description: '✅ Session authentication successful',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Backend JWT access token for API authentication'
        },
        refresh_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Backend JWT refresh token'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '68a230dc276cc04a4ea9' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'user' },
            emailVerification: { type: 'boolean', example: true },
          }
        },
        message: {
          type: 'string',
          example: 'Session authentication successful. Use the access_token for API requests.',
          description: 'Success message'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - Session ID and email required',
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - Invalid session or credentials',
  })
  async authenticateSession(@Body() body: { session_id?: string; email?: string; password?: string }) {
    if (body.session_id && body.email) {
      return this.authService.authenticateWithSession(body.session_id, body.email);
    }
    if (body.email && body.password) {
      return this.authService.authenticateWithEmailPassword(body.email, body.password);
    }
    throw new BadRequestException('Provide either session_id+email or email+password');
  }

  @Post('session-logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🚪 Logout and invalidate Appwrite session',
    description: 'Logout user by deleting the Appwrite session and invalidating backend tokens.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Appwrite session ID to logout',
          example: '68a230dc276cc04a4ea9'
        }
      },
      required: ['session_id']
    }
  })
  @ApiResponse({
    status: 200,
    description: '✅ Session logged out successfully',
  })
  @ApiResponse({
    status: 401,
    description: '❌ Unauthorized - Invalid session',
  })
  async logoutSession(@Body() body: { session_id: string }) {
    return this.authService.logoutSession(body.session_id);
  }

  @Get('session-info/:session_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ℹ️ Get session information and user details',
    description: 'Retrieve information about a specific session and its associated user.',
  })
  @ApiParam({
    name: 'session_id',
    description: 'Appwrite session ID',
    example: '68a230dc276cc04a4ea9'
  })
  @ApiResponse({
    status: 200,
    description: '✅ Session information retrieved',
  })
  async getSessionInfo(@Param('session_id') session_id: string) {
    return this.authService.getSessionInfo(session_id);
  }

  @Post('session-validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '✅ Validate session status',
    description: 'Check if a session is still valid and active.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Appwrite session ID to validate',
          example: '68a230dc276cc04a4ea9'
        }
      },
      required: ['session_id']
    }
  })
  @ApiResponse({
    status: 200,
    description: '✅ Session validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        session_id: { type: 'string', example: '68a230dc276cc04a4ea9' }
      }
    }
  })
  async validateSession(@Body() body: { session_id: string }) {
    const isValid = await this.authService.validateSession(body.session_id);
    return { valid: isValid, session_id: body.session_id };
  }
}
