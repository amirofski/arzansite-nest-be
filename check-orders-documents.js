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

async function checkOrdersDocuments() {
  try {
    console.log('🔍 Checking orders collection documents...');
    
    // Get collection details
    const collection = await databases.getCollection(
      config.databaseId,
      config.ordersCollection
    );
    
    console.log(`📋 Collection: ${collection.name} (${collection.$id})`);
    
    // Try to list documents
    try {
      const documents = await databases.listDocuments(
        config.databaseId,
        config.ordersCollection,
        []
      );
      
      console.log(`\n📊 Found ${documents.documents.length} documents`);
      
      if (documents.documents.length > 0) {
        console.log('\n📄 Sample document structure:');
        const sampleDoc = documents.documents[0];
        Object.keys(sampleDoc).forEach(key => {
          if (!key.startsWith('$')) {
            console.log(`  - ${key}: ${typeof sampleDoc[key]} = ${JSON.stringify(sampleDoc[key]).substring(0, 100)}`);
          }
        });
        
        // Check if any document has order_number or currency
        const hasOrderNumber = documents.documents.some(doc => doc.order_number);
        const hasCurrency = documents.documents.some(doc => doc.currency);
        
        console.log('\n🔍 Field Availability Check:');
        console.log(`  - order_number: ${hasOrderNumber ? '✅ EXISTS in documents' : '❌ NOT FOUND in documents'}`);
        console.log(`  - currency: ${hasCurrency ? '✅ EXISTS in documents' : '❌ NOT FOUND in documents'}`);
        
        if (hasOrderNumber || hasCurrency) {
          console.log('\n📋 Documents with these fields:');
          documents.documents.forEach((doc, index) => {
            if (doc.order_number || doc.currency) {
              console.log(`  Document ${index + 1}:`);
              if (doc.order_number) console.log(`    order_number: ${doc.order_number}`);
              if (doc.currency) console.log(`    currency: ${doc.currency}`);
            }
          });
        }
      } else {
        console.log('\n📝 No documents found - collection is empty');
      }
      
    } catch (docError) {
      console.error('❌ Error listing documents:', docError.message);
      
      if (docError.code === 400) {
        console.log('\n💡 This might indicate a schema mismatch or missing required fields');
      }
    }
    
    // Also check the collection attributes again
    console.log('\n🔧 Collection attributes (recheck):');
    const attributes = await databases.listAttributes(
      config.databaseId,
      config.ordersCollection
    );
    
    const orderNumberAttr = attributes.attributes.find(attr => attr.key === 'order_number');
    const currencyAttr = attributes.attributes.find(attr => attr.key === 'currency');
    
    if (orderNumberAttr) {
      console.log(`  ✅ order_number: ${orderNumberAttr.type} (${orderNumberAttr.status})`);
    } else {
      console.log(`  ❌ order_number: NOT FOUND`);
    }
    
    if (currencyAttr) {
      console.log(`  ✅ currency: ${currencyAttr.type} (${currencyAttr.status})`);
    } else {
      console.log(`  ❌ currency: NOT FOUND`);
    }
    
  } catch (error) {
    console.error('❌ Error checking orders documents:', error);
  }
}

// Run the check
checkOrdersDocuments()
  .then(() => {
    console.log('\n🎉 Document check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Document check failed:', error);
    process.exit(1);
  });
