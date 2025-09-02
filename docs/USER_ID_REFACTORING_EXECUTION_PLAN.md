# 🎯 Complete User_ID Refactoring Execution Plan

## 📋 Overview

This document outlines the complete process to refactor your entire codebase and Appwrite database to use `user_id` (snake_case) consistently instead of `userId` (camelCase). This will eliminate the current dual-naming conflicts and establish a clean, maintainable schema.

## 🚀 Why `user_id` is More Logical

### **Database Standards**
- **PostgreSQL/MySQL**: Use snake_case by default
- **Appwrite**: Internal APIs and examples often use snake_case
- **Consistency**: Your current database already has many snake_case fields

### **Current Problems Solved**
- ❌ Eliminates `userId` vs `user_id` conflicts
- ❌ Removes data inconsistency
- ❌ Simplifies queries and maintenance
- ❌ Provides clear, explicit field naming

## 🔧 Implementation Steps

### **Phase 1: Database Refactoring** ⚠️ **CRITICAL - BACKUP FIRST!**

#### Step 1.1: Create Database Backup
```bash
# Before proceeding, ensure you have a complete backup of your Appwrite database
# This is a destructive operation that cannot be undone!
```

#### Step 1.2: Run Database Refactoring Script
```bash
node refactor-to-user-id.js
```

**What this script does:**
- ✅ Adds `user_id` field to all collections that need it
- ✅ Copies data from `userId`/`userid` to `user_id`
- ✅ Removes old `userId`/`userid` fields
- ✅ Standardizes all field names to snake_case
- ✅ Updates all existing documents

**Collections processed:**
- `profiles`, `orders`, `wallets`, `transactions`, `designs`
- `email_logs`, `email_verifications`, `receipts`, `invoices`
- `wallet_adjustments`, `wizard_orders`, `domain_extensions`
- `project_files`, `password_resets`, `support_tickets`
- `notifications`, `notification_preferences`

### **Phase 2: Codebase Refactoring**

#### Step 2.1: Run Codebase Refactoring Script
```bash
node refactor-codebase-to-user-id.js
```

**What this script does:**
- ✅ Updates all TypeScript/JavaScript files
- ✅ Changes `userId` → `user_id` throughout codebase
- ✅ Updates all related field names to snake_case
- ✅ Processes `src/`, `test/`, and `scripts/` directories

**Files affected:**
- All `.ts`, `.js`, `.json`, `.md` files
- Excludes `node_modules`, `.git`, `dist`, `build`

### **Phase 3: Manual Updates & Verification**

#### Step 3.1: Update DTOs and Interfaces
```typescript
// Before (camelCase)
export interface UserDto {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// After (snake_case)
export interface UserDto {
  user_id: string;
  created_at: Date;
  updated_at: Date;
}
```

#### Step 3.2: Update Service Methods
```typescript
// Before
async getUserById(userId: string): Promise<User> {
  return this.findUser({ userId });
}

// After
async getUserById(user_id: string): Promise<User> {
  return this.findUser({ user_id });
}
```

#### Step 3.3: Update Database Queries
```typescript
// Before
Query.equal('userId', userId)

// After
Query.equal('user_id', user_id)
```

## 📊 Field Mapping Reference

### **User Identification**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `userId` | `user_id` |
| `userid` | `user_id` |

### **Timestamps**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `completedAt` | `completed_at` |
| `lastAccessed` | `last_accessed` |

### **Order Related**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `orderId` | `order_id` |
| `sessionId` | `session_id` |
| `siteType` | `site_type` |

### **Payment Related**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `paymentGateway` | `payment_gateway` |
| `zarinpalAuthority` | `zarinpal_authority` |
| `zarinpalRefId` | `zarinpal_ref_id` |

### **Design Related**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `wizardData` | `wizard_data` |
| `designSnapshot` | `design_snapshot` |
| `callbackUrl` | `callback_url` |
| `returnUrl` | `return_url` |
| `websiteFramework` | `website_framework` |
| `additionalServices` | `additional_services` |
| `projectFiles` | `project_files` |

### **Amount and Pricing**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `totalAmount` | `total_amount` |

### **Wallet Related**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `walletId` | `wallet_id` |

### **Profile Related**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `fullName` | `full_name` |

### **File Related**
| Old (camelCase) | New (snake_case) |
|------------------|------------------|
| `fileName` | `file_name` |
| `originalName` | `original_name` |
| `mimeType` | `mime_type` |
| `bucketId` | `bucket_id` |
| `fileId` | `file_id` |

## 🚨 Critical Considerations

### **Before Running Scripts**
1. **BACKUP YOUR DATABASE** - This is irreversible!
2. **Stop your application** - Prevent data corruption
3. **Test on staging** - Never run this on production first
4. **Review the scripts** - Understand what they do

### **After Running Scripts**
1. **Verify data integrity** - Check that all data was preserved
2. **Test all functionality** - Ensure nothing is broken
3. **Update frontend code** - Match the new field names
4. **Monitor for issues** - Watch for any problems

## 📋 Execution Checklist

### **Pre-Execution**
- [ ] Complete database backup created
- [ ] Application stopped
- [ ] Staging environment ready for testing
- [ ] Team notified of maintenance window

### **Database Refactoring**
- [ ] Run `node refactor-to-user-id.js`
- [ ] Verify all collections updated
- [ ] Check data integrity
- [ ] Confirm old fields removed

### **Codebase Refactoring**
- [ ] Run `node refactor-codebase-to-user-id.js`
- [ ] Review all file changes
- [ ] Fix any manual edge cases
- [ ] Update hardcoded references

### **Testing & Verification**
- [ ] Run test suite
- [ ] Manual testing of all features
- [ ] Database queries verification
- [ ] API endpoint testing

### **Deployment**
- [ ] Deploy to staging
- [ ] Full functionality testing
- [ ] Deploy to production
- [ ] Monitor for issues

## 🎯 Expected Results

### **Database**
- ✅ All collections use `user_id` consistently
- ✅ No more `userId`/`user_id` conflicts
- ✅ All field names standardized to snake_case
- ✅ Data integrity preserved

### **Codebase**
- ✅ All TypeScript files updated
- ✅ Consistent field naming throughout
- ✅ No more dual-naming confusion
- ✅ Cleaner, more maintainable code

### **Performance**
- ✅ Eliminated duplicate field queries
- ✅ Consistent indexing strategy
- ✅ Better query performance
- ✅ Reduced storage overhead

## 🔄 Rollback Plan

### **If Database Refactoring Fails**
1. Restore from backup
2. Investigate error logs
3. Fix any issues
4. Retry refactoring

### **If Codebase Refactoring Fails**
1. Use git to revert changes
2. Fix any broken files manually
3. Retry refactoring with fixes

### **If Issues Arise After Deployment**
1. Monitor error logs
2. Identify affected areas
3. Apply targeted fixes
4. Consider partial rollback if needed

## 📞 Support & Troubleshooting

### **Common Issues**
- **Field not found errors**: Check if field was properly renamed
- **Type errors**: Verify TypeScript interfaces updated
- **Query failures**: Ensure database queries use new field names

### **Getting Help**
- Review the refactoring scripts for details
- Check Appwrite console for collection status
- Run analysis script to verify current state
- Contact development team for assistance

---

## 🎉 Success Criteria

**The refactoring is successful when:**
1. ✅ All collections use `user_id` consistently
2. ✅ No `userId` fields remain in database
3. ✅ All TypeScript code compiles without errors
4. ✅ All functionality works as expected
5. ✅ Performance is maintained or improved
6. ✅ No data loss occurred

---

*This refactoring will transform your codebase from a mixed-naming convention system into a clean, consistent, and maintainable architecture that follows database engineering best practices.*

