import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ErrorInterceptor } from './common/interceptors/error.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // CORS configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') || [
    'https://arzansite.com',
    'https://www.arzansite.com',
    'http://localhost:8080',
    'http://localhost:5173',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Upgrade',
      'Connection',
    ],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new ErrorInterceptor());

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger configuration
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
    .setVersion('1.0.0')
    .setContact('ArzanSite Team', 'https://arzansite.com', 'support@arzansite.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://app.arzansite.com', 'Production')
    .addTag('auth', '🔐 Authentication & User Management (including OAuth)')
    .addTag('profiles', '👤 User Profiles')
    .addTag('orders', '📦 Order Management')
    .addTag('designs', '🎨 Design Management')
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
  
  // Custom Swagger UI options
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
    `,
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js',
    ],
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📡 WebSocket gateway available at: ws://localhost:${port}/ws`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
