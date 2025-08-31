const { Client, Databases } = require('node-appwrite');
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
    codebase: {},
    appwrite: {},
    mismatches: [],
    recommendations: []
};

// Known field mappings from your codebase (based on actual usage)
const codebaseFieldMappings = {
    orders: {
        // Core fields used in codebase
        user_id: { type: 'string', required: true, used: true },
        title: { type: 'string', required: true, used: true },
        description: { type: 'string', required: false, used: true },
        price: { type: 'number', required: true, used: true },
        status: { type: 'string', required: true, used: true },
        payment_status: { type: 'string', required: true, used: true },
        comments: { type: 'string', required: false, used: true },
        sessionId: { type: 'string', required: false, used: true },
        siteType: { type: 'string', required: false, used: true },
        created_at: { type: 'datetime', required: true, used: true },
        updated_at: { type: 'datetime', required: true, used: true },
        
        // Fields that might be used but need verification
        design_data: { type: 'string', required: false, used: false },
        design_preview_url: { type: 'string', required: false, used: false },
        total_pages: { type: 'number', required: false, used: false },
        total_sections: { type: 'number', required: false, used: false },
        design_options: { type: 'string', required: false, used: false },
        branding: { type: 'string', required: false, used: false },
        payment_gateway: { type: 'string', required: false, used: false },
        zarinpal_authority: { type: 'string', required: false, used: false },
        zarinpal_ref_id: { type: 'string', required: false, used: false },
        wizardData: { type: 'string', required: false, used: false },
        orderNumber: { type: 'string', required: false, used: false },
        totalAmount: { type: 'number', required: false, used: false },
        currency: { type: 'string', required: false, used: false },
        createdAt: { type: 'datetime', required: false, used: false },
        updatedAt: { type: 'datetime', required: false, used: false }
    },
    invoices: {
        user_id: { type: 'string', required: true, used: true },
        order_id: { type: 'string', required: true, used: true },
        amount: { type: 'number', required: true, used: true },
        due_date: { type: 'datetime', required: true, used: true },
        status: { type: 'string', required: true, used: true },
        description: { type: 'string', required: false, used: true },
        created_at: { type: 'datetime', required: true, used: true },
        updated_at: { type: 'datetime', required: true, used: true }
    },
    receipts: {
        invoice_id: { type: 'string', required: true, used: true },
        ref_id: { type: 'string', required: true, used: true },
        amount: { type: 'number', required: true, used: true },
        format: { type: 'string', required: true, used: true },
        created_at: { type: 'datetime', required: true, used: true },
        updated_at: { type: 'datetime', required: true, used: true }
    },
    wallets: {
        user_id: { type: 'string', required: true, used: true },
        balance: { type: 'number', required: true, used: true },
        created_at: { type: 'datetime', required: true, used: true },
        updated_at: { type: 'datetime', required: true, used: true }
    },
    transactions: {
        user_id: { type: 'string', required: true, used: true },
        wallet_id: { type: 'string', required: true, used: true },
        type: { type: 'string', required: true, used: true },
        amount: { type: 'number', required: true, used: true },
        description: { type: 'string', required: false, used: true },
        status: { type: 'string', required: true, used: true },
        balance_before: { type: 'number', required: true, used: true },
        balance_after: { type: 'number', required: true, used: true },
        reference_id: { type: 'string', required: false, used: true },
        reference_type: { type: 'string', required: false, used: true },
        metadata: { type: 'string', required: false, used: true },
        created_at: { type: 'datetime', required: true, used: true }
    },
    profiles: {
        user_id: { type: 'string', required: true, used: true },
        email: { type: 'string', required: true, used: true },
        full_name: { type: 'string', required: false, used: true },
        phone: { type: 'string', required: false, used: true },
        address: { type: 'string', required: false, used: true },
        created_at: { type: 'datetime', required: true, used: true },
        updated_at: { type: 'datetime', required: true, used: true }
    },
    support_tickets: {
        user_id: { type: 'string', required: true, used: true },
        type: { type: 'string', required: true, used: true },
        order_id: { type: 'string', required: false, used: true },
        description: { type: 'string', required: true, used: true },
        priority: { type: 'string', required: true, used: true },
        status: { type: 'string', required: true, used: true },
        created_at: { type: 'datetime', required: true, used: true },
        updated_at: { type: 'datetime', required: true, used: true }
    },
    notifications: {
        user_id: { type: 'string', required: true, used: true },
        type: { type: 'string', required: true, used: true },
        title: { type: 'string', required: true, used: true },
        message: { type: 'string', required: true, used: true },
        is_read: { type: 'boolean', required: true, used: true },
        created_at: { type: 'datetime', required: true, used: true }
    }
};

async function analyzeCodebaseUsage() {
    console.log('🔍 Analyzing codebase field usage...\n');
    
    // This would normally scan your actual codebase files
    // For now, we'll use the predefined mappings
    analysis.codebase = codebaseFieldMappings;
    
    console.log('✅ Codebase analysis completed');
    console.log(`   - Collections analyzed: ${Object.keys(analysis.codebase).length}`);
    
    // Count total fields
    let totalFields = 0;
    Object.values(analysis.codebase).forEach(collection => {
        totalFields += Object.keys(collection).length;
    });
    console.log(`   - Total fields: ${totalFields}\n`);
}

async function analyzeAppwriteSchema() {
    console.log('🔍 Analyzing Appwrite database schema...\n');
    
    try {
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        
        for (const collection of collections.collections) {
            console.log(`📋 Collection: ${collection.name} (${collection.$id})`);
            
            try {
                const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, collection.$id);
                
                analysis.appwrite[collection.$id] = {
                    name: collection.name,
                    attributes: {}
                };
                
                for (const attribute of attributes.attributes) {
                    analysis.appwrite[collection.$id].attributes[attribute.key] = {
                        type: attribute.type,
                        required: attribute.required,
                        size: attribute.size,
                        array: attribute.array,
                        default: attribute.default
                    };
                }
                
                console.log(`   - Attributes: ${Object.keys(analysis.appwrite[collection.$id].attributes).length}`);
                
            } catch (error) {
                console.log(`   - Error getting attributes: ${error.message}`);
            }
        }
        
        console.log('\n✅ Appwrite schema analysis completed');
        console.log(`   - Collections found: ${Object.keys(analysis.appwrite).length}\n`);
        
    } catch (error) {
        console.error('❌ Error analyzing Appwrite schema:', error.message);
        throw error;
    }
}

function findMismatches() {
    console.log('🔍 Finding mismatches between codebase and database...\n');
    
    const mismatches = [];
    
    // Check each collection
    Object.keys(analysis.codebase).forEach(collectionId => {
        const codebaseCollection = analysis.codebase[collectionId];
        const appwriteCollection = analysis.appwrite[collectionId];
        
        if (!appwriteCollection) {
            mismatches.push({
                type: 'missing_collection',
                collection: collectionId,
                message: `Collection '${collectionId}' exists in codebase but not in Appwrite`
            });
            return;
        }
        
        // Check for missing attributes in Appwrite
        Object.keys(codebaseCollection).forEach(fieldName => {
            if (!appwriteCollection.attributes[fieldName]) {
                mismatches.push({
                    type: 'missing_field',
                    collection: collectionId,
                    field: fieldName,
                    message: `Field '${fieldName}' exists in codebase but not in Appwrite collection '${collectionId}'`
                });
            }
        });
        
        // Check for extra attributes in Appwrite
        Object.keys(appwriteCollection.attributes).forEach(fieldName => {
            if (!codebaseCollection[fieldName]) {
                mismatches.push({
                    type: 'extra_field',
                    collection: collectionId,
                    field: fieldName,
                    message: `Field '${fieldName}' exists in Appwrite collection '${collectionId}' but not in codebase`
                });
            }
        });
    });
    
    // Check for extra collections in Appwrite
    Object.keys(analysis.appwrite).forEach(collectionId => {
        if (!analysis.codebase[collectionId]) {
            mismatches.push({
                type: 'extra_collection',
                collection: collectionId,
                message: `Collection '${collectionId}' exists in Appwrite but not in codebase`
            });
        }
    });
    
    analysis.mismatches = mismatches;
    
    console.log(`✅ Mismatch analysis completed`);
    console.log(`   - Total mismatches found: ${mismatches.length}\n`);
}

function generateRecommendations() {
    console.log('💡 Generating recommendations...\n');
    
    const recommendations = [];
    
    // Group mismatches by type
    const missingFields = analysis.mismatches.filter(m => m.type === 'missing_field');
    const extraFields = analysis.mismatches.filter(m => m.type === 'extra_field');
    const missingCollections = analysis.mismatches.filter(m => m.type === 'missing_collection');
    const extraCollections = analysis.mismatches.filter(m => m.type === 'extra_collection');
    
    if (missingFields.length > 0) {
        recommendations.push({
            priority: 'HIGH',
            action: 'ADD_FIELDS',
            message: `Add ${missingFields.length} missing fields to Appwrite collections`,
            details: missingFields.map(m => `${m.collection}.${m.field}`)
        });
    }
    
    if (extraFields.length > 0) {
        recommendations.push({
            priority: 'MEDIUM',
            action: 'REMOVE_FIELDS',
            message: `Remove ${extraFields.length} unused fields from Appwrite collections`,
            details: extraFields.map(m => `${m.collection}.${m.field}`)
        });
    }
    
    if (missingCollections.length > 0) {
        recommendations.push({
            priority: 'HIGH',
            action: 'CREATE_COLLECTIONS',
            message: `Create ${missingCollections.length} missing collections in Appwrite`,
            details: missingCollections.map(m => m.collection)
        });
    }
    
    if (extraCollections.length > 0) {
        recommendations.push({
            priority: 'LOW',
            action: 'REMOVE_COLLECTIONS',
            message: `Consider removing ${extraCollections.length} unused collections from Appwrite`,
            details: extraCollections.map(m => m.collection)
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'NONE',
            action: 'PERFECT_MATCH',
            message: 'Codebase and Appwrite schema are perfectly aligned!',
            details: []
        });
    }
    
    analysis.recommendations = recommendations;
    
    console.log(`✅ Recommendations generated: ${recommendations.length}\n`);
}

function outputResults() {
    console.log('📊 ANALYSIS RESULTS\n');
    console.log('=' .repeat(50));
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   - Codebase collections: ${Object.keys(analysis.codebase).length}`);
    console.log(`   - Appwrite collections: ${Object.keys(analysis.appwrite).length}`);
    console.log(`   - Total mismatches: ${analysis.mismatches.length}`);
    
    // Mismatches
    if (analysis.mismatches.length > 0) {
        console.log('\n❌ MISMATCHES FOUND:');
        analysis.mismatches.forEach((mismatch, index) => {
            console.log(`   ${index + 1}. ${mismatch.message}`);
        });
    } else {
        console.log('\n✅ NO MISMATCHES FOUND!');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    analysis.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}: ${rec.message}`);
        if (rec.details.length > 0) {
            rec.details.forEach(detail => {
                console.log(`      - ${detail}`);
            });
        }
    });
    
    // Detailed collection comparison
    console.log('\n📊 DETAILED COLLECTION COMPARISON:');
    Object.keys(analysis.codebase).forEach(collectionId => {
        const codebaseCollection = analysis.codebase[collectionId];
        const appwriteCollection = analysis.appwrite[collectionId];
        
        console.log(`\n   Collection: ${collectionId}`);
        
        if (!appwriteCollection) {
            console.log(`     ❌ Missing in Appwrite`);
            return;
        }
        
        const codebaseFields = Object.keys(codebaseCollection);
        const appwriteFields = Object.keys(appwriteCollection.attributes);
        
        console.log(`     - Codebase fields: ${codebaseFields.length}`);
        console.log(`     - Appwrite fields: ${appwriteFields.length}`);
        
        // Show field details
        codebaseFields.forEach(field => {
            const appwriteField = appwriteCollection.attributes[field];
            if (appwriteField) {
                console.log(`       ✅ ${field}: ${appwriteField.type}${appwriteField.required ? ' (required)' : ''}`);
            } else {
                console.log(`       ❌ ${field}: Missing in Appwrite`);
            }
        });
        
        // Show extra fields
        appwriteFields.forEach(field => {
            if (!codebaseCollection[field]) {
                console.log(`       ⚠️  ${field}: Extra in Appwrite`);
            }
        });
    });
}

function saveDetailedReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            codebaseCollections: Object.keys(analysis.codebase).length,
            appwriteCollections: Object.keys(analysis.appwrite).length,
            totalMismatches: analysis.mismatches.length
        },
        mismatches: analysis.mismatches,
        recommendations: analysis.recommendations,
        detailedComparison: Object.keys(analysis.codebase).map(collectionId => {
            const codebaseCollection = analysis.codebase[collectionId];
            const appwriteCollection = analysis.appwrite[collectionId];
            
            return {
                collection: collectionId,
                codebaseFields: Object.keys(codebaseCollection),
                appwriteFields: appwriteCollection ? Object.keys(appwriteCollection.attributes) : [],
                missingFields: Object.keys(codebaseCollection).filter(field => 
                    !appwriteCollection || !appwriteCollection.attributes[field]
                ),
                extraFields: appwriteCollection ? 
                    Object.keys(appwriteCollection.attributes).filter(field => 
                        !codebaseCollection[field]
                    ) : []
            };
        })
    };
    
    const filename = `schema-analysis-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${filename}`);
}

async function cleanupDatabase() {
    console.log('\n🧹 DATABASE CLEANUP RECOMMENDATIONS\n');
    console.log('=' .repeat(50));
    
    const extraFields = analysis.mismatches.filter(m => m.type === 'extra_field');
    const extraCollections = analysis.mismatches.filter(m => m.type === 'extra_collection');
    
    if (extraFields.length > 0) {
        console.log('\n🗑️  FIELDS TO REMOVE:');
        extraFields.forEach(field => {
            console.log(`   - ${field.collection}.${field.field}`);
        });
        
        console.log('\n⚠️  WARNING: Removing fields will permanently delete data!');
        console.log('   Make sure to backup your database before proceeding.');
    }
    
    if (extraCollections.length > 0) {
        console.log('\n🗑️  COLLECTIONS TO REMOVE:');
        extraCollections.forEach(collection => {
            console.log(`   - ${collection.collection}`);
        });
        
        console.log('\n⚠️  WARNING: Removing collections will permanently delete all data!');
        console.log('   Make sure to backup your database before proceeding.');
    }
    
    if (extraFields.length === 0 && extraCollections.length === 0) {
        console.log('\n✅ No cleanup needed - database is clean!');
    }
}

async function main() {
    try {
        console.log('🚀 Starting Codebase-Database Schema Analysis...\n');
        
        // Step 1: Analyze codebase usage
        await analyzeCodebaseUsage();
        
        // Step 2: Analyze Appwrite schema
        await analyzeAppwriteSchema();
        
        // Step 3: Find mismatches
        findMismatches();
        
        // Step 4: Generate recommendations
        generateRecommendations();
        
        // Step 5: Output results
        outputResults();
        
        // Step 6: Save detailed report
        saveDetailedReport();
        
        // Step 7: Show cleanup recommendations
        await cleanupDatabase();
        
        console.log('\n🎉 Analysis completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

// Run the analysis
if (require.main === module) {
    main();
}

module.exports = {
    analyzeCodebaseUsage,
    analyzeAppwriteSchema,
    findMismatches,
    generateRecommendations,
    outputResults,
    saveDetailedReport,
    cleanupDatabase
};
