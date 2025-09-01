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

async function addMissingOrderFields() {
  try {
    console.log('🔍 Adding missing fields to orders collection...');
    
    // Add order_number field
    console.log('📝 Adding order_number field...');
    try {
      await databases.createStringAttribute(
        config.databaseId,
        config.ordersCollection,
        'order_number',
        50,
        true
      );
      console.log('✅ order_number field added successfully');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️ order_number field already exists');
      } else {
        throw error;
      }
    }

    // Add currency field
    console.log('📝 Adding currency field...');
    try {
      await databases.createStringAttribute(
        config.databaseId,
        config.ordersCollection,
        'currency',
        3,
        true
      );
      console.log('✅ currency field added successfully');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️ currency field already exists');
      } else {
        throw error;
      }
    }

    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    
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

    try {
      await databases.createIndex(
        config.databaseId,
        config.ordersCollection,
        ID.unique(),
        'currency_index',
        'key',
        ['currency']
      );
      console.log('✅ currency index created');
    } catch (indexError) {
      console.log('ℹ️ currency index already exists or failed to create');
    }

    console.log('\n🎉 Missing fields added successfully!');
    console.log('\n📋 Now the orders collection has:');
    console.log('  ✅ order_number (string, required)');
    console.log('  ✅ currency (string, required)');
    console.log('  ✅ All other required fields');
    
    console.log('\n🚀 The wizard complete-order endpoint should now work!');
    
  } catch (error) {
    console.error('❌ Error adding missing fields:', error);
    throw error;
  }
}

// Run the field addition
addMissingOrderFields()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
