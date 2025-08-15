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

const { Client, Databases, Account, Users } = require('node-appwrite');

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

// New collections for Wallet & Invoice Management System
const newCollections = {
    // Invoices collection
    invoices: {
        name: 'invoices',
        attributes: [
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'order_id', type: 'string', size: 36, required: true, array: false },
            { key: 'amount', type: 'double', required: true, array: false },
            { key: 'due_date', type: 'datetime', required: true, array: false },
            { key: 'status', type: 'string', size: 20, required: true, array: false, enum: ['pending', 'paid', 'overdue', 'cancelled'] },
            { key: 'description', type: 'string', size: 500, required: false, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'order_id_idx', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
            { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
            { key: 'due_date_idx', type: 'key', attributes: ['due_date'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    },

    // Receipts collection
    receipts: {
        name: 'receipts',
        attributes: [
            { key: 'invoice_id', type: 'string', size: 36, required: true, array: false },
            { key: 'ref_id', type: 'string', size: 100, required: true, array: false },
            { key: 'amount', type: 'double', required: true, array: false },
            { key: 'format', type: 'string', size: 10, required: true, array: false, enum: ['pdf', 'html'] },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'invoice_id_idx', type: 'key', attributes: ['invoice_id'], orders: ['ASC'] },
            { key: 'ref_id_idx', type: 'key', attributes: ['ref_id'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    },

    // Wallet adjustments collection
    wallet_adjustments: {
        name: 'wallet_adjustments',
        attributes: [
            { key: 'wallet_id', type: 'string', size: 36, required: true, array: false },
            { key: 'admin_id', type: 'string', size: 36, required: true, array: false },
            { key: 'amount', type: 'double', required: true, array: false },
            { key: 'type', type: 'string', size: 20, required: true, array: false, enum: ['credit', 'debit', 'correction'] },
            { key: 'reason', type: 'string', size: 500, required: true, array: false },
            { key: 'notes', type: 'string', size: 1000, required: false, array: false },
            { key: 'balance_before', type: 'double', required: true, array: false },
            { key: 'balance_after', type: 'double', required: true, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'wallet_id_idx', type: 'key', attributes: ['wallet_id'], orders: ['ASC'] },
            { key: 'admin_id_idx', type: 'key', attributes: ['admin_id'], orders: ['ASC'] },
            { key: 'type_idx', type: 'key', attributes: ['type'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    }
};

// Helper function to create string attribute
async function createStringAttribute(collectionId, attribute) {
    try {
        const { key, size, required, array, enum: enumValues } = attribute;

        // Appwrite v13: createStringAttribute(db, col, key, size, required?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            size || 255,
            required ?? false,
            null,
            array ?? false,
        ];

        await databases.createStringAttribute(...params);
        
        // If enum values are specified, create enum attribute
        if (enumValues && Array.isArray(enumValues)) {
            console.log(`✅ Created string attribute: ${key} (enum: ${enumValues.join(', ')})`);
        } else {
            console.log(`✅ Created string attribute: ${key}`);
        }
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  String attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create string attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create double attribute
async function createDoubleAttribute(collectionId, attribute) {
    try {
        const { key, required, array } = attribute;

        // Appwrite v13: createFloatAttribute(db, col, key, required?, min?, max?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            required ?? false,
            null,
            null,
            null,
            array ?? false,
        ];

        await databases.createFloatAttribute(...params);
        
        console.log(`✅ Created double attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Double attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create double attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create datetime attribute
async function createDatetimeAttribute(collectionId, attribute) {
    try {
        const { key, required, array } = attribute;

        // Appwrite v13: createDatetimeAttribute(db, col, key, required?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            required ?? false,
            null,
            array ?? false,
        ];

        await databases.createDatetimeAttribute(...params);
        
        console.log(`✅ Created datetime attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Datetime attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create datetime attribute ${attribute.key}:`, error.message);
        return false;
    }
}

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

// Function to create a collection
async function createCollection(collectionName, collectionConfig) {
    try {
        console.log(`🔄 Creating collection: ${collectionName}`);
        
        // Create collection with proper permissions
        const collection = await databases.createCollection(
            APPWRITE_DATABASE_ID,
            'unique()',
            collectionName,
            [] // Empty permissions array - no restrictions
        );
        
        console.log(`✅ Collection ${collectionName} created with ID: ${collection.$id}`);
        
        // Create attributes
        console.log(`📝 Creating attributes for ${collectionName}...`);
        for (const attribute of collectionConfig.attributes) {
            switch (attribute.type) {
                case 'string':
                    await createStringAttribute(collection.$id, attribute);
                    break;
                case 'double':
                    await createDoubleAttribute(collection.$id, attribute);
                    break;
                case 'datetime':
                    await createDatetimeAttribute(collection.$id, attribute);
                    break;
                default:
                    console.log(`⚠️  Unknown attribute type: ${attribute.type} for ${attribute.key}`);
            }
        }
        
        // Wait a bit for attributes to be created
        console.log(`⏳ Waiting for attributes to be created...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create indexes
        if (collectionConfig.indexes && collectionConfig.indexes.length > 0) {
            console.log(`🔍 Creating indexes for ${collectionName}...`);
            for (const index of collectionConfig.indexes) {
                await createIndex(collection.$id, index);
            }
        }
        
        console.log(`✅ Collection ${collectionName} setup completed!`);
        return collection;
        
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Collection ${collectionName} already exists`);
            return null;
        }
        console.error(`❌ Failed to create collection ${collectionName}:`, error.message);
        return null;
    }
}

// Function to check if collection exists
async function collectionExists(collectionName) {
    try {
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        return collections.collections.some(col => col.name === collectionName);
    } catch (error) {
        console.error(`❌ Error checking if collection exists:`, error.message);
        return false;
    }
}

// Main function to create new collections
async function createNewCollections() {
    try {
        console.log('🚀 Starting Appwrite schema update for Wallet & Invoice Management System...');
        console.log(`📊 Database ID: ${APPWRITE_DATABASE_ID}`);
        console.log(`🔑 Project ID: ${process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43'}`);
        console.log('');
        
        // Check if database exists
        try {
            await databases.get(APPWRITE_DATABASE_ID);
            console.log(`✅ Database ${APPWRITE_DATABASE_ID} exists`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`📝 Creating database: ${APPWRITE_DATABASE_ID}`);
                await databases.create(APPWRITE_DATABASE_ID, 'Main Database');
                console.log(`✅ Database ${APPWRITE_DATABASE_ID} created successfully`);
            } else {
                throw error;
            }
        }
        
        console.log('');
        console.log('📋 Creating new collections for Wallet & Invoice Management...');
        console.log('');
        
        // Create new collections
        const collections = Object.values(newCollections);
        let successCount = 0;
        let totalCount = collections.length;
        
        for (const collectionConfig of collections) {
            console.log(`🔄 Processing collection: ${collectionConfig.name}`);
            
            // Check if collection already exists
            const exists = await collectionExists(collectionConfig.name);
            if (exists) {
                console.log(`ℹ️  Collection ${collectionConfig.name} already exists, skipping...`);
                successCount++;
            } else {
                const result = await createCollection(collectionConfig.name, collectionConfig);
                if (result) {
                    successCount++;
                }
            }
            console.log('');
        }
        
        console.log('🎉 Schema update completed!');
        console.log(`✅ Successfully processed: ${successCount}/${totalCount} collections`);
        
        if (successCount < totalCount) {
            console.log('⚠️  Some collections failed to create. Check the logs above for details.');
        }
        
        console.log('');
        console.log('📋 New Collections Created:');
        console.log('  • invoices - Invoice management with status tracking');
        console.log('  • receipts - Digital receipt generation and storage');
        console.log('  • wallet_adjustments - Admin balance adjustments with audit trail');
        console.log('');
        console.log('🔧 Environment Variables to Add:');
        console.log('  APPWRITE_COLLECTION_INVOICES=invoices');
        console.log('  APPWRITE_COLLECTION_RECEIPTS=receipts');
        console.log('  APPWRITE_COLLECTION_WALLET_ADJUSTMENTS=wallet_adjustments');
        
    } catch (error) {
        console.error('💥 Fatal error during schema update:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createNewCollections();
}

module.exports = { createNewCollections };
