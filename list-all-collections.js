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
  console.error('❌ APPWRITE_API_KEY is required in environment variables');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

async function listAllCollections() {
  try {
    console.log('🔍 Listing all collections in database...');
    
    const collections = await databases.listCollections(config.databaseId);
    
    console.log(`📊 Found ${collections.collections.length} collections:\n`);
    
    for (const collection of collections.collections) {
      console.log(`📋 Collection: ${collection.name} (${collection.$id})`);
      
      try {
        const attributes = await databases.listAttributes(
          config.databaseId,
          collection.$id
        );
        
        console.log(`  🔧 Attributes (${attributes.attributes.length}):`);
        attributes.attributes.forEach(attr => {
          const status = attr.status === 'available' ? '✅' : 
                        attr.status === 'processing' ? '⏳' : '❌';
          console.log(`    ${status} ${attr.key}: ${attr.type} (${attr.status})`);
        });
        
        // Check if this collection has order-related fields
        const orderFields = ['order_number', 'currency', 'user_id', 'title', 'total_amount'];
        const hasOrderFields = orderFields.filter(field => 
          attributes.attributes.some(attr => attr.key === field)
        );
        
        if (hasOrderFields.length > 0) {
          console.log(`  🎯 Order-related fields found: ${hasOrderFields.join(', ')}`);
        }
        
        console.log('');
        
      } catch (attrError) {
        console.log(`  ❌ Could not get attributes: ${attrError.message}`);
        console.log('');
      }
    }
    
    // Look for collections that might contain order data
    console.log('🔍 Looking for collections with order data...');
    const orderCollections = collections.collections.filter(col => 
      col.name.toLowerCase().includes('order') || 
      col.name.toLowerCase().includes('enhanced')
    );
    
    if (orderCollections.length > 0) {
      console.log('\n📦 Potential order collections:');
      orderCollections.forEach(col => {
        console.log(`  - ${col.name} (${col.$id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing collections:', error);
  }
}

// Run the listing
listAllCollections()
  .then(() => {
    console.log('\n🎉 Collection listing completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Collection listing failed:', error);
    process.exit(1);
  });
