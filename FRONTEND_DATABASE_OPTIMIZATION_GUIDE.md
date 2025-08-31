# Frontend Database Optimization Migration Guide

## Overview

This guide outlines the changes needed on the frontend after completing the Appwrite database optimization. The optimization has standardized the database schema to use **camelCase** naming conventions and removed duplicate/unused collections and attributes.

## 🚨 Important Changes

### 1. Collection Names Updated

Some collections have been renamed or removed for better organization:

| Old Collection Name | New Status | Action Required |
|-------------------|------------|-----------------|
| `design_data` | ❌ Removed | Update to use `designs` collection |
| `payment_transactions` | ❌ Removed | Update to use `transactions` collection |
| `email_verification_logs` | ❌ Removed | Update to use `email_logs` collection |
| `enhanced_orders` | ❌ Removed | Update to use `orders` collection |
| `enhanced_wallet_transactions` | ❌ Removed | Update to use `transactions` collection |
| `order_progress` | ❌ Removed | Update to use `wizard_orders` collection |

### 2. Field Naming Standardization

All database fields now use **camelCase** consistently. The following fields have been updated:

#### Orders Collection
```typescript
// OLD (snake_case) - REMOVED
{
  user_id: string,
  created_at: string,
  updated_at: string,
  total_amount: number
}

// NEW (camelCase) - USE THESE
{
  userId: string,
  createdAt: string,
  updatedAt: string,
  totalAmount: number
}
```

#### Profiles Collection
```typescript
// OLD (snake_case) - REMOVED
{
  user_id: string,
  full_name: string,
  phone: string,
  address: string,
  created_at: string,
  updated_at: string
}

// NEW (camelCase) - USE THESE
{
  userId: string,
  fullName: string,
  phone: string,
  address: string,
  createdAt: string,
  updatedAt: string
}
```

#### Wallets Collection
```typescript
// OLD (snake_case) - REMOVED
{
  user_id: string,
  balance: number,
  created_at: string,
  updated_at: string
}

// NEW (camelCase) - USE THESE
{
  userId: string,
  balance: number,
  createdAt: string,
  updatedAt: string
}
```

#### Transactions Collection
```typescript
// OLD (snake_case) - REMOVED
{
  user_id: string,
  wallet_id: string,
  type: string,
  amount: number,
  description: string,
  status: string,
  metadata: object,
  created_at: string
}

// NEW (camelCase) - USE THESE
{
  userId: string,
  walletId: string,
  type: string,
  amount: number,
  description: string,
  status: string,
  metadata: object,
  createdAt: string
}
```

### 3. New Required Fields Added

The `orders` collection now includes these additional fields:

```typescript
interface Order {
  // ... existing fields ...
  designSnapshot?: string;        // Design data snapshot
  callbackUrl?: string;           // Payment callback URL
  returnUrl?: string;             // Payment return URL
  websiteFramework?: string;      // Framework used
  additionalServices?: string;    // Additional services JSON
  domains?: string;               // Domain information JSON
  pricing?: string;               // Pricing details JSON
}
```

## 🔧 Required Frontend Updates

### 1. Update API Calls

#### Before (using old collection names)
```typescript
// ❌ OLD - Don't use these anymore
const designData = await appwrite.databases.listDocuments(
  databaseId,
  'design_data',  // This collection was removed
  queries
);

const paymentTx = await appwrite.databases.listDocuments(
  databaseId,
  'payment_transactions',  // This collection was removed
  queries
);
```

#### After (using new collection names)
```typescript
// ✅ NEW - Use these collections
const designs = await appwrite.databases.listDocuments(
  databaseId,
  'designs',  // Updated collection name
  queries
);

const transactions = await appwrite.databases.listDocuments(
  databaseId,
  'transactions',  // Updated collection name
  queries
);
```

### 2. Update TypeScript Interfaces

#### Before
```typescript
// ❌ OLD - Remove these interfaces
interface OldOrder {
  user_id: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
}

interface OldProfile {
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}
```

#### After
```typescript
// ✅ NEW - Use these interfaces
interface Order {
  userId: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  // ... other fields
}

interface Profile {
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  // ... other fields
}
```

### 3. Update Form Fields

#### Before
```typescript
// ❌ OLD - Remove these field names
const formData = {
  user_id: userId,
  full_name: fullName,
  phone: phone,
  address: address
};
```

#### After
```typescript
// ✅ NEW - Use these field names
const formData = {
  userId: userId,
  fullName: fullName,
  phone: phone,
  address: address
};
```

### 4. Update Query Filters

#### Before
```typescript
// ❌ OLD - Remove these field names
const queries = [
  Query.equal('user_id', userId),
  Query.orderDesc('created_at')
];
```

#### After
```typescript
// ✅ NEW - Use these field names
const queries = [
  Query.equal('userId', userId),
  Query.orderDesc('createdAt')
];
```

### 5. Update Response Handling

#### Before
```typescript
// ❌ OLD - Remove these field mappings
const order = {
  id: doc.$id,
  userId: doc.user_id,        // OLD
  createdAt: doc.created_at,  // OLD
  updatedAt: doc.updated_at,  // OLD
  totalAmount: doc.total_amount // OLD
};
```

#### After
```typescript
// ✅ NEW - Use these field mappings
const order = {
  id: doc.$id,
  userId: doc.userId,         // NEW
  createdAt: doc.createdAt,   // NEW
  updatedAt: doc.updatedAt,   // NEW
  totalAmount: doc.totalAmount // NEW
};
```

## 📋 Migration Checklist

### Phase 1: Update Collection References
- [ ] Replace `design_data` with `designs`
- [ ] Replace `payment_transactions` with `transactions`
- [ ] Replace `email_verification_logs` with `email_logs`
- [ ] Replace `enhanced_orders` with `orders`
- [ ] Replace `enhanced_wallet_transactions` with `transactions`
- [ ] Replace `order_progress` with `wizard_orders`

### Phase 2: Update Field Names
- [ ] Update all `user_id` to `userId`
- [ ] Update all `created_at` to `createdAt`
- [ ] Update all `updated_at` to `updatedAt`
- [ ] Update all `full_name` to `fullName`
- [ ] Update all `total_amount` to `totalAmount`
- [ ] Update all `wallet_id` to `walletId`
- [ ] Update all `order_id` to `orderId`
- [ ] Update all `invoice_id` to `invoiceId`

### Phase 3: Update API Calls
- [ ] Update all database queries
- [ ] Update all form submissions
- [ ] Update all response mappings
- [ ] Update all TypeScript interfaces

### Phase 4: Testing
- [ ] Test user registration/login
- [ ] Test order creation
- [ ] Test profile updates
- [ ] Test wallet operations
- [ ] Test transaction history
- [ ] Test design management

## 🧪 Testing Recommendations

### 1. Unit Tests
```typescript
// Test that new field names are used
describe('Order Interface', () => {
  it('should use camelCase field names', () => {
    const order: Order = {
      userId: 'test-user',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      totalAmount: 1000
    };
    
    expect(order.userId).toBeDefined();
    expect(order.createdAt).toBeDefined();
    expect(order.updatedAt).toBeDefined();
    expect(order.totalAmount).toBeDefined();
  });
});
```

### 2. Integration Tests
```typescript
// Test API calls with new collection names
describe('API Integration', () => {
  it('should fetch designs from correct collection', async () => {
    const designs = await appwrite.databases.listDocuments(
      databaseId,
      'designs', // Should use new collection name
      []
    );
    
    expect(designs).toBeDefined();
  });
});
```

### 3. E2E Tests
```typescript
// Test complete user flows
describe('User Flow', () => {
  it('should create order with new field names', async () => {
    // Test complete order creation flow
    // Ensure all new fields are properly handled
  });
});
```

## 🚨 Common Issues & Solutions

### Issue 1: Field Not Found Errors
```typescript
// ❌ Error: Field 'user_id' not found
Query.equal('user_id', userId)

// ✅ Solution: Use new field name
Query.equal('userId', userId)
```

### Issue 2: Collection Not Found Errors
```typescript
// ❌ Error: Collection 'design_data' not found
appwrite.databases.listDocuments(databaseId, 'design_data', [])

// ✅ Solution: Use new collection name
appwrite.databases.listDocuments(databaseId, 'designs', [])
```

### Issue 3: Type Mismatch Errors
```typescript
// ❌ Error: Type 'string' is not assignable to type 'undefined'
interface OldInterface {
  user_id?: string; // OLD
}

// ✅ Solution: Use new interface
interface NewInterface {
  userId: string; // NEW - required field
}
```

## 📚 Additional Resources

- [Appwrite Database API Reference](https://appwrite.io/docs/references/cloud/databases)
- [Appwrite Query Builder](https://appwrite.io/docs/references/cloud/databases/query)
- [TypeScript Interface Documentation](https://www.typescriptlang.org/docs/handbook/interfaces.html)

## 🆘 Support

If you encounter issues during migration:

1. Check the browser console for error messages
2. Verify collection names in Appwrite console
3. Confirm field names in database schema
4. Review API response structure
5. Contact the backend team for assistance

---

**Remember**: Always test thoroughly in a development environment before deploying to production!
