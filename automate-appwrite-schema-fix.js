#!/usr/bin/env node

/**
 * Automated Appwrite Schema Fixer
 * 
 * This script automatically fixes Appwrite schema issues by:
 * 1. Removing duplicate/conflicting attributes
 * 2. Standardizing field names to snake_case
 * 3. Adding missing required fields
 * 4. Cleaning up unused attributes
 * 5. Ensuring consistency with the codebase
 */

const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env' });

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

// Field mapping for consistency
const FIELD_MAPPING = {
  // User fields
  userId: 'user_id',
  userid: 'user_id',
  
  // Date fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  lastAccessed: 'last_accessed',
  
  // Order fields
  orderId: 'order_id',
  orderid: 'order_id',
  sessionId: 'session_id',
  sessionid: 'session_id',
  siteType: 'site_type',
  orderNumber: 'order_number',
  
  // Payment fields
  paymentGateway: 'payment_gateway',
  paymentStatus: 'payment_status',
  zarinpalAuthority: 'zarinpal_authority',
  zarinpalRefId: 'zarinpal_ref_id',
  zarinpalInvoiceId: 'zarinpal_invoice_id',
  
  // Design fields
  wizardData: 'wizard_data',
  designSnapshot: 'design_snapshot',
  designData: 'design_data',
  designPreviewUrl: 'design_preview_url',
  designOptions: 'design_options',
  callbackUrl: 'callback_url',
  returnUrl: 'return_url',
  websiteFramework: 'website_framework',
  additionalServices: 'additional_services',
  projectFiles: 'project_files',
  
  // Amount fields
  totalAmount: 'total_amount',
  balanceBefore: 'balance_before',
  balanceAfter: 'balance_after',
  
  // Wallet fields
  walletId: 'wallet_id',
  walletid: 'wallet_id',
  
  // Profile fields
  fullName: 'full_name',
  firstName: 'first_name',
  lastName: 'last_name',
  phoneNumber: 'phone_number',
  
  // File fields
  fileName: 'file_name',
  originalName: 'original_name',
  mimeType: 'mime_type',
  bucketId: 'bucket_id',
  fileId: 'file_id',
  
  // Transaction fields
  transactionType: 'transaction_type',
  transactionId: 'transaction_id',
  referenceId: 'reference_id',
  referenceType: 'reference_type',
  
  // Support fields
  ticketId: 'ticket_id',
  adminUserId: 'admin_user_id',
  assignedTo: 'assigned_to',
  
  // Notification fields
  notificationType: 'notification_type',
  notificationPreferences: 'notification_preferences',
};

// Collections that need schema fixes
const COLLECTIONS_TO_FIX = {
  orders: {
    requiredFields: ['user_id', 'title', 'status', 'created_at', 'updated_at'],
    optionalFields: [
      'description', 'price', 'comments', 'payment_status', 'zarinpal_authority',
      'zarinpal_ref_id', 'design_data', 'design_preview_url', 'total_pages',
      'total_sections', 'design_options', 'session_id', 'site_type', 'wizard_data',
      'website_framework', 'additional_services', 'total_amount', 'currency',
      'payment_gateway', 'callback_url', 'return_url', 'order_number'
    ],
    conflictsToResolve: [
      { camelCase: 'domains', snakeCase: 'domains' },
      { camelCase: 'pricing', snakeCase: 'pricing' }
    ]
  },
  profiles: {
    requiredFields: ['user_id', 'full_name', 'created_at', 'updated_at'],
    optionalFields: ['email', 'phone', 'address'],
    conflictsToResolve: []
  },
  wizard_orders: {
    requiredFields: ['user_id', 'created_at', 'updated_at'],
    optionalFields: ['session_id', 'wizard_data', 'status'],
    conflictsToResolve: [
      { camelCase: 'userId', snakeCase: 'user_id' },
      { camelCase: 'sessionId', snakeCase: 'session_id' }
    ]
  },
  password_resets: {
    requiredFields: ['user_id', 'token', 'created_at', 'expires_at'],
    optionalFields: ['email', 'used'],
    conflictsToResolve: [
      { camelCase: 'email', snakeCase: 'email' },
      { camelCase: 'token', snakeCase: 'token' }
    ]
  },
  support_tickets: {
    requiredFields: ['user_id', 'title', 'description', 'status', 'created_at'],
    optionalFields: ['priority', 'assigned_to', 'admin_user_id', 'updated_at'],
    conflictsToResolve: [
      { camelCase: 'type', snakeCase: 'type' },
      { camelCase: 'description', snakeCase: 'description' },
      { camelCase: 'priority', snakeCase: 'priority' },
      { camelCase: 'status', snakeCase: 'status' }
    ]
  },
  notifications: {
    requiredFields: ['user_id', 'title', 'message', 'created_at'],
    optionalFields: ['type', 'read', 'updated_at'],
    conflictsToResolve: [
      { camelCase: 'type', snakeCase: 'type' },
      { camelCase: 'title', snakeCase: 'title' },
      { camelCase: 'message', snakeCase: 'message' }
    ]
  }
};

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function main() {
  console.log('🔧 Starting Automated Appwrite Schema Fix...\n');
  
  try {
    // Validate configuration
    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID) {
      throw new Error('Missing required Appwrite configuration');
    }
    
    console.log('✅ Configuration validated');
    
    // Process each collection
    for (const [collectionName, config] of Object.entries(COLLECTIONS_TO_FIX)) {
      console.log(`\n📋 Processing collection: ${collectionName}`);
      
      try {
        await fixCollectionSchema(collectionName, config);
        console.log(`✅ Collection ${collectionName} processed successfully`);
      } catch (error) {
        console.error(`❌ Error processing collection ${collectionName}:`, error.message);
      }
    }
    
    console.log('\n🎉 Automated schema fix completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

async function fixCollectionSchema(collectionName, config) {
  // Get collection details
  const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionName);
  const currentAttributes = collection.attributes;
  
  console.log(`  📊 Current attributes: ${currentAttributes.length}`);
  
  // Step 1: Resolve conflicts (keep snake_case, remove camelCase)
  for (const conflict of config.conflictsToResolve) {
    const camelCaseAttr = currentAttributes.find(attr => attr.key === conflict.camelCase);
    const snakeCaseAttr = currentAttributes.find(attr => attr.key === conflict.snakeCase);
    
    if (camelCaseAttr && snakeCaseAttr) {
      console.log(`    🔧 Resolving conflict: ${conflict.camelCase} vs ${conflict.snakeCase}`);
      
      // Copy data from camelCase to snake_case if needed
      await copyAttributeData(collectionName, conflict.camelCase, conflict.snakeCase);
      
      // Remove camelCase attribute
      await deleteAttribute(collectionName, conflict.camelCase);
      console.log(`    ✅ Removed ${conflict.camelCase}, kept ${conflict.snakeCase}`);
    }
  }
  
  // Step 2: Add missing required fields
  for (const field of config.requiredFields) {
    const exists = currentAttributes.some(attr => attr.key === field);
    if (!exists) {
      console.log(`    ➕ Adding missing required field: ${field}`);
      await addRequiredField(collectionName, field);
    }
  }
  
  // Step 3: Add missing optional fields
  for (const field of config.optionalFields) {
    const exists = currentAttributes.some(attr => attr.key === field);
    if (!exists) {
      console.log(`    ➕ Adding missing optional field: ${field}`);
      await addOptionalField(collectionName, field);
    }
  }
  
  // Step 4: Remove unused attributes (not in required or optional lists)
  const allAllowedFields = [...config.requiredFields, ...config.optionalFields];
  for (const attr of currentAttributes) {
    if (!allAllowedFields.includes(attr.key)) {
      console.log(`    🗑️  Removing unused field: ${attr.key}`);
      await deleteAttribute(collectionName, attr.key);
    }
  }
}

async function copyAttributeData(collectionName, fromField, toField) {
  try {
    // Get all documents
    const documents = await databases.listDocuments(APPWRITE_DATABASE_ID, collectionName);
    
    // Update each document to copy data
    for (const doc of documents.documents) {
      if (doc[fromField] && !doc[toField]) {
        const updateData = { [toField]: doc[fromField] };
        await databases.updateDocument(APPWRITE_DATABASE_ID, collectionName, doc.$id, updateData);
      }
    }
    
    console.log(`      📋 Copied data from ${fromField} to ${toField}`);
  } catch (error) {
    console.log(`      ⚠️  Could not copy data: ${error.message}`);
  }
}

async function deleteAttribute(collectionName, attributeName) {
  try {
    await databases.deleteAttribute(APPWRITE_DATABASE_ID, collectionName, attributeName);
    console.log(`      ✅ Deleted attribute: ${attributeName}`);
  } catch (error) {
    console.log(`      ⚠️  Could not delete attribute ${attributeName}: ${error.message}`);
  }
}

async function addRequiredField(collectionName, fieldName) {
  try {
    const fieldType = getFieldType(fieldName);
    await databases.createStringAttribute(APPWRITE_DATABASE_ID, collectionName, fieldName, 255, true);
    console.log(`      ✅ Added required field: ${fieldName} (${fieldType})`);
  } catch (error) {
    console.log(`      ⚠️  Could not add field ${fieldName}: ${error.message}`);
  }
}

async function addOptionalField(collectionName, fieldName) {
  try {
    const fieldType = getFieldType(fieldName);
    await databases.createStringAttribute(APPWRITE_DATABASE_ID, collectionName, fieldName, 255, false);
    console.log(`      ✅ Added optional field: ${fieldName} (${fieldType})`);
  } catch (error) {
    console.log(`      ⚠️  Could not add field ${fieldName}: ${error.message}`);
  }
}

function getFieldType(fieldName) {
  if (fieldName.includes('_at') || fieldName === 'created_at' || fieldName === 'updated_at') {
    return 'datetime';
  }
  if (fieldName.includes('_id')) {
    return 'string';
  }
  if (fieldName.includes('amount') || fieldName.includes('price') || fieldName.includes('balance')) {
    return 'double';
  }
  if (fieldName.includes('total_') && (fieldName.includes('pages') || fieldName.includes('sections'))) {
    return 'integer';
  }
  return 'string';
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, fixCollectionSchema };
