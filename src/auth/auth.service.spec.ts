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
      admin: {
        updateUserById: jest.fn(),
        listUsers: jest.fn(),
      },
    },
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

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'session-token' } },
        error: null,
      });

      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      emailService.sendEmailVerification.mockResolvedValue(true);

      const result = await service.signUp(signUpDto);

      expect(result.message).toBe('User created successfully');
      expect(result.user).toBeDefined();
      expect(result.verificationToken).toBeDefined();
      expect(typeof result.verificationToken).toBe('string');
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signUpDto.email,
        password: signUpDto.password,
        options: { data: signUpDto.metadata },
      });
      expect(emailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw BadRequestException on signup error', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already exists' },
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-token';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        user_metadata: {
          verificationToken: token,
          verificationTokenCreatedAt: new Date().toISOString(),
        },
        email_confirmed_at: null,
      };

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [mockUser] },
        error: null,
      });

      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await service.verifyEmail(token);

      expect(result.message).toBe('Email verified successfully');
      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        mockUser.id,
        {
          email_confirm: true,
          user_metadata: {
            ...mockUser.user_metadata,
            verificationToken: null,
            verificationTokenCreatedAt: null,
            emailVerifiedAt: expect.any(String),
          },
        },
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      const token = 'invalid-token';

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null,
      });

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const token = 'expired-token';
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        user_metadata: {
          verificationToken: token,
          verificationTokenCreatedAt: expiredDate.toISOString(),
        },
      };

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [mockUser] },
        error: null,
      });

      await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException);
    });

    it('should return success for already verified email', async () => {
      const token = 'valid-token';
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        user_metadata: {
          verificationToken: token,
          verificationTokenCreatedAt: new Date().toISOString(),
        },
        email_confirmed_at: new Date().toISOString(),
      };

      mockSupabaseClient.auth.admin.listUsers.mockResolvedValue({
        data: { users: [mockUser] },
        error: null,
      });

      const result = await service.verifyEmail(token);

      expect(result.message).toBe('Email verified successfully');
      expect(mockSupabaseClient.auth.admin.updateUserById).not.toHaveBeenCalled();
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a secure random token', () => {
      const token1 = (service as any).generateVerificationToken();
      const token2 = (service as any).generateVerificationToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
      expect(token2.length).toBe(64);
    });
  });
});
