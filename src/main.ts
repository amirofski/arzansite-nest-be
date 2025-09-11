import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ValidationPipe, Logger } from '@nestjs/common';
import pino from 'pino';
import pinoHttp from 'pino-http';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      cors: false,
    });
    // Resolve ConfigService early for validations
    const configService = app.get(ConfigService);

    // Startup env validation (fail fast)
    const requiredEnvs = [
      'APPWRITE_ENDPOINT',
      'APPWRITE_PROJECT_ID',
      'APPWRITE_API_KEY',
      'APPWRITE_DATABASE_ID',
      'JWT_SECRET',
      'FRONTEND_URL',
      'ZARINPAL_MERCHANT_ID',
    ];
    const missing = requiredEnvs.filter((k) => !configService.get(k));
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Request logging (sanitized)
    app.use(
      pinoHttp({
        logger: pino({ level: process.env.LOG_LEVEL || 'info' }),
        autoLogging: true,
        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              remoteAddress: req.socket?.remoteAddress,
              userAgent: req.headers['user-agent'],
            };
          },
          res(res) {
            return { statusCode: res.statusCode };
          },
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          remove: true,
        },
      })
    );
    
    // configService already initialized above

    // Enable CORS EARLY so headers are present even if later middleware throws
    const corsEnv = configService.get<string>('CORS_ORIGINS') || '';
    const corsOrigins = corsEnv
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, mobile apps)
        if (!origin) return callback(null, true);
        // If "*" present in env, allow any origin (note: not with credentials)
        if (corsOrigins.includes('*')) return callback(null, true);
        if (corsOrigins.includes(origin)) return callback(null, true);
        logger.warn(`CORS blocked request from origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cookie',
        'Upgrade',
        'Connection',
        'X-API-Key',
        'X-Client-Version',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    // Enhanced security middleware with latest configurations
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          connectSrc: ["'self'", "https://app.arzansite.com"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }));
    
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }));
    
    app.use(cookieParser());

    // Enhanced body parser with better limits and security
    app.use(bodyParser.json({ 
      limit: '30mb',
      verify: (req: any, _res, buf: Buffer) => {
        // Only validate JSON if content-type indicates JSON and body is non-empty
        const ct = (req.headers?.['content-type'] || '').toString();
        if (!ct.includes('application/json')) return;
        if (!buf || buf.length === 0) return;
        const text = buf.toString('utf-8').trim();
        if (text.length === 0) return;
        try {
          JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON payload');
        }
      }
    }));
    
    app.use(bodyParser.urlencoded({ 
      limit: '30mb', 
      extended: true,
      parameterLimit: 1000,
    }));


    // Enhanced global pipes with better validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Temporarily allow unknown properties
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        forbidUnknownValues: false, // Temporarily allow unknown values
        skipMissingProperties: false,
        skipNullProperties: false,
        skipUndefinedProperties: false,
        validationError: {
          target: false,
          value: false,
        },
        exceptionFactory: (errors) => {
          const messages = errors.map(error => 
            Object.values(error.constraints || {}).join(', ')
          );
          return new Error(`Validation failed: ${messages.join('; ')}`);
        },
      }),
    );

    // Global filters and interceptors
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new RequestLoggingInterceptor(), new TransformInterceptor(), new ErrorInterceptor());

    // Global prefix
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'health', method: 'GET' as any },
        { path: 'api/docs', method: 'GET' as any },
        { path: 'api/docs-json', method: 'GET' as any },
      ],
    });

    // Enhanced Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('ArzanSite API')
      .setDescription(`
# ArzanSite Backend API Documentation

This API provides comprehensive backend services for ArzanSite, including:

## 🔐 Authentication & User Management
- User registration, login, and session management
- Email verification and password recovery
- JWT-based authentication with role-based access control

## 💼 Business Operations
- Order management and tracking
- Design creation and management
- Payment processing and verification
- Wallet and transaction management

## 💰 Wallet & Invoice Management System
- **User Wallets**: Balance tracking, top-up functionality, transaction history
- **Invoice Management**: Automatic generation, status tracking, auto-payment
- **Digital Receipts**: PDF/HTML generation, secure download, audit trail
- **Admin Controls**: Balance adjustments, financial oversight, dashboard statistics
- **Scheduled Tasks**: Automated invoice processing, overdue detection, maintenance

## 🗄️ Data & Storage
- Database operations via Appwrite
- File storage and management
- Cloud function execution
- Real-time messaging

## ⚙️ System Management
- Site configuration and settings
- Domain management and validation
- Email services and templates
- Health monitoring

## 🔒 Security Features
- JWT token authentication
- Role-based access control (RBAC)
- Rate limiting and throttling
- CORS protection
- RefId validation for payment security

## 📱 API Features
- RESTful endpoints with consistent response format
- Comprehensive error handling
- Request validation and sanitization
- Swagger/OpenAPI documentation

For detailed endpoint information, see the sections below.
      `)
      .setVersion('2.0.0')
      .setContact('ArzanSite Team', 'https://arzansite.com', 'support@arzansite.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', 'Local Development')
      .addServer('https://app.arzansite.com', 'Production')
      .addTag('auth', '🔐 Authentication & User Management (including OAuth)')
      .addTag('profiles', '👤 User Profiles')
      .addTag('orders', '📦 Order Management')
      .addTag('wallets', '💰 Wallet & Transactions')
      .addTag('invoices', '📄 Invoice Management')
      .addTag('receipts', '🧾 Digital Receipts')
      .addTag('admin', '👨‍💼 Administrative Controls')
      .addTag('payments', '💳 Payment Processing')
      .addTag('transactions', '📊 Transaction History')
      .addTag('storage', '📁 File Storage')
      .addTag('appwrite', '☁️ Appwrite Services')
      .addTag('domains', '🌐 Domain Management')
      .addTag('site-config', '⚙️ Site Configuration')
      .addTag('email', '📧 Email Services')
      .addTag('health', '🏥 Health Monitoring')
      .addTag('wizard', '🧙‍♂️ Website Design Wizard')
      .addTag('uploads', '📤 File Upload System')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key for external services',
        },
        'API-Key',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    
    // Enhanced Swagger UI options
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        requestInterceptor: (request: any) => {
          // Add default headers for testing
          if (!request.headers) request.headers = {};
          if (!request.headers['Content-Type']) {
            request.headers['Content-Type'] = 'application/json';
          }
          return request;
        },
        responseInterceptor: (response: any) => {
          // Log API usage for analytics
          logger.debug(`API accessed: ${response.url}`);
          return response;
        },
      },
      customSiteTitle: 'ArzanSite API Documentation',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2c3e50; font-size: 36px; }
        .swagger-ui .info .description { font-size: 16px; line-height: 1.6; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #61affe; }
        .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #49cc90; }
        .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #fca130; }
        .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #f93e3e; }
        .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #50e3c2; }
        .swagger-ui .info .scheme-container { margin: 20px 0; }
        .swagger-ui .info .scheme-container .schemes-title { font-weight: bold; }
      `,
      customJs: [
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js',
      ],
    });

    const port = configService.get<number>('PORT', 3000);
    const host = configService.get<string>('HOST', '0.0.0.0');
    
    await app.listen(port, host);

    logger.log(`🚀 Application is running on: http://${host}:${port}`);
    logger.log(`📡 WebSocket gateway available at: ws://${host}:${port}/ws`);
    logger.log(`📚 API Documentation available at: http://${host}:${port}/api/docs`);
    logger.log(`📁 File upload limit: 30MB`);
    logger.log(`🔐 API prefix: /api`);
    logger.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
    logger.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
