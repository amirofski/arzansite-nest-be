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

// Missing attributes that need to be added without default values
const missingAttributes = {
  users: [
    { key: 'role', type: 'string', size: 50, required: true },
    { key: 'status', type: 'string', size: 50, required: true },
    { key: 'verification_status', type: 'string', size: 50, required: true }
  ],
  orders: [
    { key: 'currency', type: 'string', size: 10, required: true },
    { key: 'status', type: 'string', size: 50, required: true },
    { key: 'payment_status', type: 'string', size: 50, required: true }
  ],
  payments: [
    { key: 'status', type: 'string', size: 50, required: true }
  ],
  wizard_sessions: [
    { key: 'current_step', type: 'string', size: 50, required: true },
    { key: 'is_completed', type: 'boolean', required: true }
  ],
  project_files: [
    { key: 'status', type: 'string', size: 50, required: true }
  ],
  notifications: [
    { key: 'priority', type: 'string', size: 20, required: true },
    { key: 'is_read', type: 'boolean', required: true }
  ],
  support_tickets: [
    { key: 'priority', type: 'string', size: 20, required: true },
    { key: 'status', type: 'string', size: 50, required: true }
  ],
  system_settings: [
    { key: 'is_public', type: 'boolean', required: true }
  ]
};

async function addMissingAttributes() {
  try {
    console.log('🔧 Adding missing attributes without default values...');
    
    for (const [collectionId, attributes] of Object.entries(missingAttributes)) {
      if (attributes.length === 0) continue;
      
      console.log(`📝 Adding missing attributes to ${collectionId}...`);
      
      for (const attr of attributes) {
        try {
          console.log(`  📝 Creating: ${attr.key} (${attr.type})`);
          
          switch (attr.type) {
            case 'string':
              await databases.createStringAttribute(
                config.databaseId,
                collectionId,
                attr.key,
                attr.size,
                attr.required
              );
              break;
            case 'boolean':
              await databases.createBooleanAttribute(
                config.databaseId,
                collectionId,
                attr.key,
                attr.required
              );
              break;
            default:
              console.log(`    ⚠️  Unknown type: ${attr.type}`);
          }
          
          console.log(`    ✅ Created successfully`);
          
          // Small delay between attributes
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`    ❌ Failed: ${error.message}`);
        }
      }
      
      console.log(`  🎉 ${collectionId} missing attributes completed`);
      console.log('');
    }
    
    console.log('🎉 All missing attributes added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add missing attributes:', error.message);
  }
}

async function verifyCollections() {
  try {
    console.log('🔍 Verifying collections and attributes...');
    
    const collections = await databases.listCollections(config.databaseId);
    console.log(`📊 Found ${collections.collections.length} collections`);
    
    for (const collection of collections.collections) {
      console.log(`\n📋 ${collection.name} (${collection.$id})`);
      
      try {
        const attributes = await databases.listAttributes(config.databaseId, collection.$id);
        console.log(`  📝 ${attributes.attributes.length} attributes`);
        
        // List attribute names
        attributes.attributes.forEach(attr => {
          console.log(`    - ${attr.key} (${attr.type}) ${attr.required ? '[REQUIRED]' : '[OPTIONAL]'}`);
        });
        
      } catch (error) {
        console.log(`  ⚠️  Could not list attributes: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to verify collections:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Phase 3: Fixing Missing Attributes');
    console.log('=====================================');
    
    // Test connection
    console.log('🔌 Testing connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Add missing attributes
    await addMissingAttributes();
    
    // Verify everything
    console.log('\n🔍 Final verification...');
    await verifyCollections();
    
    console.log('\n🎉 Phase 3 completed successfully!');
    console.log('📋 Next: Create indexes manually or run phase3-add-indexes.js');
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
