const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5',
  userRolesCollection: '68b597bc00026c2fc802'
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

async function checkCollectionStatus() {
  try {
    console.log('🔍 Checking user_roles collection status...');
    
    // Get collection details
    const collection = await databases.getCollection(
      config.databaseId,
      config.userRolesCollection
    );
    
    console.log(`📋 Collection: ${collection.name} (${collection.$id})`);
    console.log(`📊 Document count: ${collection.documentSecurity ? 'Unknown' : 'Available'}`);
    
    // Get collection attributes
    const attributes = await databases.listAttributes(
      config.databaseId,
      config.userRolesCollection
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
    
    // Check if we can create documents
    if (attributes.attributes.every(attr => attr.status === 'available')) {
      console.log('\n✅ All attributes are ready! Collection can be used.');
      
      // Try to create a test document
      console.log('\n🧪 Testing document creation...');
      try {
        const testDoc = await databases.createDocument(
          config.databaseId,
          config.userRolesCollection,
          'test-doc-' + Date.now(),
          {
            user_id: 'test-user-' + Date.now(),
            role: 'user',
            created_at: new Date().toISOString()
          }
        );
        console.log('✅ Test document created successfully!');
        
        // Clean up test document
        await databases.deleteDocument(
          config.databaseId,
          config.userRolesCollection,
          testDoc.$id
        );
        console.log('🧹 Test document cleaned up');
        
      } catch (testError) {
        console.error('❌ Test document creation failed:', testError.message);
      }
      
    } else {
      console.log('\n⏳ Some attributes are still processing. Please wait...');
      console.log('💡 This can take a few minutes for new collections.');
    }

  } catch (error) {
    console.error('❌ Error checking collection status:', error);
  }
}

// Run the check
checkCollectionStatus()
  .then(() => {
    console.log('\n🎉 Status check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Status check failed:', error);
    process.exit(1);
  });
