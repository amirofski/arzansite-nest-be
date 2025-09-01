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

async function testFixedOrderCreation() {
  try {
    console.log('🧪 Testing FIXED order creation in orders collection...');
    
    // Test data with ONLY fields that exist in the orders collection
    const testOrderData = {
      user_id: 'test-user-' + Date.now(),
      title: 'Test Order',
      description: 'Test order description',
      total_amount: 1000000,
      status: 'pending',
      payment_status: 'pending',
      comments: 'Test comment',
      session_id: 'test-session-' + Date.now(),
      site_type: 'personal',
      wizard_data: JSON.stringify({ test: 'data' }),
      website_framework: JSON.stringify({ framework: 'test' }),
      additional_services: JSON.stringify({ services: 'test' }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('\n📤 Test data being sent (only existing fields):');
    Object.keys(testOrderData).forEach(key => {
      console.log(`  - ${key}: ${typeof testOrderData[key]} = ${JSON.stringify(testOrderData[key]).substring(0, 50)}`);
    });
    
    console.log('\n🚀 Attempting to create test document...');
    
    try {
      const testDoc = await databases.createDocument(
        config.databaseId,
        config.ordersCollection,
        ID.unique(),
        testOrderData
      );
      
      console.log('✅ Test document created successfully!');
      console.log(`📋 Document ID: ${testDoc.$id}`);
      
      // Verify the document was created with all fields
      console.log('\n🔍 Verifying created document...');
      const verifyDoc = await databases.getDocument(
        config.databaseId,
        config.ordersCollection,
        testDoc.$id
      );
      
      console.log('\n📄 Created document fields:');
      Object.keys(verifyDoc).forEach(key => {
        if (!key.startsWith('$')) {
          console.log(`  - ${key}: ${typeof verifyDoc[key]} = ${JSON.stringify(verifyDoc[key]).substring(0, 100)}`);
        }
      });
      
      // Clean up test document
      console.log('\n🧹 Cleaning up test document...');
      await databases.deleteDocument(
        config.databaseId,
        config.ordersCollection,
        testDoc.$id
      );
      console.log('✅ Test document cleaned up');
      
      console.log('\n🎉 SUCCESS! The orders collection now works with the correct fields.');
      console.log('🚀 The wizard complete-order endpoint should now work!');
      
    } catch (createError) {
      console.error('❌ Error creating test document:', createError.message);
      console.error('Error code:', createError.code);
      console.error('Error type:', createError.type);
      
      if (createError.response) {
        console.error('Error response:', createError.response);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testFixedOrderCreation()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
