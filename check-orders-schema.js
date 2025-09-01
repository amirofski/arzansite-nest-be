const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5',
  ordersCollection: 'orders'
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

async function checkOrdersSchema() {
  try {
    console.log('🔍 Checking orders collection schema...');
    
    // Get collection details
    const collection = await databases.getCollection(
      config.databaseId,
      config.ordersCollection
    );
    
    console.log(`📋 Collection: ${collection.name} (${collection.$id})`);
    
    // Get collection attributes
    const attributes = await databases.listAttributes(
      config.databaseId,
      config.ordersCollection
    );
    
    console.log(`\n🔧 Attributes (${attributes.attributes.length}):`);
    attributes.attributes.forEach(attr => {
      console.log(`  - ${attr.key}: ${attr.type} (${attr.status})`);
      if (attr.status === 'processing') {
        console.log(`    ⏳ Still processing...`);
      } else if (attr.status === 'available') {
        console.log(`    ✅ Ready to use`);
      } else if (attr.status === 'failed') {
        console.log(`    ❌ Failed: ${attr.error || 'Unknown error'}`);
      }
    });
    
    // Check for specific fields that the wizard service needs
    const requiredFields = [
      'user_id', 'order_number', 'title', 'description', 'total_amount', 
      'currency', 'status', 'payment_status', 'created_at', 'updated_at'
    ];
    
    const existingFields = attributes.attributes.map(attr => attr.key);
    
    console.log('\n🎯 Field Analysis:');
    requiredFields.forEach(field => {
      if (existingFields.includes(field)) {
        console.log(`  ✅ ${field} - EXISTS`);
      } else {
        console.log(`  ❌ ${field} - MISSING`);
      }
    });
    
    // Check for camelCase vs snake_case conflicts
    console.log('\n🔍 Field Naming Conflicts:');
    const conflicts = [];
    
    if (existingFields.includes('orderNumber') && existingFields.includes('order_number')) {
      conflicts.push('Both orderNumber and order_number exist');
    }
    if (existingFields.includes('totalAmount') && existingFields.includes('total_amount')) {
      conflicts.push('Both totalAmount and total_amount exist');
    }
    if (existingFields.includes('createdAt') && existingFields.includes('created_at')) {
      conflicts.push('Both createdAt and created_at exist');
    }
    if (existingFields.includes('updatedAt') && existingFields.includes('updated_at')) {
      conflicts.push('Both updatedAt and updated_at exist');
    }
    
    if (conflicts.length > 0) {
      conflicts.forEach(conflict => console.log(`  ⚠️  ${conflict}`));
    } else {
      console.log('  ✅ No naming conflicts found');
    }
    
    // Show what the wizard service is trying to send
    console.log('\n📤 What Wizard Service is Trying to Send:');
    console.log('  - user_id: ✅ (should work)');
    console.log('  - orderNumber: ❌ (should be order_number)');
    console.log('  - title: ✅ (should work)');
    console.log('  - description: ✅ (should work)');
    console.log('  - total_amount: ✅ (should work)');
    console.log('  - currency: ✅ (should work)');
    console.log('  - status: ✅ (should work)');
    console.log('  - payment_status: ✅ (should work)');
    console.log('  - created_at: ✅ (should work)');
    console.log('  - updated_at: ✅ (should work)');
    
  } catch (error) {
    console.error('❌ Error checking orders schema:', error);
    
    if (error.code === 404) {
      console.error('\n💡 The orders collection might not exist. Let\'s check available collections:');
      try {
        const collections = await databases.listCollections(config.databaseId);
        console.log('Available collections:');
        collections.collections.forEach(col => {
          console.log(`  - ${col.name} (${col.$id})`);
        });
      } catch (colError) {
        console.error('Could not list collections:', colError.message);
      }
    }
  }
}

// Run the check
checkOrdersSchema()
  .then(() => {
    console.log('\n🎉 Schema check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Schema check failed:', error);
    process.exit(1);
  });
