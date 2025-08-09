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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, RefreshTokenDto, VerifyEmailDto } from './dto/auth.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'User registration',
    description: 'Create a new user account and send verification email',
  })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User created successfully' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'user@example.com' },
            user_metadata: { type: 'object' },
            email_confirmed_at: { type: 'string', nullable: true },
            created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
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
    description: 'Verify user email address using verification token',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or expired verification token',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto & { email?: string }) {
    return this.authService.verifyEmail(verifyEmailDto.token, verifyEmailDto.email);
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
        user: { type: 'object' },
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
        refresh_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
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
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate session',
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
    description: 'Unauthorized - invalid or missing token',
  })
  async signOut(@Request() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.signOut(token);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get current authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid' },
        email: { type: 'string', example: 'user@example.com' },
        role: { type: 'string', example: 'user' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getMe(@User() user: UserPayload) {
    return this.authService.getMe(user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Send password reset email to user',
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
    description: 'Password reset email sent',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset email sent. Please check your email.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid email or user not found',
  })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.sendPasswordResetEmail(body.email);
  }

  @Post('welcome-email/:userId')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send welcome email',
    description: 'Send welcome email to specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'Welcome email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Welcome email sent successfully.' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async sendWelcomeEmail(@Param('userId') userId: string) {
    return this.authService.sendWelcomeEmail(userId);
  }
}
