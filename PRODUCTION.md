# ArzanSite Backend – Production Runbook

This runbook covers the essential steps to prepare, verify, and operate the backend in production.

1) Prerequisites
- Node.js >= 20, npm >= 9
- Appwrite instance with API key that can manage Database and Storage
- ZarinPal merchant credentials
- SMTP credentials (optional but recommended)

2) Environment variables
- Copy .env.example to .env and fill the values.
- DO NOT share secrets. Rotate keys immediately if leaked.
- Required keys:
  - APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID
  - FRONTEND_URL
  - ZARINPAL_MERCHANT_ID, ZARINPAL_CALLBACK_URL
  - JWT_SECRET (min 24 chars)
- Optional:
  - CORS_ORIGINS (comma-separated list, wildcard allowed but not recommended)
  - SMTP_* for email (recommended: host, port=587, starttls, from, user, pass)
  - Storage buckets mapping used by the app (configured in your config service)

3) Schema migration / verification
- The migration script ensures collections, attributes, and indexes exist in Appwrite.
- Run:
  - Windows PowerShell example:
    $env:APPWRITE_ENDPOINT="https://<your-appwrite>/v1"
    $env:APPWRITE_PROJECT_ID="<project>"
    $env:APPWRITE_API_KEY="<api-key>"
    $env:APPWRITE_DATABASE_ID="<database>"
    npm run migrate:appwrite
  - Or with a .env file:
    npm run migrate:appwrite

4) Build & start
- Build: npm run build
- Start dev: npm run start:dev
- Start prod: npm run start:prod

5) Health and diagnostics
- Health: GET /health
- Swagger docs: GET /api/docs
  - Use Authorize button to set Bearer JWT
- Logs: Pino HTTP logs are enabled with sanitized headers

6) Security hardening
- Ensure NODE_ENV=production for production deployments
- Use strong JWT_SECRET, rotate periodically
- Limit CORS origins to your domains (do not use *)
- Use HTTPS in front of the app (reverse proxy / load balancer)
- Configure Appwrite API key with the least privileges necessary
- Ensure data validation (Joi validation integrated in ConfigModule)

7) Payments flow
- /payments/request -> returns authority + paymentUrl
- Redirect user to paymentUrl
- /payments/verify -> verify payment and update order/wallet accordingly
- Wallet deposit endpoints under /wallets (deposit, verify, callback) support idempotency

8) File storage
- Configure buckets in Appwrite Storage
- Map bucket keys (document/design/avatar) in your config
- Use /uploads endpoints to upload/list/delete

9) Troubleshooting
- "Missing required environment variables": ensure your .env is loaded and valid
- Appwrite 404 on attributes/indexes: re-run migrate:appwrite with correct API key
- Payment errors: verify ZarinPal merchant ID and callback URL, check sandbox/production flag
- SMTP errors: switch to port 587 + starttls; verify credentials; avoid SSL 465 unless necessary

10) Operations
- Monitor logs for error bursts
- Rotate API keys and JWT secret on a schedule
- Periodically re-run migrations after schema updates
- Backup Appwrite data regularly

If you need a CI/CD version of these steps or container orchestration manifests (Docker/K8s) let me know; I can generate them based on your environment.

