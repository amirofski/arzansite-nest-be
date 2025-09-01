const { Client, Databases, ID } = require('node-appwrite');
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

async function fixOrdersCollection() {
  try {
    console.log('🔍 Fixing orders collection schema...');
    
    // First, let's check what fields currently exist
    const attributes = await databases.listAttributes(
      config.databaseId,
      config.ordersCollection
    );
    
    console.log(`📊 Current attributes (${attributes.attributes.length}):`);
    const existingFields = attributes.attributes.map(attr => attr.key);
    existingFields.forEach(field => console.log(`  - ${field}`));
    
    // Check what fields are missing
    const requiredFields = ['order_number', 'currency'];
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length === 0) {
      console.log('\n✅ All required fields already exist!');
      return;
    }
    
    console.log(`\n❌ Missing fields: ${missingFields.join(', ')}`);
    
    // Add missing fields
    for (const field of missingFields) {
      console.log(`\n📝 Adding ${field} field...`);
      
      try {
        if (field === 'order_number') {
          await databases.createStringAttribute(
            config.databaseId,
            config.ordersCollection,
            'order_number',
            50,
            true
          );
          console.log('✅ order_number field added successfully');
        } else if (field === 'currency') {
          await databases.createStringAttribute(
            config.databaseId,
            config.ordersCollection,
            'currency',
            3,
            true
          );
          console.log('✅ currency field added successfully');
        }
      } catch (error) {
        if (error.code === 409) {
          console.log(`ℹ️ ${field} field already exists`);
        } else {
          console.error(`❌ Failed to add ${field}:`, error.message);
          throw error;
        }
      }
    }
    
    // Create indexes for better performance
    console.log('\n🔍 Creating indexes...');
    
    try {
      await databases.createIndex(
        config.databaseId,
        config.ordersCollection,
        ID.unique(),
        'order_number_index',
        'key',
        ['order_number']
      );
      console.log('✅ order_number index created');
    } catch (indexError) {
      console.log('ℹ️ order_number index already exists or failed to create');
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const updatedAttributes = await databases.listAttributes(
      config.databaseId,
      config.ordersCollection
    );
    
    const updatedFields = updatedAttributes.attributes.map(attr => attr.key);
    const stillMissing = requiredFields.filter(field => !updatedFields.includes(field));
    
    if (stillMissing.length === 0) {
      console.log('✅ All required fields are now available!');
      console.log('\n🚀 The wizard complete-order endpoint should now work!');
    } else {
      console.log(`❌ Still missing: ${stillMissing.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing orders collection:', error);
    throw error;
  }
}

// Run the fix
fixOrdersCollection()
  .then(() => {
    console.log('\n🎉 Orders collection fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Orders collection fix failed:', error);
    process.exit(1);
  });
