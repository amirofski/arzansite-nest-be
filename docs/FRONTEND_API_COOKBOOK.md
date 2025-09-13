# Frontend API Cookbook

This document summarizes the main backend endpoints and provides practical examples for frontend integration (fetch/Axios). All routes are prefixed with /api.

Auth and Sessions
- POST /api/auth/signup
- POST /api/auth/verify-email
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/exchange-jwt
- Magic link:
  - POST /api/auth/magic-link/request
  - POST /api/auth/magic-link/verify
- OAuth:
  - POST /api/auth/oauth/start → returns { redirectUrl }. Frontend should redirect user to this URL.
  - POST /api/auth/oauth/:provider/callback → exchange user_id + secret for session
  - GET  /api/auth/oauth/me

Example (login)
```js path=null start=null
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
```

Magic Link
- Request:
```js path=null start=null
await fetch('/api/auth/magic-link/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, redirectUrl: window.location.origin + '/auth/magic' }),
});
```
- Verify:
```js path=null start=null
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const user_id = params.get('user_id');
const res = await fetch('/api/auth/magic-link/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, user_id }),
});
const data = await res.json();
```

Storage (Appwrite-backed)
- POST /api/storage/upload/:bucket_id (multipart/form-data: file, order_id?)
- GET  /api/storage/:bucket_id/:file_id
- GET  /api/storage/:bucket_id/:file_id/url
- DELETE /api/storage/:bucket_id/:file_id
- GET  /api/storage/:bucket_id
- GET  /api/storage/projects/:order_id/files (list files by order)

Example (upload using fetch)
```js path=null start=null
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('order_id', orderId);
await fetch(`/api/storage/upload/${bucketId}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
  body: form,
});
```

Example (get view URL)
```js path=null start=null
const res = await fetch(`/api/storage/${bucketId}/${fileId}/url`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { url } = await res.json();
```

Wizard
- POST /api/wizard/save-progress
- POST /api/wizard/save-session
- GET  /api/wizard/progress/:session_id
- GET  /api/wizard/load-progress/:session_id
- GET  /api/wizard/progress?session_id=...
- GET  /api/wizard/progress/user/:user_id
- POST /api/wizard/complete-order
- PUT  /api/wizard/orders/:order_id
- GET  /api/wizard/orders/:order_id
- GET  /api/wizard/orders/user/:user_id
- GET  /api/wizard/orders/admin
- POST /api/wizard/upload-files (deprecated; use storage upload)
- GET  /api/wizard/orders/:order_id/files
- DELETE /api/wizard/files/:file_id?order_id=...
- POST /api/wizard/designs
- GET  /api/wizard/designs/:order_id

Example (list files for an order via storage service)
```js path=null start=null
const res = await fetch(`/api/storage/projects/${orderId}/files`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const { files } = await res.json();
```

Database (Appwrite Databases proxy)
- POST /api/db/:collectionId
- GET  /api/db/:collectionId/:documentId
- PUT  /api/db/:collectionId/:documentId
- DELETE /api/db/:collectionId/:documentId
- GET  /api/db/:collectionId

Messaging (Appwrite Messaging proxy)
- POST /api/messaging/topics
- POST /api/messaging/topics/:topicId/messages

Payments/Invoices/Transactions (selected)
- GET  /api/payments/test-connection
- POST /api/payments/request
- POST /api/payments/verify
- GET  /api/invoices
- POST /api/invoices
- GET  /api/transactions

Health
- GET /api/health

Common tips
- Always include Authorization: Bearer <access_token> for protected endpoints.
- For multipart uploads, use FormData and do not set Content-Type manually (the browser sets the boundary).
- Use the URL endpoint from GET /api/storage/:bucket_id/:file_id/url to render images/files.
