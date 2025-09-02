const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5',
  userRolesCollection: '68b597bc00026c2fc802'
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

async function addAdminRole() {
  try {
    const targetUserId = '689e28fe002e2a63e1c1';
    
    console.log(`🎯 Adding admin role for user: ${targetUserId}`);
    
    // Create admin role document
    const adminRole = await databases.createDocument(
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
    
    console.log('✅ Admin role added successfully!');
    console.log(`📋 Document ID: ${adminRole.$id}`);
    
    // Verify it was created
    const verifyDoc = await databases.getDocument(
      config.databaseId,
      config.userRolesCollection,
      adminRole.$id
    );
    
    console.log('\n🔍 Verification:');
    console.log(`  - User ID: ${verifyDoc.user_id}`);
    console.log(`  - Role: ${verifyDoc.role}`);
    console.log(`  - Created: ${verifyDoc.created_at}`);
    
    console.log('\n🚀 Now when you call /api/auth/me, you should get:');
    console.log(`  { "success": true, "data": { "id": "${targetUserId}", "role": "admin" } }`);
    
  } catch (error) {
    console.error('❌ Error adding admin role:', error);
    
    if (error.code === 409) {
      console.log('ℹ️ User might already have a role. Let\'s check existing roles...');
      try {
        const existingRoles = await databases.listDocuments(
          config.databaseId,
          config.userRolesCollection,
          []
        );
        
        const userRole = existingRoles.documents.find(doc => doc.user_id === '689e28fe002e2a63e1c1');
        if (userRole) {
          console.log(`📝 User already has role: ${userRole.role}`);
          if (userRole.role === 'admin') {
            console.log('✅ User already has admin role!');
          } else {
            console.log('🔄 Updating role to admin...');
            await databases.updateDocument(
              config.databaseId,
              config.userRolesCollection,
              userRole.$id,
              {
                role: 'admin',
                updated_at: new Date().toISOString()
              }
            );
            console.log('✅ Role updated to admin!');
          }
        }
      } catch (checkError) {
        console.error('Could not check existing roles:', checkError.message);
      }
    }
  }
}

// Run the script
addAdminRole()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
