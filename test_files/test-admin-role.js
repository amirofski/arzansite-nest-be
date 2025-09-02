const { Client, Users } = require('node-appwrite');
require('dotenv').config();

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  apiKey: process.env.APPWRITE_API_KEY,
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

const users = new Users(client);

async function testAdminRole() {
  try {
    const targetUserId = '689e28fe002e2a63e1c1';
    
    console.log(`🔍 Testing admin role for user: ${targetUserId}`);
    
    // Get user details including labels
    const user = await users.get(targetUserId);
    
    console.log(`📋 User details:`);
    console.log(`  - ID: ${user.$id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Labels: ${user.labels ? user.labels.join(', ') : 'None'}`);
    
    // Check if user has admin label
    const hasAdminLabel = user.labels && user.labels.includes('admin');
    const role = hasAdminLabel ? 'admin' : 'user';
    
    console.log(`\n🎯 Role determination:`);
    console.log(`  - Has admin label: ${hasAdminLabel}`);
    console.log(`  - Determined role: ${role}`);
    
    if (hasAdminLabel) {
      console.log('\n✅ SUCCESS! User has admin label in Appwrite');
      console.log('🚀 Now when you call /api/auth/me, you should get:');
      console.log(`  { "success": true, "data": { "id": "${targetUserId}", "role": "admin" } }`);
    } else {
      console.log('\n❌ User does not have admin label');
      console.log('💡 You need to set the "admin" label in Appwrite console:');
      console.log('   1. Go to Appwrite Console → Users');
      console.log('   2. Find your user');
      console.log('   3. Click on the user');
      console.log('   4. Go to Labels tab');
      console.log('   5. Add "admin" label');
    }
    
  } catch (error) {
    console.error('❌ Error testing admin role:', error);
  }
}

// Run the test
testAdminRole()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
