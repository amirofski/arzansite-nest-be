const { Client, Databases } = require('node-appwrite');

// Configuration - update these values
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'your-project-id';
const APPWRITE_API_KEY = 'your-api-key';
const APPWRITE_DATABASE_ID = 'your-database-id';

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function cleanupOrdersTable() {
    console.log('🧹 Cleaning up Orders Table...\n');
    
    try {
        // Find the orders collection
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        const ordersCollection = collections.collections.find(c => c.name === 'orders');
        
        if (!ordersCollection) {
            console.log('❌ Orders collection not found');
            return;
        }
        
        console.log(`📋 Found orders collection: ${ordersCollection.$id}\n`);
        
        // List of attributes to delete (duplicates/conflicts)
        const attributesToDelete = [
            'price',           // Duplicate of totalAmount
            'created_at',      // Snake_case version of createdAt
            'updated_at'       // Snake_case version of updatedAt
        ];
        
        console.log('🗑️  Attributes to delete:');
        attributesToDelete.forEach(attr => console.log(`   - ${attr}`));
        
        console.log('\n⚠️  WARNING: This will permanently delete these attributes!');
        console.log('Make sure you have a backup before proceeding.\n');
        
        // Check if attributes exist before trying to delete
        const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, ordersCollection.$id);
        const existingAttributes = attributes.attributes.map(attr => attr.key);
        
        for (const attrName of attributesToDelete) {
            if (existingAttributes.includes(attrName)) {
                try {
                    console.log(`🗑️  Deleting ${attrName}...`);
                    await databases.deleteAttribute(APPWRITE_DATABASE_ID, ordersCollection.$id, attrName);
                    console.log(`✅ Successfully deleted ${attrName}`);
                } catch (error) {
                    console.log(`❌ Failed to delete ${attrName}: ${error.message}`);
                }
            } else {
                console.log(`ℹ️  ${attrName} not found, skipping...`);
            }
        }
        
        console.log('\n🎉 Cleanup completed!');
        console.log('\n📊 Current orders table structure:');
        
        // Show final structure
        const finalAttributes = await databases.listAttributes(APPWRITE_DATABASE_ID, ordersCollection.$id);
        finalAttributes.attributes.forEach(attr => {
            const status = attr.required ? 'REQUIRED' : 'OPTIONAL';
            console.log(`   ${attr.key} (${attr.type}) - ${status}`);
        });
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
}

// Run cleanup
cleanupOrdersTable();
