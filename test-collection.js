const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function testCollection() {
  try {
    console.log('🔍 Testing user_profiles collection...');
    
    // Try to create a test document
    const testDoc = await databases.createDocument({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      collectionId: 'user_profiles',
      documentId: ID.unique(),
      data: {
        user_id: 'test123',
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
    
    console.log('✅ Test document created successfully:', testDoc);
    
    // Clean up
    await databases.deleteDocument({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      collectionId: 'user_profiles',
      documentId: testDoc.$id
    });
    
    console.log('✅ Test document deleted successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
}

testCollection();



