const { Client, Databases, Users, ID } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5',
  userRolesCollection: process.env.APPWRITE_COLLECTION_USER_ROLES || '68b597bc00026c2fc802'
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
const users = new Users(client);

async function fixUserAdminRole() {
  try {
    console.log('🔍 Checking user_roles collection...');
    
    // First, let's see what's in the user_roles collection
    const existingRoles = await databases.listDocuments(
      config.databaseId,
      config.userRolesCollection,
      []
    );
    
    console.log(`📊 Found ${existingRoles.documents.length} existing role records:`);
    existingRoles.documents.forEach(doc => {
      console.log(`  - User ${doc.user_id}: ${doc.role}`);
    });

    // Get the user ID from the error message (689e28fe002e2a63e1c1)
    const targetUserId = '689e28fe002e2a63e1c1';
    
    console.log(`\n🎯 Target user ID: ${targetUserId}`);
    
    // Check if user already has a role record
    const existingUserRole = existingRoles.documents.find(doc => doc.user_id === targetUserId);
    
    if (existingUserRole) {
      console.log(`📝 User already has role: ${existingUserRole.role}`);
      
      if (existingUserRole.role === 'admin') {
        console.log('✅ User already has admin role in database!');
        return;
      }
      
      // Update existing role to admin
      console.log('🔄 Updating existing role to admin...');
      await databases.updateDocument(
        config.databaseId,
        config.userRolesCollection,
        existingUserRole.$id,
        {
          role: 'admin',
          updated_at: new Date().toISOString()
        }
      );
      console.log('✅ Role updated to admin successfully!');
    } else {
      // Create new admin role record
      console.log('🆕 Creating new admin role record...');
      await databases.createDocument(
        config.databaseId,
        config.userRolesCollection,
        ID.unique(),
        {
          user_id: targetUserId,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      );
      console.log('✅ Admin role record created successfully!');
    }

    // Verify the change
    console.log('\n🔍 Verifying the change...');
    const updatedRoles = await databases.listDocuments(
      config.databaseId,
      config.userRolesCollection,
      []
    );
    
    const userRole = updatedRoles.documents.find(doc => doc.user_id === targetUserId);
    if (userRole && userRole.role === 'admin') {
      console.log('✅ Verification successful! User now has admin role in database.');
      console.log(`\n📋 Summary:`);
      console.log(`  - User ID: ${targetUserId}`);
      console.log(`  - Database Role: ${userRole.role}`);
      console.log(`  - Appwrite Label: admin (set manually)`);
      console.log(`\n🚀 Now when you call /api/auth/me, you should get:`);
      console.log(`  { "success": true, "data": { "id": "${targetUserId}", "role": "admin" } }`);
    } else {
      console.error('❌ Verification failed! User role not properly set.');
    }

  } catch (error) {
    console.error('❌ Error fixing user admin role:', error);
    
    if (error.code === 404) {
      console.error('\n💡 The user_roles collection might not exist. Let\'s check available collections:');
      try {
        const collections = await databases.listCollections(config.databaseId);
        console.log('Available collections:');
        collections.collections.forEach(col => {
          console.log(`  - ${col.name} (${col.$id})`);
        });
      } catch (colError) {
        console.error('Could not list collections:', colError.message);
      }
    }
  }
}

// Run the fix
fixUserAdminRole()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
