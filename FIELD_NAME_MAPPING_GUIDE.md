# 🔄 Field Name Mapping Guide - Old to New Database Structure

## 📋 **Overview**
This guide shows the mapping between your old database fields and the new optimized structure. Use this as a quick reference when updating your NestJS backend code.

## 🚨 **Important Notes**

- **All new fields use snake_case naming**
- **Old camelCase fields no longer exist**
- **Some fields have been removed or consolidated**
- **New required fields must be provided**

## 🔄 **Orders Collection Mapping**

### **Core Fields (Required)**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `orderNumber` | `order_number` | string | ✅ | Order identifier |
| `userId` | `user_id` | string | ✅ | Links to Appwrite Auth user |
| `totalAmount` | `total_amount` | integer | ✅ | Price in Tomans |
| `status` | `status` | string | ✅ | Order status |
| `paymentStatus` | `payment_status` | string | ✅ | Payment status |
| `siteType` | `site_type` | string | ✅ | Website type |

### **New Required Fields**
| New Field | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | ✅ | Order title (e.g., "وب‌سایت شخصی") |
| `description` | string | ✅ | Order description |
| `currency` | string | ✅ | Currency code (default: "IRR") |
| `created_at` | datetime | ✅ | Creation timestamp |
| `updated_at` | datetime | ✅ | Last update timestamp |

### **Optional Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `comments` | `comments` | string | ❌ | User comments |
| `sessionId` | `session_id` | string | ❌ | Wizard session reference |
| `wizardData` | `wizard_data` | string | ❌ | Full design snapshot (JSON) |

### **Removed Fields (No Longer Exist)**
| Old Field | Reason |
|-----------|--------|
| `websiteFramework` | Consolidated into `wizard_data` |
| `additionalServices` | Consolidated into `wizard_data` |
| `branding` | Consolidated into `wizard_data` |
| `domains` | Consolidated into `wizard_data` |
| `pricing` | Consolidated into `wizard_data` |
| `paymentOptions` | Consolidated into `wizard_data` |

## 🔄 **Payments Collection Mapping**

### **Core Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `orderId` | `order_id` | string | ✅ | Links to order |
| `userId` | `user_id` | string | ✅ | Links to user |
| `amount` | `amount` | integer | ✅ | Payment amount |
| `currency` | `currency` | string | ✅ | Payment currency |
| `status` | `status` | string | ✅ | Payment status |

### **Gateway Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `paymentGateway` | `payment_gateway` | string | ✅ | Gateway name |
| `gatewayTransactionId` | `gateway_transaction_id` | string | ❌ | Gateway transaction ID |
| `gatewayAuthority` | `gateway_authority` | string | ❌ | Gateway authority |
| `gatewayRefId` | `gateway_ref_id` | string | ❌ | Gateway reference ID |

### **Timestamps**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `createdAt` | `created_at` | datetime | ✅ | Creation timestamp |
| `updatedAt` | `updated_at` | datetime | ✅ | Last update timestamp |
| `paidAt` | `paid_at` | datetime | ❌ | Payment completion time |

## 🔄 **Wizard Sessions Collection Mapping**

### **Core Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `sessionId` | `session_id` | string | ✅ | Session identifier |
| `userId` | `user_id` | string | ❌ | User ID (can be null) |
| `currentStep` | `current_step` | string | ✅ | Current wizard step |
| `isCompleted` | `is_completed` | boolean | ✅ | Session completion status |

### **Data Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `designData` | `design_data` | string | ❌ | Design progress (JSON) |
| `progressData` | `progress_data` | string | ❌ | Wizard progress (JSON) |

### **Timestamps**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `lastActivity` | `last_activity` | datetime | ✅ | Last activity time |
| `createdAt` | `created_at` | datetime | ✅ | Creation timestamp |
| `updatedAt` | `updated_at` | datetime | ✅ | Last update timestamp |

## 🔄 **User Profiles Collection Mapping**

### **Core Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `userId` | `user_id` | string | ✅ | Links to Appwrite Auth user |

### **Profile Information**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `companyName` | `company_name` | string | ❌ | Company name |
| `jobTitle` | `job_title` | string | ❌ | Job title |
| `bio` | `bio` | string | ❌ | User biography |
| `website` | `website` | string | ❌ | Personal website |
| `location` | `location` | string | ❌ | User location |
| `socialLinks` | `social_links` | string | ❌ | Social media links (JSON) |

### **Timestamps**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `createdAt` | `created_at` | datetime | ✅ | Creation timestamp |
| `updatedAt` | `updated_at` | datetime | ✅ | Last update timestamp |

## 🔄 **Notifications Collection Mapping**

### **Core Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `userId` | `user_id` | string | ✅ | Target user |
| `title` | `title` | string | ✅ | Notification title |
| `message` | `message` | string | ✅ | Notification message |
| `type` | `type` | string | ✅ | Notification type |

### **Status Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `isRead` | `is_read` | boolean | ✅ | Read status |
| `priority` | `priority` | string | ✅ | Priority level |

### **Optional Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `actionUrl` | `action_url` | string | ❌ | Action URL |
| `readAt` | `read_at` | datetime | ❌ | Read timestamp |

### **Timestamps**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `createdAt` | `created_at` | datetime | ✅ | Creation timestamp |
| `updatedAt` | `updated_at` | datetime | ✅ | Last update timestamp |

## 🔄 **Project Files Collection Mapping**

### **Core Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `userId` | `user_id` | string | ✅ | File owner |
| `orderId` | `order_id` | string | ❌ | Associated order |
| `fileName` | `file_name` | string | ✅ | File name |
| `filePath` | `file_path` | string | ✅ | File path |
| `fileType` | `file_type` | string | ✅ | File type |
| `fileSize` | `file_size` | integer | ✅ | File size in bytes |
| `mimeType` | `mime_type` | string | ✅ | MIME type |
| `storageBucket` | `storage_bucket` | string | ✅ | Storage bucket name |

### **Status Fields**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `status` | `status` | string | ✅ | File status |

### **Timestamps**
| Old Field | New Field | Type | Required | Notes |
|-----------|-----------|------|----------|-------|
| `createdAt` | `created_at` | datetime | ✅ | Creation timestamp |
| `updatedAt` | `updated_at` | datetime | ✅ | Last update timestamp |

## 🔄 **Code Examples**

### **Creating an Order (Before)**
```typescript
// OLD - This will fail
const orderData = {
  orderNumber: "WD-2025-001",
  userId: user_id,
  totalAmount: 4700000,
  websiteFramework: JSON.stringify(design.websiteFramework),
  additionalServices: JSON.stringify(design.additionalServices),
  branding: JSON.stringify(design.branding)
};
```

### **Creating an Order (After)**
```typescript
// NEW - This will work
const orderData = {
  order_number: "WD-2025-001",
  user_id: user_id,
  title: "وب‌سایت شخصی",
  description: "پروژه ذخیره شده",
  total_amount: 4700000,
  currency: "IRR",
  status: "pending",
  payment_status: "pending",
  site_type: "personal",
  wizard_data: JSON.stringify(design), // Store entire design here
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

### **Querying Orders (Before)**
```typescript
// OLD - This will fail
const orders = await databases.listDocuments(
  databaseId,
  collectionId,
  [databases.queries.equal('userId', user_id)]
);
```

### **Querying Orders (After)**
```typescript
// NEW - This will work
const orders = await databases.listDocuments(
  databaseId,
  collectionId,
  [databases.queries.equal('user_id', user_id)]
);
```

## 🚨 **Common Mistakes to Avoid**

1. **❌ Using camelCase field names** - All fields must be snake_case
2. **❌ Missing required fields** - New required fields must be provided
3. **❌ Using old collection IDs** - Update all collection references
4. **❌ Storing complex data in separate fields** - Use `wizard_data` for design snapshots
5. **❌ Forgetting timestamps** - `created_at` and `updated_at` are required

## ✅ **Quick Checklist**

Before testing your API, ensure:
- [ ] All field names use snake_case
- [ ] All required fields are provided
- [ ] Collection IDs are updated
- [ ] Timestamps are included
- [ ] Complex data is stored in `wizard_data`

---

**Use this guide alongside the `BACKEND_UPDATE_TASK_LIST.md` for a complete backend update! 🚀**
