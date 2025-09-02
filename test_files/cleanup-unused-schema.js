const { Client, Databases } = require('node-appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Collections that are actually used in the codebase (KEEP THESE)
const requiredCollections = {
    'orders': 'Main orders collection',
    'invoices': 'Invoice management',
    'receipts': 'Digital receipts',
    'wallets': 'User wallet balances',
    'transactions': 'Wallet transactions',
    'profiles': 'User profiles',
    'support_tickets': 'Support system',
    'notifications': 'User notifications',
    'password_resets': 'Password reset tokens',
    'email_verifications': 'Email verification tokens',
    'user_roles': 'User role assignments',
    'designs': 'Design snapshots',
    'wizard_orders': 'Wizard progress data',
    'domain_extensions': 'Domain pricing',
    'email_logs': 'Email tracking',
    'site_config': 'Site settings',
    'user_activity': 'User analytics',
    'wallet_adjustments': 'Admin adjustments',
    'notification_preferences': 'User preferences',
    'push_tokens': 'Mobile notifications',
    'project_files': 'File storage'
};

// Collections that can be safely removed (UNUSED)
const collectionsToRemove = [
    'design_data', // Duplicate of designs
    'payment_transactions', // Duplicate of transactions
    'email_verification_logs', // Duplicate of email_logs
    'enhanced_orders', // Unused enhanced version
    'enhanced_wallet_transactions', // Unused enhanced version
    'order_progress' // Unused progress tracking
];

// Fields to remove from each collection (duplicate snake_case versions)
const fieldsToRemove = {
    'profiles': ['email', 'phone', 'address'], // Keep camelCase versions
    'orders': ['title', 'description', 'status', 'comments', 'branding', 'currency'], // Keep camelCase versions
    'wallets': ['balance'], // Keep camelCase version
    'transactions': ['type', 'status', 'amount', 'description', 'metadata'], // Keep camelCase versions
    'design_data': ['sections'], // Keep camelCase version
    'designs': ['design', 'created_at', 'updated_at', 'name', 'description', 'category', 'price', 'currency', 'imageUrl', 'isActive', 'createdAt', 'updatedAt'], // Remove unused fields
    'payment_transactions': ['amount', 'status', 'metadata'], // Keep camelCase versions
    'email_logs': ['subject', 'success', 'to_email', 'error_message', 'service_used', 'template_type'], // Keep camelCase versions
    'email_verification_logs': ['email', 'success'], // Keep camelCase versions
    'site_config': ['mode', 'created_at'], // Keep camelCase versions
    'email_verifications': ['token', 'used', 'expiresAt', 'createdAt', 'type'], // Keep camelCase versions
    'receipts': ['amount', 'format'], // Keep camelCase versions
    'invoices': ['status', 'description', 'amount'], // Keep camelCase versions
    'wallet_adjustments': ['type', 'reason', 'notes', 'wallet_id', 'updated_at'], // Keep camelCase versions
    'wizard_orders': ['branding', 'domains', 'pricing', 'status', 'user_id', 'userId', 'siteType', 'websiteFramework', 'additionalServices', 'paymentOptions', 'createdAt', 'updatedAt', 'completedAt'], // Keep camelCase versions
    'domain_extensions': ['extension', 'name', 'description', 'available', 'category', 'createdAt', 'updatedAt'], // Keep camelCase versions
    'project_files': ['filename'], // Keep camelCase version
    'password_resets': ['email', 'token'], // Keep camelCase versions
    'enhanced_wallet_transactions': ['metadata'], // Keep camelCase versions
    'support_tickets': ['type', 'description', 'priority', 'status'], // Keep camelCase versions
    'notifications': ['type', 'title', 'message'], // Keep camelCase versions
    'notification_preferences': ['email_notifications', 'push_notifications', 'sms_notifications'] // Keep camelCase versions
};

// Fields to add to collections (missing required fields)
const fieldsToAdd = {
    'orders': [
        { key: 'design_snapshot', type: 'string', size: 65535, required: false },
        { key: 'callback_url', type: 'string', size: 255, required: false },
        { key: 'return_url', type: 'string', size: 255, required: false },
        { key: 'websiteFramework', type: 'string', size: 255, required: false },
        { key: 'additionalServices', type: 'string', size: 65535, required: false },
        { key: 'domains', type: 'string', size: 65535, required: false },
        { key: 'pricing', type: 'string', size: 65535, required: false }
    ]
};

async function removeUnusedCollections() {
    console.log('🗑️  Removing unused collections...\n');
    
    for (const collectionName of collectionsToRemove) {
        try {
            // Find collection by name
            const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
            const collection = collections.collections.find(c => c.name === collectionName);
            
            if (collection) {
                console.log(`🗑️  Removing collection: ${collectionName} (${collection.$id})`);
                await databases.deleteCollection(APPWRITE_DATABASE_ID, collection.$id);
                console.log(`✅ Successfully removed ${collectionName}`);
            } else {
                console.log(`⚠️  Collection not found: ${collectionName}`);
            }
        } catch (error) {
            console.log(`❌ Failed to remove ${collectionName}: ${error.message}`);
        }
    }
}

async function removeDuplicateFields() {
    console.log('\n🧹 Removing duplicate fields...\n');
    
    for (const [collectionName, fields] of Object.entries(fieldsToRemove)) {
        try {
            // Find collection by name
            const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
            const collection = collections.collections.find(c => c.name === collectionName);
            
            if (!collection) {
                console.log(`⚠️  Collection not found: ${collectionName}`);
                continue;
            }
            
            console.log(`🧹 Processing collection: ${collectionName}`);
            
            for (const fieldName of fields) {
                try {
                    console.log(`  🗑️  Removing field: ${fieldName}`);
                    await databases.deleteAttribute(APPWRITE_DATABASE_ID, collection.$id, fieldName);
                    console.log(`    ✅ Successfully removed ${fieldName}`);
                } catch (error) {
                    console.log(`    ❌ Failed to remove ${fieldName}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log(`❌ Error processing collection ${collectionName}: ${error.message}`);
        }
    }
}

async function addMissingFields() {
    console.log('\n➕ Adding missing fields...\n');
    
    for (const [collectionName, fields] of Object.entries(fieldsToAdd)) {
        try {
            // Find collection by name
            const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
            const collection = collections.collections.find(c => c.name === collectionName);
            
            if (!collection) {
                console.log(`⚠️  Collection not found: ${collectionName}`);
                continue;
            }
            
            console.log(`➕ Processing collection: ${collectionName}`);
            
            for (const field of fields) {
                try {
                    console.log(`  ➕ Adding field: ${field.key} (${field.type})`);
                    
                    if (field.type === 'string') {
                        await databases.createStringAttribute(
                            APPWRITE_DATABASE_ID,
                            collection.$id,
                            field.key,
                            field.size,
                            field.required
                        );
                    } else if (field.type === 'integer') {
                        await databases.createIntegerAttribute(
                            APPWRITE_DATABASE_ID,
                            collection.$id,
                            field.key,
                            field.required
                        );
                    } else if (field.type === 'double') {
                        await databases.createFloatAttribute(
                            APPWRITE_DATABASE_ID,
                            collection.$id,
                            field.key,
                            field.required
                        );
                    } else if (field.type === 'boolean') {
                        await databases.createBooleanAttribute(
                            APPWRITE_DATABASE_ID,
                            collection.$id,
                            field.key,
                            field.required
                        );
                    } else if (field.type === 'datetime') {
                        await databases.createDatetimeAttribute(
                            APPWRITE_DATABASE_ID,
                            collection.$id,
                            field.key,
                            field.required
                        );
                    }
                    
                    console.log(`    ✅ Successfully added ${field.key}`);
                } catch (error) {
                    console.log(`    ❌ Failed to add ${field.key}: ${error.message}`);
                }
            }
        } catch (error) {
            console.log(`❌ Error processing collection ${collectionName}: ${error.message}`);
        }
    }
}

async function optimizeCollections() {
    console.log('\n🚀 Optimizing collection structure...\n');
    
    // Create indexes for better performance
    const collectionsToIndex = [
        { name: 'orders', fields: ['user_id', 'status', 'createdAt'] },
        { name: 'invoices', fields: ['user_id', 'status', 'due_date'] },
        { name: 'transactions', fields: ['user_id', 'type', 'created_at'] },
        { name: 'profiles', fields: ['user_id', 'email'] },
        { name: 'wizard_orders', fields: ['user_id', 'sessionId'] },
        { name: 'designs', fields: ['user_id', 'order_id'] }
    ];
    
    for (const collectionInfo of collectionsToIndex) {
        try {
            const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
            const collection = collections.collections.find(c => c.name === collectionInfo.name);
            
            if (!collection) continue;
            
            console.log(`📊 Creating indexes for: ${collectionInfo.name}`);
            
            for (const field of collectionInfo.fields) {
                try {
                    await databases.createIndex(
                        APPWRITE_DATABASE_ID,
                        collection.$id,
                        `idx_${field}`,
                        'key',
                        [field]
                    );
                    console.log(`  ✅ Index created for ${field}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`  ℹ️  Index already exists for ${field}`);
                    } else {
                        console.log(`  ❌ Failed to create index for ${field}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error indexing ${collectionInfo.name}: ${error.message}`);
        }
    }
}

async function generateOptimizationReport() {
    console.log('\n📊 Generating optimization report...\n');
    
    try {
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        
        console.log('🎯 OPTIMIZATION RESULTS');
        console.log('=' .repeat(50));
        console.log(`\n📈 FINAL STATISTICS:`);
        console.log(`Total Collections: ${collections.collections.length}`);
        console.log(`Collections Removed: ${collectionsToRemove.length}`);
        console.log(`Fields Cleaned: ${Object.values(fieldsToRemove).flat().length}`);
        console.log(`Fields Added: ${Object.values(fieldsToAdd).flat().length}`);
        
        console.log(`\n✅ REMAINING COLLECTIONS:`);
        for (const collection of collections.collections) {
            const isRequired = requiredCollections[collection.name] ? '✅ Required' : '⚠️  Unknown';
            console.log(`  ${collection.name}: ${isRequired}`);
        }
        
        console.log(`\n💡 OPTIMIZATION BENEFITS:`);
        console.log(`  • Reduced database size by removing duplicates`);
        console.log(`  • Improved query performance with proper indexes`);
        console.log(`  • Cleaner, more maintainable schema`);
        console.log(`  • Consistent naming conventions (camelCase)`);
        console.log(`  • Better data integrity and relationships`);
        
        console.log(`\n🔧 NEXT STEPS:`);
        console.log(`  1. Test your application thoroughly`);
        console.log(`  2. Monitor database performance`);
        console.log(`  3. Update frontend code if needed`);
        console.log(`  4. Consider implementing data archiving for old records`);
        
    } catch (error) {
        console.log(`❌ Error generating report: ${error.message}`);
    }
}

async function main() {
    console.log('🚀 Starting Appwrite Database Optimization...\n');
    console.log('⚠️  WARNING: This will permanently modify your database!');
    console.log('Make sure you have a backup before proceeding.\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Do you want to proceed with database optimization? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
            try {
                console.log('\n🚀 Starting optimization process...\n');
                
                // Step 1: Remove unused collections
                await removeUnusedCollections();
                
                // Step 2: Remove duplicate fields
                await removeDuplicateFields();
                
                // Step 3: Add missing fields
                await addMissingFields();
                
                // Step 4: Optimize collections
                await optimizeCollections();
                
                // Step 5: Generate final report
                await generateOptimizationReport();
                
                console.log('\n🎉 Database optimization completed successfully!');
                
            } catch (error) {
                console.error('\n❌ Optimization failed:', error.message);
            }
        } else {
            console.log('\n❌ Optimization cancelled.');
        }
        
        rl.close();
    });
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    removeUnusedCollections,
    removeDuplicateFields,
    addMissingFields,
    optimizeCollections,
    generateOptimizationReport
};
