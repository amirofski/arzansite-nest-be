import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/auth/signup (POST)', () => {
    it('should create a new user and send verification email', () => {
      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        metadata: {
          first_name: 'Test',
          last_name: 'User',
        },
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpData)
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('User created successfully');
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe(signUpData.email);
        });
    });

    it('should return error for invalid email', () => {
      const signUpData = {
        email: 'invalid-email',
        password: 'password123',
        metadata: {},
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpData)
        .expect(400);
    });

    it('should return error for missing password', () => {
      const signUpData = {
        email: 'test@example.com',
        metadata: {},
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpData)
        .expect(400);
    });
  });

  describe('/auth/verify-email (POST)', () => {
    it('should return error for invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid verification token');
        });
    });

    it('should return error for missing token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({})
        .expect(400);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
