const { databases, client } = require('./appwrite-schema');

// Configuration
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';

async function testConnection() {
    try {
        console.log('🔍 Testing Appwrite connection...');
        console.log(`📊 Project ID: ${process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43'}`);
        console.log(`🗄️  Database ID: ${APPWRITE_DATABASE_ID}`);
        console.log('');
        
        // Test database access
        console.log('📋 Checking database...');
        const database = await databases.get(APPWRITE_DATABASE_ID);
        console.log(`✅ Database found: ${database.name} (${database.$id})`);
        console.log('');
        
        // List existing collections
        console.log('📚 Listing existing collections...');
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        
        if (collections.collections.length === 0) {
            console.log('ℹ️  No collections found in the database');
        } else {
            console.log(`📊 Found ${collections.collections.length} collection(s):`);
            collections.collections.forEach((collection, index) => {
                console.log(`  ${index + 1}. ${collection.name} (${collection.$id})`);
                console.log(`     - Document Security: ${collection.documentSecurity ? 'Enabled' : 'Disabled'}`);
                console.log(`     - Created: ${new Date(collection.$createdAt).toLocaleString()}`);
                console.log('');
            });
        }
        
        console.log('🎉 Connection test completed successfully!');
        
    } catch (error) {
        console.error('💥 Connection test failed:', error.message);
        
        if (error.code === 401) {
            console.error('❌ Authentication failed. Check your API key.');
        } else if (error.code === 404) {
            console.error('❌ Database not found. Check your database ID.');
        } else if (error.code === 403) {
            console.error('❌ Permission denied. Check your API key permissions.');
        }
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testConnection();
}

module.exports = { testConnection };
