import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { AppwriteService } from "../appwrite/appwrite.service";
import { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException, BadRequestException } from "@nestjs/common";
import { SignUpDto, SignInDto, RefreshTokenDto, LoginWithJwtDto } from "./dto/auth.dto";
import * as jwt from "jsonwebtoken";

describe("AuthService", () => {
  let service: AuthService;
  let appwriteService: jest.Mocked<AppwriteService>;
  let emailService: jest.Mocked<EmailService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAppwriteService = {
    createUser: jest.fn(),
    getAccount: jest.fn(),
    getUsers: jest.fn(),
    createSession: jest.fn(),
    getCurrentUser: jest.fn(),
    deleteSession: jest.fn(),
    createVerificationWithUserSession: jest.fn(),
    createRecoveryWithUserSession: jest.fn(),
    getDatabases: jest.fn(),
    createDocument: jest.fn(),
  };

  const mockEmailService = {
    sendConfirmationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
    sendEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AppwriteService,
          useValue: mockAppwriteService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    appwriteService = module.get(AppwriteService);
    emailService = module.get(EmailService);
    configService = module.get(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
    
    // Default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        FRONTEND_URL: "https://arzansite.com",
        JWT_SECRET: "test-secret",
        JWT_EXPIRES_IN: "1h",
        APPWRITE_ENDPOINT: "http://localhost/v1",
        APPWRITE_PROJECT_ID: "test-project",
        APPWRITE_DATABASE_ID: "test-database",
        APPWRITE_COLLECTION_EMAIL_VERIFICATIONS: "email_verifications",
      };
      return config[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("signUp", () => {
    const signUpDto: SignUpDto = {
      email: "test@example.com",
      password: "password123",
      metadata: { name: "Test User" },
    };

      const mockUser = {
    $id: "user123",
    email: "test@example.com",
    emailVerification: false,
    $createdAt: "2023-01-01T00:00:00Z",
    $updatedAt: "2023-01-01T00:00:00Z",
    name: "Test User",
    registration: "2023-01-01T00:00:00Z",
    status: 1,
    labels: [],
    passwordUpdate: "2023-01-01T00:00:00Z",
    phone: "",
    phoneVerification: false,
    prefs: {},
  } as any;

    const mockVerification = {
      $id: "verification123",
      $createdAt: "2023-01-01T00:00:00Z",
      userId: "user123",
      secret: "secret123",
      expire: "2023-01-08T00:00:00Z",
      phrase: "verification",
    } as any;

    it("should create user successfully without sending verification email", async () => {
      appwriteService.createUser.mockResolvedValue(mockUser);
      // Mock email service to return false (email sending failed)
      mockEmailService.sendConfirmationEmail.mockResolvedValue(false);
      // Mock database operations
      appwriteService.getDatabases.mockReturnValue({
        createDocument: jest.fn().mockResolvedValue({})
      } as any);

      const result = await service.signUp(signUpDto);

      expect(appwriteService.createUser).toHaveBeenCalledWith(
        signUpDto.email,
        signUpDto.password,
        signUpDto.metadata?.name
      );
      expect(result).toEqual({
        message: "User created successfully. Please sign in to verify your email.",
        user: {
          id: mockUser.$id,
          email: mockUser.email,
          emailVerification: mockUser.emailVerification,
          $createdAt: mockUser.$createdAt,
        },
        verificationEmailSent: false,
        requiresFrontendVerification: true,
      });
    });

    it("should create user successfully and send verification email", async () => {
      appwriteService.createUser.mockResolvedValue(mockUser);
      // Mock email service to return true (email sending successful)
      mockEmailService.sendConfirmationEmail.mockResolvedValue(true);
      // Mock database operations
      appwriteService.getDatabases.mockReturnValue({
        createDocument: jest.fn().mockResolvedValue({})
      } as any);

      const result = await service.signUp(signUpDto);

      expect(appwriteService.createUser).toHaveBeenCalledWith(
        signUpDto.email,
        signUpDto.password,
        signUpDto.metadata?.name
      );
      expect(result).toEqual({
        message: "User created successfully. Please check your email to verify your account.",
        user: {
          id: mockUser.$id,
          email: mockUser.email,
          emailVerification: mockUser.emailVerification,
          $createdAt: mockUser.$createdAt,
        },
        verificationEmailSent: true,
        requiresFrontendVerification: false,
      });
    });

    it("should handle user creation failure", async () => {
      appwriteService.createUser.mockRejectedValue(new Error("User creation failed"));

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });

    it("should handle user creation failure", async () => {
      appwriteService.createUser.mockRejectedValue(new Error("User creation failed"));

      await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifyEmail", () => {
    const token = "verification-token";
    const userId = "user123";
    const mockUser = {
      $id: "user123",
      email: "test@example.com",
      name: "Test User",
      emailVerification: true,
    };

    it("should verify email successfully and send welcome email", async () => {
      // Mock the database operations for our custom verification system
      appwriteService.getDatabases.mockReturnValue({
        listDocuments: jest.fn().mockResolvedValue({
          documents: [{
            $id: 'doc123',
            userId: userId,
            token: token,
            used: false,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }]
        }),
        updateDocument: jest.fn().mockResolvedValue({})
      } as any);
      
      appwriteService.getUsers.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUser),
      } as any);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

      const result = await service.verifyEmail(token, userId);

      expect(result).toEqual({
        message: "Email verified successfully! Welcome email sent.",
        user: {
          id: mockUser.$id,
          email: mockUser.email,
          name: mockUser.name,
          emailVerification: true,
        },
        welcomeEmailSent: true,
      });
    });

    it("should handle verification failure", async () => {
      // Mock the database to return no valid tokens (verification will fail)
      appwriteService.getDatabases.mockReturnValue({
        listDocuments: jest.fn().mockResolvedValue({
          documents: [] // No valid tokens found
        })
      } as any);

      await expect(service.verifyEmail(token, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe("sendPasswordReset", () => {
    const email = "test@example.com";
    const mockRecovery = {
      $id: "recovery123",
      $createdAt: "2023-01-01T00:00:00Z",
      userId: "user123",
      secret: "secret123",
      expire: "2023-01-08T00:00:00Z",
      phrase: "recovery",
    } as any;

    it("should send password reset email successfully", async () => {
      appwriteService.getAccount.mockReturnValue({
        createRecovery: jest.fn().mockResolvedValue(mockRecovery),
      } as any);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.sendPasswordReset(email);

      expect(result).toEqual({
        message: "Password reset email sent successfully. Please check your email.",
        emailSent: true,
      });
    });

    it("should handle email sending failure", async () => {
      appwriteService.getAccount.mockReturnValue({
        createRecovery: jest.fn().mockResolvedValue(mockRecovery),
      } as any);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(false);

      await expect(service.sendPasswordReset(email)).rejects.toThrow(BadRequestException);
    });
  });

  describe("requestEmailVerification", () => {
    const email = "test@example.com";
    const password = "password123";
    const mockVerification = {
      $id: "verification123",
      userId: "user123",
    } as any;

    it("should send verification email successfully", async () => {
      appwriteService.createVerificationWithUserSession.mockResolvedValue(mockVerification);
      mockEmailService.sendConfirmationEmail.mockResolvedValue(true);

      const result = await service.requestEmailVerification(email, password);

      expect(appwriteService.createVerificationWithUserSession).toHaveBeenCalledWith(
        email,
        password,
        "https://arzansite.com/auth/verify"
      );
      expect(result).toEqual({
        message: "Verification email sent successfully. Please check your email.",
        verificationEmailSent: true,
      });
    });

    it("should handle verification creation failure", async () => {
      appwriteService.createVerificationWithUserSession.mockRejectedValue(new Error("Verification failed"));

      await expect(service.requestEmailVerification(email, password)).rejects.toThrow(BadRequestException);
    });
  });

  describe("checkEmailVerificationStatus", () => {
    const email = "test@example.com";
    const mockUser = {
      $id: "user123",
      email: "test@example.com",
      emailVerification: false,
    } as any;

    it("should return verification status for unverified email", async () => {
      appwriteService.getUsers.mockReturnValue({
        list: jest.fn().mockResolvedValue({
          users: [mockUser],
        }),
      } as any);

      const result = await service.checkEmailVerificationStatus(email);

      expect(result).toEqual({
        email: mockUser.email,
        emailVerified: mockUser.emailVerification,
        userId: mockUser.$id,
        message: "Email is not verified. Please check your inbox for verification email.",
      });
    });

    it("should return verification status for verified email", async () => {
      const verifiedUser = { ...mockUser, emailVerification: true };
      appwriteService.getUsers.mockReturnValue({
        list: jest.fn().mockResolvedValue({
          users: [verifiedUser],
        }),
      } as any);

      const result = await service.checkEmailVerificationStatus(email);

      expect(result).toEqual({
        email: verifiedUser.email,
        emailVerified: verifiedUser.emailVerification,
        userId: verifiedUser.$id,
        message: "Email is verified. You can now log in.",
      });
    });

    it("should handle user not found", async () => {
      appwriteService.getUsers.mockReturnValue({
        list: jest.fn().mockResolvedValue({
          users: [],
        }),
      } as any);

      await expect(service.checkEmailVerificationStatus(email)).rejects.toThrow(BadRequestException);
    });
  });

  describe("signIn", () => {
    const signInDto: SignInDto = {
      email: "test@example.com",
      password: "password123",
    };

    const mockSession = {
      userId: "user123",
      $id: "session123",
      $createdAt: "2023-01-01T00:00:00Z",
      $updatedAt: "2023-01-01T00:00:00Z",
      expire: "2023-01-08T00:00:00Z",
      provider: "email",
      providerUid: "test@example.com",
      current: true,
      factors: [],
      secret: "",
      mfaUpdatedAt: "2023-01-01T00:00:00Z",
      countryCode: "",
      countryName: "",
      city: "",
      ip: "",
      code: "",
      osCode: "",
      osName: "",
      clientCode: "",
      clientName: "",
      clientVersion: "",
      clientEngine: "",
      clientEngineVersion: "",
      deviceName: "",
      deviceBrand: "",
      deviceModel: "",
    } as any;

    it("should sign in successfully and return tokens", async () => {
      const mockUser = {
        $id: "user123",
        email: "test@example.com",
        emailVerification: true,
      } as any;

      appwriteService.createSession.mockResolvedValue(mockSession);
      appwriteService.getUsers.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.signIn(signInDto);

      expect(appwriteService.createSession).toHaveBeenCalledWith(
        signInDto.email,
        signInDto.password
      );
      expect(result).toHaveProperty("access_token");
      expect(result).toHaveProperty("refresh_token");
      expect(result.user).toEqual({
        id: mockSession.userId,
        email: signInDto.email,
        emailVerified: true,
      });
      expect(result.session).toEqual(mockSession);
    });

    it("should handle invalid credentials", async () => {
      appwriteService.createSession.mockRejectedValue(new Error("Invalid credentials"));

      await expect(service.signIn(signInDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("loginWithJwt", () => {
    const loginDto: LoginWithJwtDto = {
      jwt: "appwrite-jwt-token",
      email: "test@example.com",
    };

    const mockUser = {
      $id: "user123",
      email: "test@example.com",
      emailVerification: true,
      $createdAt: "2023-01-01T00:00:00Z",
      $updatedAt: "2023-01-01T00:00:00Z",
      name: "Test User",
      registration: "2023-01-01T00:00:00Z",
      status: 1,
      labels: [],
      passwordUpdate: "2023-01-01T00:00:00Z",
      phone: "",
      phoneVerification: false,
      prefs: {},
    } as any;

    it("should login successfully with valid JWT", async () => {
      appwriteService.getCurrentUser.mockResolvedValue(mockUser);

      const result = await service.loginWithJwt(loginDto);

      expect(appwriteService.getCurrentUser).toHaveBeenCalledWith(loginDto.jwt);
      expect(result).toHaveProperty("access_token");
      expect(result).toHaveProperty("refresh_token");
      expect(result.user).toEqual({
        id: mockUser.$id,
        email: mockUser.email,
      });
    });

    it("should reject unverified email", async () => {
      const unverifiedUser = { ...mockUser, emailVerification: false } as any;
      appwriteService.getCurrentUser.mockResolvedValue(unverifiedUser);

      await expect(service.loginWithJwt(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it("should reject email mismatch", async () => {
      const mismatchedUser = { ...mockUser, email: "different@example.com" } as any;
      appwriteService.getCurrentUser.mockResolvedValue(mismatchedUser);

      await expect(service.loginWithJwt(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refreshToken", () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: "valid-refresh-token",
    };

    it("should refresh token successfully", async () => {
      const mockDecoded = {
        sub: "user123",
        email: "test@example.com",
        type: "refresh",
        sessionId: "session123",
      };

      jest.spyOn(jwt, "verify").mockReturnValue(mockDecoded as any);
      jest.spyOn(jwt, "sign").mockReturnValue("new-access-token" as any);

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toHaveProperty("access_token");
      expect(result.user).toEqual({
        id: mockDecoded.sub,
        email: mockDecoded.email,
      });
    });

    it("should reject invalid refresh token type", async () => {
      const mockDecoded = {
        sub: "user123",
        email: "test@example.com",
        type: "access",
      };

      jest.spyOn(jwt, "verify").mockReturnValue(mockDecoded as any);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it("should reject invalid refresh token", async () => {
      jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("signOut", () => {
    const accessToken = "valid-access-token";

    it("should sign out successfully", async () => {
      const mockDecoded = {
        sub: "user123",
        email: "test@example.com",
        sessionId: "session123",
      };

      jest.spyOn(jwt, "verify").mockReturnValue(mockDecoded as any);
      appwriteService.deleteSession.mockResolvedValue(undefined);

      const result = await service.signOut(accessToken);

      expect(appwriteService.deleteSession).toHaveBeenCalledWith(mockDecoded.sessionId);
      expect(result).toEqual({ message: "Successfully signed out" });
    });

    it("should handle session deletion failure gracefully", async () => {
      const mockDecoded = {
        sub: "user123",
        email: "test@example.com",
        sessionId: "session123",
      };

      jest.spyOn(jwt, "verify").mockReturnValue(mockDecoded as any);
      appwriteService.deleteSession.mockRejectedValue(new Error("Session deletion failed"));

      const result = await service.signOut(accessToken);

      expect(result).toEqual({ message: "Successfully signed out" });
    });

    it("should reject invalid access token", async () => {
      jest.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.signOut(accessToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getMe", () => {
    const userId = "user123";

    it("should return user profile information", async () => {
      const result = await service.getMe(userId);

      expect(result).toEqual({
        id: userId,
        message: "User profile endpoint. Implement additional profile fetching as needed.",
      });
    });
  });

  describe("buildVerificationUrl", () => {
    it("should build correct verification URL", async () => {
      const mockVerification = { $id: "verification123" };
      const userId = "user123";

      // Use reflection to access private method for testing
      const buildVerificationUrl = (service as any).buildVerificationUrl.bind(service);
      const result = buildVerificationUrl(mockVerification, userId);

      expect(result).toBe("https://arzansite.com/auth/verify?token=verification123&userId=user123");
    });
  });

  describe("buildRecoveryUrl", () => {
    it("should build correct recovery URL", async () => {
      const mockRecovery = { $id: "recovery123" };
      const email = "test@example.com";

      // Use reflection to access private method for testing
      const buildRecoveryUrl = (service as any).buildRecoveryUrl.bind(service);
      const result = buildRecoveryUrl(mockRecovery, email);

      expect(result).toBe("https://arzansite.com/auth/reset-password?token=recovery123&email=test%40example.com");
    });
  });
});
