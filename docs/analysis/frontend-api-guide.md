# Frontend API Guide (Generated)

Generated at: 2025-09-10T13:20:45.883Z

## AdminController (/admin)

### GET /admin/dashboard/stats

### POST /admin/domains/check-availability

### POST /admin/domains/extensions

### GET /admin/domains/prices

### PUT /admin/domains/prices/:extensionId

### POST /admin/emails/test-service

### GET /admin/invoices

### GET /admin/payments

### GET /admin/system/metrics

### DELETE /admin/users/:user_id

### GET /admin/wallets

### POST /admin/wallets/:id/adjust

### GET /admin/wallets/:wallet_id/adjustments

## AnalyticsController (/analytics)

### GET /analytics/comparison

### GET /analytics/dashboard

### GET /analytics/export

### GET /analytics/forecasting

### GET /analytics/insights

### GET /analytics/orders

### GET /analytics/reports

### GET /analytics/revenue

### GET /analytics/user-behavior

### GET /analytics/wallet-transactions

## DatabaseController (/db)

### POST /db/:collectionId

### GET /db/:collectionId

### GET /db/:collectionId/:documentId

### PUT /db/:collectionId/:documentId

### DELETE /db/:collectionId/:documentId

## AppwriteFunctionsController (/functions)

### POST /functions/execute

### POST /functions/webhook

## MessagingController (/messaging)

### POST /messaging/topics

### POST /messaging/topics/:topicId/messages

## StorageController (/storage)

### GET /storage/:bucket_id

### GET /storage/:bucket_id/:file_id

### DELETE /storage/:bucket_id/:file_id

### GET /storage/:bucket_id/:file_id/url

### GET /storage/file-url

### POST /storage/upload-url

### POST /storage/upload/:bucket_id

### POST /storage/uploads

### GET /storage/uploads

### DELETE /storage/uploads/:id

### GET /storage/uploads/signed-url

## AuthController (/auth)

### GET /auth/check-verification/:email

### POST /auth/exchange-jwt

### POST /auth/login

### POST /auth/login-with-jwt

### POST /auth/logout

### GET /auth/me

### POST /auth/oauth/:provider/callback

### POST /auth/oauth/:provider/start

### POST /auth/oauth/github/callback

### POST /auth/oauth/github/start

### POST /auth/oauth/logout

### GET /auth/oauth/me

### GET /auth/oauth/providers

### POST /auth/oauth/start

### POST /auth/password-reset

### POST /auth/refresh

### POST /auth/request-verification

### POST /auth/reset-password

### POST /auth/session

### POST /auth/session-auth

### GET /auth/session-info/:session_id

### POST /auth/session-logout

### POST /auth/session-validate

### POST /auth/signup

### POST /auth/userinfo

### POST /auth/verify-email

### POST /auth/verify-email

## DomainsController (/domains)

### GET /domains/check

### POST /domains/check

### POST /domains/check-availability

### GET /domains/extensions

### GET /domains/prices

### PUT /domains/prices/:extensionId

### GET /domains/search

## EmailController (/emails)

### GET /emails/logs

### POST /emails/send

### GET /emails/status

### POST /emails/template

### POST /emails/test

## HealthController (/health)

### GET /health

## InvoicesController (/invoices)

### POST /invoices

### GET /invoices

### GET /invoices/:id

### PUT /invoices/:id

### POST /invoices/:id/pay

### GET /invoices/admin/all

## NotificationsController (/notifications)

### PUT /notifications/:notificationId/read

### GET /notifications/channels/status

### GET /notifications/history

### POST /notifications/order-status

### GET /notifications/preferences

### PUT /notifications/preferences

### PUT /notifications/read-all

### POST /notifications/test

### GET /notifications/unread-count

## OrdersController (/orders)

### GET /orders

### POST /orders

### GET /orders

### GET /orders/:id

### PATCH /orders/:id

### DELETE /orders/:id

## PaymentsController (/payments)

### POST /payments/cancel

### GET /payments/orders/:order_id

### POST /payments/refund

### POST /payments/request

### GET /payments/status

### GET /payments/test-connection

### POST /payments/verify

## ProfilesController (/profiles)

### GET /profiles

### GET /profiles/me

### PATCH /profiles/me

## ReceiptsController (/receipts)

### GET /receipts

### GET /receipts/:id

### GET /receipts/:id/download

### GET /receipts/admin/all

## SiteConfigController (/site-config)

### PATCH /site-config

### GET /site-config/current

### GET /site-config/history

## SupportController (/support)

### GET /support/contact-info

### GET /support/faq

### POST /support/report-issue

### GET /support/tickets

### GET /support/tickets/:ticketId

### POST /support/tickets/:ticketId/messages

### POST /support/tickets/:ticketId/status

## TransactionsController (/transactions)

### GET /transactions

### GET /transactions/:id

### GET /transactions/my

### GET /transactions/order/:order_id

## UploadsController (/uploads)

### GET /uploads

### POST /uploads

### GET /uploads/:id

### DELETE /uploads/:id

### POST /uploads/bulk

### DELETE /uploads/bulk

### GET /uploads/order/:order_id

### GET /uploads/test

## WalletsController (/wallets)

### GET /wallets/:user_id

### POST /wallets/:user_id/credit

### POST /wallets/:user_id/debit

### GET /wallets/:user_id/transactions

### GET /wallets/balance

### POST /wallets/deposit/callback

### POST /wallets/deposit/verify-with-gateway

### GET /wallets/me

### GET /wallets/me/balance

### POST /wallets/me/deposit

### POST /wallets/me/deposit/verify

### POST /wallets/me/topup

### GET /wallets/me/transactions

### POST /wallets/me/transactions

### POST /wallets/refund-order

## WizardController (/wizard)

### POST /wizard/calculate-price

### POST /wizard/complete-order

### POST /wizard/designs

### GET /wizard/designs/:order_id

### POST /wizard/domains/check-availability

### GET /wizard/domains/extensions

### GET /wizard/domains/prices

### PUT /wizard/domains/prices/:extensionId

### GET /wizard/files/:file_id

### DELETE /wizard/files/:file_id

### PUT /wizard/orders/:order_id

### GET /wizard/orders/:order_id

### GET /wizard/orders/:order_id/files

### GET /wizard/orders/admin

### GET /wizard/orders/user/:user_id

### GET /wizard/pricing-config

### GET /wizard/progress/:session_id

### GET /wizard/progress/user/:user_id

### POST /wizard/save-progress

### POST /wizard/upload-files
