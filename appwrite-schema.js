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
            { key: 'price', type: 'double', required: false, array: false },
            { key: 'comments', type: 'string', size: 1000, required: false, array: false },
            { key: 'design_data', type: 'string', size: 8192, required: false, array: false }, // JSON as string
            { key: 'design_preview_url', type: 'string', size: 500, required: false, array: false },
            { key: 'total_pages', type: 'integer', required: false, array: false },
            { key: 'total_sections', type: 'integer', required: false, array: false },
            { key: 'design_options', type: 'string', size: 2048, required: false, array: false }, // JSON as string
            { key: 'created_at', type: 'datetime', required: true, array: false },
            { key: 'updated_at', type: 'datetime', required: true, array: false }
        ],
        indexes: [
            { key: 'user_id_idx', type: 'key', attributes: ['user_id'], orders: ['ASC'] },
            { key: 'status_idx', type: 'key', attributes: ['status'], orders: ['ASC'] },
            { key: 'price_idx', type: 'key', attributes: ['price'], orders: ['ASC'] },
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
    }
    ,

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

    // Invoices collection
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

    // Receipts collection
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

    // Wallet adjustments collection
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
    }
};

module.exports = { schema, databases, client };
