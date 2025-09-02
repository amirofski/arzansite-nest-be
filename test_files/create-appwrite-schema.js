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

// Helper function to get existing attributes
async function getExistingAttributes(collectionId) {
    try {
        const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, collectionId);
        return attributes.attributes.map(attr => attr.key);
    } catch (error) {
        console.warn(`Warning: Could not get existing attributes for ${collectionId}:`, error.message);
        return [];
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
                    attributeConfig.required ? null : attributeConfig.default,
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
                    attributeConfig.required ? null : attributeConfig.default,
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
                    attributeConfig.required ? null : attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'boolean':
                await databases.createBooleanAttribute(
            APPWRITE_DATABASE_ID,
            collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.required ? null : attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'email':
                await databases.createEmailAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.required ? null : attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'url':
                await databases.createUrlAttribute(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.required ? null : attributeConfig.default,
                    attributeConfig.array || false
                );
                break;
            case 'datetime':
                await databases.createDatetimeAttribute(
                            APPWRITE_DATABASE_ID,
                            collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.required ? null : attributeConfig.default,
                    attributeConfig.array || false
                        );
                        break;
            case 'ip':
                await databases.createIpAttribute(
                            APPWRITE_DATABASE_ID,
                            collectionId,
                    attributeKey,
                    attributeConfig.required || false,
                    attributeConfig.required ? null : attributeConfig.default,
                    attributeConfig.array || false
                        );
                        break;
            default:
                throw new Error(`Unsupported attribute type: ${attributeConfig.type}`);
        }
        
        console.log(`✅ Attribute ${attributeKey} created successfully in ${collectionId}`);
    } catch (error) {
        if (error.message && error.message.includes('maximum number or size of attributes')) {
            console.warn(`⚠️  Skipping attribute ${attributeKey} in ${collectionId}: Collection has reached maximum attributes limit`);
            return;
        }
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

// Main function to create the complete schema
async function createAppwriteSchema() {
    console.log('🚀 Starting Appwrite Schema Creation...\n');

    try {
        // Test connection
        console.log('1️⃣ Testing Appwrite connection...');
        const database = await databases.get(APPWRITE_DATABASE_ID);
        console.log(`✅ Connected to database: ${database.name}\n`);

        // Define collections and their schemas
        const collections = {
            orders: {
                name: 'Orders',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    orderNumber: { type: 'string', required: true, size: 50 },
                    status: { type: 'string', required: true, size: 20 },
                    totalAmount: { type: 'float', required: true },
                    currency: { type: 'string', required: true, size: 3 },
                    items: { type: 'string', required: false, size: 1000 }, // JSON string
                    createdAt: { type: 'datetime', required: true },
                    updatedAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_orders': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    },
                    'idx_order_status': {
                        type: 'key',
                        attributes: ['status'],
                        orders: ['ASC']
                    },
                    'idx_created_at': {
                        type: 'key',
                        attributes: ['createdAt'],
                        orders: ['DESC']
                    }
                }
            },
            designs: {
                name: 'Designs',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    name: { type: 'string', required: true, size: 255 },
                    description: { type: 'string', required: false, size: 1000 },
                    category: { type: 'string', required: true, size: 100 },
                    price: { type: 'float', required: true },
                    currency: { type: 'string', required: true, size: 3 },
                    imageUrl: { type: 'url', required: false },
                    isActive: { type: 'boolean', required: true, default: true },
                    createdAt: { type: 'datetime', required: true },
                    updatedAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_designs': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    },
                    'idx_category': {
                        type: 'key',
                        attributes: ['category'],
                        orders: ['ASC']
                    },
                    'idx_active_designs': {
                        type: 'key',
                        attributes: ['isActive'],
                        orders: ['ASC']
                    }
                }
            },
            wallets: {
                name: 'Wallets',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    balance: { type: 'float', required: true, default: 0 },
                    currency: { type: 'string', required: true, size: 3 },
                    isActive: { type: 'boolean', required: true, default: true },
                    createdAt: { type: 'datetime', required: true },
                    updatedAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_wallet': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    },
                    'idx_active_wallets': {
                        type: 'key',
                        attributes: ['isActive'],
                        orders: ['ASC']
                    }
                }
            },
            transactions: {
                name: 'Transactions',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    walletId: { type: 'string', required: true, size: 36 },
                    type: { type: 'string', required: true, size: 20 }, // credit, debit
                    amount: { type: 'float', required: true },
                    currency: { type: 'string', required: true, size: 3 },
                    description: { type: 'string', required: false, size: 500 },
                    reference: { type: 'string', required: false, size: 100 },
                    status: { type: 'string', required: true, size: 20 }, // pending, completed, failed
                    createdAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_transactions': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    },
                    'idx_wallet_transactions': {
                        type: 'key',
                        attributes: ['walletId'],
                        orders: ['ASC']
                    },
                    'idx_transaction_type': {
                        type: 'key',
                        attributes: ['type'],
                        orders: ['ASC']
                    },
                    'idx_transaction_status': {
                        type: 'key',
                        attributes: ['status'],
                        orders: ['ASC']
                    },
                    'idx_transaction_date': {
                        type: 'key',
                        attributes: ['createdAt'],
                        orders: ['DESC']
                    }
                }
            },
            profiles: {
                name: 'Profiles',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    firstName: { type: 'string', required: false, size: 100 },
                    lastName: { type: 'string', required: false, size: 100 },
                    phone: { type: 'string', required: false, size: 20 },
                    address: { type: 'string', required: false, size: 500 },
                    city: { type: 'string', required: false, size: 100 },
                    country: { type: 'string', required: false, size: 100 },
                    postalCode: { type: 'string', required: false, size: 20 },
                    avatarUrl: { type: 'url', required: false },
                    bio: { type: 'string', required: false, size: 1000 },
                    createdAt: { type: 'datetime', required: true },
                    updatedAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_profile': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    }
                }
            },
            email_verifications: {
                name: 'Email Verifications',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    token: { type: 'string', required: true, size: 255 },
                    type: { type: 'string', required: true, size: 20 }, // verification, password_reset
                    used: { type: 'boolean', required: true, default: false },
                    expiresAt: { type: 'datetime', required: true },
                    createdAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_verifications': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    },
                    'idx_token_verifications': {
                        type: 'key',
                        attributes: ['token'],
                        orders: ['ASC']
                    },
                    'idx_type_verifications': {
                        type: 'key',
                        attributes: ['type'],
                        orders: ['ASC']
                    },
                    'idx_expires_verifications': {
                        type: 'key',
                        attributes: ['expiresAt'],
                        orders: ['ASC']
                    }
                }
            },
            password_resets: {
                name: 'Password Resets',
                permissions: ["read(\"any\")", "write(\"any\")"],
                attributes: {
                    userId: { type: 'string', required: true, size: 36 },
                    email: { type: 'email', required: true },
                    token: { type: 'string', required: true, size: 255 },
                    used: { type: 'boolean', required: true, default: false },
                    expiresAt: { type: 'datetime', required: true },
                    createdAt: { type: 'datetime', required: true }
                },
                indexes: {
                    'idx_user_password_resets': {
                        type: 'key',
                        attributes: ['userId'],
                        orders: ['ASC']
                    },
                    'idx_email_password_resets': {
                        type: 'key',
                        attributes: ['email'],
                        orders: ['ASC']
                    },
                    'idx_token_password_resets': {
                        type: 'key',
                        attributes: ['token'],
                        orders: ['ASC']
                    },
                    'idx_expires_password_resets': {
                        type: 'key',
                        attributes: ['expiresAt'],
                        orders: ['ASC']
                    }
                }
            }
        };

        // Create collections and their schemas
        for (const [collectionId, schema] of Object.entries(collections)) {
            console.log(`2️⃣ Processing collection: ${collectionId}`);
            
            // Create collection
            await ensureCollectionExists(collectionId, schema);
            
            // Get existing attributes to avoid conflicts
            const existingAttributes = await getExistingAttributes(collectionId);
            console.log(`📋 Existing attributes in ${collectionId}: ${existingAttributes.length}`);
            
            // Create attributes (skip if they already exist)
            for (const [attributeKey, attributeConfig] of Object.entries(schema.attributes)) {
                if (!existingAttributes.includes(attributeKey)) {
                    await ensureAttributeExists(collectionId, attributeKey, attributeConfig);
            } else {
                    console.log(`✅ Attribute ${attributeKey} already exists in ${collectionId}`);
                }
            }
            
            // Create indexes
            if (schema.indexes) {
                for (const [indexKey, indexConfig] of Object.entries(schema.indexes)) {
                    await ensureIndexExists(collectionId, indexKey, indexConfig);
                }
            }
            
            console.log(`✅ Collection ${collectionId} setup completed\n`);
        }

        console.log('🎉 Appwrite Schema Creation Completed Successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - Database: ${database.name} (${APPWRITE_DATABASE_ID})`);
        console.log(`   - Collections processed: ${Object.keys(collections).length}`);
        console.log(`   - Total attributes defined: ${Object.values(collections).reduce((sum, schema) => sum + Object.keys(schema.attributes).length, 0)}`);
        console.log(`   - Total indexes defined: ${Object.values(collections).reduce((sum, schema) => sum + (schema.indexes ? Object.keys(schema.indexes).length : 0), 0)}`);

    } catch (error) {
        console.error('❌ Schema creation failed:', error.message);
        process.exit(1);
    }
}

// Run the schema creation
if (require.main === module) {
    createAppwriteSchema();
}

module.exports = {
    createAppwriteSchema,
    collectionExists,
    ensureCollectionExists,
    ensureAttributeExists,
    ensureIndexExists
};
