const { Client, Databases } = require('node-appwrite');

// Configuration - update these values
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'your-project-id';
const APPWRITE_API_KEY = 'your-api-key';
const APPWRITE_DATABASE_ID = 'your-database-id';

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function analyzeDatabase() {
    console.log('🔍 Analyzing Appwrite Database Schema...\n');
    
    try {
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        
        for (const collection of collections.collections) {
            console.log(`📋 Collection: ${collection.name}`);
            
            const attributes = await databases.listAttributes(APPWRITE_DATABASE_ID, collection.$id);
            const attrNames = attributes.attributes.map(attr => attr.key);
            
            console.log(`   Attributes (${attrNames.length}): ${attrNames.join(', ')}`);
            
            // Check for specific issues in orders collection
            if (collection.name === 'orders') {
                analyzeOrdersCollection(attrNames);
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

function analyzeOrdersCollection(attributes) {
    console.log('   🚨 ISSUES FOUND:');
    
    // Check for duplicates
    if (attributes.includes('price') && attributes.includes('totalAmount')) {
        console.log('     ❌ DUPLICATE: Both "price" and "totalAmount" exist');
        console.log('        → DELETE "price", keep "totalAmount"');
    }
    
    if (attributes.includes('created_at') && attributes.includes('createdAt')) {
        console.log('     ❌ CONFLICT: Both "created_at" and "createdAt" exist');
        console.log('        → DELETE "created_at", keep "createdAt"');
    }
    
    if (attributes.includes('updated_at') && attributes.includes('updatedAt')) {
        console.log('     ❌ CONFLICT: Both "updated_at" and "updatedAt" exist');
        console.log('        → DELETE "updated_at", keep "updatedAt"');
    }
    
    // Check for missing required fields
    if (!attributes.includes('orderNumber')) {
        console.log('     ⚠️  MISSING: "orderNumber" field is required');
    }
    
    if (!attributes.includes('currency')) {
        console.log('     ⚠️  MISSING: "currency" field is required');
    }
    
    console.log('\n   ✅ RECOMMENDED STRUCTURE:');
    console.log('      userId, orderNumber, title, description, totalAmount, currency,');
    console.log('      status, payment_status, comments, design_data, design_preview_url,');
    console.log('      total_pages, total_sections, design_options, sessionId, siteType,');
    console.log('      branding, payment_gateway, zarinpal_authority, zarinpal_ref_id,');
    console.log('      wizardData, createdAt, updatedAt');
}

// Run analysis
analyzeDatabase();
