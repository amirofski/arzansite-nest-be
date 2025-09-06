# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: NestJS (TypeScript) with Appwrite (Auth, Databases, Storage, Functions, Messaging)
- API prefix: /api
- Swagger: /api/docs
- Default port: 3000
- Node version: >= 20 (see package.json engines)
- Production base URL (from project rules): https://nest.arzansite.com/api

Common commands (pwsh-friendly)
- Install deps
  - npm ci
- Build
  - npm run build
- Run (dev)
  - npm run start:dev
- Run (prod, after build)
  - npm run start:prod
- Lint and format
  - Lint (with autofix): npm run lint
  - Format: npm run format
- Tests (Jest)
  - All unit tests: npm test
  - Watch: npm run test:watch
  - Coverage: npm run test:cov
  - E2E tests: npm run test:e2e
  - Run a single unit test file: npm test -- src/auth/auth.service.spec.ts
  - Run a single E2E test file: npm run test:e2e -- test/auth-integration.e2e-spec.ts
  - Run a specific test by name: npm test -- -t "should handle token refresh correctly"
- Docker (optional)
  - Start with env from .env: docker-compose up -d --build
  - Logs: docker-compose logs -f arzansite-be
  - Stop: docker-compose down

Environment configuration
The app validates critical environment variables at startup (main.ts). Set these in .env before running locally:
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID
- APPWRITE_API_KEY
- APPWRITE_DATABASE_ID
- JWT_SECRET
- FRONTEND_URL
- ZARINPAL_MERCHANT_ID
- CORS_ORIGINS (comma-separated; supports * for any)
Notes
- docker-compose uses many additional APPWRITE_COLLECTION_* and SMTP_* variables; ensure they are provided in .env for container runs.
- Health endpoint used by Docker healthcheck: GET /api/health

High-level architecture and flow
1) Bootstrap and cross-cutting concerns (src/main.ts, src/app.module.ts)
- Global prefix: /api
- Security/middleware: helmet, compression, cookieParser, bodyParser (30MB), CORS (env-driven)
- Rate limiting: @nestjs/throttler with multiple buckets (short/medium/long)
- Logging: pino + pino-http request logging with header redaction
- Global pipes/filters/interceptors: ValidationPipe, HttpExceptionFilter, TransformInterceptor, ErrorInterceptor, RequestLoggingInterceptor
- API docs: Swagger configured with tags for domains like auth, orders, payments, wallets, storage, etc.

2) Appwrite integration (src/appwrite)
- AppwriteConfig reads all APPWRITE_* env (endpoint, project, apiKey, database, collection IDs, buckets)
- AppwriteService initializes v18 node-appwrite Client and service facades (Databases, Account, Storage, Functions, Messaging, Users, Teams)
- All domain services rely on AppwriteService for DB and storage access

3) Data naming strategy and base persistence layer
- Persistence uses snake_case in Appwrite collections; API/DTOs generally camelCase in Nest
- src/common/utils/field-mapper.util.ts maps camelCase ↔ snake_case
- src/common/services/base-appwrite.service.ts centralizes CRUD:
  - createDocument/getDocument/updateDocument/listDocuments/findDocuments
  - Automatically maps fields via the field mapper
  - Builds queries using node-appwrite Query helpers
- See FIELD_NAME_MAPPING_GUIDE.md for canonical mappings and required fields per collection

4) Domain modules (big picture)
- Auth: User signup/login via Appwrite Users/Account; backend-issued JWT; email verification tokens stored in an auth_tokens collection (hashed); roles resolved via Appwrite labels (admin vs user)
- Profiles: User profile documents (user_profiles) created on signup and managed via profile endpoints
- Orders: Creates orders consolidating wizard data into a single wizard_data JSON field; enforces ownership; integrates with Email and (via flows) Payments/Wallets
- Payments + Wallets + Transactions: ZarinPal integration; request/verify flows update orders/payment_status; wallet deposits and transaction history maintained; invoices/receipts modules generate records for finance flows
- Storage/Uploads: Appwrite Storage for file/bucket operations; uploads module with size limits aligned to body parser and bucket policies
- Wizard: Saves sessions and converts design snapshots into order creation (wizard_data is the source of truth)
- Notifications: Stores and serves in-app notifications; used by status changes and verification flows
- Admin/Analytics/Site-config/Domains: Administrative endpoints, metrics, runtime configuration, and domain checks; some use WebSocket gateway for live updates
- Scheduled tasks: Background/scheduled jobs for recurring maintenance (e.g., invoices, overdue detection)

5) Request/response contract
- Consistent JSON responses shaped by TransformInterceptor and error filter
- Swagger at /api/docs provides interactive testing; JWT bearer auth and X-API-Key are defined in the doc

End-to-end flows (concise)
- Authentication
  - POST /api/auth/signup → Appwrite Users.create → profile init → verification token email → client can sign in and later verify
  - POST /api/auth/signin → Appwrite Account session (JWT) → backend JWT issued for API access
- Order → Payment → Wallet
  - Create order with wizard_data snapshot
  - Payments.request (ZarinPal) returns paymentUrl; Payments.verify updates order payment_status and logs payments/transactions
  - Wallet deposits follow a similar request/verify pattern and adjust balances
- Files
  - Upload/download through storage and uploads modules, backed by Appwrite Storage buckets

Operational notes
- API base paths
  - Local: http://localhost:3000/api
  - Production (from project rule): https://nest.arzansite.com/api
- Swagger: http://localhost:3000/api/docs
- WebSocket gateway (as logged on start): ws://localhost:3000/ws

Pointers to deeper docs in this repo
- BACKEND_USAGE_GUIDE.md — endpoint-level usage and flows (auth, orders, payments, wallets, files, admin)
- docs/README.md — overall system architecture diagrams (Auth, Security, Collections, Gateway role)
- docs/COMPREHENSIVE_API_GUIDE.md — detailed API coverage
- FIELD_NAME_MAPPING_GUIDE.md — snake_case mapping and collection fields

What to keep in mind when editing/adding code here
- Use BaseAppwriteService for DB CRUD to automatically enforce field mapping
- Persist structured design details in wizard_data rather than scattered fields
- Keep environment-driven configuration centralized via AppwriteConfig and ConfigService
- Using Appwrite node version 14 for Nestjs, my Appwrite Server version is 1.6.1, make sure compatible.
make sure this Codebase Nestjs, Expose All Appwrite infrastructure, just for Sending Email, Handle With custom SMTP Via Nestjs this codebase.

