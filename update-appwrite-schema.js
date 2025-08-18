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

// New collections for Wallet & Invoice Management System
const newCollections = {
    invoices: {
        name: 'Invoices',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            userId: { type: 'string', required: true, size: 36 },
            orderId: { type: 'string', required: true, size: 36 },
            amount: { type: 'float', required: true },
            currency: { type: 'string', required: true, size: 3 },
            dueDate: { type: 'datetime', required: true },
            status: { type: 'string', required: true, size: 20 }, // pending, paid, overdue, cancelled
            description: { type: 'string', required: false, size: 500 },
            createdAt: { type: 'datetime', required: true },
            updatedAt: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_user_invoices': {
                type: 'key',
                attributes: ['userId'],
                orders: ['ASC']
            },
            'idx_order_invoices': {
                type: 'key',
                attributes: ['orderId'],
                orders: ['ASC']
            },
            'idx_invoice_status': {
                type: 'key',
                attributes: ['status'],
                orders: ['ASC']
            },
            'idx_due_date': {
                type: 'key',
                attributes: ['dueDate'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['createdAt'],
                orders: ['DESC']
            }
        }
    },
    receipts: {
        name: 'Receipts',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            invoiceId: { type: 'string', required: true, size: 36 },
            refId: { type: 'string', required: true, size: 100 },
            amount: { type: 'float', required: true },
            currency: { type: 'string', required: true, size: 3 },
            format: { type: 'string', required: true, size: 10 }, // pdf, html
            createdAt: { type: 'datetime', required: true },
            updatedAt: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_invoice_receipts': {
                type: 'key',
                attributes: ['invoiceId'],
                orders: ['ASC']
            },
            'idx_ref_id': {
                type: 'key',
                attributes: ['refId'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['createdAt'],
                orders: ['DESC']
            }
        }
    },
    walletAdjustments: {
        name: 'Wallet Adjustments',
        permissions: ["read(\"any\")", "write(\"any\")"],
        attributes: {
            walletId: { type: 'string', required: true, size: 36 },
            adminId: { type: 'string', required: true, size: 36 },
            amount: { type: 'float', required: true },
            type: { type: 'string', required: true, size: 20 }, // credit, debit, correction
            reason: { type: 'string', required: true, size: 500 },
            notes: { type: 'string', required: false, size: 1000 },
            balanceBefore: { type: 'float', required: true },
            balanceAfter: { type: 'float', required: true },
            createdAt: { type: 'datetime', required: true },
            updatedAt: { type: 'datetime', required: true }
        },
        indexes: {
            'idx_wallet_adjustments': {
                type: 'key',
                attributes: ['walletId'],
                orders: ['ASC']
            },
            'idx_admin_adjustments': {
                type: 'key',
                attributes: ['adminId'],
                orders: ['ASC']
            },
            'idx_adjustment_type': {
                type: 'key',
                attributes: ['type'],
                orders: ['ASC']
            },
            'idx_created_at': {
                type: 'key',
                attributes: ['createdAt'],
                orders: ['DESC']
            }
        }
    }
};

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

// Helper function to safely create collection
async function ensureCollectionExists(collectionId, collectionSchema) {
    try {
        const exists = await collectionExists(collectionId);
        if (!exists) {
            console.log(`Creating collection: ${collectionId}`);
            await databases.createCollection(
                APPWRITE_DATABASE_ID,
                collectionId,
                collectionSchema.name,
                collectionSchema.permissions || ["read(\"any\")"],
                collectionSchema.documentSecurity || false,
                collectionSchema.enabled || true
            );
            console.log(`✅ Collection ${collectionId} created successfully`);
        } else {
            console.log(`✅ Collection ${collectionId} already exists`);
        }
    } catch (error) {
        console.error(`❌ Failed to create collection ${collectionId}:`, error.message);
        throw error;
    }
}

// Helper function to safely create attribute
async function ensureAttributeExists(collectionId, attributeKey, attributeConfig) {
    try {
        // Check if attribute exists by trying to get it
        try {
            await databases.getAttribute(APPWRITE_DATABASE_ID, collectionId, attributeKey);
            console.log(`✅ Attribute ${attributeKey} already exists in ${collectionId}`);
            return;
        } catch (error) {
            if (error.code !== 404) {
                throw error;
            }
        }

        // Create attribute based on type
        console.log(`Creating attribute: ${attributeKey} in ${collectionId}`);
        
        switch (attributeConfig.type) {
            case 'string':
                await databases.createStringAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.size || 255,
                    attributeConfig.required || false,
                    attributeConfig.default,
                    attributeConfig.array || false,
                    attributeConfig.encrypt || false
                );
                break;
            case 'integer':
                await databases.createIntegerAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.min,
                    attributeConfig.max,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'float':
                await databases.createFloatAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.min,
                    attributeConfig.max,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'boolean':
                await databases.createBooleanAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'email':
                await databases.createEmailAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'url':
                await databases.createUrlAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'datetime':
                await databases.createDatetimeAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'ip':
                await databases.createIpAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            default:
                throw new Error(`Unsupported attribute type: ${attributeConfig.type}`);
        }
        
        console.log(`✅ Attribute ${attributeKey} created successfully in ${collectionId}`);
    } catch (error) {
        console.error(`❌ Failed to create attribute ${attributeKey} in ${collectionId}:`, error.message);
        throw error;
    }
}

// Helper function to safely create index
async function ensureIndexExists(collectionId, indexKey, indexConfig) {
    try {
        // Check if index exists by trying to get it
        try {
            await databases.getIndex(APPWRITE_DATABASE_ID, collectionId, indexKey);
            console.log(`✅ Index ${indexKey} already exists in ${collectionId}`);
            return;
        } catch (error) {
            if (error.code !== 404) {
                throw error;
            }
        }

        // Create index
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
    } catch (error) {
        console.error(`❌ Failed to create index ${indexKey} in ${collectionId}:`, error.message);
        throw error;
    }
}

// Main function to update the schema
async function updateAppwriteSchema() {
    console.log('🚀 Starting Appwrite Schema Update...\n');

    try {
        // Test connection
        console.log('1️⃣ Testing Appwrite connection...');
        const database = await databases.get(APPWRITE_DATABASE_ID);
        console.log(`✅ Connected to database: ${database.name}\n`);

        // Create new collections and their schemas
        for (const [collectionId, schema] of Object.entries(newCollections)) {
            console.log(`2️⃣ Processing new collection: ${collectionId}`);
            
            // Create collection
            await ensureCollectionExists(collectionId, schema);
            
            // Create attributes
            for (const [attributeKey, attributeConfig] of Object.entries(schema.attributes)) {
                await ensureAttributeExists(collectionId, attributeKey, attributeConfig);
            }
            
            // Create indexes
            if (schema.indexes) {
                for (const [indexKey, indexConfig] of Object.entries(schema.indexes)) {
                    await ensureIndexExists(collectionId, indexKey, indexConfig);
                }
            }
            
            console.log(`✅ Collection ${collectionId} setup completed\n`);
        }

        console.log('🎉 Appwrite Schema Update Completed Successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Database: ${database.name} (${APPWRITE_DATABASE_ID})`);
        console.log(`   - New collections added: ${Object.keys(newCollections).length}`);
        console.log(`   - Total new attributes: ${Object.values(newCollections).reduce((sum, schema) => sum + Object.keys(schema.attributes).length, 0)}`);
        console.log(`   - Total new indexes: ${Object.values(newCollections).reduce((sum, schema) => sum + (schema.indexes ? Object.keys(schema.indexes).length : 0), 0)}`);

    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
        process.exit(1);
    }
}

// Run the schema update
if (require.main === module) {
    updateAppwriteSchema();
}

module.exports = {
    updateAppwriteSchema,
    newCollections,
    collectionExists,
    ensureCollectionExists,
    ensureAttributeExists,
    ensureIndexExists
};
