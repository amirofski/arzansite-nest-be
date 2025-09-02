#!/usr/bin/env node

/**
 * Test Session-Based Login
 * 
 * This script tests the session-based authentication endpoint
 * to see if it works with the current user
 */

const { Client, Account } = require('node-appwrite');
const fetch = require('node-fetch');

// Configuration
const config = {
  appwriteEndpoint: 'https://app.arzansite.com/v1',
  appwriteProjectId: '6898b35e003067cd7b43',
  backendUrl: 'https://nest.arzansite.com',
  testEmail: 'amir.devel@gmail.com',
  testPassword: 'u9uAP426wSFqev'
};

async function testSessionLogin() {
  console.log('🧪 Testing Session-Based Login...\n');
  
  try {
    // Step 1: Create Appwrite session
    console.log('1️⃣ Creating Appwrite session...');
    
    const client = new Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId);
    
    const account = new Account(client);
    
    const session = await account.createEmailPasswordSession(config.testEmail, config.testPassword);
    console.log('✅ Appwrite session created successfully!');
    console.log(`   Session ID: ${session.$id}`);
    console.log(`   User ID: ${session.userId}`);
    console.log(`   Session Expiry: ${session.expire}\n`);
    
    // Step 2: Test session validation with Appwrite
    console.log('2️⃣ Testing session validation with Appwrite...');
    
    try {
      const userWithSession = await account.get();
      console.log('✅ Appwrite session validation successful!');
      console.log(`   User ID: ${userWithSession.$id}`);
      console.log(`   Email: ${userWithSession.email}`);
      console.log(`   Labels: [${userWithSession.labels.join(', ')}]\n`);
    } catch (sessionError) {
      console.log('❌ Appwrite session validation failed:');
      console.log(`   Error: ${sessionError.message}\n`);
      return;
    }
    
    // Step 3: Test backend session-auth endpoint
    console.log('3️⃣ Testing backend session-auth endpoint...');
    
    const sessionAuthResponse = await fetch(`${config.backendUrl}/api/auth/session-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.$id,
        email: config.testEmail
      }),
    });
    
    console.log(`   Status: ${sessionAuthResponse.status}`);
    console.log(`   Status Text: ${sessionAuthResponse.statusText}`);
    
    if (!sessionAuthResponse.ok) {
      const errorText = await sessionAuthResponse.text();
      console.log(`   Error: ${errorText}`);
      return;
    }
    
    const sessionAuthData = await sessionAuthResponse.json();
    console.log('✅ Backend session authentication successful!\n');
    
    // Step 4: Analyze the response structure
    console.log('4️⃣ Analyzing session-auth response...');
    console.log('   Response keys:', Object.keys(sessionAuthData));
    
    if (sessionAuthData.access_token) {
      console.log('   ✅ Access token found');
      console.log(`   Token length: ${sessionAuthData.access_token.length}`);
      console.log(`   Token preview: ${sessionAuthData.access_token.substring(0, 50)}...`);
    } else {
      console.log('   ❌ No access_token in response');
    }
    
    if (sessionAuthData.refresh_token) {
      console.log('   ✅ Refresh token found');
      console.log(`   Token length: ${sessionAuthData.refresh_token.length}`);
      console.log(`   Token preview: ${sessionAuthData.refresh_token.substring(0, 50)}...`);
    } else {
      console.log('   ❌ No refresh_token in response');
    }
    
    if (sessionAuthData.user) {
      console.log('   ✅ User info found');
      console.log(`   User ID: ${sessionAuthData.user.id}`);
      console.log(`   User email: ${sessionAuthData.user.email}`);
    } else {
      console.log('   ❌ No user info in response');
    }
    
    console.log('');
    
    // Step 5: Test protected endpoint with the token
    if (sessionAuthData.access_token) {
      console.log('5️⃣ Testing protected endpoint with token...');
      
      const profileResponse = await fetch(`${config.backendUrl}/api/profiles/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionAuthData.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`   Status: ${profileResponse.status}`);
      console.log(`   Status Text: ${profileResponse.statusText}`);
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('✅ Protected endpoint accessible!');
        console.log('   Profile data:', profileData);
      } else {
        const errorText = await profileResponse.text();
        console.log(`   ❌ Protected endpoint failed: ${errorText}`);
      }
    } else {
      console.log('5️⃣ Skipping protected endpoint test - no token available');
    }
    
    // Step 6: Clean up session
    console.log('\n6️⃣ Cleaning up session...');
    
    try {
      await account.deleteSession(session.$id);
      console.log('✅ Session deleted successfully');
    } catch (cleanupError) {
      console.log('⚠️ Could not delete session (this is okay)');
    }
    
    console.log('\n📋 Session Login Analysis Summary:');
    console.log('   ✅ Appwrite session creation working');
    console.log('   ✅ Appwrite session validation working');
    console.log('   ✅ Backend session-auth endpoint working');
    console.log(`   ${sessionAuthData.access_token ? '✅' : '❌'} Access token present`);
    console.log(`   ${sessionAuthData.refresh_token ? '✅' : '❌'} Refresh token present`);
    console.log(`   ${sessionAuthData.user ? '✅' : '❌'} User info present`);
    
    if (sessionAuthData.access_token) {
      console.log('\n💡 Frontend should use session-auth endpoint:');
      console.log(`   POST /api/auth/session-auth`);
      console.log(`   Body: { sessionId: "${session.$id}", email: "${config.testEmail}" }`);
      console.log(`   Response contains: access_token, refresh_token, user`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('Invalid credentials')) {
      console.log('\n💡 Check your test credentials');
    }
    
    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Check if your backend server is running');
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSessionLogin();
}

module.exports = { testSessionLogin };
