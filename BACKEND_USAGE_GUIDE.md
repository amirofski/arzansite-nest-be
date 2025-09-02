# Backend Usage Guide (NestJS + Appwrite)

## Overview
- Framework: NestJS
- Services: Appwrite (Auth, Databases, Storage), Custom API Endpoints
- Base URL: `http://localhost:3000/api`
- Auth: `Authorization: Bearer {JWT}`
- Persistence naming: snake_case; DTOs in camelCase, mapped via field mapper

## Authentication & Headers
- Required for all endpoints except `/health`
- Headers:
  - `Authorization: Bearer {JWT}`
  - `Content-Type: application/json`
- Roles resolved from Appwrite labels: `admin` or default `user`
Notes:
- Email verification is enforced. Verification and password reset tokens are stored hashed in `auth_tokens` (single-use, 24h expiry).
- Flows:
  - Verify email: POST `/auth/verify-email` with `token`
  - Request reset: POST `/auth/password-reset` with `email`
  - Reset password: POST `/auth/reset-password` with `token` and `newPassword`

## API Reference

### Health
- GET `/health`
- Purpose: Liveness check
- Response:
```
{ "success": true, "data": { "status": "ok", "timestamp": "...", "uptime": 12.34 }, "timestamp": "..." }
```

### Auth
- GET `/auth/me`
- Purpose: Current user + role from Appwrite labels
- Response: `{ success: true, data: { id: string, role: 'admin' | 'user' }, timestamp }`

### Wizard
- POST `/wizard/save-session`
  - Body: `{ session_id: string, wizard_data: object }`
  - Purpose: Save wizard progress to `wizard_sessions`
- POST `/wizard/complete-order`
  - Body:
```
{
  "session_id": "wizard_...",
  "order": {
    "title": "...",
    "description": "...",
    "total_amount": 4700000,
    "comments": "...",
    "site_type": "personal"
  },
  "design_snapshot": { /* full JSON */ }
}
```
  - Purpose: Create `orders` document; consolidate data into `wizard_data`
  - Response:
```
{
  "success": true,
  "data": {
    "order": { "$id": "...", "user_id": "...", "title": "...", "total_amount": 4700000, "payment_status": "pending", ... },
    "payment": { "$id": "...", "status": "pending", "amount": 4700000, "zarinpal_authority": "..." },
    "total_amount": 4700000
  }
}
```

### Orders
- GET `/orders`
  - Query (optional): `status`, `payment_status`
  - Purpose: List current user's orders (admin sees all)
- GET `/orders/:id`
  - Purpose: Get order by id with ownership/admin enforcement
- POST `/orders`
  - Body:
```
{
  "title": "...",
  "description": "...",
  "total_amount": 1000000,
  "site_type": "business",
  "session_id": "wizard_...",
  "wizard_data": { ... },
  "payment_gateway": "zarinpal",
  "callback_url": "https://...",
  "return_url": "https://..."
}
```
- PATCH `/orders/:id`
  - Body: subset of updatable fields (e.g., `status`, `payment_status`, `comments`)

### Payments
- POST `/payments/request`
  - Body:
```
{
  "order_id": "order_xxx" | "deposit_{userId}_{timestamp}_{amount}",
  "amount": 3000000,
  "description": "Order #123",
  "callback_url": "https://..."
}
```
  - Purpose: Create ZarinPal payment request; log to `payments`
  - Response: `{ success: true, authority: string, paymentUrl: string, invoiceId?: string }`
- POST `/payments/verify`
  - Body: `{ order_id: string, authority: string }`
  - Purpose: Verify payment; set `order.payment_status = paid`; log in `payments`
  - Response: `{ success: true, refId: string, amount: number }`
Hardening:
- Callback URL must be HTTPS and same-origin with FRONTEND_URL
- Verification is idempotent by `authority` (repeated calls return existing result)

### Wallets
- GET `/wallets/me`
  - Purpose: Get authenticated user's wallet
- GET `/wallets/me/balance`
  - Purpose: Return current wallet balance
- POST `/wallets/me/deposit`
  - Body: `{ amount: number, description?: string, callback_url?: string }`
  - Purpose: Initiate wallet deposit via ZarinPal (internally uses `PaymentsService.createWalletDeposit`)
  - Response: `{ success: true, paymentUrl: string, authority: string, invoiceId?: string, order_id: string }`
- POST `/wallets/me/deposit/verify`
  - Body: `{ authority: string }`
  - Purpose: Verify deposit; log transaction; update wallet balance
  - Response: `{ success: true, message: string, amount: number, refId: string, newBalance: number }`

### Profiles
- GET `/profiles/me`
- PATCH `/profiles/me`
- Purpose: Manage extended user profile in `user_profiles`

### Files
- POST `/storage/project-files`
- GET `/storage/project-files/:id`
- Purpose: Upload/fetch project files in `project_files`
Security:
- Max size: 10MB for Appwrite storage upload endpoint
- MIME whitelist: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`, `text/plain`
- Buckets allowlist: only configured buckets are accepted

### Support
- POST `/support/tickets`
- GET `/support/tickets`
- Purpose: Submit/list tickets in `support_tickets`

### Notifications
- GET `/notifications`
- PATCH `/notifications/:id/read`
- Purpose: Retrieve and mark notifications as read in `notifications`

### Admin
- GET `/admin/users`
- GET `/admin/orders`
- Purpose: Admin analytics/management (requires `admin` label)

## Payment Flow

### Wallet Recharge
1. Client: `POST /wallets/me/deposit` with `amount`
2. System: creates temp `order_id = deposit_{userId}_{timestamp}_{amount}`; log in `payments` status `pending`
3. Redirect user to `paymentUrl`
4. Verify: `POST /wallets/me/deposit/verify` with `authority`
5. On success: credit wallet; log completed entry in `payments`
- Statuses: `pending` → `completed | failed`

### Order Payment
1. Order created with `payment_status = pending` (if not paid immediately)
2. Request: `POST /payments/request` with `order_id`
3. Redirect and verify: `POST /payments/verify`
4. On success: set `order.payment_status = paid`; log to `payments`; notify user
- Statuses: `pending` → `paid | failed`

### Invoice Generation
- Each payment stage (request, verify, refund/cancel) stored in `payments` with:
  - `order_id`, `user_id`, `amount`, `status`, `zarinpal_authority`, `zarinpal_ref_id?`, `gateway_response`, `metadata`, `created_at`, `updated_at`
- Render invoices/receipts directly from these records.

## Communication

### Email Notifications
- Triggers:
  - Order creation (confirmation)
  - Payment request (with link)
  - Payment success/failure
- EmailService methods used by Orders: `sendOrderNotification`, `sendPaymentNotification`

### System Notifications
- Stored in `notifications`
- Triggered on: order/payment status changes, support replies
- Mark read via `PATCH /notifications/:id/read`

## Order Management

### Order Registration
- Creation via `/wizard/complete-order` or `/orders`
- Required/primary fields:
  - `user_id`, `title`, `description`, `total_amount`, `currency=IRR`, `status`, `payment_status`, `site_type`, `comments?`, `session_id?`, `wizard_data`, `created_at`, `updated_at`
- Ownership enforced (non-admin sees only their orders)

### Canvas Layout (Wizard)
- Full design snapshot stored as JSON string in `wizard_data`
- Preview URLs handled by frontend or a job; files can be stored in `project_files` or `designs`

### Dashboards
- User: `/orders`, `/wallets/me`, `/notifications`, `/support/tickets`
- Admin: `/admin/orders`, `/admin/users`
Order visibility:
- User dashboard lists own orders with key fields from `orders` (reads filtered by `user_id`).
- Admin panel lists all orders/payments with pagination and filters.

## Price Calculation Service

### Functionality
- Compute `total_amount` using:
  - `site_type`
  - `pages/sections` derived from wizard snapshot
  - `additional_services` (seo, analytics, maintenance, rush)
  - `customization level`
- Uses `wizard_data.pricing.totalPrice` when provided; otherwise derive from snapshot

### Usage
- During order creation:
  - If `total_amount` not provided, calculate and set automatically
- Extensible: move pricing rules to `system_settings` for dynamic tuning

## Codebase Review

### Key Files & Purpose
- `src/app.module.ts` – Root wiring
- `src/main.ts` – Bootstrap
- `src/appwrite/appwrite.service.ts` – Appwrite client (Databases, Users, Storage)
- `src/appwrite/appwrite.config.ts` – Centralized collection/bucket IDs
- `src/common/services/base-appwrite.service.ts` – CRUD with mapping
- `src/common/utils/field-mapper.util.ts` – FIELD_MAPPING camel↔snake
- `src/auth/*` – JWT guards, labels-based roles, auth endpoints
- `src/wizard/*` – Wizard save/complete, file handling
- `src/orders/*` – Orders CRUD, pricing, notifications
- `src/payments/*` – ZarinPal integration; request/verify; logs to `payments`
- `src/wallets/*` – Wallets, balance, transactions, deposit flow
- `src/profiles/*` – User profiles in `user_profiles`
- `src/notifications/*` – In-app notifications
- `src/support/*` – Tickets
- `src/storage/*` – Project files upload/download
- `src/email/*` – Email notifications
- `src/health/*` – Health endpoint

### File Relations
- Payments ⟷ Wallets: wallet deposits (modules use `forwardRef` to avoid cycles)
- Orders → Email, Wallets
- Wizard → Orders, Storage, Payments
- All services → AppwriteService for DB/Storage access
- Guards → AuthService for labels/roles

### Optimization Check
- Duplicate "enhanced" files removed; logic merged into main services/DTOs
- snake_case at persistence; automatic mapping in services
- Env and collections aligned with optimized schema
- Circular dependencies resolved with `forwardRef`
- Legacy fields removed (e.g., `website_framework`, `design_options`); consolidated into `wizard_data`

## Sample Requests

### Create Order
```
POST /api/orders
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "title": "وب‌سایت فروشگاهی",
  "description": "سفارش از ویزارد",
  "total_amount": 4700000,
  "site_type": "shop",
  "session_id": "wizard_1756742357515",
  "wizard_data": { "pricing": { "totalPrice": 4700000 }, "website_framework": { /* ... */ } },
  "payment_gateway": "zarinpal",
  "callback_url": "https://app.example.com/payment/callback",
  "return_url": "https://app.example.com/orders"
}
```

### Request Payment
```
POST /api/payments/request
Authorization: Bearer {JWT}
Content-Type: application/json

{ "order_id": "68b...", "amount": 4700000, "description": "Order Payment" }
```

### Verify Payment
```
POST /api/payments/verify
Authorization: Bearer {JWT}
Content-Type: application/json

{ "order_id": "68b...", "authority": "A000..." }
```

### Wallet Deposit
```
POST /api/wallets/me/deposit
Authorization: Bearer {JWT}
Content-Type: application/json

{ "amount": 3000000, "callback_url": "https://..." }
```

### Wallet Deposit Verify
```
POST /api/wallets/me/deposit/verify
Authorization: Bearer {JWT}
Content-Type: application/json

{ "authority": "A000..." }
```

## Data Modeling Highlights
- `orders`: user_id, title, description, total_amount, currency, status, payment_status, site_type, session_id, wizard_data, created_at, updated_at
- `payments`: order_id|deposit_id, user_id, amount, status, zarinpal_authority, zarinpal_ref_id?, gateway_response, metadata, created_at, updated_at
- `wallets`: user_id, balance, created_at, updated_at
- `transactions`: wallet_id, user_id, type, status, amount, balance_before, balance_after, reference_id, reference_type, metadata, created_at, updated_at
- `wizard_sessions`: session_id, user_id, current_step, design_data/progress, is_completed
- `notifications`, `user_profiles`, `support_tickets`: as per names
- `auth_tokens`: user_id, email?, type (`verification`|`password_reset`), token_hash, is_used, expires_at, created_at, updated_at

Design data policy:
- Source of truth for order design details is `wizard_data`. The separate `designs` module/collection is optional; if unused in frontend, it can be deprecated.

## Reliability & Coordination
- Idempotency: verify endpoints check existing `payments` by authority to avoid duplicates
- Notifications: fire on order/payment status changes
- Emails: send confirmations and status updates; log/queue failures for retry

## Diagrams (Conceptual)

Payment flow (high-level):
- Client → Payments.request → ZarinPal → callback → Payments.verify → Orders/Wallets update → Notifications/Email

Wallet deposit (high-level):
- Client → Wallets.deposit → Payments.createWalletDeposit → ZarinPal → verify → Wallet top-up → Notifications

---

This guide reflects the current, optimized backend aligned with the Appwrite schema and consolidated services. Update as endpoints evolve.
