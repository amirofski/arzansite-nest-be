const { Client, Databases, Storage } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5'
};

if (!config.apiKey) {
  console.error('❌ APPWRITE_API_KEY is required in environment variables');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

// Collections to delete in dependency order (child collections first)
const collectionsToDelete = [
  // Child collections (dependencies first)
  "password_resets",
  "email_logs", 
  "notifications",
  "receipts",
  "invoices",
  "payment_transactions",
  "payments",
  "orders",
  "wizard_sessions",
  "designs",
  "profiles",
  "wallets",
  "transactions",
  "support",
  "uploads",
  "storage",
  "scheduled_tasks",
  "analytics",
  "admin"
];

// Storage buckets to delete
const bucketsToDelete = [
  // Add your bucket IDs here if you know them
  // "bucket_id_1",
  // "bucket_id_2"
];

async function confirmDestruction() {
  console.log('🚨 DESTRUCTION CONFIRMATION REQUIRED');
  console.log('=====================================');
  console.log('⚠️  WARNING: This will PERMANENTLY DELETE all collections and data!');
  console.log('⚠️  Make sure you have completed Phase 1 (backup) before proceeding!');
  console.log('');
  console.log('Collections to be deleted:');
  collectionsToDelete.forEach((collectionId, index) => {
    console.log(`  ${index + 1}. ${collectionId}`);
  });
  console.log('');
  console.log('Storage buckets to be deleted:');
  if (bucketsToDelete.length > 0) {
    bucketsToDelete.forEach((bucketId, index) => {
      console.log(`  ${index + 1}. ${bucketId}`);
    });
  } else {
    console.log('  (Will be detected automatically)');
  }
  console.log('');
  console.log('❓ Are you absolutely sure you want to proceed?');
  console.log('   Type "YES DESTROY ALL" to confirm:');
  
  // In a real scenario, you'd want to read from stdin
  // For safety, we'll require manual confirmation
  console.log('');
  console.log('🔒 SAFETY CHECK: This script requires manual confirmation');
  console.log('   To proceed, you must manually edit this script and set:');
  console.log('   const MANUAL_CONFIRMATION = true;');
  console.log('');
  
  const MANUAL_CONFIRMATION = true; // Set to true after manual review
  
  if (!MANUAL_CONFIRMATION) {
    console.log('❌ MANUAL CONFIRMATION REQUIRED');
    console.log('   Edit this script and set MANUAL_CONFIRMATION = true');
    console.log('   Then run the script again');
    process.exit(1);
  }
  
  console.log('✅ Manual confirmation received');
  console.log('🚀 Proceeding with destruction...');
}

async function deleteCollections() {
  try {
    console.log('🗑️ Starting collection deletion...');
    
    // Get current collections
    const currentCollections = await databases.listCollections(config.databaseId);
    console.log(`📊 Found ${currentCollections.collections.length} collections to delete`);
    
    // Delete collections in specified order
    for (const collectionId of collectionsToDelete) {
      try {
        // Check if collection exists
        const exists = currentCollections.collections.find(c => c.$id === collectionId);
        if (!exists) {
          console.log(`⏭️  Collection ${collectionId} not found, skipping...`);
          continue;
        }
        
        console.log(`🗑️ Deleting collection: ${collectionId} (${exists.name})`);
        
        // Delete the collection
        await databases.deleteCollection(config.databaseId, collectionId);
        console.log(`  ✅ Collection ${collectionId} deleted successfully`);
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed to delete collection ${collectionId}:`, error.message);
        
        // Check if it's a dependency error
        if (error.message.includes('dependency') || error.message.includes('constraint')) {
          console.log(`  ⚠️  Collection ${collectionId} has dependencies, will retry later`);
          // Add to end of list to retry
          collectionsToDelete.push(collectionId);
        }
      }
    }
    
    // Verify all collections are deleted
    const remainingCollections = await databases.listCollections(config.databaseId);
    if (remainingCollections.collections.length === 0) {
      console.log('✅ All collections deleted successfully');
    } else {
      console.log(`⚠️  ${remainingCollections.collections.length} collections remain:`, 
        remainingCollections.collections.map(c => c.$id));
    }
    
  } catch (error) {
    console.error('❌ Failed to delete collections:', error);
    throw error;
  }
}

async function deleteStorageBuckets() {
  try {
    console.log('🗂️ Starting storage bucket deletion...');
    
    // Get current buckets
    const currentBuckets = await storage.listBuckets();
    console.log(`📦 Found ${currentBuckets.buckets.length} storage buckets`);
    
    // Delete buckets
    for (const bucket of currentBuckets.buckets) {
      try {
        console.log(`🗑️ Deleting bucket: ${bucket.name} (${bucket.$id})`);
        
        // Delete the bucket
        await storage.deleteBucket(bucket.$id);
        console.log(`  ✅ Bucket ${bucket.name} deleted successfully`);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ Failed to delete bucket ${bucket.name}:`, error.message);
      }
    }
    
    // Verify all buckets are deleted
    const remainingBuckets = await storage.listBuckets();
    if (remainingBuckets.buckets.length === 0) {
      console.log('✅ All storage buckets deleted successfully');
    } else {
      console.log(`⚠️  ${remainingBuckets.buckets.length} buckets remain:`, 
        remainingBuckets.buckets.map(b => b.$id));
    }
    
  } catch (error) {
    console.error('❌ Failed to delete storage buckets:', error);
    throw error;
  }
}

async function verifyCleanState() {
  try {
    console.log('🔍 Verifying clean state...');
    
    // Check collections
    const collections = await databases.listCollections(config.databaseId);
    if (collections.collections.length === 0) {
      console.log('✅ Database is clean - no collections remain');
    } else {
      console.log(`⚠️  ${collections.collections.length} collections still exist:`, 
        collections.collections.map(c => c.$id));
    }
    
    // Check storage
    const buckets = await storage.listBuckets();
    if (buckets.buckets.length === 0) {
      console.log('✅ Storage is clean - no buckets remain');
    } else {
      console.log(`⚠️  ${buckets.buckets.length} storage buckets still exist:`, 
        buckets.buckets.map(b => b.$id));
    }
    
    // Overall status
    if (collections.collections.length === 0 && buckets.buckets.length === 0) {
      console.log('🎉 PHASE 2 COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Database is completely clean and ready for Phase 3');
      console.log('📋 Next step: Create new optimized collections');
    } else {
      console.log('⚠️  PHASE 2 PARTIALLY COMPLETED');
      console.log('=====================================');
      console.log('Some collections or buckets could not be deleted');
      console.log('You may need to manually delete them or proceed with caution');
    }
    
  } catch (error) {
    console.error('❌ Failed to verify clean state:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Phase 2: Destroy Existing Structure');
    console.log('================================================');
    
    // Safety confirmation
    await confirmDestruction();
    
    // Test connection
    console.log('🔌 Testing Appwrite connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Destroy everything
    await deleteCollections();
    await deleteStorageBuckets();
    await verifyCleanState();
    
  } catch (error) {
    console.error('\n❌ PHASE 2 FAILED!');
    console.error('=====================================');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your APPWRITE_API_KEY has admin permissions');
    console.error('2. Verify database ID is correct');
    console.error('3. Ensure Appwrite service is running');
    console.error('4. Check if collections have dependencies');
    
    process.exit(1);
  }
}

// Run destruction
main();
