# Appwrite Database Update Guide - Wallet & Invoice Management System

## 🎯 **Overview**

This guide will help you update your Appwrite database to include the new collections required for the Wallet & Invoice Management System.

## 📋 **New Collections to Add**

### 1. **`invoices` Collection**
- **Purpose**: Store invoice data with status tracking
- **Key Features**: User invoices, order linking, payment status, due dates

### 2. **`receipts` Collection**
- **Purpose**: Digital receipt generation and storage
- **Key Features**: Invoice linking, RefId tracking, format support (PDF/HTML)

### 3. **`wallet_adjustments` Collection**
- **Purpose**: Admin balance adjustments with audit trail
- **Key Features**: Balance modifications, admin tracking, audit logging

## 🚀 **Quick Start (Recommended)**

### **Step 1: Run the Update Script**
```bash
npm run appwrite:update
```

This will automatically:
- ✅ Check if collections exist
- ✅ Create missing collections
- ✅ Set up all attributes and indexes
- ✅ Provide detailed progress logs

### **Step 2: Verify the Update**
```bash
npm run appwrite:test
```

## 🔧 **Manual Update Methods**

### **Method 1: Using the Update Script**

1. **Run the dedicated update script**:
   ```bash
   node update-appwrite-schema.js
   ```

2. **Check the output** for success messages:
   ```
   🎉 Schema update completed!
   ✅ Successfully processed: 3/3 collections
   ```

### **Method 2: Using the Full Schema Script**

1. **Run the complete schema migration**:
   ```bash
   npm run appwrite:migrate
   ```

2. **This will recreate all collections** (use with caution if you have existing data)

### **Method 3: Manual Appwrite Console**

If you prefer to create collections manually through the Appwrite Console:

#### **Collection 1: `invoices`**

**Basic Settings:**
- **Name**: `invoices`
- **Document Security**: `false`
- **Permissions**: Configure as needed

**Attributes:**
| Name | Type | Size | Required | Default | Array | Enum Values |
|------|------|------|----------|---------|-------|-------------|
| `user_id` | string | 36 | ✅ | - | ❌ | - |
| `order_id` | string | 36 | ✅ | - | ❌ | - |
| `amount` | double | - | ✅ | - | ❌ | - |
| `due_date` | datetime | - | ✅ | - | ❌ | - |
| `status` | string | 20 | ✅ | - | ❌ | pending, paid, overdue, cancelled |
| `description` | string | 500 | ❌ | - | ❌ | - |
| `created_at` | datetime | - | ✅ | - | ❌ | - |
| `updated_at` | datetime | - | ✅ | - | ❌ | - |

**Indexes:**
| Name | Type | Attributes | Orders |
|------|------|------------|--------|
| `user_id_idx` | key | user_id | ASC |
| `order_id_idx` | key | order_id | ASC |
| `status_idx` | key | status | ASC |
| `due_date_idx` | key | due_date | ASC |
| `created_at_idx` | key | created_at | DESC |

#### **Collection 2: `receipts`**

**Basic Settings:**
- **Name**: `receipts`
- **Document Security**: `false`
- **Permissions**: Configure as needed

**Attributes:**
| Name | Type | Size | Required | Default | Array | Enum Values |
|------|------|------|----------|---------|-------|-------------|
| `invoice_id` | string | 36 | ✅ | - | ❌ | - |
| `ref_id` | string | 100 | ✅ | - | ❌ | - |
| `amount` | double | - | ✅ | - | ❌ | - |
| `format` | string | 10 | ✅ | - | ❌ | pdf, html |
| `created_at` | datetime | - | ✅ | - | ❌ | - |
| `updated_at` | datetime | - | ✅ | - | ❌ | - |

**Indexes:**
| Name | Type | Attributes | Orders |
|------|------|------------|--------|
| `invoice_id_idx` | key | invoice_id | ASC |
| `ref_id_idx` | key | ref_id | ASC |
| `created_at_idx` | key | created_at | DESC |

#### **Collection 3: `wallet_adjustments`**

**Basic Settings:**
- **Name**: `wallet_adjustments`
- **Document Security**: `false`
- **Permissions**: Configure as needed

**Attributes:**
| Name | Type | Size | Required | Default | Array | Enum Values |
|------|------|------|----------|---------|-------|-------------|
| `wallet_id` | string | 36 | ✅ | - | ❌ | - |
| `admin_id` | string | 36 | ✅ | - | ❌ | - |
| `amount` | double | - | ✅ | - | ❌ | - |
| `type` | string | 20 | ✅ | - | ❌ | credit, debit, correction |
| `reason` | string | 500 | ✅ | - | ❌ | - |
| `notes` | string | 1000 | ❌ | - | ❌ | - |
| `balance_before` | double | - | ✅ | - | ❌ | - |
| `balance_after` | double | - | ✅ | - | ❌ | - |
| `created_at` | datetime | - | ✅ | - | ❌ | - |
| `updated_at` | datetime | - | ✅ | - | ❌ | - |

**Indexes:**
| Name | Type | Attributes | Orders |
|------|------|------------|--------|
| `wallet_id_idx` | key | wallet_id | ASC |
| `admin_id_idx` | key | admin_id | ASC |
| `type_idx` | key | type | ASC |
| `created_at_idx` | key | created_at | DESC |

## 🔧 **Environment Variables**

After creating the collections, ensure these environment variables are set in your `.env` file:

```bash
# New Collections for Wallet & Invoice Management
APPWRITE_COLLECTION_INVOICES=invoices
APPWRITE_COLLECTION_RECEIPTS=receipts
APPWRITE_COLLECTION_WALLET_ADJUSTMENTS=wallet_adjustments
```

## ✅ **Verification Steps**

### **1. Check Collection Creation**
```bash
# Run the test script
npm run appwrite:test

# Or check manually in Appwrite Console
# Go to Database → Your Database → Collections
```

### **2. Verify Attributes and Indexes**
In Appwrite Console:
1. **Navigate to each collection**
2. **Check Attributes tab** - verify all attributes exist
3. **Check Indexes tab** - verify all indexes are created

### **3. Test Application Startup**
```bash
npm run start:dev
```

Look for these log messages:
```
✅ Appwrite collections loaded successfully
✅ Wallet & Invoice Management System initialized
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Issue 1: Collection Already Exists**
```
ℹ️  Collection invoices already exists, skipping...
```
**Solution**: This is normal. The script skips existing collections.

#### **Issue 2: Permission Denied**
```
❌ Failed to create collection: Permission denied
```
**Solution**: 
1. Check your API key permissions
2. Ensure the API key has database write access
3. Verify project ID is correct

#### **Issue 3: Attribute Creation Failed**
```
❌ Failed to create string attribute user_id
```
**Solution**:
1. Wait a few seconds and retry
2. Check if the attribute already exists
3. Verify attribute configuration

#### **Issue 4: Index Creation Failed**
```
❌ Failed to create index user_id_idx
```
**Solution**:
1. Ensure all attributes are created first
2. Wait for attribute creation to complete
3. Check index configuration

### **Debug Mode**
For detailed debugging, run:
```bash
DEBUG=appwrite:* node update-appwrite-schema.js
```

## 📊 **Collection Relationships**

### **Data Flow Diagram**
```
users → wallets → transactions
  ↓
orders → invoices → receipts
  ↓
wallet_adjustments (admin operations)
```

### **Key Relationships**
- **`invoices.user_id`** → **`profiles.$id`**
- **`invoices.order_id`** → **`orders.$id`**
- **`receipts.invoice_id`** → **`invoices.$id`**
- **`wallet_adjustments.wallet_id`** → **`wallets.$id`**
- **`wallet_adjustments.admin_id`** → **`profiles.$id`**

## 🔒 **Security Considerations**

### **Collection Permissions**
- **`invoices`**: Users can read their own, admins can read all
- **`receipts`**: Users can read their own, admins can read all
- **`wallet_adjustments`**: Admin only (audit trail)

### **Data Validation**
- All monetary amounts use `double` type for precision
- Enum values restrict status and type fields
- Required fields prevent incomplete data

## 📈 **Performance Optimization**

### **Index Strategy**
- **User-based queries**: `user_id_idx`
- **Status filtering**: `status_idx`
- **Date-based queries**: `created_at_idx`, `due_date_idx`
- **Payment tracking**: `ref_id_idx`

### **Query Optimization**
- Use indexes for filtering and sorting
- Implement pagination for large datasets
- Cache frequently accessed data

## 🎯 **Next Steps**

After successful database update:

1. **Test the API endpoints**:
   ```bash
   # Test wallet endpoints
   curl -X GET http://localhost:3000/api/wallets/me \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

   # Test invoice endpoints
   curl -X POST http://localhost:3000/api/invoices \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"orderId":"test","amount":1000000,"dueDate":"2024-12-31T23:59:59.000Z"}'
   ```

2. **Monitor application logs** for any collection-related errors

3. **Verify scheduled tasks** are working properly

4. **Test admin functionality** for wallet adjustments

## 📚 **Related Documentation**

- [Wallet & Invoice API Documentation](./WALLET_INVOICE_API_DOCUMENTATION.md)
- [Scheduled Tasks Fix](./SCHEDULED_TASKS_FIX.md)
- [Comprehensive API Docs](./COMPREHENSIVE_API_DOCS.md)

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Ready for Production
