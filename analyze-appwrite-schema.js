const { Client, Databases, Storage, Functions, Account, Teams, Users } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

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

// Analysis results
const analysis = {
    collections: {},
    duplicates: [],
    conflicts: [],
    unused: [],
    recommendations: []
};

// Collections that are actually used in the codebase with their expected fields (snake_case)
const codebaseCollections = {
    orders: {
        name: 'Orders',
        description: 'Main orders collection used by wizard service',
        required: true,
        expectedFields: [
            'user_id', 'title', 'description', 'status', 'payment_status', 
            'comments', 'sessionId', 'siteType', 'orderNumber', 'totalAmount',
            'currency', 'createdAt', 'updatedAt', 'total_pages', 'total_sections',
            'design_data', 'design_options', 'design_snapshot', 'design_preview_url',
            'branding', 'payment_gateway', 'callback_url', 'return_url',
            'zarinpal_authority', 'zarinpal_ref_id', 'wizardData', 'websiteFramework',
            'additionalServices', 'domains', 'pricing'
        ]
    },
    invoices: {
        name: 'Invoices', 
        description: 'Invoice management system',
        required: true,
        expectedFields: ['user_id', 'order_id', 'amount', 'due_date', 'status', 'description', 'created_at', 'updated_at']
    },
    receipts: {
        name: 'Receipts',
        description: 'Digital receipt generation',
        required: true,
        expectedFields: ['invoice_id', 'ref_id', 'amount', 'format', 'created_at', 'updated_at']
    },
    wallets: {
        name: 'Wallets',
        description: 'User wallet balances',
        required: true,
        expectedFields: ['user_id', 'balance', 'created_at', 'updated_at']
    },
    transactions: {
        name: 'Transactions',
        description: 'Wallet transaction history',
        required: true,
        expectedFields: ['user_id', 'wallet_id', 'type', 'amount', 'description', 'status', 'balance_before', 'balance_after', 'reference_id', 'reference_type', 'metadata', 'created_at']
    },
    profiles: {
        name: 'Profiles',
        description: 'User profile information',
        required: true,
        expectedFields: ['user_id', 'email', 'full_name', 'phone', 'address', 'created_at', 'updated_at']
    },
    support_tickets: {
        name: 'Support Tickets',
        description: 'Customer support system',
        required: true,
        expectedFields: ['user_id', 'type', 'order_id', 'description', 'priority', 'status', 'created_at', 'updated_at']
    },
    notifications: {
        name: 'Notifications',
        description: 'User notification system',
        required: true,
        expectedFields: ['user_id', 'type', 'title', 'message', 'is_read', 'created_at']
    },
    // Authentication and verification collections
    password_resets: {
        name: 'Password Resets',
        description: 'Password reset tokens and management',
        required: true,
        expectedFields: ['user_id', 'token', 'expires_at', 'is_used', 'created_at']
    },
    email_verifications: {
        name: 'Email Verifications',
        description: 'Email verification tokens and management',
        required: true,
        expectedFields: ['user_id', 'token', 'expires_at', 'is_used', 'created_at']
    },
    user_roles: {
        name: 'User Roles',
        description: 'User role assignments and permissions',
        required: true,
        expectedFields: ['user_id', 'role', 'created_at']
    },
    // Design and wizard collections
    designs: {
        name: 'Designs',
        description: 'User design snapshots and configurations',
        required: true,
        expectedFields: ['user_id', 'order_id', 'design_data', 'design_snapshot', 'created_at', 'updated_at']
    },
    wizard_orders: {
        name: 'Wizard Orders',
        description: 'Wizard progress and temporary order data',
        required: true,
        expectedFields: ['user_id', 'sessionId', 'progress_data', 'order_data', 'created_at', 'updated_at']
    },
    // Domain and configuration collections
    domain_extensions: {
        name: 'Domain Extensions',
        description: 'Available domain extensions and pricing',
        required: true,
        expectedFields: ['extension', 'price', 'is_active', 'created_at', 'updated_at']
    },
    // Email and logging collections
    email_logs: {
        name: 'Email Logs',
        description: 'Email sending logs and tracking',
        required: true,
        expectedFields: ['user_id', 'type', 'recipient', 'subject', 'status', 'sent_at', 'created_at']
    },
    // Site configuration
    site_config: {
        name: 'Site Configuration',
        description: 'Global site settings and configuration',
        required: true,
        expectedFields: ['key', 'value', 'description', 'updated_at']
    },
    // User activity tracking
    user_activity: {
        name: 'User Activity',
        description: 'User activity logs and analytics',
        required: true,
        expectedFields: ['user_id', 'action', 'details', 'ip_address', 'user_agent', 'created_at']
    },
    // Wallet adjustments (admin)
    wallet_adjustments: {
        name: 'Wallet Adjustments',
        description: 'Admin wallet balance adjustments',
        required: true,
        expectedFields: ['user_id', 'admin_id', 'amount', 'reason', 'type', 'created_at']
    },
    // Notification preferences
    notification_preferences: {
        name: 'Notification Preferences',
        description: 'User notification preferences and settings',
        required: true,
        expectedFields: ['user_id', 'email_notifications', 'push_notifications', 'sms_notifications', 'created_at', 'updated_at']
    },
    // Push tokens for mobile notifications
    push_tokens: {
        name: 'Push Tokens',
        description: 'Mobile push notification tokens',
        required: true,
        expectedFields: ['user_id', 'token', 'platform', 'is_active', 'created_at', 'updated_at']
    }
};

async function analyzeDatabase() {
    console.log('🔍 Starting Appwrite Database Schema Analysis...\n');

    try {
        // Get all collections
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        
        for (const collection of collections.collections) {
            console.log(`📋 Analyzing collection: ${collection.name} (${collection.$id})`);
            
            // Get collection attributes
            const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, collection.$id);
            
            analysis.collections[collection.$id] = {
                name: collection.name,
                id: collection.$id,
                attributes: attributes.attributes,
                attributeCount: attributes.attributes.length
            };

            // Analyze attributes for this collection
            await analyzeCollectionAttributes(collection.$id, collection.name, attributes.attributes);
        }

        // Generate recommendations
        generateRecommendations();
        
        // Output results
        outputResults();
        
        // Save detailed report
        saveDetailedReport();

    } catch (error) {
        console.error('❌ Error analyzing database:', error);
    }
}

async function analyzeCollectionAttributes(collectionId, collectionName, attributes) {
    console.log(`  📊 Found ${attributes.length} attributes`);
    
    const attributeNames = attributes.map(attr => attr.key);
    const duplicates = findDuplicateAttributes(attributes);
    const conflicts = findConflictingAttributes(attributes);
    
    if (duplicates.length > 0) {
        analysis.duplicates.push({
            collection: collectionName,
            collectionId: collectionId,
            duplicates: duplicates
        });
    }
    
    if (conflicts.length > 0) {
        analysis.conflicts.push({
            collection: collectionName,
            collectionId: collectionId,
            conflicts: conflicts
        });
    }

    // Check for unused attributes based on codebase analysis
    if (codebaseCollections[collectionName]) {
        const usedFields = codebaseCollections[collectionName].expectedFields;
        const unusedFields = attributeNames.filter(attr => !usedFields.includes(attr));
        
        if (unusedFields.length > 0) {
            analysis.unused.push({
                collection: collectionName,
                collectionId: collectionId,
                unused: unusedFields
            });
        }
    }
}

function findDuplicateAttributes(attributes) {
    const duplicates = [];
    const seen = new Map();
    
    for (const attr of attributes) {
        const normalizedKey = attr.key.toLowerCase();
        
        if (seen.has(normalizedKey)) {
            duplicates.push({
                key: attr.key,
                duplicateOf: seen.get(normalizedKey),
                type: attr.type,
                required: attr.required
            });
        } else {
            seen.set(normalizedKey, attr.key);
        }
    }
    
    return duplicates;
}

function findConflictingAttributes(attributes) {
    const conflicts = [];
    const fieldPatterns = {
        snake_case: /^[a-z]+(_[a-z]+)*$/,
        camelCase: /^[a-z]+([A-Z][a-z]*)*$/
    };
    
    // Check for mixed naming conventions
    const snakeCaseFields = attributes.filter(attr => fieldPatterns.snake_case.test(attr.key));
    const camelCaseFields = attributes.filter(attr => fieldPatterns.camelCase.test(attr.key));
    
    if (snakeCaseFields.length > 0 && camelCaseFields.length > 0) {
        // Find potential conflicts (same meaning, different naming)
        const conflicts = [];
        
        for (const snakeField of snakeCaseFields) {
            const camelField = camelCaseFields.find(camel => 
                snakeField.key.replace(/_/g, '') === camel.key.replace(/([A-Z])/g, (match, p1) => p1.toLowerCase())
            );
            
            if (camelField) {
                conflicts.push({
                    snake_case: snakeField.key,
                    camelCase: camelField.key,
                    recommendation: 'Keep camelCase version for consistency'
                });
            }
        }
        
        return conflicts;
    }
    
    return [];
}

function generateRecommendations() {
    console.log('\n💡 Generating recommendations...\n');
    
    // Process duplicates
    for (const duplicate of analysis.duplicates) {
        for (const dup of duplicate.duplicates) {
            analysis.recommendations.push({
                type: 'duplicate',
                collection: duplicate.collection,
                issue: `Duplicate attribute: ${dup.key} conflicts with ${dup.duplicateOf}`,
                action: `DELETE ${dup.key}`,
                reason: 'Duplicate attributes cause confusion and data inconsistency'
            });
        }
    }
    
    // Process conflicts
    for (const conflict of analysis.conflicts) {
        for (const conf of conflict.conflicts) {
            analysis.recommendations.push({
                type: 'conflict',
                collection: conflict.collection,
                issue: `Naming conflict: ${conf.snake_case} vs ${conf.camelCase}`,
                action: `DELETE ${conf.snake_case}`,
                reason: conf.recommendation
            });
        }
    }
    
    // Process unused attributes
    for (const unused of analysis.unused) {
        for (const field of unused.unused) {
            analysis.recommendations.push({
                type: 'unused',
                collection: unused.collection,
                issue: `Unused attribute: ${field}`,
                action: `DELETE ${field}`,
                reason: 'Not referenced in codebase, safe to remove'
            });
        }
    }
    
    // Specific recommendations for orders collection
    const ordersCollection = analysis.collections[Object.keys(analysis.collections).find(key => 
        analysis.collections[key].name === 'orders'
    )];
    
    if (ordersCollection) {
        // Check for the specific issues in your orders table
        const ordersAttributes = ordersCollection.attributes.map(attr => attr.key);
        
        // Check for price vs totalAmount conflict
        if (ordersAttributes.includes('price') && ordersAttributes.includes('totalAmount')) {
            analysis.recommendations.push({
                type: 'conflict',
                collection: 'orders',
                issue: 'Both price and totalAmount exist - this is redundant',
                action: 'DELETE price',
                reason: 'Keep totalAmount as it\'s more descriptive and matches the schema'
            });
        }
        
        // Check for created_at vs createdAt conflict
        if (ordersAttributes.includes('created_at') && ordersAttributes.includes('createdAt')) {
            analysis.recommendations.push({
                type: 'conflict',
                collection: 'orders',
                issue: 'Both created_at and createdAt exist - naming convention conflict',
                action: 'DELETE created_at',
                reason: 'Keep createdAt for camelCase consistency'
            });
        }
        
        // Check for updated_at vs updatedAt conflict
        if (ordersAttributes.includes('updated_at') && ordersAttributes.includes('updatedAt')) {
            analysis.recommendations.push({
                type: 'conflict',
                collection: 'orders',
                issue: 'Both updated_at and updatedAt exist - naming convention conflict',
                action: 'DELETE updated_at',
                reason: 'Keep updatedAt for camelCase consistency'
            });
        }
    }
}

function outputResults() {
    console.log('📊 ANALYSIS RESULTS\n');
    console.log('=' .repeat(50));
    
    // Summary
    console.log(`\n📈 SUMMARY:`);
    console.log(`Total Collections: ${Object.keys(analysis.collections).length}`);
    console.log(`Total Duplicates Found: ${analysis.duplicates.length}`);
    console.log(`Total Conflicts Found: ${analysis.conflicts.length}`);
    console.log(`Total Unused Attributes: ${analysis.unused.length}`);
    console.log(`Total Recommendations: ${analysis.recommendations.length}`);
    
    // Collections overview
    console.log(`\n📋 COLLECTIONS OVERVIEW:`);
    for (const [id, collection] of Object.entries(analysis.collections)) {
        console.log(`  ${collection.name}: ${collection.attributeCount} attributes`);
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
        console.log(`\n🚨 RECOMMENDATIONS:`);
        console.log('=' .repeat(50));
        
        for (const rec of analysis.recommendations) {
            console.log(`\n📍 ${rec.collection.toUpperCase()}:`);
            console.log(`   Issue: ${rec.issue}`);
            console.log(`   Action: ${rec.action}`);
            console.log(`   Reason: ${rec.reason}`);
        }
    }
    
    // Specific orders table analysis
    console.log(`\n🎯 ORDERS TABLE SPECIFIC ANALYSIS:`);
    console.log('=' .repeat(50));
    
    const ordersCollection = analysis.collections[Object.keys(analysis.collections).find(key => 
        analysis.collections[key].name === 'orders'
    )];
    
    if (ordersCollection) {
        console.log(`\nCurrent attributes in orders table:`);
        ordersCollection.attributes.forEach(attr => {
            const status = attr.required ? 'REQUIRED' : 'OPTIONAL';
            console.log(`  ${attr.key} (${attr.type}) - ${status}`);
        });
        
        console.log(`\n🚨 ISSUES IN ORDERS TABLE:`);
        
        // Check for specific problems
        const ordersAttributes = ordersCollection.attributes.map(attr => attr.key);
        
        if (ordersAttributes.includes('price') && ordersAttributes.includes('totalAmount')) {
            console.log(`  ❌ DUPLICATE: Both 'price' and 'totalAmount' exist`);
            console.log(`     → DELETE 'price', keep 'totalAmount'`);
        }
        
        if (ordersAttributes.includes('created_at') && ordersAttributes.includes('createdAt')) {
            console.log(`  ❌ CONFLICT: Both 'created_at' and 'createdAt' exist`);
            console.log(`     → DELETE 'created_at', keep 'createdAt'`);
        }
        
        if (ordersAttributes.includes('updated_at') && ordersAttributes.includes('updatedAt')) {
            console.log(`  ❌ CONFLICT: Both 'updated_at' and 'updatedAt' exist`);
            console.log(`     → DELETE 'updated_at', keep 'updatedAt'`);
        }
        
        if (!ordersAttributes.includes('orderNumber')) {
            console.log(`  ⚠️  MISSING: 'orderNumber' field is required but missing`);
        }
        
        if (!ordersAttributes.includes('currency')) {
            console.log(`  ⚠️  MISSING: 'currency' field is required but missing`);
        }
        
        console.log(`\n✅ RECOMMENDED ORDERS TABLE STRUCTURE:`);
        console.log(`   userId (string, required)`);
        console.log(`   orderNumber (string, required)`);
        console.log(`   title (string, required)`);
        console.log(`   description (string, optional)`);
        console.log(`   totalAmount (double, required)`);
        console.log(`   currency (string, required)`);
        console.log(`   status (enum, required)`);
        console.log(`   payment_status (string, required)`);
        console.log(`   comments (string, optional)`);
        console.log(`   design_data (string, optional)`);
        console.log(`   design_preview_url (string, optional)`);
        console.log(`   total_pages (integer, optional)`);
        console.log(`   total_sections (integer, optional)`);
        console.log(`   design_options (string, optional)`);
        console.log(`   sessionId (string, optional)`);
        console.log(`   siteType (string, optional)`);
        console.log(`   branding (string, optional)`);
        console.log(`   payment_gateway (string, optional)`);
        console.log(`   zarinpal_authority (string, optional)`);
        console.log(`   zarinpal_ref_id (string, optional)`);
        console.log(`   wizardData (string, optional)`);
        console.log(`   createdAt (datetime, required)`);
        console.log(`   updatedAt (datetime, required)`);
    }
}

function saveDetailedReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalCollections: Object.keys(analysis.collections).length,
            totalDuplicates: analysis.duplicates.length,
            totalConflicts: analysis.conflicts.length,
            totalUnused: analysis.unused.length,
            totalRecommendations: analysis.recommendations.length
        },
        collections: analysis.collections,
        duplicates: analysis.duplicates,
        conflicts: analysis.conflicts,
        unused: analysis.unused,
        recommendations: analysis.recommendations
    };
    
    fs.writeFileSync('appwrite-schema-analysis.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: appwrite-schema-analysis.json`);
}

// Cleanup script for removing duplicate/conflicting attributes
async function cleanupDatabase() {
    console.log('\n🧹 DATABASE CLEANUP SCRIPT');
    console.log('=' .repeat(50));
    console.log('\n⚠️  WARNING: This will permanently delete attributes from your database!');
    console.log('Make sure you have a backup before proceeding.\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Do you want to proceed with cleanup? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
            console.log('\n🚀 Starting cleanup process...\n');
            
            for (const rec of analysis.recommendations) {
                if (rec.action.startsWith('DELETE')) {
                    const fieldToDelete = rec.action.replace('DELETE ', '');
                    const collectionId = Object.keys(analysis.collections).find(key => 
                        analysis.collections[key].name === rec.collection
                    );
                    
                    if (collectionId) {
                        try {
                            console.log(`🗑️  Deleting ${fieldToDelete} from ${rec.collection}...`);
                            await databases.deleteAttribute(APPWRITE_DATABASE_ID, collectionId, fieldToDelete);
                            console.log(`✅ Successfully deleted ${fieldToDelete}`);
                        } catch (error) {
                            console.log(`❌ Failed to delete ${fieldToDelete}: ${error.message}`);
                        }
                    }
                }
            }
            
            console.log('\n🎉 Cleanup completed!');
        } else {
            console.log('\n❌ Cleanup cancelled.');
        }
        
        rl.close();
    });
}

// Main execution
async function main() {
    if (process.argv.includes('--cleanup')) {
        // Run cleanup after analysis
        await analyzeDatabase();
        await cleanupDatabase();
    } else {
        // Just run analysis
        await analyzeDatabase();
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { analyzeDatabase, cleanupDatabase };
