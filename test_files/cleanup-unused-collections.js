const { Client, Databases, Storage, Users, Functions } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1',
  projectId: '6898b35e003067cd7b43',
  apiKey: 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4',
  databaseId: '6899993d001b0b35b6b5',
};

// Initialize Appwrite client
const client = new Client();
client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);
const functions = new Functions(client);

// Collections that are actively used by the codebase
const REQUIRED_COLLECTIONS = [
  'users',
  'orders',
  'profiles',
  'wizard_orders',
  'project_files',
  'password_resets',
  'email_verifications',
  'sessions',
  'tokens',
  'site_config',
  'email_logs',
  'receipts',
  'wallet_adjustments',
  'domain_extensions',
  'user_activity',
  'notification_preferences',
  'designs',
  'invoices',
  'analytics',
  'notifications'
];

// Collections that can be safely removed (enhanced/duplicate collections)
const COLLECTIONS_TO_REMOVE = [
  'enhanced_orders',
  'enhanced_wallet_transactions',
  'enhanced_payment_requests',
  'order_progress',
  'wallet_transactions',
  'payment_requests',
  'user_sessions',
  'user_tokens',
  'user_profiles',
  'user_orders',
  'user_files',
  'user_designs',
  'user_invoices',
  'user_analytics',
  'user_notifications'
];

// Attributes that are commonly unused and can be removed
const COMMON_UNUSED_ATTRIBUTES = [
  'userId', // Old camelCase version
  'userid', // Old version
  'orderId', // Old camelCase version
  'orderid', // Old version
  'createdAt', // Old camelCase version
  'updatedAt', // Old camelCase version
  'completedAt', // Old camelCase version
  'lastAccessed', // Old camelCase version
  'sessionId', // Old camelCase version
  'sessionid', // Old version
  'siteType', // Old camelCase version
  'paymentGateway', // Old camelCase version
  'zarinpalAuthority', // Old camelCase version
  'zarinpalRefId', // Old camelCase version
  'wizardData', // Old camelCase version
  'designSnapshot', // Old camelCase version
  'callbackUrl', // Old camelCase version
  'returnUrl', // Old camelCase version
  'websiteFramework', // Old camelCase version
  'additionalServices', // Old camelCase version
  'projectFiles', // Old camelCase version
  'totalAmount', // Old camelCase version
  'walletId', // Old camelCase version
  'walletid', // Old version
  'fullName', // Old camelCase version
  'fileName', // Old camelCase version
  'originalName', // Old camelCase version
  'mimeType', // Old camelCase version
  'bucketId', // Old camelCase version
  'fileId' // Old camelCase version
];

async function analyzeCollections() {
  console.log('🔍 Analyzing Appwrite collections...');
  
  try {
    const collections = await databases.listCollections(config.databaseId);
    console.log(`📊 Found ${collections.total} collections`);
    
    const unusedCollections = [];
    const usedCollections = [];
    
    for (const collection of collections.collections) {
      if (REQUIRED_COLLECTIONS.includes(collection.$id)) {
        usedCollections.push(collection.$id);
      } else if (COLLECTIONS_TO_REMOVE.includes(collection.$id)) {
        unusedCollections.push(collection.$id);
      } else {
        console.log(`⚠️  Collection "${collection.$id}" not in required list - review manually`);
      }
    }
    
    console.log('\n✅ Required collections:');
    usedCollections.forEach(id => console.log(`  - ${id}`));
    
    console.log('\n🗑️  Collections that can be removed:');
    unusedCollections.forEach(id => console.log(`  - ${id}`));
    
    return { usedCollections, unusedCollections };
  } catch (error) {
    console.error('❌ Error analyzing collections:', error.message);
    return { usedCollections: [], unusedCollections: [] };
  }
}

async function analyzeAttributes() {
  console.log('\n🔍 Analyzing collection attributes...');
  
  try {
    const collections = await databases.listCollections(config.databaseId);
    const attributeAnalysis = {};
    
    for (const collection of collections.collections) {
      if (REQUIRED_COLLECTIONS.includes(collection.$id)) {
        console.log(`\n📋 Analyzing collection: ${collection.$id}`);
        
        try {
          const attributes = await databases.listAttributes(config.databaseId, collection.$id);
          const unusedAttributes = [];
          
          for (const attr of attributes.attributes) {
            if (COMMON_UNUSED_ATTRIBUTES.includes(attr.key)) {
              unusedAttributes.push(attr.key);
            }
          }
          
          if (unusedAttributes.length > 0) {
            console.log(`  🗑️  Unused attributes: ${unusedAttributes.join(', ')}`);
            attributeAnalysis[collection.$id] = unusedAttributes;
          } else {
            console.log(`  ✅ No unused attributes found`);
          }
        } catch (error) {
          console.log(`  ⚠️  Could not analyze attributes: ${error.message}`);
        }
      }
    }
    
    return attributeAnalysis;
  } catch (error) {
    console.error('❌ Error analyzing attributes:', error.message);
    return {};
  }
}

async function removeUnusedCollections(collectionsToRemove) {
  console.log('\n🗑️  Removing unused collections...');
  
  let removedCount = 0;
  let failedCount = 0;
  
  for (const collectionId of collectionsToRemove) {
    try {
      console.log(`  🗑️  Removing collection: ${collectionId}`);
      await databases.deleteCollection(config.databaseId, collectionId);
      console.log(`  ✅ Successfully removed: ${collectionId}`);
      removedCount++;
    } catch (error) {
      console.log(`  ❌ Failed to remove ${collectionId}: ${error.message}`);
      failedCount++;
    }
  }
  
  console.log(`\n📊 Collection removal summary:`);
  console.log(`  ✅ Successfully removed: ${removedCount}`);
  console.log(`  ❌ Failed to remove: ${failedCount}`);
  
  return { removedCount, failedCount };
}

async function removeUnusedAttributes(attributeAnalysis) {
  console.log('\n🗑️  Removing unused attributes...');
  
  let removedCount = 0;
  let failedCount = 0;
  
  for (const [collectionId, attributes] of Object.entries(attributeAnalysis)) {
    for (const attributeKey of attributes) {
      try {
        console.log(`  🗑️  Removing attribute: ${collectionId}.${attributeKey}`);
        await databases.deleteAttribute(config.databaseId, collectionId, attributeKey);
        console.log(`  ✅ Successfully removed: ${collectionId}.${attributeKey}`);
        removedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to remove ${collectionId}.${attributeKey}: ${error.message}`);
        failedCount++;
      }
    }
  }
  
  console.log(`\n📊 Attribute removal summary:`);
  console.log(`  ✅ Successfully removed: ${removedCount}`);
  console.log(`  ❌ Failed to remove: ${failedCount}`);
  
  return { removedCount, failedCount };
}

async function generateCleanupReport() {
  console.log('\n📋 Generating cleanup report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    endpoint: config.endpoint,
    projectId: config.projectId,
    databaseId: config.databaseId,
    requiredCollections: REQUIRED_COLLECTIONS,
    collectionsToRemove: COLLECTIONS_TO_REMOVE,
    commonUnusedAttributes: COMMON_UNUSED_ATTRIBUTES,
    summary: {}
  };
  
  try {
    // Analyze current state
    const { usedCollections, unusedCollections } = await analyzeCollections();
    const attributeAnalysis = await analyzeAttributes();
    
    // Generate summary
    report.summary = {
      totalCollections: usedCollections.length + unusedCollections.length,
      requiredCollections: usedCollections.length,
      removableCollections: unusedCollections.length,
      unusedAttributes: Object.values(attributeAnalysis).flat().length,
      attributeAnalysis
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Cleanup report saved to: ${reportPath}`);
    
    return report;
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    return report;
  }
}

async function main() {
  console.log('🚀 Starting Appwrite cleanup automation...\n');
  
  // Validate configuration
  if (!config.projectId || !config.apiKey || !config.databaseId) {
    console.error('❌ Missing required configuration. Please set:');
    console.error('  - APPWRITE_PROJECT_ID');
    console.error('  - APPWRITE_API_KEY');
    console.error('  - APPWRITE_DATABASE_ID');
    process.exit(1);
  }
  
  try {
    // Generate analysis report
    const report = await generateCleanupReport();
    
    // Ask for confirmation before proceeding
    console.log('\n⚠️  WARNING: This will permanently delete collections and attributes!');
    console.log('📊 Summary of what will be removed:');
    console.log(`  - Collections: ${report.summary.removableCollections}`);
    console.log(`  - Attributes: ${report.summary.unusedAttributes}`);
    
    // For safety, we'll just show what would be removed
    console.log('\n🔒 SAFETY MODE: Collections and attributes will NOT be automatically removed.');
    console.log('📝 Review the cleanup-report.json file and manually remove items if needed.');
    console.log('💡 To enable automatic removal, modify this script and uncomment the removal functions.');
    
    /*
    // Uncomment these lines to enable automatic removal
    if (report.summary.removableCollections > 0) {
      await removeUnusedCollections(report.summary.removableCollections);
    }
    
    if (report.summary.unusedAttributes > 0) {
      await removeUnusedAttributes(report.summary.attributeAnalysis);
    }
    */
    
    console.log('\n✅ Cleanup analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  analyzeCollections,
  analyzeAttributes,
  removeUnusedCollections,
  removeUnusedAttributes,
  generateCleanupReport
};

