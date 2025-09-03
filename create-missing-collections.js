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

// Missing collections that the backend needs
const missingCollections = [
  {
    id: 'auth_tokens',
    name: 'Auth Tokens',
    description: 'Stores email verification and password reset tokens',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'],
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'type', type: 'enum', elements: ['verification', 'password_reset'], required: true },
      { key: 'token_hash', type: 'string', size: 255, required: true },
      { key: 'is_used', type: 'boolean', required: true, default: false },
      { key: 'expires_at', type: 'datetime', required: true },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'user_id_index', type: 'key', attributes: ['user_id'] },
      { key: 'token_hash_index', type: 'key', attributes: ['token_hash'] },
      { key: 'type_index', type: 'key', attributes: ['type'] },
      { key: 'expires_at_index', type: 'key', attributes: ['expires_at'] }
    ]
  },
  {
    id: 'invoices',
    name: 'Invoices',
    description: 'Stores invoice information for orders and payments',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'],
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'order_id', type: 'string', size: 255, required: true },
      { key: 'amount', type: 'integer', required: true },
      { key: 'due_date', type: 'datetime', required: true },
      { key: 'status', type: 'enum', elements: ['pending', 'paid', 'overdue', 'cancelled'], required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'user_id_index', type: 'key', attributes: ['user_id'] },
      { key: 'order_id_index', type: 'key', attributes: ['order_id'] },
      { key: 'status_index', type: 'key', attributes: ['status'] },
      { key: 'due_date_index', type: 'key', attributes: ['due_date'] }
    ]
  },
  {
    id: 'receipts',
    name: 'Receipts',
    description: 'Stores payment receipts and transaction records',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'],
    attributes: [
      { key: 'invoice_id', type: 'string', size: 255, required: true },
      { key: 'ref_id', type: 'string', size: 255, required: true },
      { key: 'amount', type: 'integer', required: true },
      { key: 'format', type: 'enum', elements: ['pdf', 'html', 'json'], required: true },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'invoice_id_index', type: 'key', attributes: ['invoice_id'] },
      { key: 'ref_id_index', type: 'key', attributes: ['ref_id'] }
    ]
  },
  {
    id: 'wallets',
    name: 'Wallets',
    description: 'User wallet balances and information',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'],
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'balance', type: 'integer', required: true, default: 0 },
      { key: 'currency', type: 'string', size: 10, required: true, default: 'IRR' },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'user_id_index', type: 'key', attributes: ['user_id'] },
      { key: 'balance_index', type: 'key', attributes: ['balance'] }
    ]
  },
  {
    id: 'transactions',
    name: 'Transactions',
    description: 'Wallet transaction history',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'],
    attributes: [
      { key: 'wallet_id', type: 'string', size: 255, required: true },
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'type', type: 'enum', elements: ['credit', 'debit', 'transfer'], required: true },
      { key: 'status', type: 'enum', elements: ['pending', 'completed', 'failed', 'cancelled'], required: true },
      { key: 'amount', type: 'integer', required: true },
      { key: 'balance_before', type: 'integer', required: true },
      { key: 'balance_after', type: 'integer', required: true },
      { key: 'reference_id', type: 'string', size: 255, required: false },
      { key: 'reference_type', type: 'string', size: 100, required: false },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'metadata', type: 'string', size: 2000, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'wallet_id_index', type: 'key', attributes: ['wallet_id'] },
      { key: 'user_id_index', type: 'key', attributes: ['user_id'] },
      { key: 'type_index', type: 'key', attributes: ['type'] },
      { key: 'status_index', type: 'key', attributes: ['status'] },
      { key: 'reference_id_index', type: 'key', attributes: ['reference_id'] }
    ]
  },
  {
    id: 'designs',
    name: 'Designs',
    description: 'Design snapshots and assets (optional - data can be stored in wizard_data)',
    permissions: ['read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'],
    attributes: [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'order_id', type: 'string', size: 255, required: false },
      { key: 'design_data', type: 'string', size: 10000, required: true },
      { key: 'preview_url', type: 'string', size: 500, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ],
    indexes: [
      { key: 'user_id_index', type: 'key', attributes: ['user_id'] },
      { key: 'order_id_index', type: 'key', attributes: ['order_id'] }
    ]
  }
];

async function createCollection(collectionDef) {
  try {
    console.log(`🏗️ Creating: ${collectionDef.name} (${collectionDef.id})`);
    
    // Create collection
    await databases.createCollection(
      config.databaseId,
      collectionDef.id,
      collectionDef.name,
      collectionDef.permissions
    );
    
    console.log(`  ✅ Collection created successfully`);
    
    // Wait for collection to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create attributes
    if (collectionDef.attributes) {
      console.log(`  📝 Creating attributes...`);
      for (const attr of collectionDef.attributes) {
        try {
          await databases.createStringAttribute(
            config.databaseId,
            collectionDef.id,
            attr.key,
            attr.size || 255,
            attr.required || false,
            attr.default || undefined,
            attr.array || false
          );
          console.log(`    ✅ String attribute: ${attr.key}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`    ⚠️ Attribute already exists: ${attr.key}`);
          } else {
            console.error(`    ❌ Failed to create string attribute ${attr.key}:`, error.message);
          }
        }
        
        // Wait between attribute creation
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Create indexes
    if (collectionDef.indexes) {
      console.log(`  🔍 Creating indexes...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for attributes to be ready
      
      for (const index of collectionDef.indexes) {
        try {
          await databases.createIndex(
            config.databaseId,
            collectionDef.id,
            index.key,
            index.type,
            index.attributes
          );
          console.log(`    ✅ Index created: ${index.key}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`    ⚠️ Index already exists: ${index.key}`);
          } else {
            console.error(`    ❌ Failed to create index ${index.key}:`, error.message);
          }
        }
        
        // Wait between index creation
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`  🎉 ${collectionDef.name} setup complete`);
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`  ⚠️ Collection already exists: ${collectionDef.name}`);
    } else {
      console.error(`  ❌ Failed: ${error.message}`);
      throw error;
    }
  }
}

async function main() {
  try {
    console.log('🚀 Creating Missing Collections for Backend');
    console.log('==========================================');
    
    // Test connection
    console.log('🔌 Testing connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Check existing collections
    console.log('\n🔍 Checking existing collections...');
    const existing = await databases.listCollections(config.databaseId);
    const existingIds = existing.collections.map(c => c.$id);
    console.log(`Found ${existingIds.length} existing collections:`, existingIds);
    
    // Filter out existing collections
    const toCreate = missingCollections.filter(c => !existingIds.includes(c.id));
    
    if (toCreate.length === 0) {
      console.log('\n✅ All required collections already exist!');
      return;
    }
    
    console.log(`\n📋 Need to create ${toCreate.length} collections:`);
    toCreate.forEach(c => console.log(`  - ${c.name} (${c.id})`));
    
    // Create missing collections
    console.log('\n🏗️ Creating missing collections...');
    for (const collection of toCreate) {
      await createCollection(collection);
      console.log(''); // Empty line for readability
    }
    
    // Verify
    console.log('\n🔍 Verifying...');
    const final = await databases.listCollections(config.databaseId);
    console.log(`✅ Total collections: ${final.collections.length}`);
    
    console.log('\n🎉 Missing collections created successfully!');
    console.log('\n📋 Environment variables needed:');
    console.log('APPWRITE_COLLECTION_AUTH_TOKENS=auth_tokens');
    console.log('APPWRITE_COLLECTION_INVOICES=invoices');
    console.log('APPWRITE_COLLECTION_RECEIPTS=receipts');
    console.log('APPWRITE_COLLECTION_WALLETS=wallets');
    console.log('APPWRITE_COLLECTION_TRANSACTIONS=transactions');
    console.log('APPWRITE_COLLECTION_DESIGNS=designs');
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
