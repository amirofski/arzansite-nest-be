# 🏗️ Field Mapper Architecture Guide

## 📋 Overview

The `field-mapper.util.ts` is a comprehensive utility that ensures consistent field naming across your entire application. It automatically handles the mapping between `camelCase` (used in Appwrite models and frontend) and `snake_case` (used in database storage) field names.

## 🎯 Key Benefits

### 1. **Consistent Naming Convention**
- **Database**: Uses `snake_case` (e.g., `user_id`, `created_at`, `order_id`)
- **Appwrite Models**: Uses `camelCase` (e.g., `userId`, `createdAt`, `orderId`)
- **Automatic Mapping**: No manual field name conversion needed

### 2. **Clean Architecture**
- **Base Service Class**: `BaseAppwriteService` handles all field mapping automatically
- **Type Safety**: Full TypeScript support with proper types
- **Zero Duplication**: Single source of truth for field mappings

### 3. **Maintainability**
- **Centralized Mapping**: All field mappings in one place
- **Easy Updates**: Add new fields to the mapping object
- **Validation**: Built-in field validation and error handling

## 🏛️ Architecture Components

### 1. Field Mapper Utility (`src/common/utils/field-mapper.util.ts`)

```typescript
// Field mapping: camelCase → snake_case
export const FIELD_MAPPING = {
  // User fields
  userId: 'user_id',
  userid: 'user_id',
  
  // Date fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Order fields
  orderId: 'order_id',
  sessionId: 'session_id',
  siteType: 'site_type',
  
  // Payment fields
  paymentGateway: 'payment_gateway',
  zarinpalAuthority: 'zarinpal_authority',
  
  // ... and many more
} as const;
```

**Key Functions:**
- `mapAppwriteToDatabase()` - Convert camelCase to snake_case
- `mapDatabaseToAppwrite()` - Convert snake_case to camelCase
- `getDatabaseField()` - Get database field name
- `getAppwriteField()` - Get Appwrite field name
- `validateSnakeCaseFields()` - Validate required fields

### 2. Base Appwrite Service (`src/common/services/base-appwrite.service.ts`)

```typescript
@Injectable()
export abstract class BaseAppwriteService {
  protected abstract readonly collectionId: string;

  // Automatic field mapping for all operations
  protected async createDocument<T>(data: Record<string, any>): Promise<T>
  protected async getDocument<T>(documentId: string): Promise<T | null>
  protected async updateDocument<T>(documentId: string, data: Record<string, any>): Promise<T>
  protected async listDocuments<T>(queries: string[]): Promise<{ documents: T[]; total: number }>
  protected async findDocuments<T>(field: string, value: any): Promise<{ documents: T[]; total: number }>
}
```

**Features:**
- ✅ Automatic field mapping for all CRUD operations
- ✅ Type-safe operations with generics
- ✅ Built-in error handling
- ✅ Query optimization
- ✅ Validation support

### 3. Service Implementation Example

```typescript
@Injectable()
export class OrdersService extends BaseAppwriteService {
  protected readonly collectionId = 'orders';

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const orderData = {
      // Use camelCase - automatically converted to snake_case
      userId,
      title: createOrderDto.title,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Automatic mapping happens here
    return this.createDocument<Order>(orderData);
  }

  async getOrders(userId: string): Promise<Order[]> {
    // Automatic field mapping in queries
    const result = await this.findDocuments<Order>('userId', userId);
    return result.documents;
  }
}
```

## 🔄 Field Mapping Process

### 1. **Creating Documents**
```typescript
// Input (camelCase)
const data = {
  userId: 'user123',
  orderId: 'order456',
  createdAt: '2024-01-01T00:00:00Z'
};

// Automatic conversion to snake_case for database
const mappedData = mapAppwriteToDatabase(data);
// Result: { user_id: 'user123', order_id: 'order456', created_at: '2024-01-01T00:00:00Z' }
```

### 2. **Reading Documents**
```typescript
// Database returns snake_case
const dbData = {
  user_id: 'user123',
  order_id: 'order456',
  created_at: '2024-01-01T00:00:00Z'
};

// Automatic conversion to camelCase for response
const responseData = mapDatabaseToAppwrite(dbData);
// Result: { userId: 'user123', orderId: 'order456', createdAt: '2024-01-01T00:00:00Z' }
```

### 3. **Query Operations**
```typescript
// Use camelCase in code
await this.findDocuments('userId', 'user123');

// Automatically converted to snake_case for database query
// Query.equal('user_id', 'user123')
```

## 📊 Complete Field Mapping Reference

### User & Authentication
| camelCase | snake_case | Description |
|-----------|------------|-------------|
| `userId` | `user_id` | User identifier |
| `fullName` | `full_name` | User's full name |
| `firstName` | `first_name` | User's first name |
| `lastName` | `last_name` | User's last name |
| `phoneNumber` | `phone_number` | User's phone number |
| `createdAt` | `created_at` | Creation timestamp |
| `updatedAt` | `updated_at` | Last update timestamp |

### Orders & Business Logic
| camelCase | snake_case | Description |
|-----------|------------|-------------|
| `orderId` | `order_id` | Order identifier |
| `sessionId` | `session_id` | Session identifier |
| `siteType` | `site_type` | Type of website |
| `orderNumber` | `order_number` | Order number |
| `totalAmount` | `total_amount` | Total order amount |
| `paymentStatus` | `payment_status` | Payment status |
| `paymentGateway` | `payment_gateway` | Payment gateway used |

### Payment & Transactions
| camelCase | snake_case | Description |
|-----------|------------|-------------|
| `zarinpalAuthority` | `zarinpal_authority` | ZarinPal authority |
| `zarinpalRefId` | `zarinpal_ref_id` | ZarinPal reference ID |
| `zarinpalInvoiceId` | `zarinpal_invoice_id` | ZarinPal invoice ID |
| `transactionType` | `transaction_type` | Transaction type |
| `transactionId` | `transaction_id` | Transaction identifier |
| `balanceBefore` | `balance_before` | Balance before transaction |
| `balanceAfter` | `balance_after` | Balance after transaction |

### Design & Files
| camelCase | snake_case | Description |
|-----------|------------|-------------|
| `wizardData` | `wizard_data` | Wizard configuration data |
| `designSnapshot` | `design_snapshot` | Design snapshot |
| `designData` | `design_data` | Design data |
| `designPreviewUrl` | `design_preview_url` | Design preview URL |
| `designOptions` | `design_options` | Design options |
| `fileName` | `file_name` | File name |
| `originalName` | `original_name` | Original file name |
| `mimeType` | `mime_type` | MIME type |
| `bucketId` | `bucket_id` | Storage bucket ID |
| `fileId` | `file_id` | File identifier |

## 🚀 Usage Examples

### 1. **Creating a New Service**
```typescript
@Injectable()
export class ProfilesService extends BaseAppwriteService {
  protected readonly collectionId = 'profiles';

  async createProfile(userId: string, profileData: CreateProfileDto): Promise<Profile> {
    const data = {
      userId,
      fullName: profileData.fullName,
      email: profileData.email,
      phoneNumber: profileData.phoneNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.createDocument<Profile>(data);
  }

  async getProfileByUserId(userId: string): Promise<Profile | null> {
    return this.findDocument<Profile>('userId', userId);
  }
}
```

### 2. **Complex Queries**
```typescript
async getOrdersByStatus(userId: string, status: string): Promise<Order[]> {
  const queries = [
    Query.equal('user_id', userId),
    Query.equal('status', status),
    Query.orderDesc('created_at')
  ];

  const result = await this.listDocuments<Order>(queries);
  return result.documents;
}
```

### 3. **Validation**
```typescript
async createOrder(orderData: CreateOrderDto): Promise<Order> {
  // Validate required fields
  this.validateRequiredFields(orderData, ['userId', 'title', 'status']);
  
  return this.createDocument<Order>(orderData);
}
```

## 🔧 Automation Scripts

### 1. **Appwrite Schema Fixer** (`automate-appwrite-schema-fix.js`)
```bash
node automate-appwrite-schema-fix.js
```
- Removes duplicate/conflicting attributes
- Standardizes field names to snake_case
- Adds missing required fields
- Cleans up unused attributes

### 2. **Codebase Cleanup** (`cleanup-codebase.js`)
```bash
node cleanup-codebase.js
```
- Removes duplicate code
- Standardizes field names
- Merges similar files
- Cleans up imports
- Removes unused files

## 📈 Performance Benefits

### 1. **Reduced Code Duplication**
- Single field mapping definition
- Reusable base service class
- Consistent patterns across all services

### 2. **Type Safety**
- Full TypeScript support
- Compile-time error checking
- IntelliSense support

### 3. **Maintainability**
- Centralized field management
- Easy to add new fields
- Consistent naming across the application

### 4. **Error Prevention**
- Automatic field validation
- Built-in error handling
- Clear error messages

## 🎯 Best Practices

### 1. **Always Use the Base Service**
```typescript
// ✅ Good
export class MyService extends BaseAppwriteService {
  protected readonly collectionId = 'my_collection';
}

// ❌ Avoid
export class MyService {
  // Manual field mapping and database operations
}
```

### 2. **Use camelCase in Code**
```typescript
// ✅ Good
const data = { userId: '123', orderId: '456' };

// ❌ Avoid
const data = { user_id: '123', order_id: '456' };
```

### 3. **Add New Fields to Mapping**
```typescript
// ✅ Add to FIELD_MAPPING
export const FIELD_MAPPING = {
  // ... existing fields
  newField: 'new_field',
} as const;
```

### 4. **Validate Required Fields**
```typescript
// ✅ Always validate
this.validateRequiredFields(data, ['userId', 'title']);
```

## 🔍 Troubleshooting

### Common Issues

1. **Field Not Found Error**
   - Check if the field is in `FIELD_MAPPING`
   - Ensure the field exists in the database collection

2. **Type Errors**
   - Use proper TypeScript interfaces
   - Ensure field names match the mapping

3. **Build Errors**
   - Run `npm run build` to check for issues
   - Fix any TypeScript compilation errors

### Debug Mode
```typescript
// Enable debug logging
console.log('Original data:', data);
console.log('Mapped data:', mapAppwriteToDatabase(data));
```

## 📚 Related Documentation

- [Database Optimization Plan](./DATABASE_OPTIMIZATION_PLAN.md)
- [Frontend Migration Guide](./FRONTEND_DATABASE_OPTIMIZATION_GUIDE.md)
- [API Reference](./COMPREHENSIVE_API_GUIDE.md)
- [Authentication Guide](./FRONTEND_AUTHENTICATION_GUIDE.md)

---

This architecture ensures your codebase is clean, maintainable, and follows consistent patterns throughout the application. The field mapper utility eliminates the need for manual field name conversion and provides a robust foundation for all database operations.

