const { Client, Databases, ID } = require('node-appwrite');
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

async function createUserRolesCollection() {
  try {
    console.log('🔍 Creating user_roles collection...');
    
    // Create the user_roles collection
    const collection = await databases.createCollection(
      config.databaseId,
      ID.unique(),
      'user_roles'
    );

    console.log('✅ Collection created, now adding attributes...');

    // Add user_id attribute
    await databases.createStringAttribute(
      config.databaseId,
      collection.$id,
      'user_id',
      36,
      true
    );

    // Add role attribute (enum: user, admin)
    await databases.createEnumAttribute(
      config.databaseId,
      collection.$id,
      'role',
      ['user', 'admin'],
      false,
      'user'
    );

    // Add created_at attribute
    await databases.createDatetimeAttribute(
      config.databaseId,
      collection.$id,
      'created_at',
      true
    );

    // Add updated_at attribute
    await databases.createDatetimeAttribute(
      config.databaseId,
      collection.$id,
      'updated_at',
      false
    );

    console.log('✅ user_roles collection created successfully!');
    console.log(`📋 Collection ID: ${collection.$id}`);
    
    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    
    try {
      await databases.createIndex(
        config.databaseId,
        collection.$id,
        ID.unique(),
        'user_id_index',
        'key',
        ['user_id']
      );
      console.log('✅ user_id index created');
    } catch (indexError) {
      console.log('ℹ️ user_id index already exists or failed to create');
    }

    try {
      await databases.createIndex(
        config.databaseId,
        collection.$id,
        ID.unique(),
        'role_index',
        'key',
        ['role']
      );
      console.log('✅ role index created');
    } catch (indexError) {
      console.log('ℹ️ role index already exists or failed to create');
    }

    console.log('\n🎉 user_roles collection setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Run fix-user-admin-role.js to add your admin role');
    console.log('2. Test the /api/auth/me endpoint');
    
    return collection.$id;

  } catch (error) {
    console.error('❌ Error creating user_roles collection:', error);
    
    if (error.code === 409) {
      console.log('ℹ️ Collection already exists, getting its ID...');
      try {
        const collections = await databases.listCollections(config.databaseId);
        const userRolesCollection = collections.collections.find(col => col.name === 'user_roles');
        if (userRolesCollection) {
          console.log(`✅ Found existing user_roles collection: ${userRolesCollection.$id}`);
          return userRolesCollection.$id;
        }
      } catch (listError) {
        console.error('Could not list collections:', listError.message);
      }
    }
    
    throw error;
  }
}

// Run the collection creation
createUserRolesCollection()
  .then((collectionId) => {
    console.log(`\n🎯 Collection ID for future use: ${collectionId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
