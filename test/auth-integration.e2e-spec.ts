import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../src/appwrite/appwrite.service';

describe('Auth Integration Tests (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let appwriteService: AppwriteService;
  
  // Test data
  const testUser = {
    email: `integration-test-${Date.now()}@example.com`,
    password: 'IntegrationTest123!',
    newPassword: 'NewIntegrationPassword123!',
    name: 'Integration Test User'
  };

  let user_id: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    configService = app.get(ConfigService);
    appwriteService = app.get(AppwriteService);
    
    await app.init();
  });

  describe('Complete Authentication Flow Integration', () => {
    it('should complete full registration and login flow', async () => {
      // Step 1: Register user
      console.log('Step 1: Registering user...');
      const signUpResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: testUser.email,
          password: testUser.password,
          metadata: { name: testUser.name }
        })
        .expect(201);

      expect(signUpResponse.body.success).toBe(true);
      expect(signUpResponse.body.data.user.email).toBe(testUser.email);
      user_id = signUpResponse.body.data.user.id;

      // Step 2: Try to login (should work even without email verification)
      console.log('Step 2: Logging in...');
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.access_token).toBeDefined();
      expect(loginResponse.body.data.refresh_token).toBeDefined();
      
      accessToken = loginResponse.body.data.access_token;
      refreshToken = loginResponse.body.data.refresh_token;

      // Step 3: Access protected resource
      console.log('Step 3: Accessing protected resource...');
      const meResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.user.email).toBe(testUser.email);

      console.log('✅ Full authentication flow completed successfully');
    });

    it('should handle password reset flow', async () => {
      // Step 1: Request password reset
      console.log('Step 1: Requesting password reset...');
      const resetRequestResponse = await request(app.getHttpServer())
        .post('/api/auth/password-reset')
        .send({ email: testUser.email })
        .expect(200);

      expect(resetRequestResponse.body.success).toBe(true);
      expect(resetRequestResponse.body.data.message).toContain('sent');

      // Step 2: Try to login with old password (should still work)
      console.log('Step 2: Verifying old password still works...');
      const oldLoginResponse = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(oldLoginResponse.body.success).toBe(true);

      // Note: In a real scenario, we would extract the reset token from the email
      // For now, we test the endpoint with an invalid token to ensure proper error handling
      console.log('Step 3: Testing invalid reset token...');
      const invalidResetResponse = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token-12345',
          newPassword: testUser.newPassword
        })
        .expect(400);

      expect(invalidResetResponse.body.success).toBe(false);
      expect(invalidResetResponse.body.error).toContain('Invalid or expired reset token');

      console.log('✅ Password reset flow validation completed');
    });

    it('should handle email verification flow', async () => {
      // Step 1: Request email verification
      console.log('Step 1: Requesting email verification...');
      const verificationResponse = await request(app.getHttpServer())
        .post('/api/auth/request-email-verification')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(verificationResponse.body.success).toBe(true);
      expect(verificationResponse.body.data.message).toContain('verification email sent');

      // Step 2: Check verification status
      console.log('Step 2: Checking verification status...');
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/auth/check-email-verification-status/${encodeURIComponent(testUser.email)}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('isVerified');

      console.log('✅ Email verification flow completed');
    });

    it('should handle token refresh correctly', async () => {
      // Step 1: Refresh the access token
      console.log('Step 1: Refreshing access token...');
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.access_token).toBeDefined();
      expect(refreshResponse.body.data.refresh_token).toBeDefined();

      const newAccessToken = refreshResponse.body.data.access_token;
      const newRefreshToken = refreshResponse.body.data.refresh_token;

      // Step 2: Use new access token
      console.log('Step 2: Using new access token...');
      const meResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.user.email).toBe(testUser.email);

      // Step 3: Try to use old refresh token (should fail)
      console.log('Step 3: Testing old refresh token...');
      const oldRefreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);

      expect(oldRefreshResponse.body.success).toBe(false);

      // Update tokens for cleanup
      accessToken = newAccessToken;
      refreshToken = newRefreshToken;

      console.log('✅ Token refresh flow completed');
    });

    it('should handle session management', async () => {
      // Step 1: Create session
      console.log('Step 1: Creating session...');
      const sessionResponse = await request(app.getHttpServer())
        .post('/api/auth/create-session')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(sessionResponse.body.success).toBe(true);
      expect(sessionResponse.body.data.session_id).toBeDefined();
      
      const session_id = sessionResponse.body.data.session_id;

      // Step 2: Validate session
      console.log('Step 2: Validating session...');
      const validateResponse = await request(app.getHttpServer())
        .post('/api/auth/validate-session')
        .send({ session_id })
        .expect(200);

      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.valid).toBe(true);

      // Step 3: Get session info
      console.log('Step 3: Getting session info...');
      const infoResponse = await request(app.getHttpServer())
        .get(`/api/auth/session/${session_id}/info`)
        .expect(200);

      expect(infoResponse.body.success).toBe(true);
      expect(infoResponse.body.data.session).toBeDefined();

      // Step 4: Logout session
      console.log('Step 4: Logging out session...');
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout-session')
        .send({ session_id })
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 5: Try to validate logged out session
      console.log('Step 5: Validating logged out session...');
      const invalidSessionResponse = await request(app.getHttpServer())
        .post('/api/auth/validate-session')
        .send({ session_id })
        .expect(400);

      expect(invalidSessionResponse.body.success).toBe(false);

      console.log('✅ Session management flow completed');
    });

    it('should handle logout correctly', async () => {
      // Step 1: Logout user
      console.log('Step 1: Logging out user...');
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/signout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.data.message).toContain('logged out');

      // Step 2: Try to access protected resource with old token
      console.log('Step 2: Testing access with logged out token...');
      const unauthorizedResponse = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(unauthorizedResponse.body.success).toBe(false);

      console.log('✅ Logout flow completed');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      console.log('Testing concurrent login attempts...');
      
      const loginPromises = Array(3).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/auth/signin')
          .send({
            email: testUser.email,
            password: testUser.password
          })
      );

      const responses = await Promise.all(loginPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.access_token).toBeDefined();
      });

      console.log('✅ Concurrent login test completed');
    });

    it('should handle invalid JWT tokens gracefully', async () => {
      console.log('Testing invalid JWT token handling...');
      
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid-token',
        'malformed-token',
        '',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      }

      console.log('✅ Invalid JWT token test completed');
    });

    it('should handle rate limiting gracefully', async () => {
      console.log('Testing rate limiting...');
      
      // Make multiple rapid requests to a protected endpoint
      const promises = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/auth/password-reset')
          .send({ email: 'test@example.com' })
      );

      const responses = await Promise.all(promises);
      
      // Some should succeed (200) and some might be rate limited (429)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      console.log('✅ Rate limiting test completed');
    });
  });

  describe('Data Validation and Security', () => {
    it('should validate input data properly', async () => {
      console.log('Testing input validation...');
      
      const invalidInputs = [
        { email: '', password: 'test' }, // Empty email
        { email: 'invalid', password: 'test' }, // Invalid email format
        { email: 'test@example.com', password: '' }, // Empty password
        { email: 'test@example.com' }, // Missing password
        {}, // Empty object
      ];

      for (const input of invalidInputs) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/signin')
          .send(input);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }

      console.log('✅ Input validation test completed');
    });

    it('should not expose sensitive information in error messages', async () => {
      console.log('Testing error message security...');
      
      // Try to login with non-existent user
      const response = await request(app.getHttpServer())
        .post('/api/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      // Error message should not reveal whether user exists or not
      expect(response.body.error).not.toContain('user not found');
      expect(response.body.error).not.toContain('email does not exist');

      console.log('✅ Error message security test completed');
    });
  });

  afterAll(async () => {
    console.log('Cleaning up integration test...');
    
    try {
      // Attempt to clean up the test user
      // Note: In a production test environment, you might want to implement
      // a cleanup mechanism or use a test database
      console.log(`Test user created: ${testUser.email} (ID: ${user_id})`);
      console.log('Consider implementing cleanup mechanism for test data');
    } catch (error) {
      console.log('Cleanup note:', error.message);
    }

    await app.close();
    console.log('✅ Integration test cleanup completed');
  });
});
