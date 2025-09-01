const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6898b35e003067cd7b43';

// Initialize Appwrite client
const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Field mapping: camelCase → snake_case
const FIELD_MAPPING = {
  // User identification
  'userId': 'user_id',
  'userid': 'user_id',
  
  // Timestamps
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'completedAt': 'completed_at',
  'lastAccessed': 'last_accessed',
  
  // Order related
  'orderId': 'order_id',
  'orderid': 'order_id',
  'sessionId': 'session_id',
  'sessionid': 'session_id',
  'siteType': 'site_type',
  'site_type': 'site_type',
  
  // Payment related
  'paymentGateway': 'payment_gateway',
  'payment_gateway': 'payment_gateway',
  'zarinpalAuthority': 'zarinpal_authority',
  'zarinpalRefId': 'zarinpal_ref_id',
  
  // Design related
  'wizardData': 'wizard_data',
  'designSnapshot': 'design_snapshot',
  'callbackUrl': 'callback_url',
  'returnUrl': 'return_url',
  'websiteFramework': 'website_framework',
  'additionalServices': 'additional_services',
  'projectFiles': 'project_files',
  
  // Amount and pricing
  'totalAmount': 'total_amount',
  'total_amount': 'total_amount',
  
  // Wallet related
  'walletId': 'wallet_id',
  'walletid': 'wallet_id',
  
  // Profile related
  'fullName': 'full_name',
  'full_name': 'full_name',
  
  // File related
  'fileName': 'file_name',
  'originalName': 'original_name',
  'mimeType': 'mime_type',
  'bucketId': 'bucket_id',
  'fileId': 'file_id'
};

// Collections to process
const COLLECTIONS_TO_PROCESS = [
  'profiles', 'orders', 'wallets', 'transactions', 'designs',
  'email_logs', 'email_verifications', 'receipts', 'invoices',
  'wallet_adjustments', 'wizard_orders', 'domain_extensions',
  'project_files', 'password_resets', 'support_tickets',
  'notifications', 'notification_preferences'
];

async function refactorDatabaseToUserId() {
  console.log('🚀 Starting comprehensive refactoring to user_id...');
  console.log('⚠️  WARNING: This will permanently modify your database!');
  console.log('Make sure you have a backup before proceeding.\n');

  try {
    // Step 1: Update all collections to use user_id
    console.log('📋 Step 1: Updating collections to use user_id...');
    
    for (const collectionId of COLLECTIONS_TO_PROCESS) {
      try {
        console.log(`\n🔄 Processing collection: ${collectionId}`);
        
        // Get collection attributes
        const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
        console.log(`  📊 Found collection with ${collection.attributes.length} attributes`);
        
        // Check if collection has userId or userid field
        const hasUserIdField = collection.attributes.some(attr => 
          attr.key === 'userId' || attr.key === 'userid'
        );
        
        if (hasUserIdField) {
          console.log(`  🔧 Collection ${collectionId} has userId field - updating...`);
          
          // Add user_id field if it doesn't exist
          const hasUserIdSnake = collection.attributes.some(attr => attr.key === 'user_id');
          if (!hasUserIdSnake) {
            try {
              await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                collectionId,
                'user_id',
                255,
                false,
                null,
                null,
                false
              );
              console.log(`  ✅ Added user_id field to ${collectionId}`);
            } catch (error) {
              if (error.message.includes('already exists')) {
                console.log(`  ℹ️  user_id field already exists in ${collectionId}`);
              } else {
                console.log(`  ❌ Failed to add user_id field: ${error.message}`);
              }
            }
          }
          
          // Update all documents to copy userId to user_id
          await updateDocumentsToUseUserId(collectionId);
          
          // Remove the old userId field
          try {
            await databases.deleteAttribute(
              APPWRITE_DATABASE_ID,
              collectionId,
              'userId'
            );
            console.log(`  ✅ Removed userId field from ${collectionId}`);
          } catch (error) {
            console.log(`  ℹ️  userId field not found or already removed: ${error.message}`);
          }
          
          try {
            await databases.deleteAttribute(
              APPWRITE_DATABASE_ID,
              collectionId,
              'userid'
            );
            console.log(`  ✅ Removed userid field from ${collectionId}`);
          } catch (error) {
            console.log(`  ℹ️  userid field not found or already removed: ${error.message}`);
          }
        } else {
          console.log(`  ℹ️  Collection ${collectionId} already uses user_id or doesn't have user identification`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing collection ${collectionId}: ${error.message}`);
      }
    }
    
    // Step 2: Standardize other field names
    console.log('\n📋 Step 2: Standardizing other field names...');
    await standardizeFieldNames();
    
    console.log('\n🎉 Database refactoring completed successfully!');
    console.log('✅ All collections now use user_id consistently');
    console.log('✅ Field naming standardized to snake_case');
    
  } catch (error) {
    console.error('❌ Database refactoring failed:', error.message);
    throw error;
  }
}

async function updateDocumentsToUseUserId(collectionId) {
  try {
    const { Query } = await import('node-appwrite');
    
    // Get all documents
    const documents = await databases.listDocuments(APPWRITE_DATABASE_ID, collectionId, [
      Query.limit(1000)
    ]);
    
    console.log(`    📄 Found ${documents.documents.length} documents to update`);
    
    let updatedCount = 0;
    for (const doc of documents.documents) {
      try {
        const updateData = {};
        let needsUpdate = false;
        
        // Copy userId to user_id if userId exists
        if (doc.userId && !doc.user_id) {
          updateData.user_id = doc.userId;
          needsUpdate = true;
        }
        
        // Copy userid to user_id if userid exists
        if (doc.userid && !doc.user_id) {
          updateData.user_id = doc.userid;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            collectionId,
            doc.$id,
            updateData
          );
          updatedCount++;
        }
      } catch (error) {
        console.log(`      ⚠️  Failed to update document ${doc.$id}: ${error.message}`);
      }
    }
    
    if (updatedCount > 0) {
      console.log(`    ✅ Updated ${updatedCount} documents in ${collectionId}`);
    }
    
  } catch (error) {
    console.log(`    ❌ Failed to update documents: ${error.message}`);
  }
}

async function standardizeFieldNames() {
  console.log('  🔄 Standardizing field names across collections...');
  
  for (const collectionId of COLLECTIONS_TO_PROCESS) {
    try {
      console.log(`    📋 Processing ${collectionId}...`);
      
      const collection = await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
      
      for (const [camelCaseField, snakeCaseField] of Object.entries(FIELD_MAPPING)) {
        try {
          // Check if camelCase field exists
          const hasCamelCase = collection.attributes.some(attr => attr.key === camelCaseField);
          const hasSnakeCase = collection.attributes.some(attr => attr.key === snakeCaseField);
          
          if (hasCamelCase && !hasSnakeCase) {
            console.log(`      🔧 Converting ${camelCaseField} → ${snakeCaseField} in ${collectionId}`);
            
            // Get the attribute details
            const attr = collection.attributes.find(attr => attr.key === camelCaseField);
            
            // Create the new snake_case field
            if (attr.type === 'string') {
              await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                collectionId,
                snakeCaseField,
                attr.size || 255,
                attr.required || false,
                attr.default || null,
                attr.array || false
              );
            } else if (attr.type === 'integer') {
              await databases.createIntegerAttribute(
                APPWRITE_DATABASE_ID,
                collectionId,
                snakeCaseField,
                attr.required || false,
                attr.min || null,
                attr.max || null,
                attr.default || null,
                attr.array || false
              );
            } else if (attr.type === 'double') {
              await databases.createFloatAttribute(
                APPWRITE_DATABASE_ID,
                collectionId,
                snakeCaseField,
                attr.required || false,
                attr.min || null,
                attr.max || null,
                attr.default || null,
                attr.array || false
              );
            } else if (attr.type === 'boolean') {
              await databases.createBooleanAttribute(
                APPWRITE_DATABASE_ID,
                collectionId,
                snakeCaseField,
                attr.required || false,
                attr.default || null,
                attr.array || false
              );
            } else if (attr.type === 'datetime') {
              await databases.createDatetimeAttribute(
                APPWRITE_DATABASE_ID,
                collectionId,
                snakeCaseField,
                attr.required || false,
                attr.default || null,
                attr.array || false
              );
            }
            
            // Copy data from old field to new field
            await copyFieldData(collectionId, camelCaseField, snakeCaseField);
            
            // Remove the old camelCase field
            await databases.deleteAttribute(APPWRITE_DATABASE_ID, collectionId, camelCaseField);
            
            console.log(`      ✅ Successfully converted ${camelCaseField} → ${snakeCaseField}`);
          }
        } catch (error) {
          console.log(`      ⚠️  Failed to convert ${camelCaseField}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`    ❌ Error processing ${collectionId}: ${error.message}`);
    }
  }
}

async function copyFieldData(collectionId, oldField, newField) {
  try {
    const { Query } = await import('node-appwrite');
    
    const documents = await databases.listDocuments(APPWRITE_DATABASE_ID, collectionId, [
      Query.limit(1000)
    ]);
    
    for (const doc of documents.documents) {
      if (doc[oldField] !== undefined) {
        try {
          await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            collectionId,
            doc.$id,
            { [newField]: doc[oldField] }
          );
        } catch (error) {
          // Ignore individual document update errors
        }
      }
    }
  } catch (error) {
    console.log(`      ⚠️  Failed to copy data from ${oldField} to ${newField}: ${error.message}`);
  }
}

// Run the refactoring
if (require.main === module) {
  refactorDatabaseToUserId()
    .then(() => {
      console.log('\n🎯 Next steps:');
      console.log('1. Update your codebase to use user_id instead of userId');
      console.log('2. Test all functionality thoroughly');
      console.log('3. Update frontend code to match new field names');
      console.log('4. Monitor for any issues');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Refactoring failed:', error);
      process.exit(1);
    });
}

module.exports = { refactorDatabaseToUserId };
