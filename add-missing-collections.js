const { Client, Databases, Storage, ID } = require('node-appwrite');
require('dotenv').config({ path: './appwrite-config.env' });

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const databaseId = process.env.APPWRITE_DATABASE_ID;

console.log('🚀 Adding missing collections to optimized database...');
console.log(`📊 Database ID: ${databaseId}`);

async function addMissingCollections() {
  try {
    // 1. Add wallets collection
    console.log('\n📦 Creating wallets collection...');
    const walletsCollection = await databases.createCollection(databaseId, ID.unique(), 'Wallets', [
      'read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'
    ]);
    console.log('✅ Wallets collection created:', walletsCollection.$id);

    // Add attributes to wallets collection
    await databases.createStringAttribute(databaseId, walletsCollection.$id, 'user_id', 255, true);
    await databases.createIntegerAttribute(databaseId, walletsCollection.$id, 'balance', true);
    await databases.createStringAttribute(databaseId, walletsCollection.$id, 'created_at', 255, true);
    await databases.createStringAttribute(databaseId, walletsCollection.$id, 'updated_at', 255, true);
    
    // Add indexes
    await databases.createIndex(databaseId, walletsCollection.$id, 'user_id_index', 'key', ['user_id']);
    console.log('✅ Wallets collection attributes and indexes added');

    // 2. Add transactions collection
    console.log('\n📦 Creating transactions collection...');
    const transactionsCollection = await databases.createCollection(databaseId, ID.unique(), 'Transactions', [
      'read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'
    ]);
    console.log('✅ Transactions collection created:', transactionsCollection.$id);

    // Add attributes to transactions collection
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'wallet_id', 255, true);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'user_id', 255, true);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'type', 255, true);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'status', 255, true);
    await databases.createIntegerAttribute(databaseId, transactionsCollection.$id, 'amount', true);
    await databases.createIntegerAttribute(databaseId, transactionsCollection.$id, 'balance_before', true);
    await databases.createIntegerAttribute(databaseId, transactionsCollection.$id, 'balance_after', true);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'description', 1000, false);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'reference_id', 255, false);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'reference_type', 255, false);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'metadata', 8192, false);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'created_at', 255, true);
    await databases.createStringAttribute(databaseId, transactionsCollection.$id, 'updated_at', 255, true);
    
    // Add indexes
    await databases.createIndex(databaseId, transactionsCollection.$id, 'user_id_index', 'key', ['user_id']);
    await databases.createIndex(databaseId, transactionsCollection.$id, 'type_index', 'key', ['type']);
    await databases.createIndex(databaseId, transactionsCollection.$id, 'status_index', 'key', ['status']);
    await databases.createIndex(databaseId, transactionsCollection.$id, 'created_at_index', 'key', ['created_at']);
    console.log('✅ Transactions collection attributes and indexes added');

    // 3. Add designs collection
    console.log('\n📦 Creating designs collection...');
    const designsCollection = await databases.createCollection(databaseId, ID.unique(), 'Designs', [
      'read("users")', 'write("users")', 'create("users")', 'update("users")', 'delete("users")'
    ]);
    console.log('✅ Designs collection created:', designsCollection.$id);

    // Add attributes to designs collection
    await databases.createStringAttribute(databaseId, designsCollection.$id, 'order_id', 255, true);
    await databases.createStringAttribute(databaseId, designsCollection.$id, 'design', 8192, false);
    await databases.createStringAttribute(databaseId, designsCollection.$id, 'created_at', 255, true);
    await databases.createStringAttribute(databaseId, designsCollection.$id, 'updated_at', 255, true);
    
    // Add indexes
    await databases.createIndex(databaseId, designsCollection.$id, 'order_id_index', 'key', ['order_id']);
    console.log('✅ Designs collection attributes and indexes added');

    console.log('\n🎉 All missing collections added successfully!');
    console.log('\n📋 Collection IDs to add to your .env files:');
    console.log(`APPWRITE_COLLECTION_WALLETS=${walletsCollection.$id}`);
    console.log(`APPWRITE_COLLECTION_TRANSACTIONS=${transactionsCollection.$id}`);
    console.log(`APPWRITE_COLLECTION_DESIGNS=${designsCollection.$id}`);

  } catch (error) {
    console.error('❌ Error adding collections:', error.message);
    if (error.code === 409) {
      console.log('⚠️  Some collections may already exist. This is normal.');
    }
  }
}

// Run the script
addMissingCollections();
