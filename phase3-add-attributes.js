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

// Attributes for each collection
const collectionAttributes = {
  users: [
    { key: 'email', type: 'string', size: 255, required: true },
    { key: 'full_name', type: 'string', size: 255, required: true },
    { key: 'phone', type: 'string', size: 20, required: false },
    { key: 'avatar_url', type: 'string', size: 500, required: false },
    { key: 'role', type: 'string', size: 50, required: true, default: 'user' },
    { key: 'status', type: 'string', size: 50, required: true, default: 'active' },
    { key: 'verification_status', type: 'string', size: 50, required: true, default: 'unverified' },
    { key: 'email_verified_at', type: 'datetime', required: false },
    { key: 'last_login_at', type: 'datetime', required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  orders: [
    { key: 'user_id', type: 'string', size: 36, required: true },
    { key: 'order_number', type: 'string', size: 50, required: true },
    { key: 'title', type: 'string', size: 255, required: true },
    { key: 'description', type: 'string', size: 1000, required: true },
    { key: 'total_amount', type: 'integer', required: true },
    { key: 'currency', type: 'string', size: 10, required: true, default: 'IRR' },
    { key: 'status', type: 'string', size: 50, required: true, default: 'pending' },
    { key: 'payment_status', type: 'string', size: 50, required: true, default: 'pending' },
    { key: 'site_type', type: 'string', size: 50, required: true },
    { key: 'comments', type: 'string', size: 1000, required: false },
    { key: 'session_id', type: 'string', size: 100, required: false },
    { key: 'wizard_data', type: 'string', size: 10000, required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  payments: [
    { key: 'order_id', type: 'string', size: 36, required: true },
    { key: 'user_id', type: 'string', size: 36, required: true },
    { key: 'payment_gateway', type: 'string', size: 50, required: true },
    { key: 'gateway_transaction_id', type: 'string', size: 255, required: false },
    { key: 'gateway_authority', type: 'string', size: 255, required: false },
    { key: 'gateway_ref_id', type: 'string', size: 255, required: false },
    { key: 'amount', type: 'integer', required: true },
    { key: 'currency', type: 'string', size: 10, required: true },
    { key: 'status', type: 'string', size: 50, required: true, default: 'pending' },
    { key: 'failure_reason', type: 'string', size: 500, required: false },
    { key: 'paid_at', type: 'datetime', required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  wizard_sessions: [
    { key: 'session_id', type: 'string', size: 100, required: true },
    { key: 'user_id', type: 'string', size: 36, required: false },
    { key: 'current_step', type: 'string', size: 50, required: true, default: 'start' },
    { key: 'design_data', type: 'string', size: 50000, required: false },
    { key: 'progress_data', type: 'string', size: 10000, required: false },
    { key: 'is_completed', type: 'boolean', required: true, default: false },
    { key: 'last_activity', type: 'datetime', required: true },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  project_files: [
    { key: 'user_id', type: 'string', size: 36, required: true },
    { key: 'order_id', type: 'string', size: 36, required: false },
    { key: 'file_name', type: 'string', size: 255, required: true },
    { key: 'file_path', type: 'string', size: 500, required: true },
    { key: 'file_type', type: 'string', size: 100, required: true },
    { key: 'file_size', type: 'integer', required: true },
    { key: 'mime_type', type: 'string', size: 100, required: true },
    { key: 'storage_bucket', type: 'string', size: 100, required: true },
    { key: 'status', type: 'string', size: 50, required: true, default: 'active' },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  notifications: [
    { key: 'user_id', type: 'string', size: 36, required: true },
    { key: 'title', type: 'string', size: 255, required: true },
    { key: 'message', type: 'string', size: 1000, required: true },
    { key: 'type', type: 'string', size: 50, required: true },
    { key: 'priority', type: 'string', size: 20, required: true, default: 'normal' },
    { key: 'is_read', type: 'boolean', required: true, default: false },
    { key: 'action_url', type: 'string', size: 500, required: false },
    { key: 'read_at', type: 'datetime', required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  user_profiles: [
    { key: 'user_id', type: 'string', size: 36, required: true },
    { key: 'company_name', type: 'string', size: 255, required: false },
    { key: 'job_title', type: 'string', size: 100, required: false },
    { key: 'bio', type: 'string', size: 1000, required: false },
    { key: 'website', type: 'string', size: 255, required: false },
    { key: 'location', type: 'string', size: 255, required: false },
    { key: 'social_links', type: 'string', size: 2000, required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  support_tickets: [
    { key: 'user_id', type: 'string', size: 36, required: true },
    { key: 'ticket_number', type: 'string', size: 50, required: true },
    { key: 'subject', type: 'string', size: 255, required: true },
    { key: 'description', type: 'string', size: 5000, required: true },
    { key: 'priority', type: 'string', size: 20, required: true, default: 'medium' },
    { key: 'status', type: 'string', size: 50, required: true, default: 'open' },
    { key: 'category', type: 'string', size: 100, required: true },
    { key: 'assigned_to', type: 'string', size: 36, required: false },
    { key: 'resolved_at', type: 'datetime', required: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ],
  audit_logs: [
    { key: 'user_id', type: 'string', size: 36, required: false },
    { key: 'action', type: 'string', size: 100, required: true },
    { key: 'resource_type', type: 'string', size: 100, required: true },
    { key: 'resource_id', type: 'string', size: 36, required: false },
    { key: 'ip_address', type: 'string', size: 45, required: true },
    { key: 'user_agent', type: 'string', size: 500, required: true },
    { key: 'details', type: 'string', size: 5000, required: false },
    { key: 'created_at', type: 'datetime', required: true }
  ],
  system_settings: [
    { key: 'setting_key', type: 'string', size: 100, required: true },
    { key: 'setting_value', type: 'string', size: 10000, required: true },
    { key: 'description', type: 'string', size: 500, required: false },
    { key: 'category', type: 'string', size: 100, required: true },
    { key: 'is_public', type: 'boolean', required: true, default: false },
    { key: 'created_at', type: 'datetime', required: true },
    { key: 'updated_at', type: 'datetime', required: true }
  ]
};

async function addAttributesToCollection(collectionId, attributes) {
  try {
    console.log(`📝 Adding attributes to ${collectionId}...`);
    
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
              attr.required,
              attr.default
            );
            break;
          case 'integer':
            await databases.createIntegerAttribute(
              config.databaseId,
              collectionId,
              attr.key,
              attr.required,
              attr.default
            );
            break;
          case 'boolean':
            await databases.createBooleanAttribute(
              config.databaseId,
              collectionId,
              attr.key,
              attr.required,
              attr.default
            );
            break;
          case 'datetime':
            await databases.createDatetimeAttribute(
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
    
    console.log(`  🎉 ${collectionId} attributes completed`);
    
  } catch (error) {
    console.error(`❌ Failed to add attributes to ${collectionId}:`, error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Phase 3: Adding Attributes to Collections');
    console.log('=============================================');
    
    // Test connection
    console.log('🔌 Testing connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Add attributes to each collection
    for (const [collectionId, attributes] of Object.entries(collectionAttributes)) {
      await addAttributesToCollection(collectionId, attributes);
      console.log(''); // Empty line for readability
    }
    
    console.log('🎉 All attributes added successfully!');
    console.log('📋 Next: Create indexes manually or run phase3-add-indexes.js');
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
