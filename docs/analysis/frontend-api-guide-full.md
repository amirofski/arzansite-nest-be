# Frontend API Guide (Comprehensive)

Generated at: 2025-09-10T13:45:59.082Z
Updated at: 2024-12-20 - Revised payment flow and transaction patterns

Base URL: {{API_BASE_URL}}
Auth: Bearer {{ACCESS_TOKEN}} where required

## Important Notes on Payment Flow

### Collections Overview
- **transactions**: Unified ledger for all financial activities (deposits, payments, refunds)
- **invoices**: Created for order payments, linked to orders and receipts
- **receipts**: Created for all successful payments (both wallet deposits and order payments)
- **payments**: Legacy collection, kept for backward compatibility only
- **wizard_sessions**: Stores order session data (renamed from orders in wizard context)
- **orders**: Actual finalized orders collection

### Payment Patterns

#### Wallet Deposits
1. User initiates deposit via `/wallets/me/deposit`
2. Payment gateway redirects to callback
3. Verification via `/wallets/me/deposit/verify` creates:
   - A receipt (no invoice for wallet deposits)
   - A transaction entry (type: 'deposit')
   - Updates wallet balance

#### Order Payments
1. User completes order via `/payments/request`
2. Payment gateway redirects to callback  
3. Verification via `/payments/verify` creates:
   - An invoice (if not exists) marked as PAID
   - A receipt linked to the invoice
   - A transaction entry (type: 'payment') with order/invoice references
   - Updates order status

## AdminController

### GET /admin/dashboard/stats
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /admin/domains/check-availability
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/domains/check-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /admin/domains/extensions
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/domains/extensions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /admin/domains/prices
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/domains/prices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /admin/domains/prices/:extensionId
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/domains/prices/${params.extensionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /admin/emails/test-service
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/emails/test-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /admin/invoices
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/invoices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /admin/payments
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/payments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /admin/system/metrics
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/system/metrics`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /admin/users/:user_id
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/users/${params.user_id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /admin/wallets
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/wallets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /admin/wallets/:id/adjust
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/wallets/${params.id}/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /admin/wallets/:wallet_id/adjustments
Client example (fetch):

```js path=null start=null
async function call_AdminController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/admin/wallets/${params.wallet_id}/adjustments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## AnalyticsController

### GET /analytics/comparison
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_getComparisonAnalytics(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/comparison`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/dashboard
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/export
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_exportAnalytics(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/export`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/forecasting
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_getForecastingAnalytics(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/forecasting`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/insights
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_getInsights(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/insights`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/orders
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/orders`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/reports
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_getReportTemplates(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/reports`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/revenue
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/revenue`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/user-behavior
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/user-behavior`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /analytics/wallet-transactions
Client example (fetch):

```js path=null start=null
async function call_AnalyticsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/analytics/wallet-transactions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## DatabaseController

### GET /db/:collectionId
Client example (fetch):

```js path=null start=null
async function call_DatabaseController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/db/${params.collectionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /db/:collectionId
Client example (fetch):

```js path=null start=null
async function call_DatabaseController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/db/${params.collectionId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /db/:collectionId/:documentId
Client example (fetch):

```js path=null start=null
async function call_DatabaseController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/db/${params.collectionId}/${params.documentId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /db/:collectionId/:documentId
Client example (fetch):

```js path=null start=null
async function call_DatabaseController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/db/${params.collectionId}/${params.documentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /db/:collectionId/:documentId
Client example (fetch):

```js path=null start=null
async function call_DatabaseController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/db/${params.collectionId}/${params.documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## AppwriteFunctionsController

### POST /functions/execute
Client example (fetch):

```js path=null start=null
async function call_AppwriteFunctionsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/functions/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /functions/webhook
Client example (fetch):

```js path=null start=null
async function call_AppwriteFunctionsController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/functions/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## MessagingController

### POST /messaging/topics
Client example (fetch):

```js path=null start=null
async function call_MessagingController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/messaging/topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /messaging/topics/:topicId/messages
Client example (fetch):

```js path=null start=null
async function call_MessagingController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/messaging/topics/${params.topicId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## StorageController

### GET /storage/:bucket_id
Client example (fetch):

```js path=null start=null
async function call_StorageController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/${params.bucket_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /storage/:bucket_id/:file_id
Client example (fetch):

```js path=null start=null
async function call_StorageController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/${params.bucket_id}/${params.file_id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /storage/:bucket_id/:file_id
Client example (fetch):

```js path=null start=null
async function call_StorageController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/${params.bucket_id}/${params.file_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /storage/:bucket_id/:file_id/url
Client example (fetch):

```js path=null start=null
async function call_StorageController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/${params.bucket_id}/${params.file_id}/url`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /storage/file-url
Client example (fetch):

```js path=null start=null
async function call_StorageController_getFileUrl(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/file-url`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /storage/upload-url
Client example (fetch):

```js path=null start=null
async function call_StorageController_createUploadUrl(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /storage/upload/:bucket_id
Client example (fetch):

```js path=null start=null
async function call_StorageController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/upload/${params.bucket_id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /storage/uploads
Client example (fetch):

```js path=null start=null
async function call_StorageController_listUploads(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/uploads`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /storage/uploads
Client example (fetch):

```js path=null start=null
async function call_StorageController_uploadMultipart(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /storage/uploads/:id
Client example (fetch):

```js path=null start=null
async function call_StorageController_deleteUpload(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/uploads/${params.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /storage/uploads/signed-url
Client example (fetch):

```js path=null start=null
async function call_StorageController_signedUrl(params, token) {
  const res = await fetch(`${API_BASE_URL}/storage/uploads/signed-url`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## AuthController

### GET /auth/check-verification/:email
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/check-verification/${params.email}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/exchange-jwt
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/exchange-jwt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/login
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/login-with-jwt
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/login-with-jwt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/logout
Client example (fetch):

```js path=null start=null
async function call_AuthController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /auth/me
Client example (fetch):

```js path=null start=null
async function call_AuthController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/oauth/:provider/callback
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/${params.provider}/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/oauth/:provider/start
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/${params.provider}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/oauth/github/callback
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/github/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/oauth/github/start
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/github/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/oauth/logout
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /auth/oauth/me
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /auth/oauth/providers
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/providers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/oauth/start
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/oauth/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/password-reset
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/password-reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/refresh
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/request-verification
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/request-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/reset-password
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/session
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/session-auth
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/session-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /auth/session-info/:session_id
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/session-info/${params.session_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/session-logout
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/session-logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/session-validate
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/session-validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/signup
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/userinfo
Client example (fetch):

```js path=null start=null
async function call_AuthController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/userinfo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/verify-email
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /auth/verify-email
Client example (fetch):

```js path=null start=null
async function call_AuthController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## DomainsController

### GET /domains/check
Client example (fetch):

```js path=null start=null
async function call_DomainsController_checkDomainAvailabilityGet(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/check`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /domains/check
Client example (fetch):

```js path=null start=null
async function call_DomainsController_checkDomainPost(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /domains/check-availability
Client example (fetch):

```js path=null start=null
async function call_DomainsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/check-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /domains/extensions
Client example (fetch):

```js path=null start=null
async function call_DomainsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/extensions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /domains/prices
Client example (fetch):

```js path=null start=null
async function call_DomainsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/prices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /domains/prices/:extensionId
Client example (fetch):

```js path=null start=null
async function call_DomainsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/prices/${params.extensionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /domains/search
Client example (fetch):

```js path=null start=null
async function call_DomainsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/domains/search`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## EmailController

### GET /emails/logs
Client example (fetch):

```js path=null start=null
async function call_EmailController_getEmailLogs(params, token) {
  const res = await fetch(`${API_BASE_URL}/emails/logs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /emails/send
Client example (fetch):

```js path=null start=null
async function call_EmailController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /emails/status
Client example (fetch):

```js path=null start=null
async function call_EmailController_getEmailServiceStatus(params, token) {
  const res = await fetch(`${API_BASE_URL}/emails/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /emails/template
Client example (fetch):

```js path=null start=null
async function call_EmailController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/emails/template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /emails/test
Client example (fetch):

```js path=null start=null
async function call_EmailController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/emails/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## HealthController

### GET /health
Client example (fetch):

```js path=null start=null
async function call_HealthController_check(params, token) {
  const res = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## InvoicesController

**Note**: Invoices are created only for order payments, not for wallet deposits.

### GET /invoices
Client example (fetch):

```js path=null start=null
async function call_InvoicesController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/invoices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /invoices
Client example (fetch):

```js path=null start=null
async function call_InvoicesController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /invoices/:id
Client example (fetch):

```js path=null start=null
async function call_InvoicesController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/invoices/${params.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /invoices/:id
Client example (fetch):

```js path=null start=null
async function call_InvoicesController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/invoices/${params.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /invoices/:id/pay
**Note**: This endpoint initiates payment for an invoice. Upon successful payment verification, a receipt will be created and linked to this invoice.

Client example (fetch):

```js path=null start=null
async function call_InvoicesController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/invoices/${params.id}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /invoices/admin/all
Client example (fetch):

```js path=null start=null
async function call_InvoicesController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/invoices/admin/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## NotificationsController

### PUT /notifications/:notificationId/read
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/${params.notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /notifications/channels/status
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/channels/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /notifications/history
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /notifications/order-status
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/order-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /notifications/preferences
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /notifications/preferences
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /notifications/read-all
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /notifications/test
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /notifications/unread-count
Client example (fetch):

```js path=null start=null
async function call_NotificationsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## OrdersController

### GET /orders
Client example (fetch):

```js path=null start=null
async function call_OrdersController_getOrders(params, token) {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /orders
Client example (fetch):

```js path=null start=null
async function call_OrdersController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /orders
Client example (fetch):

```js path=null start=null
async function call_OrdersController_createOrder(params, token) {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /orders/:id
Client example (fetch):

```js path=null start=null
async function call_OrdersController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/orders/${params.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /orders/:id
Client example (fetch):

```js path=null start=null
async function call_OrdersController_getOrder(params, token) {
  const res = await fetch(`${API_BASE_URL}/orders/${params.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PATCH /orders/:id
Client example (fetch):

```js path=null start=null
async function call_OrdersController_updateOrder(params, token) {
  const res = await fetch(`${API_BASE_URL}/orders/${params.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## PaymentsController

**Important**: The payments collection is legacy. New integrations should use the transactions collection for payment tracking.

### POST /payments/cancel
Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /payments/orders/:order_id
Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/orders/${params.order_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /payments/refund
Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /payments/request
Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /payments/status
Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /payments/test-connection
Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/test-connection`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /payments/verify
**Important**: This endpoint verifies Zarinpal payment and:
- Creates/updates invoice as PAID
- Generates a payment receipt
- Logs transaction in the unified ledger
- Updates order payment status

Client example (fetch):

```js path=null start=null
async function call_PaymentsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## ProfilesController

### GET /profiles
Client example (fetch):

```js path=null start=null
async function call_ProfilesController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/profiles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /profiles/me
Client example (fetch):

```js path=null start=null
async function call_ProfilesController_getMyProfile(params, token) {
  const res = await fetch(`${API_BASE_URL}/profiles/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PATCH /profiles/me
Client example (fetch):

```js path=null start=null
async function call_ProfilesController_updateMyProfile(params, token) {
  const res = await fetch(`${API_BASE_URL}/profiles/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## ReceiptsController

**Note**: Receipts are created for all successful payments:
- Wallet deposits (no invoice link)
- Order payments (linked to invoice)

### GET /receipts
Client example (fetch):

```js path=null start=null
async function call_ReceiptsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/receipts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /receipts/:id
Client example (fetch):

```js path=null start=null
async function call_ReceiptsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/receipts/${params.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /receipts/:id/download
Client example (fetch):

```js path=null start=null
async function call_ReceiptsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/receipts/${params.id}/download`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /receipts/admin/all
Client example (fetch):

```js path=null start=null
async function call_ReceiptsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/receipts/admin/all`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## SiteConfigController

### PATCH /site-config
Client example (fetch):

```js path=null start=null
async function call_SiteConfigController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/site-config`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /site-config/current
Client example (fetch):

```js path=null start=null
async function call_SiteConfigController_getCurrentConfig(params, token) {
  const res = await fetch(`${API_BASE_URL}/site-config/current`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /site-config/history
Client example (fetch):

```js path=null start=null
async function call_SiteConfigController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/site-config/history`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## SupportController

### GET /support/contact-info
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/contact-info`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /support/faq
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/faq`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /support/report-issue
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/report-issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /support/tickets
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/tickets`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /support/tickets/:ticketId
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${params.ticketId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /support/tickets/:ticketId/messages
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${params.ticketId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /support/tickets/:ticketId/status
Client example (fetch):

```js path=null start=null
async function call_SupportController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/support/tickets/${params.ticketId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## TransactionsController

**Important**: Transactions collection is the unified ledger for all financial activities:
- Type 'deposit': Wallet recharge transactions
- Type 'payment': Order payment transactions (audit only, no balance change)
- Type 'refund': Refund transactions
- Type 'adjustment': Admin adjustments

### GET /transactions
Client example (fetch):

```js path=null start=null
async function call_TransactionsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /transactions/:id
Client example (fetch):

```js path=null start=null
async function call_TransactionsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/transactions/${params.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /transactions/my
Client example (fetch):

```js path=null start=null
async function call_TransactionsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/transactions/my`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /transactions/order/:order_id
Client example (fetch):

```js path=null start=null
async function call_TransactionsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/transactions/order/${params.order_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## UploadsController

### GET /uploads
Client example (fetch):

```js path=null start=null
async function call_UploadsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /uploads
Client example (fetch):

```js path=null start=null
async function call_UploadsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /uploads/:id
Client example (fetch):

```js path=null start=null
async function call_UploadsController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads/${params.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /uploads/:id
Client example (fetch):

```js path=null start=null
async function call_UploadsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads/${params.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /uploads/bulk
Client example (fetch):

```js path=null start=null
async function call_UploadsController_HttpCode(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads/bulk`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /uploads/bulk
Client example (fetch):

```js path=null start=null
async function call_UploadsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /uploads/order/:order_id
Client example (fetch):

```js path=null start=null
async function call_UploadsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads/order/${params.order_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /uploads/test
Client example (fetch):

```js path=null start=null
async function call_UploadsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/uploads/test`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## WalletsController

### GET /wallets/:user_id
Client example (fetch):

```js path=null start=null
async function call_WalletsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/${params.user_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/:user_id/credit
Client example (fetch):

```js path=null start=null
async function call_WalletsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/${params.user_id}/credit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/:user_id/debit
Client example (fetch):

```js path=null start=null
async function call_WalletsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/${params.user_id}/debit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wallets/:user_id/transactions
Client example (fetch):

```js path=null start=null
async function call_WalletsController_UseGuards(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/${params.user_id}/transactions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wallets/balance
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/balance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/deposit/callback
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/deposit/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/deposit/verify-with-gateway
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/deposit/verify-with-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wallets/me
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wallets/me/balance
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me/balance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/me/deposit
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me/deposit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/me/deposit/verify
**Important**: Verifies wallet deposit payment and:
- Creates a receipt (no invoice for deposits)
- Logs transaction as type 'deposit'
- Updates wallet balance

Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me/deposit/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/me/topup
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me/topup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wallets/me/transactions
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me/transactions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/me/transactions
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/me/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wallets/refund-order
Client example (fetch):

```js path=null start=null
async function call_WalletsController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wallets/refund-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```


## WizardController

**Note**: The wizard manages order sessions (wizard_sessions collection). Methods like getOrder/updateOrder are being renamed to getSession/updateSession for clarity.

### POST /wizard/calculate-price
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/calculate-price`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wizard/complete-order
Client example (fetch):

```js path=null start=null
async function call_WizardController_UsePipes(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/complete-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wizard/designs
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/designs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/designs/:order_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/designs/${params.order_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wizard/domains/check-availability
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/domains/check-availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/domains/extensions
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/domains/extensions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/domains/prices
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/domains/prices`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /wizard/domains/prices/:extensionId
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/domains/prices/${params.extensionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### DELETE /wizard/files/:file_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/files/${params.file_id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/files/:file_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/files/${params.file_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/orders/:order_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/orders/${params.order_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### PUT /wizard/orders/:order_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/orders/${params.order_id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/orders/:order_id/files
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/orders/${params.order_id}/files`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/orders/admin
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/orders/admin`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/orders/user/:user_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/orders/user/${params.user_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/pricing-config
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/pricing-config`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/progress/:session_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/progress/${params.session_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### GET /wizard/progress/user/:user_id
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/progress/user/${params.user_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wizard/save-progress
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/save-progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

### POST /wizard/upload-files
Client example (fetch):

```js path=null start=null
async function call_WizardController_ApiOperation(params, token) {
  const res = await fetch(`${API_BASE_URL}/wizard/upload-files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json().catch(() => ({}));
}
```

