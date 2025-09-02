# 🔧 Backend Update Task List - New Appwrite Database Structure

## 📋 **Overview**
This document contains a systematic list of tasks to update your NestJS backend to work with the new optimized Appwrite database structure. Each task should be completed in order to ensure proper functionality.

## 🚨 **Critical Notes Before Starting**

1. **Your old database structure is completely gone** - all collections have been replaced
2. **New collection IDs are different** - you must update all environment variables
3. **Field names now use snake_case** - camelCase fields no longer exist
4. **Some fields have been removed/renamed** - check the mapping below

## 🔄 **Phase 1: Environment & Configuration Updates**

### **Task 1.1: Update Environment Variables**
**File**: `.env` and `.env.example`
**Priority**: 🔴 CRITICAL

```env
# OLD VALUES (DELETE THESE)
APPWRITE_COLLECTION_USER_ROLES=user_roles
APPWRITE_COLLECTION_ORDERS=orders_old
APPWRITE_COLLECTION_PAYMENTS=payments_old
# ... any other old collection IDs

# NEW VALUES (ADD THESE)
APPWRITE_COLLECTION_USERS=users
APPWRITE_COLLECTION_ORDERS=orders
APPWRITE_COLLECTION_PAYMENTS=payments
APPWRITE_COLLECTION_WIZARD_SESSIONS=wizard_sessions
APPWRITE_COLLECTION_PROJECT_FILES=project_files
APPWRITE_COLLECTION_NOTIFICATIONS=notifications
APPWRITE_COLLECTION_USER_PROFILES=user_profiles
APPWRITE_COLLECTION_SUPPORT_TICKETS=support_tickets
APPWRITE_COLLECTION_AUDIT_LOGS=audit_logs
APPWRITE_COLLECTION_SYSTEM_SETTINGS=system_settings

# Storage Buckets
APPWRITE_STORAGE_PROJECT_FILES=project_files
APPWRITE_STORAGE_USER_AVATARS=user_avatars
APPWRITE_STORAGE_DESIGN_ASSETS=design_assets
```

**Status**: ⏳ PENDING
**Estimated Time**: 10 minutes

---

### **Task 1.2: Update Appwrite Configuration**
**File**: `src/appwrite/appwrite.config.ts`
**Priority**: 🔴 CRITICAL

**Changes Required**:
```typescript
// OLD
export const appwriteConfig = {
  collections: {
    userRoles: process.env.APPWRITE_COLLECTION_USER_ROLES,
    orders: process.env.APPWRITE_COLLECTION_ORDERS,
    // ... other old collections
  }
};

// NEW
export const appwriteConfig = {
  collections: {
    users: process.env.APPWRITE_COLLECTION_USERS,
    orders: process.env.APPWRITE_COLLECTION_ORDERS,
    payments: process.env.APPWRITE_COLLECTION_PAYMENTS,
    wizardSessions: process.env.APPWRITE_COLLECTION_WIZARD_SESSIONS,
    projectFiles: process.env.APPWRITE_COLLECTION_PROJECT_FILES,
    notifications: process.env.APPWRITE_COLLECTION_NOTIFICATIONS,
    userProfiles: process.env.APPWRITE_COLLECTION_USER_PROFILES,
    supportTickets: process.env.APPWRITE_COLLECTION_SUPPORT_TICKETS,
    auditLogs: process.env.APPWRITE_COLLECTION_AUDIT_LOGS,
    systemSettings: process.env.APPWRITE_COLLECTION_SYSTEM_SETTINGS,
  },
  storage: {
    projectFiles: process.env.APPWRITE_STORAGE_PROJECT_FILES,
    userAvatars: process.env.APPWRITE_STORAGE_USER_AVATARS,
    designAssets: process.env.APPWRITE_STORAGE_DESIGN_ASSETS,
  }
};
```

**Status**: ⏳ PENDING
**Estimated Time**: 15 minutes

---

## 🔄 **Phase 2: Core Service Updates**

### **Task 2.1: Update Auth Service**
**File**: `src/auth/auth.service.ts`
**Priority**: 🔴 CRITICAL

**Key Changes**:
1. **Remove user_roles collection dependency** - we now use Appwrite Auth labels directly
2. **Update getMe method** to work with new structure
3. **Update getUserRole method** to read from Appwrite Auth labels

**Code Changes**:
```typescript
// OLD - This won't work anymore
async getMe(user_id: string) {
  const userRoles = this.appwriteService.getUserRoles();
  const userRole = await userRoles.getDocument(
    appwriteConfig.collections.userRoles,
    user_id
  );
  return { id: user_id, role: userRole.role };
}

// NEW - Use Appwrite Auth labels directly
async getMe(user_id: string) {
  try {
    const users = this.appwriteService.getUsers();
    const user = await users.get(user_id);
    const hasAdminLabel = user.labels && user.labels.includes('admin');
    const role = hasAdminLabel ? 'admin' : 'user';
    return { id: user_id, role };
  } catch (error) {
    console.warn(`Failed to get user labels for ${user_id}:`, error.message);
    return { id: user_id, role: 'user' };
  }
}
```

**Status**: ⏳ PENDING
**Estimated Time**: 30 minutes

---

### **Task 2.2: Update Wizard Service**
**File**: `src/wizard/wizard.service.ts`
**Priority**: 🔴 CRITICAL

**Key Changes**:
1. **Update completeOrder method** to use new orders collection structure
2. **Remove old field names** that no longer exist
3. **Use new snake_case field names**
4. **Update collection ID reference**

**Code Changes**:
```typescript
// OLD - This will fail
const orderData = {
  order_user_id: mapped_user_id,        // ❌ Field doesn't exist
  orderNumber: order.order_number,      // ❌ Field doesn't exist
  website_framework: JSON.stringify(design_snapshot.websiteFramework), // ❌ Field doesn't exist
  // ... other old fields
};

// NEW - Use correct field names
const orderData = {
  user_id: mapped_user_id,              // ✅ Correct field name
  order_number: order.order_number,     // ✅ Correct field name
  title: order.title,                   // ✅ Correct field name
  description: order.description,       // ✅ Correct field name
  total_amount: order.priceTomans,     // ✅ Correct field name
  currency: 'IRR',                      // ✅ Correct field name
  status: 'pending',                    // ✅ Correct field name
  payment_status: 'pending',            // ✅ Correct field name
  site_type: order.site_type,           // ✅ Correct field name
  comments: order.comments,             // ✅ Correct field name
  session_id: session_id,               // ✅ Correct field name
  wizard_data: JSON.stringify(design_snapshot), // ✅ Store full design here
  created_at: new Date().toISOString(), // ✅ Correct field name
  updated_at: new Date().toISOString()  // ✅ Correct field name
};

// Update collection reference
const orderDoc = await this.appwriteService.getDatabases().createDocument(
  appwriteConfig.databaseId,
  appwriteConfig.collections.orders,    // ✅ Use new collection ID
  'unique()',
  orderData
);
```

**Status**: ⏳ PENDING
**Estimated Time**: 45 minutes

---

### **Task 2.3: Update Orders Service**
**File**: `src/orders/orders.service.ts`
**Priority**: 🟡 HIGH

**Key Changes**:
1. **Update all field references** to use snake_case
2. **Update collection ID references**
3. **Update query filters** to use new field names
4. **Update create/update methods**

**Code Changes**:
```typescript
// OLD
const order = await this.appwriteService.getDatabases().createDocument(
  appwriteConfig.databaseId,
  appwriteConfig.collections.orders_old,  // ❌ Old collection ID
  'unique()',
  {
    userId: user_id,                      // ❌ Old field name
    orderNumber: order_number,            // ❌ Old field name
    // ... other old fields
  }
);

// NEW
const order = await this.appwriteService.getDatabases().createDocument(
  appwriteConfig.databaseId,
  appwriteConfig.collections.orders,      // ✅ New collection ID
  'unique()',
  {
    user_id: user_id,                     // ✅ New field name
    order_number: order_number,           // ✅ New field name
    title: title,                         // ✅ New field name
    description: description,             // ✅ New field name
    total_amount: total_amount,           // ✅ New field name
    currency: currency,                   // ✅ New field name
    status: 'pending',                    // ✅ New field name
    payment_status: 'pending',            // ✅ New field name
    site_type: site_type,                // ✅ New field name
    created_at: new Date().toISOString(), // ✅ New field name
    updated_at: new Date().toISOString()  // ✅ New field name
  }
);
```

**Status**: ⏳ PENDING
**Estimated Time**: 40 minutes

---

### **Task 2.4: Update Payments Service**
**File**: `src/payments/payments.service.ts`
**Priority**: 🟡 HIGH

**Key Changes**:
1. **Update field names** to snake_case
2. **Update collection ID references**
3. **Update payment status handling**

**Status**: ⏳ PENDING
**Estimated Time**: 35 minutes

---

### **Task 2.5: Update User Profiles Service**
**File**: `src/profiles/profiles.service.ts`
**Priority**: 🟡 HIGH

**Key Changes**:
1. **Update to use new user_profiles collection**
2. **Update field names** to snake_case
3. **Update collection ID references**

**Status**: ⏳ PENDING
**Estimated Time**: 30 minutes

---

## 🔄 **Phase 3: Controller Updates**

### **Task 3.1: Update Auth Controller**
**File**: `src/auth/auth.controller.ts`
**Priority**: 🟡 HIGH

**Key Changes**:
1. **Update response handling** for new user structure
2. **Update error handling** for new authentication flow

**Status**: ⏳ PENDING
**Estimated Time**: 20 minutes

---

### **Task 3.2: Update Wizard Controller**
**File**: `src/wizard/wizard.controller.ts`
**Priority**: 🟡 HIGH

**Key Changes**:
1. **Update request validation** for new field names
2. **Update response handling** for new order structure

**Status**: ⏳ PENDING
**Estimated Time**: 25 minutes

---

### **Task 3.3: Update Orders Controller**
**File**: `src/orders/orders.controller.ts`
**Priority**: 🟡 HIGH

**Key Changes**:
1. **Update DTOs** to use new field names
2. **Update response handling** for new order structure

**Status**: ⏳ PENDING
**Estimated Time**: 30 minutes

---

## 🔄 **Phase 4: DTO & Interface Updates**

### **Task 4.1: Update Order DTOs**
**Files**: 
- `src/orders/dto/create-order.dto.ts`
- `src/orders/dto/update-order.dto.ts`
- `src/orders/dto/order.dto.ts`

**Priority**: 🟡 HIGH

**Key Changes**:
1. **Rename all fields** to snake_case
2. **Update validation rules** for new field requirements
3. **Remove old fields** that no longer exist

**Example Changes**:
```typescript
// OLD
export class CreateOrderDto {
  @IsString()
  orderNumber: string;           // ❌ Old field name
  
  @IsString()
  userId: string;                // ❌ Old field name
  
  @IsNumber()
  totalAmount: number;           // ❌ Old field name
}

// NEW
export class CreateOrderDto {
  @IsString()
  order_number: string;          // ✅ New field name
  
  @IsString()
  user_id: string;               // ✅ New field name
  
  @IsNumber()
  total_amount: number;          // ✅ New field name
  
  @IsString()
  title: string;                 // ✅ New required field
  
  @IsString()
  description: string;           // ✅ New required field
  
  @IsString()
  site_type: string;             // ✅ New required field
}
```

**Status**: ⏳ PENDING
**Estimated Time**: 45 minutes

---

### **Task 4.2: Update Payment DTOs**
**Files**: 
- `src/payments/dto/create-payment.dto.ts`
- `src/payments/dto/update-payment.dto.ts`

**Priority**: 🟡 HIGH

**Status**: ⏳ PENDING
**Estimated Time**: 30 minutes

---

### **Task 4.3: Update User Profile DTOs**
**Files**: 
- `src/profiles/dto/create-profile.dto.ts`
- `src/profiles/dto/update-profile.dto.ts`

**Priority**: 🟡 HIGH

**Status**: ⏳ PENDING
**Estimated Time**: 25 minutes

---

## 🔄 **Phase 5: Testing & Validation**

### **Task 5.1: Test Authentication Flow**
**Priority**: 🔴 CRITICAL

**Test Steps**:
1. Test user registration
2. Test user login
3. Test `/api/auth/me` endpoint
4. Verify role detection works with Appwrite labels

**Status**: ⏳ PENDING
**Estimated Time**: 30 minutes

---

### **Task 5.2: Test Wizard Flow**
**Priority**: 🔴 CRITICAL

**Test Steps**:
1. Test wizard session creation
2. Test order completion
3. Verify order is saved to new database structure
4. Test order retrieval from dashboard

**Status**: ⏳ PENDING
**Estimated Time**: 45 minutes

---

### **Task 5.3: Test Order Management**
**Priority**: 🟡 HIGH

**Test Steps**:
1. Test order creation
2. Test order updates
3. Test order queries
4. Verify all field names work correctly

**Status**: ⏳ PENDING
**Estimated Time**: 40 minutes

---

## 🔄 **Phase 6: Cleanup & Optimization**

### **Task 6.1: Remove Old Code**
**Priority**: 🟢 MEDIUM

**Files to Clean**:
1. Remove references to old collections
2. Remove unused imports
3. Remove deprecated methods
4. Clean up old DTOs

**Status**: ⏳ PENDING
**Estimated Time**: 20 minutes

---

### **Task 6.2: Update Documentation**
**Priority**: 🟢 MEDIUM

**Files to Update**:
1. Update API documentation
2. Update README files
3. Update inline code comments

**Status**: ⏳ PENDING
**Estimated Time**: 30 minutes

---

## 📊 **Task Summary**

### **Total Tasks**: 25
### **Critical Priority**: 5 tasks
### **High Priority**: 12 tasks  
### **Medium Priority**: 8 tasks

### **Estimated Total Time**: 8-10 hours

## 🚨 **Critical Path (Must Complete First)**

1. **Task 1.1** - Update Environment Variables
2. **Task 1.2** - Update Appwrite Configuration  
3. **Task 2.1** - Update Auth Service
4. **Task 2.2** - Update Wizard Service
5. **Task 5.1** - Test Authentication Flow

## 📋 **Progress Tracking**

Use this section to track your progress:

- [ ] **Phase 1**: Environment & Configuration Updates
- [ ] **Phase 2**: Core Service Updates  
- [ ] **Phase 3**: Controller Updates
- [ ] **Phase 4**: DTO & Interface Updates
- [ ] **Phase 5**: Testing & Validation
- [ ] **Phase 6**: Cleanup & Optimization

## 🎯 **Success Criteria**

You'll know you're done when:
- ✅ All API endpoints return 200/201 responses
- ✅ Authentication works with Appwrite labels
- ✅ Wizard can complete orders successfully
- ✅ Orders are saved to new database structure
- ✅ Dashboard can display user orders
- ✅ No more "collection not found" errors

## 🆘 **Need Help?**

If you encounter issues:
1. Check the error messages carefully
2. Verify collection IDs match exactly
3. Ensure field names use snake_case
4. Check that required fields are provided
5. Review the new database schema in `FINAL_OPTIMIZATION_REPORT.md`

---

**Good luck with your backend update! 🚀**
