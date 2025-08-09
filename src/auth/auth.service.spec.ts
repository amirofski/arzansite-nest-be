import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { SignUpDto } from './dto/auth.dto';

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let emailService: jest.Mocked<EmailService>;

  const mockSupabaseClient = {
    auth: {
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      admin: {
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
        createUser: jest.fn(),
        generateLink: jest.fn(),
      },
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn(),
        }),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmailVerification: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            sendWelcomeEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    supabaseService = module.get(SupabaseService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a user successfully', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        password: 'password123',
        metadata: { first_name: 'Test' },
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        user_metadata: { first_name: 'Test' },
      };

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { action_link: 'https://example.com/verify?token=abc' } },
        error: null,
      });

      emailService.sendEmailVerification.mockResolvedValue(true);

      const result = await service.signUp(signUpDto);

      expect(result.message).toContain('User created successfully');
      expect(result.user).toBeDefined();
      expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
        email: signUpDto.email,
        password: signUpDto.password,
        user_metadata: signUpDto.metadata,
        email_confirm: false,
      });
      expect(mockSupabaseClient.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'signup',
        email: signUpDto.email,
        password: signUpDto.password,
        options: { redirectTo: `${process.env.FRONTEND_URL}/verify-email` },
      });
      expect(emailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw BadRequestException on signup error', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with token_hash', async () => {
      const token = 'valid-token';

      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      });

      const result = await service.verifyEmail(token);

      expect(result.message).toBe('Email verified successfully');
      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: token,
        type: 'signup',
      });
    });

    it('should verify email successfully with direct token', async () => {
      const token = 'valid-token';

      // First call fails
      mockSupabaseClient.auth.verifyOtp
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Invalid token hash' },
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          data: { user: { id: 'user-id' } },
          error: null,
        });

      const result = await service.verifyEmail(token);

      expect(result.message).toBe('Email verified successfully');
      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for invalid token', async () => {
      const token = 'invalid-token';

      mockSupabaseClient.auth.verifyOtp
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Invalid token hash' },
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Invalid token' },
        });

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockSession = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await service.signIn(signInDto);

      expect(result.access_token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(result.user).toBe(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenDto = { refresh_token: 'refresh-token' };

      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await service.refreshToken(refreshTokenDto);

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await service.signOut('access-token');

      expect(result.message).toBe('Successfully signed out');
    });
  });

  describe('getMe', () => {
    it('should get user information successfully', async () => {
      const userId = 'user-id';
      const mockUser = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
        },
      };

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const mockUserRole = { role: 'user' };
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockUserRole,
      });

      const result = await service.getMe(userId);

      expect(result.id).toBe('user-id');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('user');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';

      mockSupabaseClient.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { action_link: 'https://example.com/reset?token=xyz' } },
        error: null,
      });

      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.sendPasswordResetEmail(email);

      expect(result.message).toBe('Password reset email sent. Please check your email.');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const userId = 'user-id';
      const mockUser = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          user_metadata: { first_name: 'Test' },
        },
      };

      mockSupabaseClient.auth.admin.getUserById.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      emailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await service.sendWelcomeEmail(userId);

      expect(result.message).toBe('Welcome email sent successfully.');
    });
  });
});
