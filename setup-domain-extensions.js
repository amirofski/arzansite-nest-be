const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function setupDomainExtensions() {
  try {
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = 'domain_extensions';
    
    console.log('🔍 Checking if domain_extensions collection exists...');
    
    try {
      const existing = await databases.getCollection(databaseId, collectionId);
      console.log('✅ domain_extensions collection already exists');
    } catch (error) {
      if (error.code === 404) {
        console.log('📝 Creating domain_extensions collection...');
        
        // Create the collection
        await databases.createCollection(databaseId, collectionId, 'Domain Extensions', []);
        console.log('✅ domain_extensions collection created');
        
        // Create attributes
        console.log('📝 Creating attributes...');
        
        await databases.createStringAttribute(databaseId, collectionId, 'extension', 20, true);
        await databases.createIntegerAttribute(databaseId, collectionId, 'price', true);
        await databases.createBooleanAttribute(databaseId, collectionId, 'available', true);
        await databases.createStringAttribute(databaseId, collectionId, 'description', 500, false);
        await databases.createBooleanAttribute(databaseId, collectionId, 'isDefault', true);
        await databases.createDatetimeAttribute(databaseId, collectionId, 'created_at', true);
        await databases.createDatetimeAttribute(databaseId, collectionId, 'updated_at', true);
        
        console.log('✅ domain_extensions attributes created');
        
        // Add some default extensions
        console.log('📝 Adding default domain extensions...');
        
        const defaultExtensions = [
          { extension: '.ir', price: 50000, available: true, description: 'Iranian domain', isDefault: true },
          { extension: '.com', price: 80000, available: true, description: 'Commercial domain', isDefault: false },
          { extension: '.org', price: 70000, available: true, description: 'Organization domain', isDefault: false },
          { extension: '.net', price: 75000, available: true, description: 'Network domain', isDefault: false },
          { extension: '.io', price: 120000, available: true, description: 'Tech domain', isDefault: false },
        ];
        
        for (const ext of defaultExtensions) {
          await databases.createDocument(databaseId, collectionId, require('node-appwrite').ID.unique(), {
            ...ext,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        
        console.log('✅ Default domain extensions added');
        
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Domain extensions setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up domain extensions:', error);
  }
}

setupDomainExtensions();
