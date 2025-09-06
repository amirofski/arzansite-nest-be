const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env' });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkCollectionAttributes() {
  try {
    console.log('🔍 Checking user_profiles collection attributes...');
    
    // Get collection details
    const collection = await databases.getCollection({
      databaseId: process.env.APPWRITE_DATABASE_ID,
      collectionId: 'user_profiles'
    });
    
    console.log('📋 Collection attributes:');
    collection.attributes.forEach(attr => {
      console.log(`  - ${attr.key}: ${attr.type} (required: ${attr.required})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCollectionAttributes();



