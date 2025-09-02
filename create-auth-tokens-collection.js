const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: './appwrite-config.env' });

(async () => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID;

  if (!databaseId) {
    console.error('APPWRITE_DATABASE_ID is missing');
    process.exit(1);
  }

  console.log('🏗️ Creating auth_tokens collection...');
  try {
    const collection = await databases.createCollection(
      databaseId,
      ID.unique(),
      'auth_tokens',
      [
        'read("users")',
        'write("users")',
        'create("users")',
        'update("users")',
        'delete("users")',
      ]
    );

    const collectionId = collection.$id;
    console.log('✅ Collection created:', collectionId);

    // Attributes
    await databases.createStringAttribute(databaseId, collectionId, 'user_id', 255, true);
    await databases.createStringAttribute(databaseId, collectionId, 'email', 255, false);
    await databases.createStringAttribute(databaseId, collectionId, 'type', 64, true); // verification | password_reset
    await databases.createStringAttribute(databaseId, collectionId, 'token_hash', 64, true);
    await databases.createBooleanAttribute(databaseId, collectionId, 'is_used', true);
    await databases.createStringAttribute(databaseId, collectionId, 'expires_at', 64, true);
    await databases.createStringAttribute(databaseId, collectionId, 'created_at', 64, true);
    await databases.createStringAttribute(databaseId, collectionId, 'updated_at', 64, true);

    // Indexes
    await databases.createIndex(databaseId, collectionId, 'idx_token_hash', 'key', ['token_hash']);
    await databases.createIndex(databaseId, collectionId, 'idx_type_hash', 'key', ['type', 'token_hash']);
    await databases.createIndex(databaseId, collectionId, 'idx_user_type', 'key', ['user_id', 'type']);
    await databases.createIndex(databaseId, collectionId, 'idx_expires', 'key', ['expires_at']);
    await databases.createIndex(databaseId, collectionId, 'idx_is_used', 'key', ['is_used']);

    console.log('\n🎉 auth_tokens collection ready. Add to env:');
    console.log(`APPWRITE_COLLECTION_AUTH_TOKENS=${collectionId}`);
  } catch (err) {
    console.error('❌ Failed to create collection:', err.message || err);
    process.exit(1);
  }
})();
