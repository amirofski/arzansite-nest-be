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
  console.error('❌ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

// Complete collections needed by the backend
const collections = [
  // Core collections
  {
    id: 'users',
    name: 'Users',
    permissions: ['read("any")', 'write("users")', 'create("any")', 'update("users")', 'delete("users")']
  },
  {
    id: 'orders',
    name: 'Orders',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'payments',
    name: 'Payments',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'wizard_sessions',
    name: 'Wizard Sessions',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'project_files',
    name: 'Project Files',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'notifications',
    name: 'Notifications',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'user_profiles',
    name: 'User Profiles',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'support_tickets',
    name: 'Support Tickets',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'system_settings',
    name: 'System Settings',
    permissions: ['read("any")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  // Missing collections that backend needs
  {
    id: 'auth_tokens',
    name: 'Auth Tokens',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'invoices',
    name: 'Invoices',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'receipts',
    name: 'Receipts',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'wallets',
    name: 'Wallets',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'transactions',
    name: 'Transactions',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  },
  {
    id: 'designs',
    name: 'Designs',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")']
  }
];

async function createCollection(collectionDef) {
  try {
    console.log(`🏗️ Creating: ${collectionDef.name} (${collectionDef.id})`);
    
    await databases.createCollection(
      config.databaseId,
      collectionDef.id,
      collectionDef.name,
      collectionDef.permissions
    );
    
    console.log(`  ✅ Created successfully`);
    
    // Wait for collection to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    throw error;
  }
}

async function createStorageBuckets() {
  try {
    console.log('🗂️ Creating storage buckets...');
    
    const buckets = [
      { id: 'project_files', name: 'Project Files' },
      { id: 'user_avatars', name: 'User Avatars' },
      { id: 'design_assets', name: 'Design Assets' }
    ];
    
    for (const bucket of buckets) {
      try {
        console.log(`  📦 Creating: ${bucket.name} (${bucket.id})`);
        
        await storage.createBucket(
          bucket.id,
          bucket.name,
          ['read("users")', 'write("users")'],
          true
        );
        
        console.log(`    ✅ Created successfully`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to create storage buckets:', error);
  }
}

async function main() {
  try {
    console.log('🚀 Phase 3: Create New Collections');
    console.log('==================================');
    
    // Test connection
    console.log('🔌 Testing connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Create collections
    console.log('\n🏗️ Creating collections...');
    for (const collection of collections) {
      await createCollection(collection);
    }
    
    // Create storage
    console.log('\n🗂️ Creating storage...');
    await createStorageBuckets();
    
    // Verify
    console.log('\n🔍 Verifying...');
    const created = await databases.listCollections(config.databaseId);
    console.log(`✅ Created ${created.collections.length} collections`);
    
    console.log('\n🎉 Phase 3 completed!');
    console.log('📋 Next: Add attributes and indexes manually');
    
  } catch (error) {
    console.error('\n❌ Phase 3 failed:', error.message);
    process.exit(1);
  }
}

main();
