# Appwrite Schema Cleanup Guide

This guide helps you ensure your Appwrite database schema matches exactly what's used in your codebase, with no extra or missing attributes.

## 🎯 Purpose

The scripts in this directory will:
1. **Analyze** your codebase and Appwrite database schema
2. **Identify** mismatches, unused fields, and missing fields
3. **Recommend** what to add, remove, or keep
4. **Clean up** unused attributes (safely)
5. **Add missing** required fields automatically

## 📁 Files

- `analyze-appwrite-schema.js` - Comprehensive schema analysis script
- `cleanup-unused-schema.js` - Cleanup script for removing unused fields and adding missing ones
- `SCHEMA_CLEANUP_README.md` - This file

## 🚀 Quick Start

### Step 1: Run the Analysis

```bash
node analyze-appwrite-schema.js
```

This will:
- Analyze your codebase field usage
- Scan your Appwrite database schema
- Find mismatches, duplicates, and conflicts
- Generate a detailed report with recommendations
- Save results to a JSON file

### Step 2: Review Recommendations

The analysis will show you:
- ✅ Collections that match your codebase perfectly
- ❌ Missing required fields
- ⚠️ Extra unused fields
- 🔄 Duplicate attributes
- ⚡ Conflicting attribute types

### Step 3: Run the Cleanup

```bash
node cleanup-unused-schema.js
```

This will:
- Add missing required fields automatically
- Show what fields should be removed (safely)
- Generate a cleanup report

## 🔧 Configuration

Both scripts use these environment variables (with defaults):

```bash
APPWRITE_ENDPOINT=http://app.arzansite.com/v1
APPWRITE_PROJECT_ID=6898b35e003067cd7b43
APPWRITE_API_KEY=your_api_key_here
APPWRITE_DATABASE_ID=6899993d001b0b35b6b5
```

## 📊 What Gets Analyzed

### Required Collections
- **orders** - Main orders with wizard data
- **invoices** - Invoice management system
- **receipts** - Digital receipt generation
- **wallets** - User wallet balances
- **transactions** - Wallet transaction history
- **profiles** - User profile information
- **support_tickets** - Customer support system
- **notifications** - User notification system

### Field Naming Conventions
- **Orders**: Uses camelCase (e.g., `userId`, `createdAt`, `totalAmount`)
- **Other collections**: Mix of snake_case and camelCase based on actual usage
- **System fields**: Automatically preserved (e.g., `$id`, `$createdAt`)

## 🛡️ Safety Features

- **No automatic deletion** - Fields are only marked for removal
- **Backup recommendations** - Always backup before cleanup
- **Field validation** - Checks for required vs optional fields
- **Type checking** - Ensures attribute types match expectations

## 📋 Example Output

```
🔍 Analyzing Appwrite Database Schema...

📊 Found 25 collections in database

📋 Collection: Orders (orders)
   ✅ Required by codebase
   📊 Attributes: 15
   ❌ Missing: createdAt, updatedAt
   ⚠️  Extra: user_id, price, created_at, updated_at

📋 Collection: Invoices (invoices)
   ✅ Required by codebase
   📊 Attributes: 8
   ❌ Missing: amount
   🎯 Perfect match with codebase

💡 Recommendations:
   ➕ Add missing fields: 2 collections
   🗑️  Remove unused fields: 1 collections
   🔄 Duplicate attributes: 0
   ⚡ Conflicting attributes: 0
```

## ⚠️ Important Notes

1. **Always backup your database** before running cleanup operations
2. **Test in development** first before running in production
3. **Review recommendations** carefully before implementing changes
4. **Field removal is permanent** - ensure fields are truly unused

## 🔄 Troubleshooting

### Common Issues

- **Connection errors**: Check your Appwrite endpoint and API key
- **Permission errors**: Ensure your API key has database access
- **Field conflicts**: Resolve naming convention mismatches first

### Getting Help

If you encounter issues:
1. Check the generated JSON report for details
2. Verify your Appwrite configuration
3. Ensure your codebase is up to date

## 📈 Next Steps

After cleanup:
1. **Test your application** thoroughly
2. **Monitor for errors** in logs
3. **Update your codebase** if field names changed
4. **Document the final schema** for future reference

**Remember: Always backup your database before running cleanup operations!**
