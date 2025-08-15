// Load environment variables from .env manually (without external deps)
try {
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1);
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // ignore env load errors; fall back to existing env
}

const { Client, Databases } = require('node-appwrite');

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://app.arzansite.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Indexes to create for each collection
const indexesToCreate = {
    invoices: [
        { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
        { key: 'order_id_idx', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
        { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
        { key: 'due_date_idx', type: 'key', attributes: ['due_date'], orders: ['ASC'] },
        { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
    ],
    receipts: [
        { key: 'invoice_id_idx', type: 'key', attributes: ['invoice_id'], orders: ['ASC'] },
        { key: 'ref_id_idx', type: 'key', attributes: ['ref_id'], orders: ['ASC'] },
        { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
    ],
    wallet_adjustments: [
        { key: 'wallet_id_idx', type: 'key', attributes: ['wallet_id'], orders: ['ASC'] },
        { key: 'admin_id_idx', type: 'key', attributes: ['admin_id'], orders: ['ASC'] },
        { key: 'type_idx', type: 'key', attributes: ['type'], orders: ['ASC'] },
        { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
    ]
};

// Helper function to create index
async function createIndex(collectionId, index) {
    try {
        const { key, type, attributes, orders } = index;

        // Appwrite v13: createIndex(db, col, key, type, attributes, orders?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            type,
            attributes,
            orders || ['ASC']
        ];

        await databases.createIndex(...params);
        
        console.log(`✅ Created index: ${key} (${type})`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Index ${index.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create index ${index.key}:`, error.message);
        return false;
    }
}

// Function to get collection ID by name
async function getCollectionId(collectionName) {
    try {
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        const collection = collections.collections.find(col => col.name === collectionName);
        return collection ? collection.$id : null;
    } catch (error) {
        console.error(`❌ Error getting collection ID for ${collectionName}:`, error.message);
        return null;
    }
}

// Main function to create indexes
async function createIndexes() {
    try {
        console.log('🚀 Starting index creation for Wallet & Invoice Management collections...');
        console.log(`📊 Database ID: ${APPWRITE_DATABASE_ID}`);
        console.log(`🔑 Project ID: ${process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43'}`);
        console.log('');
        
        let totalIndexes = 0;
        let successCount = 0;
        
        for (const [collectionName, indexes] of Object.entries(indexesToCreate)) {
            console.log(`🔄 Processing indexes for collection: ${collectionName}`);
            
            const collectionId = await getCollectionId(collectionName);
            if (!collectionId) {
                console.log(`❌ Collection ${collectionName} not found, skipping...`);
                continue;
            }
            
            console.log(`📝 Collection ID: ${collectionId}`);
            
            for (const index of indexes) {
                totalIndexes++;
                const result = await createIndex(collectionId, index);
                if (result) {
                    successCount++;
                }
            }
            
            console.log('');
        }
        
        console.log('🎉 Index creation completed!');
        console.log(`✅ Successfully created: ${successCount}/${totalIndexes} indexes`);
        
        if (successCount < totalIndexes) {
            console.log('⚠️  Some indexes failed to create. Check the logs above for details.');
        }
        
    } catch (error) {
        console.error('💥 Fatal error during index creation:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createIndexes();
}

module.exports = { createIndexes };
