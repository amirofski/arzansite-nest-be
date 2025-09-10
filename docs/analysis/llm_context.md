# LLM Codebase Context (Generated)

Root: C:\Users\Amir\Desktop\arzansite-be\src
Generated at: 2025-09-10T13:20:45.883Z

Artifacts:
- codebase-map.json
- endpoints.json
- appwrite-inferred-attributes.json
- frontend-api-guide.md

## Quick Stats
- Total files scanned: 100
- Controllers found: 23
- Endpoints found: 175

## Controllers and Endpoints
### AdminController (/admin)
- GET /admin/dashboard/stats -> src\admin\admin.controller.ts
- POST /admin/domains/check-availability -> src\admin\admin.controller.ts
- POST /admin/domains/extensions -> src\admin\admin.controller.ts
- GET /admin/domains/prices -> src\admin\admin.controller.ts
- PUT /admin/domains/prices/:extensionId -> src\admin\admin.controller.ts
- POST /admin/emails/test-service -> src\admin\admin.controller.ts
- GET /admin/invoices -> src\admin\admin.controller.ts
- GET /admin/payments -> src\admin\admin.controller.ts
- GET /admin/system/metrics -> src\admin\admin.controller.ts
- DELETE /admin/users/:user_id -> src\admin\admin.controller.ts
- GET /admin/wallets -> src\admin\admin.controller.ts
- POST /admin/wallets/:id/adjust -> src\admin\admin.controller.ts
- GET /admin/wallets/:wallet_id/adjustments -> src\admin\admin.controller.ts

### AnalyticsController (/analytics)
- GET /analytics/comparison -> src\analytics\analytics.controller.ts
- GET /analytics/dashboard -> src\analytics\analytics.controller.ts
- GET /analytics/export -> src\analytics\analytics.controller.ts
- GET /analytics/forecasting -> src\analytics\analytics.controller.ts
- GET /analytics/insights -> src\analytics\analytics.controller.ts
- GET /analytics/orders -> src\analytics\analytics.controller.ts
- GET /analytics/reports -> src\analytics\analytics.controller.ts
- GET /analytics/revenue -> src\analytics\analytics.controller.ts
- GET /analytics/user-behavior -> src\analytics\analytics.controller.ts
- GET /analytics/wallet-transactions -> src\analytics\analytics.controller.ts

### DatabaseController (/db)
- POST /db/:collectionId -> src\appwrite\database.controller.ts
- GET /db/:collectionId -> src\appwrite\database.controller.ts
- GET /db/:collectionId/:documentId -> src\appwrite\database.controller.ts
- PUT /db/:collectionId/:documentId -> src\appwrite\database.controller.ts
- DELETE /db/:collectionId/:documentId -> src\appwrite\database.controller.ts

### AppwriteFunctionsController (/functions)
- POST /functions/execute -> src\appwrite\functions.controller.ts
- POST /functions/webhook -> src\appwrite\functions.controller.ts

### MessagingController (/messaging)
- POST /messaging/topics -> src\appwrite\messaging.controller.ts
- POST /messaging/topics/:topicId/messages -> src\appwrite\messaging.controller.ts

### StorageController (/storage)
- GET /storage/:bucket_id -> src\appwrite\storage.controller.ts
- GET /storage/:bucket_id/:file_id -> src\appwrite\storage.controller.ts
- DELETE /storage/:bucket_id/:file_id -> src\appwrite\storage.controller.ts
- GET /storage/:bucket_id/:file_id/url -> src\appwrite\storage.controller.ts
- GET /storage/file-url -> src\storage\storage.controller.ts
- POST /storage/upload-url -> src\storage\storage.controller.ts
- POST /storage/upload/:bucket_id -> src\appwrite\storage.controller.ts
- POST /storage/uploads -> src\storage\storage.controller.ts
- GET /storage/uploads -> src\storage\storage.controller.ts
- DELETE /storage/uploads/:id -> src\storage\storage.controller.ts
- GET /storage/uploads/signed-url -> src\storage\storage.controller.ts

### AuthController (/auth)
- GET /auth/check-verification/:email -> src\auth\auth.controller.ts
- POST /auth/exchange-jwt -> src\auth\auth.controller.ts
- POST /auth/login -> src\auth\auth.controller.ts
- POST /auth/login-with-jwt -> src\auth\auth.controller.ts
- POST /auth/logout -> src\auth\auth.controller.ts
- GET /auth/me -> src\auth\auth.controller.ts
- POST /auth/oauth/:provider/callback -> src\auth\auth.controller.ts
- POST /auth/oauth/:provider/start -> src\auth\auth.controller.ts
- POST /auth/oauth/github/callback -> src\auth\auth.controller.ts
- POST /auth/oauth/github/start -> src\auth\auth.controller.ts
- POST /auth/oauth/logout -> src\auth\auth.controller.ts
- GET /auth/oauth/me -> src\auth\auth.controller.ts
- GET /auth/oauth/providers -> src\auth\auth.controller.ts
- POST /auth/oauth/start -> src\auth\auth.controller.ts
- POST /auth/password-reset -> src\auth\auth.controller.ts
- POST /auth/refresh -> src\auth\auth.controller.ts
- POST /auth/request-verification -> src\auth\auth.controller.ts
- POST /auth/reset-password -> src\auth\auth.controller.ts
- POST /auth/session -> src\auth\auth.controller.ts
- POST /auth/session-auth -> src\auth\auth.controller.ts
- GET /auth/session-info/:session_id -> src\auth\auth.controller.ts
- POST /auth/session-logout -> src\auth\auth.controller.ts
- POST /auth/session-validate -> src\auth\auth.controller.ts
- POST /auth/signup -> src\auth\auth.controller.ts
- POST /auth/userinfo -> src\auth\auth.controller.ts
- POST /auth/verify-email -> src\auth\auth.controller.ts
- POST /auth/verify-email -> src\auth\auth.controller.ts

### DomainsController (/domains)
- GET /domains/check -> src\domains\domains.controller.ts
- POST /domains/check -> src\domains\domains.controller.ts
- POST /domains/check-availability -> src\domains\domains.controller.ts
- GET /domains/extensions -> src\domains\domains.controller.ts
- GET /domains/prices -> src\domains\domains.controller.ts
- PUT /domains/prices/:extensionId -> src\domains\domains.controller.ts
- GET /domains/search -> src\domains\domains.controller.ts

### EmailController (/emails)
- GET /emails/logs -> src\email\email.controller.ts
- POST /emails/send -> src\email\email.controller.ts
- GET /emails/status -> src\email\email.controller.ts
- POST /emails/template -> src\email\email.controller.ts
- POST /emails/test -> src\email\email.controller.ts

### HealthController (/health)
- GET /health -> src\health\health.controller.ts

### InvoicesController (/invoices)
- POST /invoices -> src\invoices\invoices.controller.ts
- GET /invoices -> src\invoices\invoices.controller.ts
- GET /invoices/:id -> src\invoices\invoices.controller.ts
- PUT /invoices/:id -> src\invoices\invoices.controller.ts
- POST /invoices/:id/pay -> src\invoices\invoices.controller.ts
- GET /invoices/admin/all -> src\invoices\invoices.controller.ts

### NotificationsController (/notifications)
- PUT /notifications/:notificationId/read -> src\notifications\notifications.controller.ts
- GET /notifications/channels/status -> src\notifications\notifications.controller.ts
- GET /notifications/history -> src\notifications\notifications.controller.ts
- POST /notifications/order-status -> src\notifications\notifications.controller.ts
- GET /notifications/preferences -> src\notifications\notifications.controller.ts
- PUT /notifications/preferences -> src\notifications\notifications.controller.ts
- PUT /notifications/read-all -> src\notifications\notifications.controller.ts
- POST /notifications/test -> src\notifications\notifications.controller.ts
- GET /notifications/unread-count -> src\notifications\notifications.controller.ts

### OrdersController (/orders)
- GET /orders -> src\orders\orders.controller.ts
- POST /orders -> src\orders\orders.controller.ts
- GET /orders -> src\orders\orders.controller.ts
- GET /orders/:id -> src\orders\orders.controller.ts
- PATCH /orders/:id -> src\orders\orders.controller.ts
- DELETE /orders/:id -> src\orders\orders.controller.ts

### PaymentsController (/payments)
- POST /payments/cancel -> src\payments\payments.controller.ts
- GET /payments/orders/:order_id -> src\payments\payments.controller.ts
- POST /payments/refund -> src\payments\payments.controller.ts
- POST /payments/request -> src\payments\payments.controller.ts
- GET /payments/status -> src\payments\payments.controller.ts
- GET /payments/test-connection -> src\payments\payments.controller.ts
- POST /payments/verify -> src\payments\payments.controller.ts

### ProfilesController (/profiles)
- GET /profiles -> src\profiles\profiles.controller.ts
- GET /profiles/me -> src\profiles\profiles.controller.ts
- PATCH /profiles/me -> src\profiles\profiles.controller.ts

### ReceiptsController (/receipts)
- GET /receipts -> src\receipts\receipts.controller.ts
- GET /receipts/:id -> src\receipts\receipts.controller.ts
- GET /receipts/:id/download -> src\receipts\receipts.controller.ts
- GET /receipts/admin/all -> src\receipts\receipts.controller.ts

### SiteConfigController (/site-config)
- PATCH /site-config -> src\site-config\site-config.controller.ts
- GET /site-config/current -> src\site-config\site-config.controller.ts
- GET /site-config/history -> src\site-config\site-config.controller.ts

### SupportController (/support)
- GET /support/contact-info -> src\support\support.controller.ts
- GET /support/faq -> src\support\support.controller.ts
- POST /support/report-issue -> src\support\support.controller.ts
- GET /support/tickets -> src\support\support.controller.ts
- GET /support/tickets/:ticketId -> src\support\support.controller.ts
- POST /support/tickets/:ticketId/messages -> src\support\support.controller.ts
- POST /support/tickets/:ticketId/status -> src\support\support.controller.ts

### TransactionsController (/transactions)
- GET /transactions -> src\transactions\transactions.controller.ts
- GET /transactions/:id -> src\transactions\transactions.controller.ts
- GET /transactions/my -> src\transactions\transactions.controller.ts
- GET /transactions/order/:order_id -> src\transactions\transactions.controller.ts

### UploadsController (/uploads)
- GET /uploads -> src\uploads\uploads.controller.ts
- POST /uploads -> src\uploads\uploads.controller.ts
- GET /uploads/:id -> src\uploads\uploads.controller.ts
- DELETE /uploads/:id -> src\uploads\uploads.controller.ts
- POST /uploads/bulk -> src\uploads\uploads.controller.ts
- DELETE /uploads/bulk -> src\uploads\uploads.controller.ts
- GET /uploads/order/:order_id -> src\uploads\uploads.controller.ts
- GET /uploads/test -> src\uploads\uploads.controller.ts

### WalletsController (/wallets)
- GET /wallets/:user_id -> src\wallets\wallets.controller.ts
- POST /wallets/:user_id/credit -> src\wallets\wallets.controller.ts
- POST /wallets/:user_id/debit -> src\wallets\wallets.controller.ts
- GET /wallets/:user_id/transactions -> src\wallets\wallets.controller.ts
- GET /wallets/balance -> src\wallets\wallets.controller.ts
- POST /wallets/deposit/callback -> src\wallets\wallets.controller.ts
- POST /wallets/deposit/verify-with-gateway -> src\wallets\wallets.controller.ts
- GET /wallets/me -> src\wallets\wallets.controller.ts
- GET /wallets/me/balance -> src\wallets\wallets.controller.ts
- POST /wallets/me/deposit -> src\wallets\wallets.controller.ts
- POST /wallets/me/deposit/verify -> src\wallets\wallets.controller.ts
- POST /wallets/me/topup -> src\wallets\wallets.controller.ts
- GET /wallets/me/transactions -> src\wallets\wallets.controller.ts
- POST /wallets/me/transactions -> src\wallets\wallets.controller.ts
- POST /wallets/refund-order -> src\wallets\wallets.controller.ts

### WizardController (/wizard)
- POST /wizard/calculate-price -> src\wizard\wizard.controller.ts
- POST /wizard/complete-order -> src\wizard\wizard.controller.ts
- POST /wizard/designs -> src\wizard\wizard.controller.ts
- GET /wizard/designs/:order_id -> src\wizard\wizard.controller.ts
- POST /wizard/domains/check-availability -> src\wizard\wizard.controller.ts
- GET /wizard/domains/extensions -> src\wizard\wizard.controller.ts
- GET /wizard/domains/prices -> src\wizard\wizard.controller.ts
- PUT /wizard/domains/prices/:extensionId -> src\wizard\wizard.controller.ts
- GET /wizard/files/:file_id -> src\wizard\wizard.controller.ts
- DELETE /wizard/files/:file_id -> src\wizard\wizard.controller.ts
- PUT /wizard/orders/:order_id -> src\wizard\wizard.controller.ts
- GET /wizard/orders/:order_id -> src\wizard\wizard.controller.ts
- GET /wizard/orders/:order_id/files -> src\wizard\wizard.controller.ts
- GET /wizard/orders/admin -> src\wizard\wizard.controller.ts
- GET /wizard/orders/user/:user_id -> src\wizard\wizard.controller.ts
- GET /wizard/pricing-config -> src\wizard\wizard.controller.ts
- GET /wizard/progress/:session_id -> src\wizard\wizard.controller.ts
- GET /wizard/progress/user/:user_id -> src\wizard\wizard.controller.ts
- POST /wizard/save-progress -> src\wizard\wizard.controller.ts
- POST /wizard/upload-files -> src\wizard\wizard.controller.ts
