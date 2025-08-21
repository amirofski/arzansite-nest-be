# 🚀 ArzanSite Backend API - Comprehensive Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Base URLs](#base-urls)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Testing](#testing)

## 🌟 Overview

The ArzanSite Backend API provides a comprehensive set of services for managing user accounts, orders, designs, payments, and more. Built with NestJS and integrated with Appwrite, it offers:

- **🔐 Secure Authentication** with Appwrite sessions (HttpOnly cookie)
- **📧 Custom Email Services** with SMTP integration
- **💳 Payment Processing** with multiple gateways
- **🗄️ Database Operations** via Appwrite
- **📁 File Storage** and management
- **⚙️ Real-time Updates** with WebSocket support

## 🌐 Base URLs

| Environment | Base URL | Description |
|-------------|----------|-------------|
| **Local Development** | `http://localhost:3000/api` | For development and testing |
| **Production** | `https://nest.arzansite.com/api` | Live production environment |

## 🔐 Authentication (Session-based)

The backend now uses a secure HttpOnly cookie for authentication instead of requiring Authorization headers.

- **Cookie name**: `appwrite_jwt`
- **How it is set**: Call `POST /api/auth/session` with a valid Appwrite JWT. The backend validates the JWT with Appwrite and sets the cookie.
- **How to call APIs**: From browsers, send requests with credentials so the cookie is included. No `Authorization` header is required.

Frontend example (browser):
```javascript
// 1) Create an Appwrite session/JWT on the frontend
// (example using Appwrite Web SDK)
import { Client, Account } from 'appwrite';

const client = new Client().setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
const account = new Account(client);

// If not already logged in:
await account.createEmailPasswordSession(email, password);

// Get a short-lived JWT from Appwrite
const { jwt } = await account.createJWT();

// 2) Create backend session cookie
await fetch('/api/auth/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ jwt })
});

// 3) Call protected APIs with credentials (cookie is sent automatically)
const me = await fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json());
```

Logout options:
- Clear backend cookie only: `POST /api/auth/oauth/logout` (clears `appwrite_jwt`)
- Invalidate Appwrite session + backend cookie: `POST /api/auth/session-logout` with `{ sessionId }`

## 📚 API Endpoints

Note: All protected endpoints accept the session cookie. In browsers, prefer cookie-based auth (no Authorization header). If you use non-browser clients, you may still send `Authorization: Bearer <token>`; the guard accepts either header or cookie.

### 🔐 Authentication (`/auth`)

#### 1. User Registration
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "metadata": {
    "name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "company": "Example Corp"
  }
}
```

**Response (201):**
```json
{
  "message": "User created successfully. Please check your email to verify your account.",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "emailVerification": false,
    "$createdAt": "2024-01-01T00:00:00.000Z"
  },
  "verificationEmailSent": true,
  "requiresFrontendVerification": false
}
```

#### 2. Create Backend Session Cookie
```http
POST /api/auth/session
Content-Type: application/json

{ "jwt": "<Appwrite JWT from account.createJWT()>" }
```

Sets `appwrite_jwt` HttpOnly cookie if the JWT is valid. Response:
```json
{
  "user": { "$id": "<userId>", "email": "user@example.com", "emailVerification": true },
  "message": "Session created successfully"
}
```

#### 3. Email Verification
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "64f8a1b2c3d4e5f6a7b8c9d0",
  "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully! Welcome email sent.",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerification": true
  },
  "welcomeEmailSent": true
}
```

#### 4. Password Reset
```http
POST /api/auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Password reset email sent successfully. Please check your email.",
  "emailSent": true
}
```

#### 5. Token Refresh
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com"
  }
}
```

#### 6. Logout (clear backend cookie only)
```http
POST /api/auth/oauth/logout
```

Clears `appwrite_jwt` cookie.

#### 7. Get Current User
```http
GET /api/auth/me
Cookie: appwrite_jwt=...
```

**Response (200):**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "message": "User profile endpoint. Implement additional profile fetching as needed."
}
```

### 👤 User Profiles (`/profiles`)

#### 1. Get My Profile
```http
GET /api/profiles/me
Cookie: appwrite_jwt=...
```

#### 2. Update My Profile
```http
PATCH /api/profiles/me
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "address": "123 Main St, City, Country"
}
```

#### 3. Get All Profiles (Admin Only)
```http
GET /api/profiles
Cookie: appwrite_jwt=...
```

### 📦 Order Management (`/orders`)

#### 1. Get Orders
```http
GET /api/orders?mine=true
Cookie: appwrite_jwt=...
```

**Query Parameters:**
- `mine=true` - Get user's own orders
- `admin=true` - Get all orders (admin only)

#### 2. Create Order
```http
POST /api/orders
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "title": "Website Design",
  "description": "Modern responsive website design",
  "budget": 1500,
  "deadline": "2024-02-01T00:00:00.000Z",
  "category": "web-design"
}
```

#### 3. Get Specific Order
```http
GET /api/orders/64f8a1b2c3d4e5f6a7b8c9d0
Cookie: appwrite_jwt=...
```

#### 4. Update Order
```http
PATCH /api/orders/64f8a1b2c3d4e5f6a7b8c9d0
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "status": "in-progress",
  "description": "Updated description"
}
```

#### 5. Delete Order
```http
DELETE /api/orders/64f8a1b2c3d4e5f6a7b8c9d0
Cookie: appwrite_jwt=...
```

### 🎨 Design Management (`/orders/:orderId/design`)

#### 1. Save Design
```http
POST /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "designData": {
    "layout": "modern",
    "colors": ["#007bff", "#28a745"],
    "fonts": ["Roboto", "Open Sans"]
  },
  "previewUrl": "https://example.com/preview.jpg"
}
```

#### 2. Get Design
```http
GET /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design
Cookie: appwrite_jwt=...
```

#### 3. Get Design Options
```http
GET /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design/options
Cookie: appwrite_jwt=...
```

#### 4. Update Design Options
```http
PATCH /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design/options
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "options": {
    "revisions": 3,
    "deliveryFormat": ["PSD", "AI", "PDF"]
  }
}
```

### 💰 Wallet & Transactions (`/wallets`)

#### 1. Get My Wallet
```http
GET /api/wallets/me
Cookie: appwrite_jwt=...
```

#### 2. Get My Balance
```http
GET /api/wallets/me/balance
Cookie: appwrite_jwt=...
```

#### 3. Get My Transactions
```http
GET /api/wallets/me/transactions?limit=10&offset=0
Cookie: appwrite_jwt=...
```

#### 4. Create Transaction
```http
POST /api/wallets/me/transactions
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "type": "deposit",
  "amount": 100.00,
  "description": "Payment for order #123"
}
```

#### 5. Refund Order
```http
POST /api/wallets/refund-order
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "amount": 50.00,
  "reason": "Customer request"
}
```

### 💳 Payment Processing (`/payments`)

#### 1. Request Payment
```http
POST /api/payments/request
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "amount": 3000000,
  "description": "Order #12345",
  "callbackUrl": "https://yourapp.com/pay/callback?order_id=12345",
  "orderId": "12345",
  "mobile": "09xxxxxxxxx",
  "email": "user@example.com"
}
```

#### 2. Verify Payment
```http
POST /api/payments/verify
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "authority": "A000000000000000000000000000000000000",
  "amount": 3000000
}
```

#### 3. Refund Payment
```http
POST /api/payments/refund
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "orderId": "12345",
  "amount": 3000000
}
```

### 📊 Transaction History (`/transactions`)

#### 1. Get My Transactions
```http
GET /api/transactions/my?limit=20&offset=0
Cookie: appwrite_jwt=...
```

#### 2. Get Transaction by ID
```http
GET /api/transactions/64f8a1b2c3d4e5f6a7b8c9d0
Cookie: appwrite_jwt=...
```

#### 3. Get Transactions for Order
```http
GET /api/transactions/order/64f8a1b2c3d4e5f6a7b8c9d0
Cookie: appwrite_jwt=...
```

### 📁 File Uploads (`/uploads`)

#### 1. Upload File
```http
POST /api/uploads
Cookie: appwrite_jwt=...
Content-Type: multipart/form-data

file: <file>
orderId: <optional>
fileType: document|design|avatar
```

#### 2. List uploads
```http
GET /api/uploads?userId=...&orderId=...
Cookie: appwrite_jwt=...
```

#### 3. Get by id
```http
GET /api/uploads/:id?bucketType=document|design|avatar
Cookie: appwrite_jwt=...
```

#### 4. Upload multiple
```http
POST /api/uploads/bulk
Cookie: appwrite_jwt=...
Content-Type: multipart/form-data

files[]: <file>…
orderId: <optional>
fileType: document|design|avatar
```

#### 5. Delete file
```http
DELETE /api/uploads/:id?bucketType=document|design|avatar
Cookie: appwrite_jwt=...
```

#### 6. Delete multiple
```http
DELETE /api/uploads/bulk
Cookie: appwrite_jwt=...
Content-Type: application/json

{ "fileIds": ["id1","id2"], "bucketType": "design" }
```

### ☁️ Appwrite Services (`/appwrite`)

#### 1. Database Operations
```http
POST /api/db/collection_id
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "data": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

#### 2. Execute Cloud Function
```http
POST /api/functions/execute
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "functionId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "data": {
    "key": "value"
  },
  "xAsync": false
}
```

#### 3. Storage Operations
```http
GET /api/storage/bucket_id
Cookie: appwrite_jwt=...
```

### 🌐 Domain Management (`/domains`)

#### 1. Check Domain Availability
```http
GET /api/domains/check?domain=example.com
```

#### 2. Search Domains
```http
GET /api/domains/search?query=example
```

### ⚙️ Site Configuration (`/site-config`)

#### 1. Get Current Configuration
```http
GET /api/site-config/current
```

#### 2. Update Configuration
```http
PATCH /api/site-config
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "siteName": "ArzanSite",
  "maintenanceMode": false,
  "contactEmail": "support@arzansite.com"
}
```

### 📧 Email Services (`/emails`)

#### 1. Send Test Email
```http
POST /api/emails/test
Cookie: appwrite_jwt=...
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "body": "This is a test email"
}
```

#### 2. Get Email Status
```http
GET /api/emails/status
Cookie: appwrite_jwt=...
```

### 🏥 Health Monitoring (`/health`)

#### 1. Health Check
```http
GET /api/health
```

## ❌ Error Handling

### Standard Error Response Format
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Error type",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST"
}
```

### Common HTTP Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid/missing session)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **429** - Too Many Requests (rate limited)
- **500** - Internal Server Error

## 🚦 Rate Limiting

- **Default**: 100 requests per minute per IP
- **Configurable**: Via `THROTTLE_TTL` and `THROTTLE_LIMIT` environment variables
- **Headers**: Rate limit information included in response headers

## 🧪 Testing

### Swagger UI
Access interactive API documentation at:
- **Local**: `http://localhost:3000/api/docs`
- **Production**: `https://app.arzansite.com/api/docs`

### Testing Tools
- **Postman**: Import OpenAPI spec from Swagger
- **cURL**: Use examples provided above
- **Frontend**: Test with your application

### Authentication Testing
1. Register a new user
2. Verify email (check inbox)
3. Create Appwrite session on frontend and get JWT via `account.createJWT()`
4. Call `POST /api/auth/session` to set `appwrite_jwt` cookie
5. Call protected endpoints with `credentials: 'include'`

## 🔒 Security Features

- **Session Authentication** using Appwrite JWT stored in HttpOnly cookie
- **Role-Based Access Control** (RBAC)
- **Input Validation** with class-validator
- **CORS Protection** for cross-origin requests
- **Rate Limiting** to prevent abuse
- **Helmet.js** for security headers
- **Request Sanitization** and validation

## 📱 Frontend Integration

### Environment Configuration
```javascript
const config = {
  development: {
    apiBaseUrl: 'http://localhost:3000/api'
  },
  production: {
    apiBaseUrl: 'https://app.arzansite.com/api'
  }
};
```

### Authentication Flow (Session)
```javascript
// Create Appwrite session and backend cookie, then call APIs with credentials: 'include'
import { Client, Account } from 'appwrite';

const client = new Client().setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT).setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
const account = new Account(client);

await account.createEmailPasswordSession(email, password);
const { jwt } = await account.createJWT();

await fetch(`${config.apiBaseUrl}/auth/session`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ jwt })
});

const me = await fetch(`${config.apiBaseUrl}/auth/me`, { credentials: 'include' }).then(r => r.json());
```

### Error Handling
```javascript
const handleApiError = (error) => {
  if (error.status === 401) {
    // Token expired, try to refresh
    refreshToken();
  } else if (error.status === 403) {
    // Insufficient permissions
    showPermissionError();
  } else {
    // Other errors
    showErrorMessage(error.message);
  }
};
```

## 📞 Support

- **Documentation**: `https://app.arzansite.com/api/docs`
- **Email**: `support@arzansite.com`
- **Website**: `https://arzansite.com`

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**API Status**: ✅ Active
