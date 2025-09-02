# Frontend User ID Migration Guide

## Overview

This guide explains the migration from `userId` to `user_id` in the backend API. All database fields now use `user_id` (snake_case) instead of `userId` (camelCase).

## What Changed

### Database Fields
- **Before**: `userId`, `createdAt`, `updatedAt` (camelCase)
- **After**: `user_id`, `created_at`, `updated_at` (snake_case)

### API Request/Response Fields
- **Before**: `{ "userId": "123", "createdAt": "..." }`
- **After**: `{ "user_id": "123", "created_at": "..." }`

## Updated API Endpoints

### 1. Authentication & User Management

#### Sign Up
```typescript
// Request
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "name": "John Doe"
  }
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "created_at": "2025-08-31T15:00:25.784Z"
    }
  }
}
```

#### Sign In
```typescript
// Request
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "user"
    },
    "accessToken": "jwt_token_here"
  }
}
```

#### Get User Profile
```typescript
// Request
GET /api/auth/me
Authorization: Bearer <access_token>

// Response
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 2. Wizard & Orders

#### Complete Order
```typescript
// Request
POST /api/wizard/complete-order
{
  "sessionId": "wizard_session_123",
  "order": {
    "title": "My Website",
    "description": "Personal website",
    "priceTomans": 4700000,
    "siteType": "personal",
    "user_id": "user_123"  // ✅ Use user_id, not userId
  },
  "designSnapshot": { ... }
}

// Response
{
  "success": true,
  "data": {
    "id": "order_123",
    "status": "pending",
    "payment_status": "pending",
    "amount": 47000000,
    "title": "My Website",
    "created_at": "2025-08-31T15:00:25.784Z",
    "updated_at": "2025-08-31T15:00:25.784Z"
  }
}
```

#### Get User Orders
```typescript
// Request
GET /api/wizard/orders
Authorization: Bearer <access_token>

// Response
{
  "success": true,
  "data": [
    {
      "id": "order_123",
      "user_id": "user_123",  // ✅ Use user_id
      "title": "My Website",
      "status": "pending",
      "created_at": "2025-08-31T15:00:25.784Z",
      "updated_at": "2025-08-31T15:00:25.784Z"
    }
  ]
}
```

### 3. Invoices

#### Get User Invoices
```typescript
// Request
GET /api/invoices
Authorization: Bearer <access_token>

// Response
{
  "success": true,
  "data": [
    {
      "id": "invoice_123",
      "user_id": "user_123",  // ✅ Use user_id
      "order_id": "order_123",
      "amount": 47000000,
      "status": "pending",
      "due_date": "2025-09-30T15:00:25.784Z",
      "created_at": "2025-08-31T15:00:25.784Z",
      "updated_at": "2025-08-31T15:00:25.784Z"
    }
  ]
}
```

### 4. Wallet & Transactions

#### Get User Wallet
```typescript
// Request
GET /api/wallets/me
Authorization: Bearer <access_token>

// Response
{
  "success": true,
  "data": {
    "id": "wallet_123",
    "user_id": "user_123",  // ✅ Use user_id
    "balance": 1000000,
    "created_at": "2025-08-31T15:00:25.784Z",
    "updated_at": "2025-08-31T15:00:25.784Z"
  }
}
```

#### Get Wallet Transactions
```typescript
// Request
GET /api/transactions
Authorization: Bearer <access_token>

// Response
{
  "success": true,
  "data": [
    {
      "id": "transaction_123",
      "user_id": "user_123",  // ✅ Use user_id
      "wallet_id": "wallet_123",
      "type": "deposit",
      "amount": 1000000,
      "status": "completed",
      "created_at": "2025-08-31T15:00:25.784Z"
    }
  ]
}
```

### 5. User Profile

#### Get User Profile
```typescript
// Request
GET /api/profiles/me
Authorization: Bearer <access_token>

// Response
{
  "success": true,
  "data": {
    "id": "profile_123",
    "user_id": "user_123",  // ✅ Use user_id
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "address": "123 Main St",
    "created_at": "2025-08-31T15:00:25.784Z",
    "updated_at": "2025-08-31T15:00:25.784Z"
  }
}
```

#### Update User Profile
```typescript
// Request
PUT /api/profiles/me
Authorization: Bearer <access_token>
{
  "full_name": "John Smith",
  "phone": "+1234567890",
  "address": "456 Oak Ave"
}

// Response
{
  "success": true,
  "data": {
    "id": "profile_123",
    "user_id": "user_123",
    "full_name": "John Smith",
    "phone": "+1234567890",
    "address": "456 Oak Ave",
    "updated_at": "2025-08-31T15:30:00.000Z"
  }
}
```

## Frontend Implementation Changes

### 1. Update TypeScript Interfaces

```typescript
// Before
interface User {
  id: string;
  userId: string;  // ❌ Remove this
  email: string;
  createdAt: string;  // ❌ Remove this
  updatedAt: string;  // ❌ Remove this
}

// After
interface User {
  id: string;
  user_id: string;  // ✅ Add this
  email: string;
  created_at: string;  // ✅ Add this
  updated_at: string;  // ✅ Add this
}
```

### 2. Update API Calls

```typescript
// Before
const createOrder = async (orderData: any) => {
  const response = await fetch('/api/wizard/complete-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...orderData,
      userId: currentUser.id  // ❌ Remove this
    })
  });
};

// After
const createOrder = async (orderData: any) => {
  const response = await fetch('/api/wizard/complete-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...orderData,
      user_id: currentUser.id  // ✅ Add this
    })
  });
};
```

### 3. Update Response Handling

```typescript
// Before
const handleOrderResponse = (order: any) => {
  console.log('Order created:', {
    id: order.id,
    userId: order.userId,  // ❌ This won't exist
    createdAt: order.createdAt  // ❌ This won't exist
  });
};

// After
const handleOrderResponse = (order: any) => {
  console.log('Order created:', {
    id: order.id,
    user_id: order.user_id,  // ✅ Use this
    created_at: order.created_at  // ✅ Use this
  });
};
```

### 4. Update Form Fields

```typescript
// Before
const [formData, setFormData] = useState({
  title: '',
  description: '',
  userId: ''  // ❌ Remove this
});

// After
const [formData, setFormData] = useState({
  title: '',
  description: '',
  user_id: ''  // ✅ Add this
});
```

## Migration Checklist

### ✅ Update TypeScript Interfaces
- [ ] User interface
- [ ] Order interface
- [ ] Invoice interface
- [ ] Wallet interface
- [ ] Transaction interface
- [ ] Profile interface

### ✅ Update API Requests
- [ ] Order creation
- [ ] Profile updates
- [ ] Invoice creation
- [ ] Wallet operations

### ✅ Update Response Handling
- [ ] Order responses
- [ ] User profile responses
- [ ] Wallet responses
- [ ] Transaction responses

### ✅ Update Form Components
- [ ] Order forms
- [ ] Profile forms
- [ ] Payment forms

### ✅ Update Display Components
- [ ] Order lists
- [ ] User profile display
- [ ] Dashboard components

## Testing

### 1. Test All API Endpoints
- Verify that requests with `user_id` work correctly
- Verify that responses contain `user_id` and `created_at`/`updated_at`

### 2. Test Form Submissions
- Ensure forms send `user_id` instead of `userId`
- Verify that all required fields are properly sent

### 3. Test Response Handling
- Ensure components correctly display `user_id` and timestamp fields
- Verify that no undefined field errors occur

## Common Issues & Solutions

### Issue: "Property 'userId' does not exist"
**Solution**: Update the property name to `user_id`

### Issue: "Property 'createdAt' does not exist"
**Solution**: Update the property name to `created_at`

### Issue: API returns 400 Bad Request
**Solution**: Check that you're sending `user_id` instead of `userId`

### Issue: Components not displaying data
**Solution**: Verify that you're accessing the correct field names (`user_id`, `created_at`, etc.)

## Support

If you encounter any issues during the migration:

1. Check the browser console for error messages
2. Verify that all API calls use the new field names
3. Ensure TypeScript interfaces are updated
4. Test with a fresh browser session

## Summary

The migration from `userId` to `user_id` standardizes all database fields to use snake_case. This change affects:

- **API requests**: Use `user_id` instead of `userId`
- **API responses**: Expect `user_id`, `created_at`, `updated_at`
- **TypeScript interfaces**: Update all interfaces to use new field names
- **Form components**: Update form state and submission logic
- **Display components**: Update how data is accessed and displayed

By following this guide, you'll ensure a smooth transition to the new field naming convention.
