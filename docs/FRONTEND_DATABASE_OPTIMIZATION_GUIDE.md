# 🐍 Frontend Database Optimization Guide - Snake_Case Standardization

## 📋 Overview

This guide provides comprehensive instructions for frontend developers to work with the updated backend that now uses **snake_case** naming conventions throughout the entire application. All API endpoints, request/response data, and database fields now consistently use `snake_case` format.

## 🎯 Key Changes Made

### 1. **Naming Convention Standardization**
- **Before**: Mixed `camelCase` and `snake_case` (e.g., `userId`, `user_id`, `createdAt`, `created_at`)
- **After**: Consistent `snake_case` everywhere (e.g., `user_id`, `created_at`, `updated_at`)

### 2. **Database Schema Updates**
- All collections now use `user_id` instead of `userId`/`userid`
- All timestamp fields use `created_at`, `updated_at`, `completed_at`
- All relationship fields use `order_id`, `wallet_id`, `invoice_id`
- All descriptive fields use `full_name`, `site_type`, `payment_status`

### 3. **API Response Structure**
- All API responses now return data in `snake_case` format
- Frontend should expect and handle `snake_case` field names
- No more field name mapping required between frontend and backend

## 🔄 Frontend Migration Steps

### Step 1: Update Data Models and Interfaces

**Before (camelCase):**
```typescript
interface User {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderId: string;
  userId: string;
  title: string;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

**After (snake_case):**
```typescript
interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  order_id: string;
  user_id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  updated_at: string;
}
```

### Step 2: Update API Calls

**Before:**
```typescript
// Creating order
const orderData = {
  title: "Website Design",
  description: "Personal website",
  price: 1000000,
  userId: currentUser.id,
  siteType: "personal"
};

// API call
const response = await api.post('/orders', orderData);
```

**After:**
```typescript
// Creating order
const orderData = {
  title: "Website Design",
  description: "Personal website",
  price: 1000000,
  user_id: currentUser.id,
  site_type: "personal"
};

// API call
const response = await api.post('/orders', orderData);
```

### Step 3: Update Form Handling

**Before:**
```typescript
const [formData, setFormData] = useState({
  fullName: '',
  email: '',
  phone: '',
  address: ''
});

const handleSubmit = async () => {
  await api.put('/profile', {
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    address: formData.address
  });
};
```

**After:**
```typescript
const [formData, setFormData] = useState({
  full_name: '',
  email: '',
  phone: '',
  address: ''
});

const handleSubmit = async () => {
  await api.put('/profile', {
    full_name: formData.full_name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address
  });
};
```

### Step 4: Update Data Display

**Before:**
```typescript
return (
  <div>
    <h2>{user.fullName}</h2>
    <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
    <p>Last Updated: {new Date(user.updatedAt).toLocaleDateString()}</p>
  </div>
);
```

**After:**
```typescript
return (
  <div>
    <h2>{user.full_name}</h2>
    <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
    <p>Last Updated: {new Date(user.updated_at).toLocaleDateString()}</p>
  </div>
);
```

## 📊 Complete Field Mapping Reference

### User-Related Fields
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `userId` | `user_id` |
| `fullName` | `full_name` |
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `phoneNumber` | `phone_number` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### Order-Related Fields
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `orderId` | `order_id` |
| `siteType` | `site_type` |
| `paymentStatus` | `payment_status` |
| `totalAmount` | `total_amount` |
| `orderNumber` | `order_number` |
| `designData` | `design_data` |
| `designPreviewUrl` | `design_preview_url` |

### Payment-Related Fields
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `paymentGateway` | `payment_gateway` |
| `zarinpalAuthority` | `zarinpal_authority` |
| `zarinpalRefId` | `zarinpal_ref_id` |
| `callbackUrl` | `callback_url` |
| `returnUrl` | `return_url` |

### File-Related Fields
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `bucketId` | `bucket_id` |
| `fileName` | `file_name` |
| `originalName` | `original_name` |
| `mimeType` | `mime_type` |
| `fileId` | `file_id` |

## 🚀 Best Practices

### 1. **Consistent Naming**
- Always use `snake_case` for all field names
- Never mix `camelCase` and `snake_case` in the same component
- Use TypeScript interfaces to enforce naming consistency

### 2. **Data Transformation**
- No need to transform field names between frontend and backend
- API responses are already in the correct format
- Focus on business logic, not data formatting

### 3. **Error Handling**
- Update error handling to expect `snake_case` field names
- Validation errors will reference `snake_case` fields
- Update error messages accordingly

### 4. **Testing**
- Update all test data to use `snake_case` field names
- Mock API responses should use `snake_case` format
- Update test assertions to expect `snake_case` fields

## 🔧 Utility Functions

### Field Name Conversion (if needed for legacy code)
```typescript
// Convert camelCase to snake_case (for legacy code migration)
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case to camelCase (if needed for specific UI components)
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert entire object from camelCase to snake_case
export function objectToSnakeCase(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnakeCase(key)] = value;
  }
  return result;
}
```

## 📱 Component Examples

### User Profile Component
```typescript
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

const UserProfileComponent: React.FC<{ user: UserProfile }> = ({ user }) => {
  return (
    <div className="user-profile">
      <h2>{user.full_name}</h2>
      <p>Email: {user.email}</p>
      <p>Phone: {user.phone}</p>
      <p>Address: {user.address}</p>
      <p>Member since: {new Date(user.created_at).toLocaleDateString()}</p>
      <p>Last updated: {new Date(user.updated_at).toLocaleDateString()}</p>
    </div>
  );
};
```

### Order List Component
```typescript
interface Order {
  id: string;
  order_id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  status: string;
  payment_status: string;
  site_type: string;
  created_at: string;
  updated_at: string;
}

const OrderListComponent: React.FC<{ orders: Order[] }> = ({ orders }) => {
  return (
    <div className="order-list">
      {orders.map(order => (
        <div key={order.id} className="order-item">
          <h3>{order.title}</h3>
          <p>Status: {order.status}</p>
          <p>Payment: {order.payment_status}</p>
          <p>Type: {order.site_type}</p>
          <p>Price: {order.price.toLocaleString()} تومان</p>
          <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
```

## ⚠️ Important Notes

### 1. **Breaking Changes**
- This is a **breaking change** - existing frontend code will need updates
- All API calls must be updated to use `snake_case` field names
- Database queries and filters must use `snake_case` field names

### 2. **Migration Timeline**
- **Phase 1**: Update all TypeScript interfaces and types
- **Phase 2**: Update all API calls and data handling
- **Phase 3**: Update all UI components and forms
- **Phase 4**: Update tests and documentation
- **Phase 5**: Deploy and monitor for issues

### 3. **Rollback Plan**
- Keep backup of old code structure
- Database can be reverted using the backup scripts
- Frontend can be reverted to previous commit

## 🎉 Benefits After Migration

### 1. **Consistency**
- No more confusion about field naming conventions
- Consistent data structure across entire application
- Easier to maintain and debug

### 2. **Performance**
- No field name transformation overhead
- Direct mapping between frontend and backend
- Reduced data processing complexity

### 3. **Developer Experience**
- Clear naming conventions
- Easier onboarding for new developers
- Better code readability and maintainability

### 4. **API Clarity**
- Self-documenting API responses
- Consistent error message format
- Easier API integration for third parties

## 📞 Support

If you encounter any issues during the migration:

1. **Check the API documentation** for correct field names
2. **Review the field mapping reference** above
3. **Use TypeScript interfaces** to catch naming errors
4. **Test thoroughly** before deploying to production
5. **Contact the backend team** for any clarification

---

**Remember**: The goal is to have **100% consistency** in using `snake_case` throughout the entire application. This will make the codebase more maintainable and reduce confusion for all developers.
