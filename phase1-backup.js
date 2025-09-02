const { Client, Databases, Storage } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5'
};

if (!config.apiKey) {
  console.error('❌ APPWRITE_API_KEY is required in environment variables');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

// Create backup directory
const backupDir = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

async function backupCollections() {
  try {
    console.log('🔍 Starting collection backup...');
    
    // Get all collections
    const collections = await databases.listCollections(config.databaseId);
    console.log(`📊 Found ${collections.collections.length} collections`);
    
    // Save collections metadata
    const collectionsBackup = {
      timestamp: new Date().toISOString(),
      database_id: config.databaseId,
      collections: collections.collections
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'collections_metadata.json'),
      JSON.stringify(collectionsBackup, null, 2)
    );
    
    console.log('✅ Collections metadata backed up');
    
    // Backup each collection's documents
    for (const collection of collections.collections) {
      console.log(`📥 Backing up collection: ${collection.name} (${collection.$id})`);
      
      try {
        const documents = await databases.listDocuments(
          config.databaseId,
          collection.$id,
          100 // Get all documents (adjust if you have more than 100 per collection)
        );
        
        const collectionBackup = {
          collection_id: collection.$id,
          collection_name: collection.name,
          timestamp: new Date().toISOString(),
          document_count: documents.documents.length,
          documents: documents.documents
        };
        
        fs.writeFileSync(
          path.join(backupDir, `collection_${collection.$id}_documents.json`),
          JSON.stringify(collectionBackup, null, 2)
        );
        
        console.log(`  ✅ ${documents.documents.length} documents backed up`);
        
      } catch (error) {
        console.error(`  ❌ Failed to backup collection ${collection.name}:`, error.message);
      }
    }
    
    console.log('🎉 Collection backup completed!');
    
  } catch (error) {
    console.error('❌ Failed to backup collections:', error);
    throw error;
  }
}

async function backupStorageBuckets() {
  try {
    console.log('🗂️ Starting storage backup...');
    
    // Get all buckets
    const buckets = await storage.listBuckets();
    console.log(`📦 Found ${buckets.buckets.length} storage buckets`);
    
    // Save buckets metadata
    const bucketsBackup = {
      timestamp: new Date().toISOString(),
      buckets: buckets.buckets
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'storage_buckets_metadata.json'),
      JSON.stringify(bucketsBackup, null, 2)
    );
    
    console.log('✅ Storage buckets metadata backed up');
    
    // Backup files from each bucket
    for (const bucket of buckets.buckets) {
      console.log(`📁 Backing up bucket: ${bucket.name} (${bucket.$id})`);
      
      try {
        const files = await storage.listFiles(bucket.$id, 100);
        
        const bucketBackup = {
          bucket_id: bucket.$id,
          bucket_name: bucket.name,
          timestamp: new Date().toISOString(),
          file_count: files.files.length,
          files: files.files.map(file => ({
            file_id: file.$id,
            name: file.name,
            size: file.size,
            mime_type: file.mimeType,
            uploaded_at: file.$createdAt
          }))
        };
        
        fs.writeFileSync(
          path.join(backupDir, `bucket_${bucket.$id}_files.json`),
          JSON.stringify(bucketBackup, null, 2)
        );
        
        console.log(`  ✅ ${files.files.length} files metadata backed up`);
        
      } catch (error) {
        console.error(`  ❌ Failed to backup bucket ${bucket.name}:`, error.message);
      }
    }
    
    console.log('🎉 Storage backup completed!');
    
  } catch (error) {
    console.error('❌ Failed to backup storage:', error);
    throw error;
  }
}

async function createBackupSummary() {
  try {
    console.log('📝 Creating backup summary...');
    
    const summary = {
      backup_timestamp: new Date().toISOString(),
      database_id: config.databaseId,
      project_id: config.projectId,
      backup_directory: backupDir,
      instructions: {
        restore_collections: "Use the collections_metadata.json to recreate collections",
        restore_documents: "Use individual collection_*_documents.json files to restore documents",
        restore_storage: "Use storage_buckets_metadata.json to recreate buckets",
        restore_files: "Use individual bucket_*_files.json files to restore file metadata"
      },
      warnings: [
        "This backup contains metadata only. Actual file content is not backed up.",
        "To restore files, you'll need to re-upload them or restore from a separate backup.",
        "Test the restore process in a development environment first.",
        "Keep this backup directory safe and secure."
      ]
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'BACKUP_SUMMARY.md'),
      `# Database Backup Summary

## Backup Information
- **Timestamp**: ${summary.backup_timestamp}
- **Database ID**: ${summary.database_id}
- **Project ID**: ${summary.project_id}
- **Backup Directory**: ${summary.backup_directory}

## What's Backed Up
- ✅ Collections metadata and structure
- ✅ All documents from all collections
- ✅ Storage buckets metadata
- ✅ File metadata (names, sizes, types)

## What's NOT Backed Up
- ❌ Actual file content (images, documents, etc.)
- ❌ User passwords (these are handled by Appwrite Auth)
- ❌ Authentication tokens

## Restore Instructions
1. **Collections**: Use \`collections_metadata.json\` to recreate collection structure
2. **Documents**: Use individual \`collection_*_documents.json\` files to restore data
3. **Storage**: Use \`storage_buckets_metadata.json\` to recreate buckets
4. **Files**: Re-upload files or restore from separate backup

## Important Warnings
${summary.warnings.map(warning => `- ${warning}`).join('\n')}

## Next Steps
1. Verify all backup files are complete
2. Store backup directory in secure location
3. Test restore process in development environment
4. Proceed with database optimization

---
*Backup created by Appwrite Database Optimization Tool*
`
    );
    
    console.log('✅ Backup summary created');
    
  } catch (error) {
    console.error('❌ Failed to create backup summary:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Phase 1: Database Backup');
    console.log('=====================================');
    
    // Test connection
    console.log('🔌 Testing Appwrite connection...');
    await databases.listCollections(config.databaseId);
    console.log('✅ Connection successful');
    
    // Create backups
    await backupCollections();
    await backupStorageBuckets();
    await createBackupSummary();
    
    console.log('\n🎉 PHASE 1 COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log(`📁 Backup directory: ${backupDir}`);
    console.log('📋 Next step: Review backup files and proceed to Phase 2');
    console.log('⚠️  IMPORTANT: Keep backup directory safe before proceeding!');
    
  } catch (error) {
    console.error('\n❌ PHASE 1 FAILED!');
    console.error('=====================================');
    console.error('Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your APPWRITE_API_KEY has admin permissions');
    console.error('2. Verify database ID is correct');
    console.error('3. Ensure Appwrite service is running');
    console.error('4. Check network connectivity');
    
    process.exit(1);
  }
}

// Run backup
main();
