const { Client, Databases } = require('node-appwrite');

// Load environment variables
require('dotenv').config({ path: './appwrite-config.env' });

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://app.arzansite.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';

// Initialize Appwrite client with latest patterns
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function testConnection() {
    try {
        console.log('🔍 Testing Appwrite connection...');
        console.log(`📊 Project ID: ${APPWRITE_PROJECT_ID}`);
        console.log(`🗄️  Database ID: ${APPWRITE_DATABASE_ID}`);
        console.log(`🔗 Endpoint: ${APPWRITE_ENDPOINT}`);
        console.log('');
        
        // Test database access
        console.log('📋 Checking database...');
        const database = await databases.get(APPWRITE_DATABASE_ID);
        console.log(`✅ Database found: ${database.name} (${database.$id})`);
        console.log(`   - Created: ${new Date(database.$createdAt).toLocaleString()}`);
        console.log(`   - Enabled: ${database.enabled ? 'Yes' : 'No'}`);
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
                console.log(`     - Enabled: ${collection.enabled ? 'Yes' : 'No'}`);
                console.log(`     - Created: ${new Date(collection.$createdAt).toLocaleString()}`);
                console.log('');
            });
        }
        
        // Test basic operations
        console.log('🧪 Testing basic operations...');
        
        // Test listing databases
        const allDatabases = await databases.list();
        console.log(`✅ Successfully listed ${allDatabases.total} database(s)`);
        
        console.log('');
        console.log('🎉 Connection test completed successfully!');
        console.log('✅ All Appwrite operations are working correctly');
        
    } catch (error) {
        console.error('💥 Connection test failed:', error.message);
        
        if (error.code === 401) {
            console.error('❌ Authentication failed. Check your API key.');
            console.error('   Make sure your API key has the correct permissions.');
        } else if (error.code === 404) {
            console.error('❌ Database not found. Check your database ID.');
            console.error('   Verify that the database exists in your Appwrite project.');
        } else if (error.code === 403) {
            console.error('❌ Permission denied. Check your API key permissions.');
            console.error('   Ensure your API key has access to databases and collections.');
        } else if (error.code === 0) {
            console.error('❌ Network error. Check your endpoint URL.');
            console.error('   Verify that your Appwrite server is accessible.');
        }
        
        console.error('');
        console.error('🔧 Troubleshooting tips:');
        console.error('1. Check your .env file or appwrite-config.env file');
        console.error('2. Verify your Appwrite project is running');
        console.error('3. Ensure your API key has the correct scopes');
        console.error('4. Check your network connection');
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testConnection();
}

module.exports = { testConnection, client, databases };
