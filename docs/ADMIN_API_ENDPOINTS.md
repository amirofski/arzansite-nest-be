# ArzanSite Backend API - Admin Endpoints Documentation

## Overview

This document provides comprehensive documentation for all admin endpoints in the ArzanSite Backend API. These endpoints require admin role authentication and provide administrative functionality for managing users, domains, system health, wallets, and email services.

## Authentication

All admin endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- Admin role permissions
- Valid session

## Base URL

```
https://api.arzansite.com/admin
```

## Endpoints

### 1. User Management

#### Delete User Account
**Endpoint:** `DELETE /admin/users/{userId}`

**Description:** Deletes a user account from the system. Cannot delete users with active orders.

**Parameters:**
- `userId` (path): ID of the user to delete

**Request:**
```http
DELETE /admin/users/user_123
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUserId": "user_123",
    "deletedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Cannot delete user with active orders
- `404 Not Found`: User not found
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Insufficient permissions

### 2. Domain Management

#### Get Domain Extension Prices
**Endpoint:** `GET /admin/domains/prices`

**Description:** Retrieves all domain extension prices and availability.

**Request:**
```http
GET /admin/domains/prices
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
[
  {
    "id": "ext_1",
    "extension": ".ir",
    "price": 0,
    "available": true,
    "description": "Iranian domain extension",
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "ext_2",
    "extension": ".com",
    "price": 500000,
    "available": true,
    "description": "International domain extension",
    "isDefault": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Update Domain Extension Price
**Endpoint:** `PUT /admin/domains/prices/{extensionId}`

**Description:** Updates the price and availability of a domain extension.

**Parameters:**
- `extensionId` (path): ID of the domain extension to update

**Request Body:**
```json
{
  "price": 600000,
  "available": true,
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": "ext_2",
  "extension": ".com",
  "price": 600000,
  "available": true,
  "description": "Updated description",
  "isDefault": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Create Domain Extension
**Endpoint:** `POST /admin/domains/extensions`

**Description:** Adds a new domain extension to the system.

**Request Body:**
```json
{
  "extension": ".io",
  "price": 800000,
  "description": "Technology domain extension",
  "available": true
}
```

**Response:**
```json
{
  "id": "ext_4",
  "extension": ".io",
  "price": 800000,
  "available": true,
  "description": "Technology domain extension",
  "isDefault": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Check Domain Availability
**Endpoint:** `POST /admin/domains/check-availability`

**Description:** Checks the availability of a domain for admin purposes.

**Request Body:**
```json
{
  "domain": "mybusiness",
  "extension": ".ir"
}
```

**Response:**
```json
{
  "domain": "mybusiness.ir",
  "available": true,
  "price": 0,
  "checkedAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. System Health Metrics

#### Get System Metrics
**Endpoint:** `GET /admin/system/metrics`

**Description:** Retrieves detailed system health metrics including system, database, and service status.

**Request:**
```http
GET /admin/system/metrics
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "system": {
    "uptime": 86400,
    "memoryUsage": 75.5,
    "cpuUsage": 23.1,
    "diskUsage": 45.2,
    "activeConnections": 127
  },
  "database": {
    "status": "healthy",
    "responseTime": 12,
    "activeQueries": 8,
    "connectionPool": {
      "active": 15,
      "idle": 25,
      "max": 50
    }
  },
  "services": {
    "email": {
      "status": "healthy",
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "queueSize": 0
    },
    "payment": {
      "status": "healthy",
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "gatewayStatus": "online"
    },
    "storage": {
      "status": "healthy",
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "usedSpace": "2.5GB",
      "totalSpace": "10GB"
    }
  },
  "performance": {
    "averageResponseTime": 45,
    "requestsPerMinute": 120,
    "errorRate": 0.02,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Wallet Management

#### Get Wallet Adjustment History
**Endpoint:** `GET /admin/wallets/{walletId}/adjustments`

**Description:** Retrieves the history of wallet adjustments for a specific wallet.

**Parameters:**
- `walletId` (path): ID of the wallet
- `page` (query): Page number (default: 1)
- `limit` (query): Number of items per page (default: 20)

**Request:**
```http
GET /admin/wallets/wallet_123/adjustments?page=1&limit=20
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "adjustments": [
    {
      "id": "adj_1",
      "walletId": "wallet_123",
      "adminId": "admin_456",
      "adminName": "John Admin",
      "type": "credit",
      "amount": 1000000,
      "reason": "Compensation for service issue",
      "notes": "Customer reported downtime",
      "balanceBefore": 500000,
      "balanceAfter": 1500000,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 5. Email Service Testing

#### Test Email Service
**Endpoint:** `POST /admin/emails/test-service`

**Description:** Tests the functionality of the email service.

**Request Body:**
```json
{
  "testType": "connection",
  "recipient": "admin@arzansite.com"
}
```

**Test Types:**
- `connection`: Tests SMTP connection and authentication
- `send`: Tests sending a test email
- `template`: Tests email template rendering

**Response:**
```json
{
  "testType": "connection",
  "status": "success",
  "message": "Email service is working correctly",
  "details": {
    "smtpStatus": "connected",
    "authentication": "successful"
  },
  "testedAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Codes

- `USER_NOT_FOUND`: User does not exist
- `USER_HAS_ACTIVE_ORDERS`: Cannot delete user with active orders
- `DOMAIN_EXTENSION_NOT_FOUND`: Domain extension does not exist
- `INVALID_TEST_TYPE`: Invalid email service test type
- `INSUFFICIENT_PERMISSIONS`: Admin role required
- `INVALID_TOKEN`: Invalid or expired JWT token

## Rate Limiting

Admin endpoints are subject to rate limiting:
- General admin operations: 50 requests per minute
- System metrics: 30 requests per minute
- Domain operations: 100 requests per minute
- Email testing: 10 requests per minute

## Security Considerations

### Authentication
- All endpoints require valid JWT token
- Token must have admin role permissions
- Tokens expire after 1 hour

### Authorization
- Role-based access control (RBAC)
- Admin role required for all endpoints
- User context validation

### Input Validation
- All input parameters are validated and sanitized
- Domain extensions must follow valid format
- Price values must be positive numbers
- User IDs must be valid UUIDs

### Audit Logging
- All admin operations are logged
- User deletion operations are tracked
- Wallet adjustments are recorded with admin details

## Data Models

### Domain Extension
```typescript
interface DomainExtension {
  id: string;
  extension: string;
  price: number;
  available: boolean;
  description: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### System Metrics
```typescript
interface SystemMetrics {
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    activeConnections: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    activeQueries: number;
    connectionPool: {
      active: number;
      idle: number;
      max: number;
    };
  };
  services: {
    email: ServiceStatus;
    payment: ServiceStatus;
    storage: ServiceStatus;
  };
  performance: {
    averageResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    lastUpdated: string;
  };
}
```

### Wallet Adjustment History
```typescript
interface WalletAdjustmentHistory {
  id: string;
  walletId: string;
  adminId: string;
  adminName: string;
  type: 'credit' | 'debit' | 'correction';
  amount: number;
  reason: string;
  notes?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}
```

## Testing

### Unit Tests
- All endpoint handlers are unit tested
- Request/response models are validated
- Error handling scenarios are covered

### Integration Tests
- Admin authentication flow is tested
- Database operations are verified
- External service integrations are tested

### Security Tests
- Unauthorized access attempts are tested
- Input sanitization is verified
- Rate limiting functionality is tested

## Deployment Notes

### Environment Variables
```bash
# Admin operations
ADMIN_OPERATION_RATE_LIMIT=50
ADMIN_SESSION_TIMEOUT=3600

# Domain management
DOMAIN_CHECK_RATE_LIMIT=100
DOMAIN_API_TIMEOUT=5000

# System metrics
SYSTEM_METRICS_INTERVAL=30000
SYSTEM_METRICS_RETENTION_DAYS=30
```

### Database Collections
- `domain_extensions`: Domain extension configurations
- `wallet_adjustments`: Wallet adjustment history
- `system_metrics`: System health metrics (optional)

### Monitoring
- All admin operations are logged
- System metrics endpoint usage is tracked
- Domain management operations are monitored
- Critical system issues trigger alerts

## Support

For technical support or questions about admin endpoints:
- Email: admin-support@arzansite.com
- Documentation: https://docs.arzansite.com/admin-api
- API Status: https://status.arzansite.com
