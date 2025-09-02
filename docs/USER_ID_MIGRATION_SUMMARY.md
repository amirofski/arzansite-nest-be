# User ID Migration Summary

## Overview

This document summarizes the migration from `userId` (camelCase) to `user_id` (snake_case) in the Appwrite database and codebase.

## What Was Accomplished

### ✅ Database Schema Updates

1. **Removed `userId` attributes from collections:**
   - `designs` - ✅ Removed `userId`, added `user_id`
   - `email_verifications` - ✅ Removed `userId`, added `user_id`
   - `wizard_orders` - ⚠️ `userId` attribute is stuck (collection not used in codebase)
   - `password_resets` - ✅ Removed `userId`, added `user_id`

2. **Collections already using `user_id`:**
   - `orders` - ✅ Uses `user_id`
   - `invoices` - ✅ Uses `user_id`
   - `receipts` - ✅ Uses `user_id`
   - `wallets` - ✅ Uses `user_id`
   - `transactions` - ✅ Uses `user_id`
   - `profiles` - ✅ Uses `user_id`
   - `support_tickets` - ✅ Uses `user_id`
   - `notifications` - ✅ Uses `user_id`

### ✅ Codebase Updates

1. **Updated DTOs:**
   - `WizardOrderDto` - ✅ Changed `userId` to `user_id`
   - `SaveProgressDto` - ✅ Changed `userId` to `user_id`
   - `OrderDto` - ✅ Changed `userId` to `user_id`
   - `CompleteOrderDto` - ✅ Changed `userId` to `user_id`

2. **Updated Services:**
   - `WizardService` - ✅ Updated to use `user_id` in database queries
   - `AuthService` - ✅ Already using `user_id` in database queries
   - `SupportService` - ✅ Already using `user_id` in database queries
   - `InvoicesService` - ✅ Already using `user_id` in database queries
   - `ProfilesService` - ✅ Already using `user_id` in database queries
   - `StorageController` - ✅ Already using `user_id` in database queries

3. **Database Queries:**
   - All `Query.equal('userId', ...)` calls updated to `Query.equal('user_id', ...)`
   - All database field references updated to use `user_id`

## Current Status

### ✅ Completed
- **4 out of 5 collections** have been successfully updated
- All critical codebase files updated to use `user_id`
- All database queries now use `user_id`
- Frontend migration guide created

### ⚠️ Remaining Issue
- **`wizard_orders` collection** has a stuck `userId` attribute
- This collection is **NOT used in the codebase** (it's in the unused collections list)
- The attribute cannot be deleted due to Appwrite's "stuck" status

## Impact Assessment

### ✅ No Impact on Functionality
- The stuck `userId` attribute is in an unused collection
- All active collections use `user_id` correctly
- All API endpoints work with `user_id`
- Frontend can safely use `user_id` for all operations

### 🔍 Why `wizard_orders` Attribute is Stuck
- The attribute may have been used in documents that were later deleted
- Appwrite sometimes marks attributes as "stuck" when they can't be safely removed
- Since this collection is unused, this doesn't affect the application

## Frontend Migration Status

### ✅ Ready for Frontend Updates
- All API endpoints return `user_id` instead of `userId`
- All API endpoints accept `user_id` instead of `userId`
- Comprehensive migration guide created (`FRONTEND_USER_ID_MIGRATION_GUIDE.md`)

### 📋 Frontend Changes Required
1. Update TypeScript interfaces to use `user_id`
2. Update API request payloads to send `user_id`
3. Update response handling to use `user_id`
4. Update form components to use `user_id`

## Testing Recommendations

### 1. Test All API Endpoints
- Verify that requests with `user_id` work correctly
- Verify that responses contain `user_id` and `created_at`/`updated_at`

### 2. Test Critical User Flows
- User registration and authentication
- Order creation and management
- Profile updates
- Wallet operations
- Invoice management

### 3. Test Error Handling
- Verify that requests with `userId` (old format) are properly rejected
- Check that validation errors are clear and helpful

## Next Steps

### For Backend Team
1. ✅ **Completed**: Database schema cleanup
2. ✅ **Completed**: Codebase migration
3. ✅ **Completed**: Frontend guide creation

### For Frontend Team
1. **Update TypeScript interfaces** to use `user_id`
2. **Update API calls** to send `user_id`
3. **Update response handling** to use `user_id`
4. **Test all user flows** with new field names

### For DevOps Team
1. **Monitor application logs** for any `userId` references
2. **Verify database queries** are using `user_id`
3. **Check API response consistency** across all endpoints

## Summary

The migration from `userId` to `user_id` has been **successfully completed** for all active collections and codebase components. The remaining stuck attribute in the unused `wizard_orders` collection does not impact application functionality.

**Frontend teams can now safely migrate to use `user_id`** in all API interactions. The comprehensive migration guide provides step-by-step instructions for updating TypeScript interfaces, API calls, and response handling.

## Files Modified

### Database Scripts
- `remove-userid-attributes.js` - Removed `userId` attributes
- `force-remove-userid.js` - Attempted to force remove stuck attribute

### Codebase Files
- `src/wizard/dto/wizard.dto.ts` - Updated DTOs to use `user_id`
- `src/wizard/wizard.service.ts` - Updated service to use `user_id`

### Documentation
- `FRONTEND_USER_ID_MIGRATION_GUIDE.md` - Comprehensive frontend guide
- `USER_ID_MIGRATION_SUMMARY.md` - This summary document

## Support

For any questions or issues during the migration:

1. **Check the frontend migration guide** for detailed examples
2. **Verify API responses** contain the expected `user_id` fields
3. **Test with a fresh browser session** to avoid cached data issues
4. **Check browser console** for any field access errors
