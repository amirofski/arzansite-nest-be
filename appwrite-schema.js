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
const account = new Account(client);
const users = new Users(client);

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
        // Check if collection already exists
        const exists = await collectionExists(collectionId);
        
        if (exists) {
            console.log(`⏭️ Collection '${collectionId}' already exists, skipping...`);
            return;
        }

        console.log(`🔨 Creating collection: ${collectionId}`);
        
        // Create the collection
        await databases.createCollection(
            APPWRITE_DATABASE_ID, 
            collectionId, 
            collectionSchema.name, 
            [], // permissions
            collectionSchema.documentSecurity
        );

        console.log(`✅ Collection '${collectionId}' created successfully`);

        // Add attributes
        for (const attr of collectionSchema.attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.size || 255,
                        attr.required,
                        attr.default,
                        attr.array
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array
                    );
                } else if (attr.type === 'double') {
                    await databases.createFloatAttribute(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array
                    );
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array
                    );
                } else if (attr.type === 'datetime') {
                    await databases.createDatetimeAttribute(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.required,
                        attr.default,
                        attr.array
                    );
                } else if (attr.type === 'enum') {
                    await databases.createEnumAttribute(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        attr.key,
                        attr.enum || [],
                        attr.required,
                        attr.default,
                        attr.array
                    );
                }
                console.log(`  ✅ Added attribute: ${attr.key} (${attr.type})`);
            } catch (attrError) {
                console.log(`  ⚠️ Attribute ${attr.key} already exists or error: ${attrError.message}`);
            }
        }

        // Add indexes
        for (const idx of collectionSchema.indexes) {
            try {
                if (idx.type === 'key') {
                    await databases.createIndex(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        idx.key,
                        'key',
                        idx.attributes,
                        idx.orders
                    );
                } else if (idx.type === 'unique') {
                    await databases.createIndex(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        idx.key,
                        'unique',
                        idx.attributes,
                        idx.orders
                    );
                } else if (idx.type === 'fulltext') {
                    await databases.createIndex(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        idx.key,
                        'fulltext',
                        idx.attributes,
                        idx.orders
                    );
                }
                console.log(`  ✅ Added index: ${idx.key} (${idx.type})`);
            } catch (idxError) {
                console.log(`  ⚠️ Index ${idx.key} already exists or error: ${idxError.message}`);
            }
        }

    } catch (error) {
        console.error(`❌ Error creating collection '${collectionId}':`, error.message);
        throw error;
    }
}

// Main function to create all collections safely
async function createCollectionsSafely() {
    console.log('🚀 Starting safe collection creation...\n');
    
    try {
        for (const [collectionId, collectionSchema] of Object.entries(schema)) {
            await ensureCollectionExists(collectionId, collectionSchema);
            console.log(''); // Add spacing between collections
        }
        
        console.log('🎉 All collections processed successfully!');
        console.log('📝 Note: Existing collections were skipped, new ones were created.');
        
    } catch (error) {
        console.error('💥 Fatal error during collection creation:', error.message);
        process.exit(1);
    }
}

// Database schema definition
const schema = {
    // Profiles collection
    profiles: {
        name: 'profiles',
        documentSecurity: false, // Allow public read access
        attributes: [
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'full_name', type: 'string', size: 255, required: true, array: false },
            { key: 'email', type: 'string', size: 255, required: true, array: false },
            { key: 'phone', type: 'string', size: 20, required: false, array: false },
            { key: 'address', type: 'string', size: 500, required: false, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'email_idx', type: 'key', attributes: ['email'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    },

    // User roles collection
    user_roles: {
        name: 'user_roles',
        documentSecurity: false,
        attributes: [
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'role', type: 'string', size: 20, required: true, array: false, enum: ['user', 'admin'] },
            { key: 'created_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'role_idx', type: 'key', attributes: ['role'], orders: ['ASC'] },
            { key: 'user_role_unique_idx', type: 'unique', attributes: ['user_id', 'role'] }
        ]
    },

    // Orders collection
    orders: {
        name: 'orders',
        documentSecurity: false,
        attributes: [
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'title', type: 'string', size: 255, required: true, array: false },
            { key: 'description', type: 'string', size: 1000, required: false, array: false },
            { key: 'status', type: 'string', size: 20, required: true, array: false, enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            { key: 'payment_status', type: 'string', size: 20, required: false, array: false, enum: ['pending', 'processing', 'succeeded', 'failed', 'cancelled'] },
            { key: 'price', type: 'double', required: false, array: false },
            { key: 'comments', type: 'string', size: 1000, required: false, array: false },
            { key: 'design_data', type: 'string', size: 8192, required: false, array: false }, // JSON as string
            { key: 'design_preview_url', type: 'string', size: 500, required: false, array: false },
            { key: 'total_pages', type: 'integer', required: false, array: false },
            { key: 'total_sections', type: 'integer', required: false, array: false },
            { key: 'design_options', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'sessionId', type: 'string', size: 100, required: false, array: false },
            { key: 'siteType', type: 'string', size: 50, required: false, array: false },
            { key: 'websiteFramework', type: 'string', size: 8192, required: false, array: false }, // JSON as string
            { key: 'branding', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'additionalServices', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'domains', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'pricing', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'payment_gateway', type: 'string', size: 50, required: false, array: false },
            { key: 'callback_url', type: 'string', size: 500, required: false, array: false },
            { key: 'return_url', type: 'string', size: 500, required: false, array: false },
            { key: 'zarinpal_authority', type: 'string', size: 100, required: false, array: false },
            { key: 'zarinpal_ref_id', type: 'string', size: 100, required: false, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
            { key: 'payment_status_idx', type: 'key', attributes: ['payment_status'], orders: ['ASC'] },
            { key: 'price_idx', type: 'key', attributes: ['price'], orders: ['ASC'] },
            { key: 'sessionId_idx', type: 'key', attributes: ['sessionId'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] },
            { key: 'updated_at_idx', type: 'key', attributes: ['updated_at'], orders: ['DESC'] }
        ]
    },

    // Wallets collection
    wallets: {
        name: 'wallets',
        documentSecurity: false,
        attributes: [
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'balance', type: 'double', required: true, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'balance_idx', type: 'key', attributes: ['balance'], orders: ['ASC'] },
            { key: 'updated_at_idx', type: 'key', attributes: ['updated_at'], orders: ['DESC'] }
        ]
    },

    // Email logs collection
    email_logs: {
        name: 'email_logs',
        documentSecurity: false,
        attributes: [
            { key: 'to_email', type: 'string', size: 255, required: true, array: false },
            { key: 'subject', type: 'string', size: 500, required: true, array: false },
            { key: 'success', type: 'boolean', required: true, array: false },
            { key: 'error_message', type: 'string', size: 1000, required: false, array: false },
            { key: 'service_used', type: 'string', size: 50, required: true, array: false },
            { key: 'template_type', type: 'string', size: 100, required: true, array: false },
            { key: 'sent_at', type: 'datetime', required: true, array: false },
            { key: 'message_id', type: 'string', size: 255, required: false, array: false }
        ],
        indexes: [
            { key: 'to_email_idx', type: 'key', attributes: ['to_email'], orders: ['ASC'] },
            { key: 'success_idx', type: 'key', attributes: ['success'], orders: ['ASC'] },
            { key: 'template_type_idx', type: 'key', attributes: ['template_type'], orders: ['ASC'] },
            { key: 'sent_at_idx', type: 'key', attributes: ['sent_at'], orders: ['DESC'] },
            { key: 'service_used_idx', type: 'key', attributes: ['service_used'], orders: ['ASC'] }
        ]
    },

    // Email verification tokens collection
    email_verifications: {
        name: 'email_verifications',
        documentSecurity: false,
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: true, array: false },
            { key: 'token', type: 'string', size: 64, required: true, array: false },
            { key: 'expiresAt', type: 'datetime', required: true, array: false },
            { key: 'used', type: 'boolean', required: true, array: false },
            { key: 'createdAt', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'userId_idx', type: 'key', attributes: ['userId'], orders: ['ASC'] },
            { key: 'token_idx', type: 'key', attributes: ['token'], orders: ['ASC'] },
            { key: 'expiresAt_idx', type: 'key', attributes: ['expiresAt'], orders: ['ASC'] },
            { key: 'used_idx', type: 'key', attributes: ['used'], orders: ['ASC'] },
            { key: 'token_unique_idx', type: 'unique', attributes: ['token'] }
        ]
    },

    // Transactions collection
    transactions: {
        name: 'transactions',
        documentSecurity: false,
        attributes: [
            { key: 'wallet_id', type: 'string', size: 36, required: true, array: false },
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'type', type: 'string', size: 20, required: true, array: false, enum: ['deposit', 'withdrawal', 'payment', 'refund', 'credit', 'debit'] },
            { key: 'status', type: 'string', size: 20, required: true, array: false, enum: ['pending', 'completed', 'failed', 'cancelled'] },
            { key: 'amount', type: 'double', required: true, array: false },
            { key: 'balance_before', type: 'double', required: true, array: false },
            { key: 'balance_after', type: 'double', required: true, array: false },
            { key: 'description', type: 'string', size: 500, required: false, array: false },
            { key: 'reference_id', type: 'string', size: 36, required: false, array: false },
            { key: 'reference_type', type: 'string', size: 50, required: false, array: false },
            { key: 'metadata', type: 'string', size: 8192, required: false, array: false }, // JSON as string
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'wallet_id_idx', type: 'key', attributes: ['wallet_id'], orders: ['ASC'] },
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'type_idx', type: 'key', attributes: ['type'], orders: ['ASC'] },
            { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
            { key: 'amount_idx', type: 'key', attributes: ['amount'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] },
            { key: 'reference_idx', type: 'key', attributes: ['reference_id', 'reference_type'], orders: ['ASC', 'ASC'] }
        ]
    },

    // Design data collection
    design_data: {
        name: 'design_data',
        documentSecurity: false,
        attributes: [
            { key: 'order_id', type: 'string', size: 36, required: true, array: false },
            { key: 'page_id', type: 'string', size: 100, required: true, array: false },
            { key: 'page_name', type: 'string', size: 255, required: true, array: false },
            { key: 'sections', type: 'string', size: 8192, required: true, array: false }, // JSON as string
            { key: 'canvas_dimensions', type: 'string', size: 2048, required: true, array: false }, // JSON as string
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'order_id_idx', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
            { key: 'page_id_idx', type: 'key', attributes: ['page_id'], orders: ['ASC'] },
            { key: 'order_page_unique_idx', type: 'unique', attributes: ['order_id', 'page_id'] }
        ]
    },

    // Designs collection (used by backend via APPWRITE_COLLECTION_DESIGNS)
    designs: {
        name: 'designs',
        documentSecurity: false,
        attributes: [
            { key: 'order_id', type: 'string', size: 36, required: true, array: false },
            { key: 'design', type: 'string', size: 8192, required: false, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'order_id_idx', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    },

    // Payment transactions collection
    payment_transactions: {
        name: 'payment_transactions',
        documentSecurity: false,
        attributes: [
            { key: 'order_id', type: 'string', size: 36, required: true, array: false },
            { key: 'user_id', type: 'string', size: 36, required: true, array: false },
            { key: 'transaction_type', type: 'string', size: 50, required: true, array: false, enum: ['payment_request', 'payment_verification', 'refund', 'cancellation'] },
            { key: 'zarinpal_authority', type: 'string', size: 100, required: false, array: false },
            { key: 'zarinpal_ref_id', type: 'string', size: 100, required: false, array: false },
            { key: 'amount', type: 'double', required: true, array: false },
            { key: 'status', type: 'string', size: 20, required: true, array: false, enum: ['pending', 'completed', 'failed', 'cancelled'] },
            { key: 'gateway_response', type: 'string', size: 4096, required: false, array: false }, // JSON as string
            { key: 'metadata', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'order_id_idx', type: 'key', attributes: ['order_id'], orders: ['ASC'] },
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
            { key: 'transaction_type_idx', type: 'key', attributes: ['transaction_type'], orders: ['ASC'] },
            { key: 'zarinpal_authority_idx', type: 'key', attributes: ['zarinpal_authority'], orders: ['ASC'] },
            { key: 'zarinpal_ref_id_idx', type: 'key', attributes: ['zarinpal_ref_id'], orders: ['ASC'] },
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    },

    // Email logs collection
    email_logs: {
        name: 'email_logs',
        documentSecurity: false,
        attributes: [
            { key: 'to_email', type: 'string', size: 255, required: true, array: false },
            { key: 'subject', type: 'string', size: 500, required: true, array: false },
            { key: 'success', type: 'boolean', required: true, array: false },
            { key: 'error_message', type: 'string', size: 1000, required: false, array: false },
            { key: 'sent_at', type: 'datetime', required: true, array: false },
            { key: 'service_used', type: 'string', size: 100, required: false, array: false, default: 'appwrite_smtp' },
            { key: 'template_type', type: 'string', size: 100, required: false, array: false },
            { key: 'user_id', type: 'string', size: 36, required: false, array: false }
        ],
        indexes: [
            { key: 'to_email_idx', type: 'key', attributes: ['to_email'], orders: ['ASC'] },
            { key: 'success_idx', type: 'key', attributes: ['success'], orders: ['ASC'] },
            { key: 'sent_at_idx', type: 'key', attributes: ['sent_at'], orders: ['DESC'] },
            { key: 'template_type_idx', type: 'key', attributes: ['template_type'], orders: ['ASC'] },
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] }
        ]
    },

    // Email verification logs collection
    email_verification_logs: {
        name: 'email_verification_logs',
        documentSecurity: false,
        attributes: [
            { key: 'user_id', type: 'string', size: 36, required: false, array: false },
            { key: 'email', type: 'string', size: 255, required: true, array: false },
            { key: 'verification_sent_at', type: 'datetime', required: true, array: false },
            { key: 'verification_clicked_at', type: 'datetime', required: false, array: false },
            { key: 'verification_expires_at', type: 'datetime', required: true, array: false },
            { key: 'ip_address', type: 'string', size: 45, required: false, array: false },
            { key: 'user_agent', type: 'string', size: 500, required: false, array: false },
            { key: 'success', type: 'boolean', required: false, array: false, default: false },
            { key: 'failure_reason', type: 'string', size: 500, required: false, array: false },
            { key: 'created_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'email_idx', type: 'key', attributes: ['email'], orders: ['ASC'] },
            { key: 'verification_sent_at_idx', type: 'key', attributes: ['verification_sent_at'], orders: ['DESC'] },
            { key: 'verification_expires_at_idx', type: 'key', attributes: ['verification_expires_at'], orders: ['ASC'] },
            { key: 'success_idx', type: 'key', attributes: ['success'], orders: ['ASC'] }
        ]
    },

    // Site configuration collection
    site_config: {
        name: 'site_config',
        documentSecurity: false,
        attributes: [
            { key: 'mode', type: 'string', size: 50, required: true, array: false, enum: ['normal', 'temporarily_unavailable', 'update_mode', 'development_mode'] },
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'created_at_idx', type: 'key', attributes: ['created_at'], orders: ['DESC'] }
        ]
    },

    // NEW: Invoices collection for wallet and invoice management system
    invoices: {
        name: 'invoices',
        documentSecurity: false,
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

    // NEW: Receipts collection for digital receipt generation
    receipts: {
        name: 'receipts',
        documentSecurity: false,
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

    // NEW: Wallet adjustments collection for admin balance modifications
    wallet_adjustments: {
        name: 'wallet_adjustments',
        documentSecurity: false,
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
    },

    // NEW: Wizard Orders collection for storing complete wizard data
    wizard_orders: {
        name: 'wizard_orders',
        documentSecurity: false,
        attributes: [
            { key: 'userId', type: 'string', size: 36, required: false, array: false },
            { key: 'sessionId', type: 'string', size: 100, required: true, array: false },
            { key: 'siteType', type: 'string', size: 20, required: true, array: false, enum: ['personal', 'business'] },
            { key: 'websiteFramework', type: 'string', size: 16384, required: true, array: false }, // JSON as string
            { key: 'branding', type: 'string', size: 2048, required: true, array: false }, // JSON as string
            { key: 'additionalServices', type: 'string', size: 1024, required: true, array: false }, // JSON as string
            { key: 'domains', type: 'string', size: 4096, required: true, array: false }, // JSON as string
            { key: 'pricing', type: 'string', size: 2048, required: true, array: false }, // JSON as string
            { key: 'paymentOptions', type: 'string', size: 512, required: true, array: false }, // JSON as string
            { key: 'projectFiles', type: 'string', size: 8192, required: true, array: false }, // JSON as string
            { key: 'status', type: 'string', size: 20, required: true, array: false, enum: ['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] },
            { key: 'createdAt', type: 'datetime', required: true, array: false },
            { key: 'updatedAt', type: 'datetime', required: true, array: false },
            { key: 'completedAt', type: 'datetime', required: false, array: false }
        ],
        indexes: [
            { key: 'userId_idx', type: 'key', attributes: ['userId'], orders: ['ASC'] },
            { key: 'sessionId_idx', type: 'key', attributes: ['sessionId'], orders: ['ASC'] },
            { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
            { key: 'siteType_idx', type: 'key', attributes: ['siteType'], orders: ['ASC'] },
            { key: 'createdAt_idx', type: 'key', attributes: ['createdAt'], orders: ['DESC'] },
            { key: 'updatedAt_idx', type: 'key', attributes: ['updatedAt'], orders: ['DESC'] },
            { key: 'session_user_idx', type: 'unique', attributes: ['sessionId', 'userId'] }
        ]
    },

    // NEW: Domain Extensions collection for managing domain prices and availability
    domain_extensions: {
        name: 'domain_extensions',
        documentSecurity: false,
        attributes: [
            { key: 'extension', type: 'string', size: 20, required: true, array: false },
            { key: 'name', type: 'string', size: 100, required: true, array: false },
            { key: 'description', type: 'string', size: 500, required: false, array: false },
            { key: 'price', type: 'double', required: true, array: false },
            { key: 'available', type: 'boolean', required: true, array: false },
            { key: 'category', type: 'string', size: 50, required: true, array: false, enum: ['international', 'country', 'specialty'] },
            { key: 'createdAt', type: 'datetime', required: true, array: false },
            { key: 'updatedAt', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'extension_idx', type: 'key', attributes: ['extension'], orders: ['ASC'] },
            { key: 'price_idx', type: 'key', attributes: ['price'], orders: ['ASC'] },
            { key: 'available_idx', type: 'key', attributes: ['available'], orders: ['ASC'] },
            { key: 'category_idx', type: 'key', attributes: ['category'], orders: ['ASC'] },
            { key: 'extension_unique_idx', type: 'unique', attributes: ['extension'] }
        ]
    },

    // NEW: Project Files collection for tracking uploaded files
    project_files: {
        name: 'project_files',
        documentSecurity: false,
        attributes: [
            { key: 'orderId', type: 'string', size: 36, required: true, array: false },
            { key: 'filename', type: 'string', size: 255, required: true, array: false },
            { key: 'originalName', type: 'string', size: 255, required: true, array: false },
            { key: 'mimeType', type: 'string', size: 100, required: true, array: false },
            { key: 'size', type: 'integer', required: true, array: false },
            { key: 'bucketId', type: 'string', size: 36, required: true, array: false },
            { key: 'fileId', type: 'string', size: 36, required: true, array: false },
            { key: 'uploadedAt', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'orderId_idx', type: 'key', attributes: ['orderId'], orders: ['ASC'] },
            { key: 'fileId_idx', type: 'key', attributes: ['fileId'], orders: ['ASC'] },
            { key: 'uploadedAt_idx', type: 'key', attributes: ['uploadedAt'], orders: ['DESC'] }
        ]
    }
};

module.exports = { schema, databases, client };

// Execute the safe collection creation if this file is run directly
if (require.main === module) {
    createCollectionsSafely();
}
