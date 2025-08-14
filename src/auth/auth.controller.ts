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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'User registration',
    description: 'Create a new user account, generate verification link, and send confirmation email via custom SMTP',
  })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User created successfully. Please check your email to verify your account.' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            emailVerification: { type: 'boolean' },
            $createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        verificationEmailSent: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or user already exists',
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Email verification',
    description: 'Verify user email address using verification token and send welcome email via custom SMTP',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Verification token from email' },
        userId: { type: 'string', description: 'User ID to verify' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully! Welcome email sent.' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            emailVerification: { type: 'boolean', example: true },
          },
        },
        welcomeEmailSent: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or expired verification token',
  })
  async verifyEmail(
    @Body() body: { token: string; userId?: string },
  ) {
    return this.authService.verifyEmail(body.token, body.userId);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Generate password recovery link and send reset email via custom SMTP',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset email sent successfully. Please check your email.' },
        emailSent: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - email not found or failed to send email',
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
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiBody({ type: SignInDto })
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
        session: {
          type: 'object',
          properties: {
            $id: { type: 'string', example: 'session_id' },
            userId: { type: 'string', example: 'user_id' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
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
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
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
    description: 'Unauthorized - invalid refresh token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Sign out user and invalidate session',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully signed out' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid access token',
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get current user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        message: { type: 'string', example: 'User profile endpoint. Implement additional profile fetching as needed.' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid access token',
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
}
