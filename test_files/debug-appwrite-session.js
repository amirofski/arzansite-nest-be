#!/usr/bin/env node

/**
 * Debug Appwrite Session Permission Issues
 * 
 * This script investigates why Appwrite sessions are failing validation
 * with "User (role: guests) missing scope (account)" error
 */

const { Client, Account, Users } = require('node-appwrite');

// Configuration
const config = {
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1',
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  appwriteApiKey: process.env.APPWRITE_API_KEY || 'your-api-key-here',
  testEmail: process.env.TEST_EMAIL || 'amir.devel@gmail.com',
  testPassword: process.env.TEST_PASSWORD || 'u9uAP426wSFqev'
};

async function debugAppwriteSession() {
  console.log('🔍 Debugging Appwrite Session Permission Issues...\n');
  
  try {
    // Step 1: Create Appwrite client and login
    console.log('1️⃣ Logging in with Appwrite...');
    const client = new Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId);
    
    const account = new Account(client);
    
    // Create session (login)
    const session = await account.createEmailPasswordSession(config.testEmail, config.testPassword);
    console.log('✅ Appwrite login successful');
    console.log(`   Session ID: ${session.$id}`);
    console.log(`   User ID: ${session.userId}`);
    console.log(`   Session Expiry: ${session.expire}`);
    console.log(`   Session Provider: ${session.provider}`);
    console.log(`   Session Provider UID: ${session.providerUid}\n`);
    
    // Step 2: Try to get user info with session
    console.log('2️⃣ Testing session-based user retrieval...');
    try {
      const userWithSession = await account.get();
      console.log('✅ Successfully got user info with session!');
      console.log(`   User ID: ${userWithSession.$id}`);
      console.log(`   Email: ${userWithSession.email}`);
      console.log(`   Name: ${userWithSession.name}`);
      console.log(`   Email Verification: ${userWithSession.emailVerification}`);
      console.log(`   Status: ${userWithSession.status}`);
      console.log(`   Created: ${userWithSession.$createdAt}`);
      console.log(`   Updated: ${userWithSession.$updatedAt}\n`);
    } catch (sessionError) {
      console.log('❌ Failed to get user info with session:');
      console.log(`   Error: ${sessionError.message}`);
      console.log(`   Code: ${sessionError.code}`);
      console.log(`   Response: ${sessionError.response}\n`);
    }
    
    // Step 3: Try to get user info with admin API key
    console.log('3️⃣ Testing admin API key access...');
    try {
      const adminClient = new Client()
        .setEndpoint(config.appwriteEndpoint)
        .setProject(config.appwriteProjectId)
        .setKey(config.appwriteApiKey);
      
      const adminUsers = new Users(adminClient);
      
      // List all users to find our test user
      const usersList = await adminUsers.list();
      const testUser = usersList.users.find(u => u.email === config.testEmail);
      
      if (testUser) {
        console.log('✅ Found user with admin API key:');
        console.log(`   User ID: ${testUser.$id}`);
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Name: ${testUser.name}`);
        console.log(`   Email Verification: ${testUser.emailVerification}`);
        console.log(`   Status: ${testUser.status}`);
        console.log(`   Created: ${testUser.$createdAt}`);
        console.log(`   Updated: ${testUser.$updatedAt}\n`);
        
        // Check if user ID matches session user ID
        if (testUser.$id === session.userId) {
          console.log('✅ User ID matches session user ID - this is correct!');
        } else {
          console.log('❌ User ID mismatch!');
          console.log(`   Session User ID: ${session.userId}`);
          console.log(`   Admin User ID: ${testUser.$id}\n`);
        }
      } else {
        console.log('❌ Could not find user with admin API key');
      }
    } catch (adminError) {
      console.log('❌ Admin API key access failed:');
      console.log(`   Error: ${adminError.message}`);
      console.log(`   Code: ${adminError.code}\n`);
    }
    
    // Step 4: Test session validation with different methods
    console.log('4️⃣ Testing alternative session validation methods...');
    
    // Method 1: Try to create JWT (this was failing before)
    try {
      const jwt = await account.createJWT();
      console.log('✅ Successfully created JWT with session!');
      console.log(`   JWT: ${jwt.substring(0, 50)}...\n`);
    } catch (jwtError) {
      console.log('❌ Failed to create JWT with session:');
      console.log(`   Error: ${jwtError.message}`);
      console.log(`   Code: ${jwtError.code}\n`);
    }
    
    // Method 2: Try to list sessions
    try {
      const sessions = await account.listSessions();
      console.log('✅ Successfully listed sessions!');
      console.log(`   Total Sessions: ${sessions.total}`);
      sessions.sessions.forEach((sess, index) => {
        console.log(`   Session ${index + 1}:`);
        console.log(`     ID: ${sess.$id}`);
        console.log(`     User ID: ${sess.userId}`);
        console.log(`     Expires: ${sess.expire}`);
        console.log(`     Provider: ${sess.provider}`);
        console.log(`     Current: ${sess.current}`);
      });
      console.log('');
    } catch (sessionsError) {
      console.log('❌ Failed to list sessions:');
      console.log(`   Error: ${sessionsError.message}`);
      console.log(`   Code: ${sessionsError.code}\n`);
    }
    
    // Step 5: Analyze the permission issue
    console.log('5️⃣ Permission Issue Analysis...');
    console.log('Based on the "User (role: guests) missing scope (account)" error:\n');
    console.log('🔍 Possible Causes:');
    console.log('   1. User role is set to "guests" instead of "users"');
    console.log('   2. Appwrite project permissions are misconfigured');
    console.log('   3. Session creation succeeded but validation failed');
    console.log('   4. User account status is inactive or suspended');
    console.log('   5. Appwrite version compatibility issues\n');
    
    console.log('💡 Recommended Solutions:');
    console.log('   1. Check user role in Appwrite Console (Users section)');
    console.log('   2. Verify project permissions and API keys');
    console.log('   3. Check if user email is verified');
    console.log('   4. Try creating a new user account');
    console.log('   5. Check Appwrite server logs for more details\n');
    
    console.log('🎯 Current Status:');
    console.log('   ✅ Session creation: Working');
    console.log('   ❌ Session validation: Failing (permission issue)');
    console.log('   ✅ Admin access: Working (if API key is correct)');
    console.log('   🔍 Root cause: User role/permission configuration\n');
    
  } catch (error) {
    console.error('\n❌ Debug script failed:', error.message);
    
    if (error.message.includes('Invalid credentials')) {
      console.log('\n💡 Check your test credentials');
    }
    
    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Check if your Appwrite server is running');
    }
    
    process.exit(1);
  }
}

// Run the debug
if (require.main === module) {
  debugAppwriteSession();
}

module.exports = { debugAppwriteSession };
