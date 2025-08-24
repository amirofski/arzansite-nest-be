import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';

describe('AuthController (e2e) - Comprehensive Authentication Tests', () => {
  let app: INestApplication;
  let configService: ConfigService;
  
  // Test data storage
  let testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User'
  };
  let verificationToken: string;
  let passwordResetToken: string;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same middleware and pipes as in main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    configService = app.get(ConfigService);
    await app.init();
  });

  describe('1. User Registration Flow', () => {
    it('should create a new user with valid data', async () => {
      const signUpData = {
        email: testUser.email,
        password: testUser.password,
        metadata: {
          name: testUser.name,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signUpData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('User created successfully');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(signUpData.email);
      expect(response.body.data.verificationEmailSent).toBe(true);
      
      // Store user ID for later tests
      userId = response.body.data.user.id;
    });

    it('should return error for duplicate email registration', async () => {
      const signUpData = {
        email: testUser.email, // Same email as previous test
        password: 'AnotherPassword123!',
        metadata: {
          name: 'Another User',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signUpData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return validation error for invalid email', async () => {
      const signUpData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        metadata: {},
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signUpData)
        .expect(400);
    });

    it('should return validation error for weak password', async () => {
      const signUpData = {
        email: `weak-password-${Date.now()}@example.com`,
        password: '123', // Too weak
        metadata: {},
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signUpData)
        .expect(400);
    });

    it('should return validation error for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({})
        .expect(400);
    });
  });

  describe('2. Email Verification Flow', () => {
    it('should request email verification', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/request-email-verification')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('verification email sent');
    });

    it('should check email verification status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/auth/check-email-verification-status/${encodeURIComponent(testUser.email)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isVerified');
    });

    it('should return error for invalid verification token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token-12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid verification');
    });

    it('should return error for missing verification token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);
    });
  });

  describe('3. User Login Flow', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);

      // Store tokens for later tests
      accessToken = response.body.data.access_token;
      refreshToken = response.body.data.refresh_token;
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
      };

      await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send(loginData)
        .expect(400);
    });
  });

  describe('4. JWT Token Management', () => {
    it('should get user info with valid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should return error for invalid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for missing authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();

      // Update tokens
      accessToken = response.body.data.access_token;
      refreshToken = response.body.data.refresh_token;
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('5. Password Reset Flow', () => {
    it('should request password reset', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/password-reset')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('sent');
      // Note: We cannot extract the actual token from email in e2e tests
      // In a real scenario, you'd check your email service or database
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not reveal if email exists or not
    });

    it('should return validation error for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/password-reset')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should return error for invalid reset token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-reset-token',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired reset token');
    });

    it('should return validation error for weak new password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: '123' // Too weak
        })
        .expect(400);
    });
  });

  describe('6. Session Management', () => {
    it('should create session with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/create-session')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should authenticate with session', async () => {
      // First create a session
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/auth/create-session')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // Then authenticate with it
      const authResponse = await request(app.getHttpServer())
        .post('/api/auth/authenticate-session')
        .send({
          sessionId: sessionId,
          email: testUser.email
        })
        .expect(200);

      expect(authResponse.body.success).toBe(true);
      expect(authResponse.body.data.user).toBeDefined();
    });

    it('should validate session', async () => {
      // First create a session
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/auth/create-session')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // Then validate it
      const validateResponse = await request(app.getHttpServer())
        .post('/api/auth/validate-session')
        .send({ sessionId: sessionId })
        .expect(200);

      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.valid).toBe(true);
    });

    it('should logout session', async () => {
      // First create a session
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/auth/create-session')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const sessionId = sessionResponse.body.data.sessionId;

      // Then logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout-session')
        .send({ sessionId: sessionId })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.data.message).toContain('logged out');
    });
  });

  describe('7. User Logout', () => {
    it('should logout user with valid access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('logged out');
    });

    it('should return error for invalid access token on logout', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('8. OAuth Providers', () => {
    it('should get available OAuth providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/oauth/providers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toBeDefined();
      expect(Array.isArray(response.body.data.providers)).toBe(true);
    });

    it('should start GitHub OAuth flow', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/oauth/github/start')
        .send({
          successUrl: 'https://example.com/success',
          failureUrl: 'https://example.com/failure'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBeDefined();
      expect(response.body.data.authUrl).toContain('github');
    });
  });

  describe('9. Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send('malformed json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should handle requests with extra fields (should be filtered)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password,
          extraField: 'should be ignored',
          anotherExtra: 'also ignored'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // The extra fields should be ignored due to whitelist: true
    });

    it('should handle very long input strings', async () => {
      const longString = 'a'.repeat(10000);
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: `${longString}@example.com`,
          password: 'TestPassword123!',
          metadata: {}
        })
        .expect(400);
    });
  });

  describe('10. Rate Limiting (if enabled)', () => {
    it('should handle multiple rapid requests gracefully', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/auth/oauth/providers')
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  afterAll(async () => {
    // Clean up: attempt to delete test user if possible
    try {
      // Note: In a real test environment, you might want to clean up test data
      // This would require additional cleanup endpoints or direct database access
      console.log('Test completed. Consider cleaning up test user:', testUser.email);
    } catch (error) {
      console.log('Cleanup note:', error.message);
    }

    await app.close();
  });
});
