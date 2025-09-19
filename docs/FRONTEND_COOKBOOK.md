# ArzanSite Frontend Cookbook

This document explains how to integrate a modern user and admin dashboard with the existing NestJS + Appwrite backend. It catalogs key endpoints, expected payloads, response samples, and prescribes UI/UX patterns per module so the frontend can deliver a polished, reliable experience.

Note about responses
- The API uses a global response envelope: { success: boolean, data: any, timestamp: string }
- Some controllers already return raw payloads and are auto-wrapped by the global interceptor.
- Plan your client to read data from either the root or data key, depending on the endpoint (the backend is converging toward returning raw payloads everywhere so only the global wrapper applies).

Contents
- Auth & Profiles
- Wizard (6-step flow) and Orders
- Payments (ZarinPal) & Wallets
- Invoices & Receipts
- Domains
- Notifications & Email Logs
- Storage (Files)
- Admin Dashboard (Users, Wallets, Invoices, System)
- Scheduled Tasks & Operational Notes
- Required Appwrite Collections and attributes
- UI/UX patterns and components

---

Auth & Profiles

Signup → Verify → Login → Session
- POST /auth/signup
  Body: { email, password, metadata?: { name?: string, ... } }
  Returns: { user: { id, email, emailVerification, $created_at }, verificationEmailSent }
- POST /auth/verify-email
  Body: { token, user_id? } → validates custom verification token
  Returns: { message, user, welcomeEmailSent }
- POST /auth/login
  Body: { email, password }
  Returns: { access_token, refresh_token, user: { id, email, role }, redirect }
- POST /auth/refresh
  Body: { refresh_token }
  Returns: { access_token, user }
- POST /auth/exchange-jwt
  Body: { appwriteJwt } → exchange Appwrite JWT to backend JWT

Profiles
- GET /profiles/me
  Returns: user profile (from users collection)
- PATCH /profiles/me
  Body: UpdateProfileDto
- PATCH /profiles/me/avatar (multipart)
  Form: file (png/jpeg/webp)
  Returns: { success, avatar_url }

Frontend tips
- Keep auth tokens in httpOnly cookies or secure storage. Refresh silently.
- After verification, redirect to login with a success banner.
- Show avatar uploader with 5MB limit and accept only image/*; preview after success.

---

Wizard (6-step flow) and Orders

Wizard sessions are saved to APPWRITE_COLLECTION_WIZARD_SESSIONS (default: wizard_sessions). Each step should update the same session_id.

Endpoints
- POST /wizard/save-progress
  Body: { session_id, user_id?, current_step, is_completed?, wizard_data? }
  Returns: Appwrite document for session

- GET /wizard/progress/:session_id
  Returns: session document; wizard_data is parsed to object if stored as string

- GET /wizard/load-progress/:session_id
  Returns: wizard_data object directly (for fast hydrate)

- POST /wizard/save-session
  Body: { session_id, wizard_data, user_id? } → Upserts session

- POST /wizard/complete-order (auth)
  Body: CompleteOrderDto including a design_snapshot
  Returns: { success, order_id, invoiceId?, paymentId, order, payment }
  Side effects: Creates order, invoice, payment, updates wizard session completed.

Orders
- GET /orders?mine=true|false&admin=true|false&page=&limit=&from=&to=
- POST /orders (create from non-wizard flows if needed)
  Side-effects: auto-creates a pending invoice for this order.
- GET /orders/:id
- PATCH /orders/:id
- DELETE /orders/:id

Frontend tips
- Maintain a single session_id across 6 steps; persist in localStorage until login, then attach user_id.
- Autosave wizard_data at each step; debounce writes.
- Before CompleteOrder, recompute total price with POST /wizard/calculate-price for consistency.
- After CompleteOrder, redirect to a Confirmation screen with Pay Now button (wallet or gateway).

---

Payments (ZarinPal) & Wallets

Wallets
- GET /wallets/me → { $id, user_id, balance, created_at, updated_at }
- GET /wallets/me/balance → { balance }
- GET /wallets/me/transactions?limit=50&offset=0 → list
- POST /wallets/me/transactions → create internal transaction (admin-only use in UI)
- POST /wallets/me/deposit → creates ZarinPal request for top-up
  Body: { amount, description?, callback_url? }
  Returns: { success, paymentUrl, authority, invoiceId, order_id }
- POST /wallets/me/deposit/verify
  Body: { authority }
  Returns: { success, refId, amount }

Order payments (user pays an order)
- POST /payments/request
  Body: { amount, description, callback_url?, order_id, mobile?, email? }
  Returns: { success, authority, paymentUrl }
- POST /payments/verify
  Body: { authority, amount }
  Returns: { success, refId, amount, authority?, orderId?, invoiceId?, receiptId? }
  Side-effects: Marks order payment succeeded, ensures invoice exists → PAID, generates receipt, logs transactions.

Frontend tips
- Always pass amount in Rials; gateway page displays Tomans.
- Callback: keep ?authority=… in URL; call /payments/verify; then show success/failure view.
- For wallet top-ups: show current balance and recent transactions; allow quick top-up presets.

---

Invoices & Receipts

Invoices
- POST /invoices (auth) → creates invoice for an order
- GET /invoices (auth) → paginated list; admins see all
- GET /invoices/:id (auth)
- POST /invoices/:id/pay (auth, wallet) → pays invoice from wallet

Receipts
- GET /receipts (auth) → wallet + invoice receipts
- GET /receipts/:id (auth)
- GET /receipts/:id/download?format=pdf|html (if available)

Frontend tips
- In user dashboard, the “Billing” tab: invoices table (status chips), pay-from-wallet button; receipts list with download.
- In admin dashboard, filters by status/date; export CSV.

---

Domains

- GET /domains/extensions → list available extensions for the wizard step
- GET /domains/prices → full list for admin
- PUT /domains/prices/:extensionId (admin) → { price, available }
- POST /domains/check-availability → { domain, extension: '.ir' | '.com' | ... }
  Returns: { available, domain, reason? }

Frontend tips
- In the wizard “Domain” step, fetch /domains/extensions for suggestions and price display.
- Admin can add/update extension records (collection APPWRITE_COLLECTION_DOMAIN_EXTENSIONS).

---

Notifications & Email Logs

Notifications (user preferences, history)
- GET /notifications/preferences
- PUT /notifications/preferences
- GET /notifications/history?type=&status=&from_date=&to_date=&page=&limit=
- POST /notifications/order-status → create and send a notification (usually server-driven; keep for tools/ops)

Email logs (Appwrite collection)
- Collection: email_logs
- Attributes:
  - to_email:string
  - subject:string
  - success:boolean
  - error_message:string
  - service_used:string
  - template_type:string (email_verification|welcome|password_reset|order_notification|payment_notification|magic_link|general)
  - sent_at:string (ISO)

Frontend tips
- Admin “System → Emails” table with filters {success, template_type, date range}; show last 50 by default.

---

Storage (Files)

- POST /storage/upload/:bucketId (multipart)
  Form: file, order_id?
  Returns: { success, file_id, name, bucket_id, order_id, user_id, url, mime_type }
- GET /storage/:bucketId/:fileId
- GET /storage/:bucketId/:fileId/url
- DELETE /storage/:bucketId/:fileId
- GET /storage/projects/:order_id/files → project files linked to an order

Buckets used
- APPWRITE_STORAGE_PROJECT_FILES → project files
- APPWRITE_STORAGE_USER_AVATARS (or APPWRITE_BUCKET_AVATARS fallback) → avatars

Frontend tips
- Use presigned view URLs for images. Cache-bust with ?t=timestamp after updates.
- For wizard file gallery: list /storage/projects/:order_id/files; allow delete with confirmation.

---

Admin Dashboard

Users
- GET /admin/users?page=1&limit=20&search=… → returns enriched profiles with Appwrite auth info (labels, emailVerification)
- GET /admin/users/:user_id
- POST /admin/users/:user_id/ban
- POST /admin/users/:user_id/unban

Wallets
- GET /admin/wallets?page=&limit=&search=
- POST /admin/wallets/:id/adjust → { amount, type: credit|debit|correction, reason, notes? }
- GET /admin/wallets/:wallet_id/adjustments?page=&limit=

Invoices/Payments
- GET /admin/invoices?status=&user_id=&from=&to=&page=&limit=
- GET /admin/payments?status=&user_id=&from=&to=&page=&limit=

Domains
- GET /domains/prices
- PUT /domains/prices/:extensionId (admin)
- POST /domains/extensions (if available) → create new extension

System
- GET /admin/system/metrics (if implemented) for health & performance
- Email Service testing endpoint available via admin module (see DTOs)

Frontend tips
- Build a left-nav with sections: Overview, Orders, Users, Wallets, Invoices, Receipts, Domains, Emails, System.
- Add power-filters (date range, search, status chips). Server provides pagination on most lists.

---

Scheduled Tasks & Operational Notes

Cron jobs (see scheduled-tasks module)
- Overdue invoice check (hourly)
- Auto-pay invoices (every 6 hours)
- Daily maintenance (2 AM)
- Weekly summary (Sun 9 AM)

Env dependencies (must be set)
- APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_INVOICES, APPWRITE_COLLECTION_RECEIPTS, APPWRITE_COLLECTION_TRANSACTIONS, APPWRITE_COLLECTION_WALLETS, APPWRITE_COLLECTION_ORDERS, APPWRITE_COLLECTION_EMAIL_LOGS

---

Required Appwrite Collections (minimum attributes)

users (APPWRITE_COLLECTION_USERS)
- user_id:string (unique index), email:string/email, full_name:string, phone:string, avatar_url:string, role:string, status:string, verification_status:string, created_at:string, updated_at:string

wizard_sessions (APPWRITE_COLLECTION_WIZARD_SESSIONS)
- session_id:string (index), user_id:string, wizard_data:string (JSON string), current_step:string, is_completed:boolean, status:string, project_files:string, created_at:string, updated_at:string

orders (APPWRITE_COLLECTION_ORDERS)
- order_number:string, user_id:string, title:string, description:string, total_amount:number, status:string, payment_status:string, comments:string, session_id:string, site_type:string, wizard_data:string, created_at:string, updated_at:string

invoices (APPWRITE_COLLECTION_INVOICES)
- user_id:string, order_id:string, amount:number, due_date:string, status:string, description:string, created_at:string, updated_at:string

receipts (APPWRITE_COLLECTION_RECEIPTS)
- invoice_id:string, user_id?:string, ref_id:string, amount:number, format:string, created_at:string, updated_at:string

payments (APPWRITE_COLLECTION_PAYMENTS)
- order_id:string, user_id:string, transaction_type:string, zarinpal_authority:string, zarinpal_ref_id?:string, amount:number, status:string, gateway_response:string(JSON), metadata:string(JSON), created_at:string, updated_at:string

transactions (APPWRITE_COLLECTION_TRANSACTIONS)
- user_id:string, type:string, amount:number, balance_before:number, balance_after:number, description:string, reference_id?:string, reference_type?:string, metadata?:string, created_at:string, updated_at:string

email_logs (APPWRITE_COLLECTION_EMAIL_LOGS)
- to_email, subject, success, error_message, service_used, template_type, sent_at

notifications (APPWRITE_COLLECTION_NOTIFICATIONS)
- user_id, order_id?, notification_type, message, priority, channels:string[], status, created_at, read_at?

notification_preferences (APPWRITE_COLLECTION_NOTIFICATION_PREFERENCES)
- user_id, per-channel booleans, created_at, updated_at

project_files (APPWRITE_COLLECTION_PROJECT_FILES)
- file_id, user_id, order_id, bucket_id, original_name, file_name, mime_type, size, url, description?, status, created_at, updated_at

Domain extensions (APPWRITE_COLLECTION_DOMAIN_EXTENSIONS)
- extension:string, price:number, available:boolean, description?:string, isDefault?:boolean, created_at, updated_at

---

UI/UX Components & Patterns

User Dashboard
- Overview: tiles for orders, invoices, receipts, wallet balance; quick actions (Start new order, Top up wallet)
- Orders: table with status, created_at, total; detail drawer shows design progress & files
- Wizard: 6-step vertical stepper; autosave; summary review; Pay Now CTA
- Billing: invoices list; Pay from Wallet; receipts list with download
- Wallet: balance card, quick top-up presets, transactions list
- Notifications: preferences toggles; history list; unread badge in header
- Profile: edit profile, upload avatar

Admin Dashboard
- Overview: cards for users count, revenue, pending/overdue invoices, transactions
- Users: search by email/full_name/phone; ban/unban; view profile; labels and verification badge
- Orders: filters by status/date; open detail panel; adjust status/progress
- Wallets: list wallets; manual adjustments; audit history
- Invoices & Payments: status filters; mark overdue; export
- Domains: CRUD extensions; prices and availability flags
- Emails: email_logs table with filters; inspect errors
- System: metrics charts (response time, error rate), SMTP status

---

Response samples (selected)

1) Save Wizard Progress
Request:
POST /wizard/save-progress
Body: { "session_id": "wizard_1757606041806", "current_step": "1", "wizard_data": { ... } }
Response (enveloped):
{ "success": true, "data": { "$id": "...", "session_id": "wizard_1757606041806", "current_step": "1", ... }, "timestamp": "..." }

2) Request Payment
POST /payments/request
Body: { "amount": 5000000, "description": "Order #123", "order_id": "ord_123" }
Response:
{ "success": true, "authority": "A...", "paymentUrl": "https://.../StartPay/A..." }

3) Verify Payment
POST /payments/verify
Body: { "authority": "A...", "amount": 5000000 }
Response:
{ "success": true, "refId": "123456789", "amount": 5000000, "authority": "A...", "orderId": "order_...", "invoiceId": "invoice_...", "receiptId": "receipt_..." }

4) Email Logs (model)
{ "to_email": "user@example.com", "subject": "Welcome", "success": true, "service_used": "custom_smtp", "template_type": "welcome", "sent_at": "2025-09-14T08:00:00.000Z" }

---

Recommendations & Fixes (backend alignment)
- Ensure APPWRITE_COLLECTION_USERS has user_id attribute and index; all profile lookups depend on it.
- Unify response wrapping: return raw payload in controllers; rely on the global TransformInterceptor to envelope once.
- PaymentsService.getUserProfile still queries APPWRITE_COLLECTION_USER_PROFILES; switch to APPWRITE_COLLECTION_USERS.
- DomainsService: replace random availability with a real WHOIS API when ready; add indexes for search.
- Scheduled tasks require APPWRITE_* collection IDs; set in .env to avoid “missing IDs; skipping run”.
- Validate schema for wizard_sessions/orders/invoices/etc. per attributes above.

---

Versioning & Changelog
- Keep this cookbook in sync with backend changes. Update response samples and collection attributes after migrations.
