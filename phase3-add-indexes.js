const { Client, Databases } = require('node-appwrite');
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

// Indexes for each collection
const collectionIndexes = {
  users: [
    { key: 'email_index', type: 'key', attributes: ['email'], orders: ['ASC'] },
    { key: 'role_index', type: 'key', attributes: ['role'], orders: ['ASC'] },
    { key: 'status_index', type: 'key', attributes: ['status'], orders: ['ASC'] }
  ],
  orders: [
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'order_number_index', type: 'key', attributes: ['order_number'], orders: ['ASC'] },
    { key: 'status_index', type: 'key', attributes: ['status'], orders: ['ASC'] },
    { key: 'payment_status_index', type: 'key', attributes: ['payment_status'], orders: ['ASC'] }
  ],
  payments: [
    { key: 'order_id_index', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'status_index', type: 'key', attributes: ['status'], orders: ['ASC'] }
  ],
  wizard_sessions: [
    { key: 'session_id_index', type: 'key', attributes: ['session_id'], orders: ['ASC'] },
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'is_completed_index', type: 'key', attributes: ['is_completed'], orders: ['ASC'] }
  ],
  project_files: [
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'order_id_index', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
    { key: 'file_type_index', type: 'key', attributes: ['file_type'], orders: ['ASC'] }
  ],
  notifications: [
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'type_index', type: 'key', attributes: ['type'], orders: ['ASC'] },
    { key: 'is_read_index', type: 'key', attributes: ['is_read'], orders: ['ASC'] }
  ],
  user_profiles: [
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] }
  ],
  support_tickets: [
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'ticket_number_index', type: 'key', attributes: ['ticket_number'], orders: ['ASC'] },
    { key: 'status_index', type: 'key', attributes: ['status'], orders: ['ASC'] },
    { key: 'priority_index', type: 'key', attributes: ['priority'], orders: ['ASC'] }
  ],
  audit_logs: [
    { key: 'user_id_index', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
    { key: 'action_index', type: 'key', attributes: ['action'], orders: ['ASC'] },
    { key: 'resource_type_index', type: 'key', attributes: ['resource_type'], orders: ['ASC'] },
    { key: 'created_at_index', type: 'key', attributes: ['created_at'], orders: ['ASC'] }
  ],
  system_settings: [
    { key: 'setting_key_index', type: 'key', attributes: ['setting_key'], orders: ['ASC'] },
    { key: 'category_index', type: 'key', attributes: ['category'], orders: ['ASC'] }
  ]
};

async function addIndexesToCollection(collectionId, indexes) {
  try {
    console.log(`🔍 Adding indexes to ${collectionId}...`);
    
    for (const index of indexes) {
      try {
        console.log(`  🔍 Creating: ${index.key}`);
        
        await databases.createIndex(
          config.databaseId,
          collectionId,
          index.key,
          index.type,
          index.attributes,
          index.orders
        );
        
        console.log(`    ✅ Created successfully`);
        
        // Small delay between indexes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`);
      }
    }
    
    console.log(`  🎉 ${collectionId} indexes completed`);
    
  } catch (error) {
    console.error(`❌ Failed to add indexes to ${collectionId}:`, error.message);
  }
}

async function verifyIndexes() {
  try {
    console.log('🔍 Verifying indexes...');
    
    const collections = await databases.listCollections(config.databaseId);
    
    for (const collection of collections.collections) {
      console.log(`\n📋 ${collection.name} (${collection.$id})`);
      
      try {
        const indexes = await databases.listIndexes(config.databaseId, collection.$id);
        console.log(`  🔍 ${indexes.indexes.length} indexes`);
        
        // List index names
        indexes.indexes.forEach(index => {
          console.log(`    - ${index.key} (${index.type}) on [${index.attributes.join(', ')}]`);
        });
        
      } catch (error) {
        console.log(`  ⚠️  Could not list indexes: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to verify indexes:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Phase 3: Adding Indexes to Collections');
    console.log('==========================================');
    
    // Test connection
    console.log('🔌 Testing connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Add indexes to each collection
    for (const [collectionId, indexes] of Object.entries(collectionIndexes)) {
      await addIndexesToCollection(collectionId, indexes);
      console.log(''); // Empty line for readability
    }
    
    // Verify everything
    console.log('\n🔍 Final verification...');
    await verifyIndexes();
    
    console.log('\n🎉 All indexes added successfully!');
    console.log('📋 Next: Update environment variables and test the new structure');
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
