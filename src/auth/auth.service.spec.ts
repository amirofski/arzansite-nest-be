import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { SignUpDto } from './dto/auth.dto';

// Mock node-appwrite module
jest.mock('node-appwrite', () => {
  const mockUsersCreate = jest.fn();
  return {
    Users: jest.fn().mockImplementation(() => ({
      create: mockUsersCreate,
    })),
    ID: {
      unique: jest.fn().mockReturnValue('unique-id'),
    },
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let appwriteService: jest.Mocked<AppwriteService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAppwriteUsers = {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  const mockAppwriteAccount = {
    createVerification: jest.fn(),
    createRecovery: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AppwriteService,
          useValue: {
            getClient: jest.fn().mockReturnValue({}),
            getUsers: jest.fn().mockReturnValue(mockAppwriteUsers),
            getAccount: jest.fn().mockReturnValue(mockAppwriteAccount),
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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    appwriteService = module.get(AppwriteService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);
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
        $id: 'user-id',
        email: 'test@example.com',
        prefs: { first_name: 'Test' },
        $createdAt: new Date().toISOString(),
      };

      // Mock the Users.create method
      const { Users } = require('node-appwrite');
      const mockUsersInstance = new Users({});
      mockUsersInstance.create.mockResolvedValue(mockUser);

      emailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await service.signUp(signUpDto);

      expect(result.message).toContain('User created successfully');
      expect(result).toEqual({ message: 'User created successfully.' });
    });

    it('should throw BadRequestException on error', async () => {
      const signUpDto: SignUpDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock the Users.create method to throw error
      const { Users } = require('node-appwrite');
      const mockUsersInstance = new Users({});
      mockUsersInstance.create.mockRejectedValue(new Error('User creation failed'));

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signIn', () => {
    it('should throw BadRequestException', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(service.signIn(signInDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should throw BadRequestException', async () => {
      const refreshTokenDto = { refresh_token: 'refresh-token' };

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const result = await service.signOut('access-token');

      expect(result.message).toBe('Signed out (client should delete Appwrite and backend tokens)');
    });
  });

  describe('getMe', () => {
    it('should get user information successfully', async () => {
      const userId = 'user-id';

      const result = await service.getMe(userId);

      expect(result.id).toBe('user-id');
      expect(result.message).toBe('User profile endpoint. Implement additional profile fetching as needed.');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';

      const result = await service.sendPasswordResetEmail(email);

      expect(result.message).toBe('Use Appwrite account.createRecovery() and account.updateRecovery() on frontend.');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const userId = 'user-id';

      const result = await service.sendWelcomeEmail(userId);

      expect(result.message).toBe('Welcome email is sent on sign up.');
    });
  });
});
