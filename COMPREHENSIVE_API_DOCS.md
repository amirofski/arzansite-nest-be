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

- **🔐 Secure Authentication** with JWT tokens
- **📧 Custom Email Services** with SMTP integration
- **💳 Payment Processing** with multiple gateways
- **🗄️ Database Operations** via Appwrite
- **📁 File Storage** and management
- **⚙️ Real-time Updates** with WebSocket support

## 🌐 Base URLs

| Environment | Base URL | Description |
|-------------|----------|-------------|
| **Local Development** | `http://localhost:3000/api` | For development and testing |
| **Production** | `https://app.arzansite.com/api` | Live production environment |

## 🔐 Authentication

### JWT Token Format
```bash
Authorization: Bearer <your-jwt-token>
```

### Token Types
- **Access Token**: Valid for 1 hour, used for API requests
- **Refresh Token**: Valid for 7 days, used to get new access tokens

## 📚 API Endpoints

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

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "email": "user@example.com",
    "emailVerified": true
  },
  "session": {
    "$id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
  },
  "redirect": {
    "url": "/dashboard",
    "message": "Login successful! Redirecting to dashboard..."
  }
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

#### 6. User Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Successfully signed out"
}
```

#### 7. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
```

#### 2. Update My Profile
```http
PATCH /api/profiles/me
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
```

### 📦 Order Management (`/orders`)

#### 1. Get Orders
```http
GET /api/orders?mine=true
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `mine=true` - Get user's own orders
- `admin=true` - Get all orders (admin only)

#### 2. Create Order
```http
POST /api/orders
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
```

#### 4. Update Order
```http
PATCH /api/orders/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "in-progress",
  "description": "Updated description"
}
```

#### 5. Delete Order
```http
DELETE /api/orders/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <access_token>
```

### 🎨 Design Management (`/orders/:orderId/design`)

#### 1. Save Design
```http
POST /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
```

#### 3. Get Design Options
```http
GET /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design/options
Authorization: Bearer <access_token>
```

#### 4. Update Design Options
```http
PATCH /api/orders/64f8a1b2c3d4e5f6a7b8c9d0/design/options
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
```

#### 2. Get My Balance
```http
GET /api/wallets/me/balance
Authorization: Bearer <access_token>
```

#### 3. Get My Transactions
```http
GET /api/wallets/me/transactions?limit=10&offset=0
Authorization: Bearer <access_token>
```

#### 4. Create Transaction
```http
POST /api/wallets/me/transactions
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "amount": 150.00,
  "currency": "USD",
  "gateway": "zarinpal"
}
```

#### 2. Verify Payment
```http
POST /api/payments/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "paymentId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "transactionId": "txn_123456789"
}
```

#### 3. Refund Payment
```http
POST /api/payments/refund
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "paymentId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "amount": 75.00,
  "reason": "Partial refund"
}
```

### 📊 Transaction History (`/transactions`)

#### 1. Get My Transactions
```http
GET /api/transactions/my?limit=20&offset=0
Authorization: Bearer <access_token>
```

#### 2. Get Transaction by ID
```http
GET /api/transactions/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <access_token>
```

#### 3. Get Transactions for Order
```http
GET /api/transactions/order/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <access_token>
```

### 📁 File Storage (`/storage`)

#### 1. Upload File
```http
POST /api/storage/uploads
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <file>
bucketId: "64f8a1b2c3d4e5f6a7b8c9d0"
```

#### 2. Get File URL
```http
GET /api/storage/file-url?fileId=64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <access_token>
```

#### 3. Get Signed URL
```http
GET /api/storage/uploads/signed-url?fileId=64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <access_token>
```

### ☁️ Appwrite Services (`/appwrite`)

#### 1. Database Operations
```http
POST /api/db/collection_id
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
Authorization: Bearer <access_token>
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
- **401** - Unauthorized (invalid/missing token)
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
1. **Register** a new user
2. **Verify** email (check inbox)
3. **Login** to get tokens
4. **Use** access token for protected endpoints
5. **Refresh** token when needed

## 🔒 Security Features

- **JWT Authentication** with secure token handling
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

### Authentication Flow
```javascript
// 1. Login
const loginResponse = await fetch(`${config.apiBaseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// 2. Store tokens
const { access_token, refresh_token } = await loginResponse.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);

// 3. Use in API calls
const response = await fetch(`${config.apiBaseUrl}/profiles/me`, {
  headers: { 
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
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
