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
  Res,
  Redirect,
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
            $createdAt: { 
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
        userId: { 
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
    @Body() body: { token: string; userId?: string },
  ) {
    return this.authService.verifyEmail(body.token, body.userId);
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
          example: 'Password reset email sent successfully. Please check your email.',
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
        userId: { type: 'string', example: 'user_id' },
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
            userId: { 
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

  @Post('oauth/github/callback')
  @ApiOperation({
    summary: '🔄 GitHub OAuth Callback Handler',
    description: 'Handle GitHub OAuth callback from Appwrite after successful OAuth authentication.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { 
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
      required: ['userId', 'secret'],
    },
  })
  @ApiResponse({
    status: 302,
    description: '✅ Redirect to frontend with session cookie set',
  })
  @ApiResponse({
    status: 400,
    description: '❌ Bad request - missing userId or secret',
  })
  async handleGitHubOAuthCallback(
    @Body() body: { userId: string; secret: string },
    @Res() res: Response,
  ) {
    return this.authService.handleOAuthCallback(body.userId, body.secret, res);
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
        $createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        $updatedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
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
    
    return res.json({ 
      message: 'Successfully signed out from OAuth session' 
    });
  }
}
