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

const { Client, Databases, ID } = require('node-appwrite');

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

// Indexes to create for each collection
const indexesToCreate = {
    orders: [
        {
            key: 'idx_user_orders',
            type: 'key',
            attributes: ['user_id'],
            orders: ['ASC']
        },
        {
            key: 'idx_order_status',
            type: 'key',
            attributes: ['status'],
            orders: ['ASC']
        },
        {
            key: 'idx_created_at',
            type: 'key',
            attributes: ['created_at'],
            orders: ['DESC']
        }
    ],
    designs: [
        {
            key: 'idx_user_designs',
            type: 'key',
            attributes: ['userId'],
            orders: ['ASC']
        },
        {
            key: 'idx_category',
            type: 'key',
            attributes: ['category'],
            orders: ['ASC']
        },
        {
            key: 'idx_active_designs',
            type: 'key',
            attributes: ['isActive'],
            orders: ['ASC']
        },
        {
            key: 'idx_price_range',
            type: 'key',
            attributes: ['price'],
            orders: ['ASC']
        }
    ],
    wallets: [
        {
            key: 'idx_user_wallet',
            type: 'key',
            attributes: ['userId'],
            orders: ['ASC']
        },
        {
            key: 'idx_active_wallets',
            type: 'key',
            attributes: ['isActive'],
            orders: ['ASC']
        },
        {
            key: 'idx_balance_range',
            type: 'key',
            attributes: ['balance'],
            orders: ['ASC']
        }
    ],
    transactions: [
        {
            key: 'idx_user_transactions',
            type: 'key',
            attributes: ['userId'],
            orders: ['ASC']
        },
        {
            key: 'idx_wallet_transactions',
            type: 'key',
            attributes: ['walletId'],
            orders: ['ASC']
        },
        {
            key: 'idx_transaction_type',
            type: 'key',
            attributes: ['type'],
            orders: ['ASC']
        },
        {
            key: 'idx_transaction_status',
            type: 'key',
            attributes: ['status'],
            orders: ['ASC']
        },
        {
            key: 'idx_transaction_date',
            type: 'key',
            attributes: ['createdAt'],
            orders: ['DESC']
        },
        {
            key: 'idx_amount_range',
            type: 'key',
            attributes: ['amount'],
            orders: ['ASC']
        }
    ],
    profiles: [
        {
            key: 'idx_user_profile',
            type: 'key',
            attributes: ['userId'],
            orders: ['ASC']
        },
        {
            key: 'idx_country_profiles',
            type: 'key',
            attributes: ['country'],
            orders: ['ASC']
        },
        {
            key: 'idx_city_profiles',
            type: 'key',
            attributes: ['city'],
            orders: ['ASC']
        }
    ],
    invoices: [
        {
            key: 'idx_user_invoices',
            type: 'key',
            attributes: ['user_id'],
            orders: ['ASC']
        },
        {
            key: 'idx_order_invoices',
            type: 'key',
            attributes: ['order_id'],
            orders: ['ASC']
        },
        {
            key: 'idx_invoice_status',
            type: 'key',
            attributes: ['status'],
            orders: ['ASC']
        },
        {
            key: 'idx_due_date',
            type: 'key',
            attributes: ['due_date'],
            orders: ['ASC']
        },
        {
            key: 'idx_created_at',
            type: 'key',
            attributes: ['created_at'],
            orders: ['DESC']
        }
    ],
    receipts: [
        {
            key: 'idx_invoice_receipts',
            type: 'key',
            attributes: ['invoice_id'],
            orders: ['ASC']
        },
        {
            key: 'idx_ref_id',
            type: 'key',
            attributes: ['ref_id'],
            orders: ['ASC']
        },
        {
            key: 'idx_created_at',
            type: 'key',
            attributes: ['created_at'],
            orders: ['DESC']
        }
    ],
    walletAdjustments: [
        {
            key: 'idx_wallet_adjustments',
            type: 'key',
            attributes: ['walletId'],
            orders: ['ASC']
        },
        {
            key: 'idx_admin_adjustments',
            type: 'key',
            attributes: ['adminId'],
            orders: ['ASC']
        },
        {
            key: 'idx_adjustment_type',
            type: 'key',
            attributes: ['type'],
            orders: ['ASC']
        },
        {
            key: 'idx_created_at',
            type: 'key',
            attributes: ['createdAt'],
            orders: ['DESC']
        }
    ]
};

// Helper function to check if index exists
async function indexExists(collectionId, indexKey) {
    try {
        await databases.getIndex(APPWRITE_DATABASE_ID, collectionId, indexKey);
        return true;
    } catch (error) {
        if (error.code === 404) {
            return false;
        }
        throw error;
    }
}

// Helper function to safely create index
async function ensureIndexExists(collectionId, indexKey, indexConfig) {
    try {
        const exists = await indexExists(collectionId, indexKey);
        if (!exists) {
            console.log(`Creating index: ${indexKey} in ${collectionId}`);
            await databases.createIndex(
                APPWRITE_DATABASE_ID,
                collectionId,
                indexKey,
                indexConfig.type,
                indexConfig.attributes,
                indexConfig.orders || []
            );
            console.log(`✅ Index ${indexKey} created successfully in ${collectionId}`);
        } else {
            console.log(`✅ Index ${indexKey} already exists in ${collectionId}`);
        }
    } catch (error) {
        console.error(`❌ Failed to create index ${indexKey} in ${collectionId}:`, error.message);
        throw error;
    }
}

// Helper function to check if collection exists
async function collectionExists(collectionId) {
    try {
        await databases.getCollection(APPWRITE_DATABASE_ID, collectionId);
        return true;
    } catch (error) {
        if (error.code === 404) {
            return false;
        }
        throw error;
    }
}

// Main function to create indexes
async function createIndexes() {
    console.log('🚀 Starting Appwrite Index Creation...\n');

    try {
        // Test connection
        console.log('1️⃣ Testing Appwrite connection...');
        const database = await databases.get(APPWRITE_DATABASE_ID);
        console.log(`✅ Connected to database: ${database.name}\n`);

        let totalIndexes = 0;
        let createdIndexes = 0;
        let skippedIndexes = 0;

        // Create indexes for each collection
        for (const [collectionId, indexes] of Object.entries(indexesToCreate)) {
            console.log(`2️⃣ Processing collection: ${collectionId}`);
            
            // Check if collection exists
            const doesCollectionExist = await collectionExists(collectionId);
            if (!doesCollectionExist) {
                console.log(`⚠️ Collection ${collectionId} does not exist, skipping...\n`);
                continue;
            }

            totalIndexes += indexes.length;
            
            for (const indexConfig of indexes) {
                try {
                    const exists = await indexExists(collectionId, indexConfig.key);
                    if (!exists) {
                        await ensureIndexExists(collectionId, indexConfig.key, indexConfig);
                        createdIndexes++;
                    } else {
                        console.log(`✅ Index ${indexConfig.key} already exists in ${collectionId}`);
                        skippedIndexes++;
                    }
                } catch (error) {
                    console.error(`❌ Failed to process index ${indexConfig.key} in ${collectionId}:`, error.message);
                }
            }
            
            console.log(`✅ Collection ${collectionId} indexes processed\n`);
        }

        console.log('🎉 Index Creation Completed!');
        console.log('\n📋 Summary:');
        console.log(`   - Database: ${database.name} (${APPWRITE_DATABASE_ID})`);
        console.log(`   - Collections processed: ${Object.keys(indexesToCreate).length}`);
        console.log(`   - Total indexes: ${totalIndexes}`);
        console.log(`   - Created: ${createdIndexes}`);
        console.log(`   - Skipped (already exist): ${skippedIndexes}`);

    } catch (error) {
        console.error('❌ Index creation failed:', error.message);
        process.exit(1);
    }
}

// Run the index creation
if (require.main === module) {
    createIndexes();
}

module.exports = {
    createIndexes,
    indexesToCreate,
    indexExists,
    ensureIndexExists,
    collectionExists
};
