const { Client, Databases, Storage } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5'
};

if (!config.apiKey) {
  console.error('❌ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

async function testCollectionCreation() {
  try {
    console.log('🧪 Testing collection creation...');
    
    // Test creating a document in the orders collection
    const testOrder = {
      user_id: 'test_user_123',
      order_number: 'TEST-001',
      title: 'Test Website Order',
      description: 'This is a test order to verify the new structure',
      total_amount: 1000000,
      currency: 'IRR',
      status: 'pending',
      payment_status: 'pending',
      site_type: 'personal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('  📝 Creating test order...');
    const orderDoc = await databases.createDocument(
      config.databaseId,
      'orders',
      'unique()',
      testOrder
    );
    
    console.log(`    ✅ Test order created with ID: ${orderDoc.$id}`);
    
    // Test reading the document
    console.log('  📖 Reading test order...');
    const readOrder = await databases.getDocument(
      config.databaseId,
      'orders',
      orderDoc.$id
    );
    
    console.log(`    ✅ Test order read successfully: ${readOrder.title}`);
    
    // Test updating the document
    console.log('  ✏️ Updating test order...');
    const updatedOrder = await databases.updateDocument(
      config.databaseId,
      'orders',
      orderDoc.$id,
      { status: 'completed', updated_at: new Date().toISOString() }
    );
    
    console.log(`    ✅ Test order updated successfully: ${updatedOrder.status}`);
    
    // Test querying the document
    console.log('  🔍 Querying test order...');
    const queryResult = await databases.listDocuments(
      config.databaseId,
      'orders',
      [databases.queries.equal('user_id', 'test_user_123')]
    );
    
    console.log(`    ✅ Query successful: Found ${queryResult.documents.length} orders`);
    
    // Clean up - delete test document
    console.log('  🗑️ Cleaning up test order...');
    await databases.deleteDocument(
      config.databaseId,
      'orders',
      orderDoc.$id
    );
    
    console.log('    ✅ Test order deleted successfully');
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Collection test failed:', error.message);
    return false;
  }
}

async function testStorageUpload() {
  try {
    console.log('🧪 Testing storage upload...');
    
    // Create a test file content
    const testContent = 'This is a test file to verify storage functionality';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    console.log('  📁 Uploading test file...');
    const uploadedFile = await storage.createFile(
      'project_files',
      'unique()',
      testFile
    );
    
    console.log(`    ✅ Test file uploaded with ID: ${uploadedFile.$id}`);
    
    // Test reading the file
    console.log('  📖 Reading test file...');
    const fileInfo = await storage.getFile('project_files', uploadedFile.$id);
    
    console.log(`    ✅ File info retrieved: ${fileInfo.name} (${fileInfo.size} bytes)`);
    
    // Clean up - delete test file
    console.log('  🗑️ Cleaning up test file...');
    await storage.deleteFile('project_files', uploadedFile.$id);
    
    console.log('    ✅ Test file deleted successfully');
    
    return true;
    
  } catch (error) {
    console.error('  ❌ Storage test failed:', error.message);
    return false;
  }
}

async function generateFinalReport() {
  try {
    console.log('📊 Generating final optimization report...');
    
    const collections = await databases.listCollections(config.databaseId);
    const buckets = await storage.listBuckets();
    
    const report = {
      timestamp: new Date().toISOString(),
      optimization_status: 'COMPLETED',
      summary: {
        collections_created: collections.collections.length,
        storage_buckets_created: buckets.buckets.length,
        total_attributes: 0,
        total_indexes: 0
      },
      collections: [],
      storage_buckets: [],
      next_steps: [
        'Update environment variables with new collection IDs',
        'Update backend services to use new collections',
        'Test all API endpoints',
        'Update frontend integration',
        'Monitor performance improvements'
      ]
    };
    
    // Collect collection details
    for (const collection of collections.collections) {
      try {
        const attributes = await databases.listAttributes(config.databaseId, collection.$id);
        const indexes = await databases.listIndexes(config.databaseId, collection.$id);
        
        report.summary.total_attributes += attributes.attributes.length;
        report.summary.total_indexes += indexes.indexes.length;
        
        report.collections.push({
          id: collection.$id,
          name: collection.name,
          attributes_count: attributes.attributes.length,
          indexes_count: indexes.indexes.length
        });
        
      } catch (error) {
        console.log(`  ⚠️  Could not get details for ${collection.name}: ${error.message}`);
      }
    }
    
    // Collect storage details
    for (const bucket of buckets.buckets) {
      report.storage_buckets.push({
        id: bucket.$id,
        name: bucket.name
      });
    }
    
    console.log('\n🎉 DATABASE OPTIMIZATION COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    console.log(`📊 Collections: ${report.summary.collections_created}`);
    console.log(`📦 Storage Buckets: ${report.summary.storage_buckets_created}`);
    console.log(`📝 Total Attributes: ${report.summary.total_attributes}`);
    console.log(`🔍 Total Indexes: ${report.summary.total_indexes}`);
    
    console.log('\n📋 Collections Created:');
    report.collections.forEach(col => {
      console.log(`  - ${col.name} (${col.id}): ${col.attributes_count} attributes, ${col.indexes_count} indexes`);
    });
    
    console.log('\n🗂️ Storage Buckets Created:');
    report.storage_buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.id})`);
    });
    
    console.log('\n📋 Next Steps:');
    report.next_steps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });
    
    console.log('\n🚀 Your database is now optimized and ready for production!');
    
  } catch (error) {
    console.error('❌ Failed to generate report:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Phase 3: Final Testing and Verification');
    console.log('==========================================');
    
    // Test connection
    console.log('🔌 Testing connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Test collections
    console.log('\n🧪 Testing collections...');
    const collectionTest = await testCollectionCreation();
    
    // Test storage
    console.log('\n🧪 Testing storage...');
    const storageTest = await testStorageUpload();
    
    // Generate final report
    if (collectionTest && storageTest) {
      console.log('\n🎉 All tests passed!');
      await generateFinalReport();
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('\n❌ Testing failed:', error.message);
    process.exit(1);
  }
}

main();
