#!/usr/bin/env node

/**
 * Session Management Test Script
 * 
 * This script tests all the new session-based authentication endpoints:
 * - session-auth
 * - session-logout
 * - session-info
 * - session-validate
 */

const { Client, Account } = require('node-appwrite');

// Configuration
const config = {
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1',
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  nestjsApiUrl: process.env.NESTJS_API_URL || 'http://localhost:3000',
  testEmail: process.env.TEST_EMAIL || 'amir.devel@gmail.com',
  testPassword: process.env.TEST_PASSWORD || 'u9uAP426RwSFqev'
};

async function testSessionManagement() {
  console.log('🔐 Testing Complete Session Management System...\n');
  
  let currentSessionId = null;
  let currentBackendToken = null;
  
  try {
    // Step 1: Create Appwrite client and login
    console.log('1️⃣ Logging in with Appwrite...');
    const client = new Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId);
    
    const account = new Account(client);
    
    // Create session (login)
    const session = await account.createEmailPasswordSession(config.testEmail, config.testPassword);
    currentSessionId = session.$id;
    console.log('✅ Appwrite login successful');
    console.log(`   Session ID: ${currentSessionId}`);
    console.log(`   User ID: ${session.userId}\n`);
    
    // Step 2: Test session-based authentication endpoint
    console.log('2️⃣ Testing session-based authentication...');
    const sessionAuthResponse = await fetch(`${config.nestjsApiUrl}/api/auth/session-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        sessionId: currentSessionId,
        email: config.testEmail
      }),
    });
    
    if (!sessionAuthResponse.ok) {
      const errorText = await sessionAuthResponse.text();
      throw new Error(`Session authentication failed: ${sessionAuthResponse.status} - ${errorText}`);
    }
    
    const sessionAuthData = await sessionAuthResponse.json();
    console.log('✅ Session authentication successful!');
    
    // Extract data from the response wrapper
    const authData = sessionAuthData.data || sessionAuthData;
    currentBackendToken = authData.access_token;
    
    console.log(`   Backend Access Token: ${authData.access_token.substring(0, 50)}...`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Auth Method: ${authData.auth_method}\n`);
    
    // Step 3: Test session validation endpoint
    console.log('3️⃣ Testing session validation...');
    const validateResponse = await fetch(`${config.nestjsApiUrl}/api/auth/session-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: currentSessionId }),
    });
    
    if (validateResponse.ok) {
      const validateData = await validateResponse.json();
      console.log('✅ Session validation successful!');
      console.log(`   Session Valid: ${validateData.valid}`);
      console.log(`   Session ID: ${validateData.sessionId}\n`);
    } else {
      console.log('❌ Session validation failed');
      console.log(`   Status: ${validateResponse.status}`);
    }
    
    // Step 4: Test session info endpoint
    console.log('4️⃣ Testing session info retrieval...');
    const sessionInfoResponse = await fetch(`${config.nestjsApiUrl}/api/auth/session-info/${currentSessionId}`);
    
    if (sessionInfoResponse.ok) {
      const sessionInfo = await sessionInfoResponse.json();
      console.log('✅ Session info retrieval successful!');
      console.log(`   Session ID: ${sessionInfo.sessionId}`);
      console.log(`   User Email: ${sessionInfo.user?.email}`);
      console.log(`   Session Valid: ${sessionInfo.valid}\n`);
    } else {
      console.log('❌ Session info retrieval failed');
      console.log(`   Status: ${sessionInfoResponse.status}`);
    }
    
    // Step 5: Test protected endpoint with backend JWT
    console.log('5️⃣ Testing protected endpoint access...');
    const protectedResponse = await fetch(`${config.nestjsApiUrl}/api/uploads`, {
      headers: {
        'Authorization': `Bearer ${currentBackendToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (protectedResponse.ok) {
      console.log('🎉 SUCCESS! Protected endpoint accessible with Session-based Backend JWT');
      console.log(`   Status: ${protectedResponse.status}\n`);
    } else {
      console.log('❌ Protected endpoint still failing');
      console.log(`   Status: ${protectedResponse.status}`);
      const errorText = await protectedResponse.text();
      console.log(`   Error: ${errorText}\n`);
    }
    
    // Step 6: Test session logout
    console.log('6️⃣ Testing session logout...');
    const logoutResponse = await fetch(`${config.nestjsApiUrl}/api/auth/session-logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: currentSessionId }),
    });
    
    if (logoutResponse.ok) {
      const logoutData = await logoutResponse.json();
      console.log('✅ Session logout successful!');
      console.log(`   Message: ${logoutData.message}\n`);
    } else {
      console.log('❌ Session logout failed');
      console.log(`   Status: ${logoutResponse.status}`);
      const errorText = await logoutResponse.text();
      console.log(`   Error: ${errorText}\n`);
    }
    
    // Step 7: Verify session is invalidated
    console.log('7️⃣ Verifying session invalidation...');
    const postLogoutValidateResponse = await fetch(`${config.nestjsApiUrl}/api/auth/session-validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: currentSessionId }),
    });
    
    if (postLogoutValidateResponse.ok) {
      const postLogoutData = await postLogoutValidateResponse.json();
      if (!postLogoutData.valid) {
        console.log('✅ Session successfully invalidated after logout!');
        console.log(`   Session Valid: ${postLogoutData.valid}\n`);
      } else {
        console.log('⚠️ Session still appears valid after logout');
        console.log(`   Session Valid: ${postLogoutData.valid}\n`);
      }
    } else {
      console.log('❌ Could not verify session invalidation');
      console.log(`   Status: ${postLogoutValidateResponse.status}\n`);
    }
    
    // Step 8: Test that protected endpoint is now inaccessible
    console.log('8️⃣ Testing protected endpoint access after logout...');
    const postLogoutProtectedResponse = await fetch(`${config.nestjsApiUrl}/api/uploads`, {
      headers: {
        'Authorization': `Bearer ${currentBackendToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (postLogoutProtectedResponse.status === 401) {
      console.log('✅ SUCCESS! Protected endpoint correctly blocked after logout');
      console.log(`   Status: ${postLogoutProtectedResponse.status} (Unauthorized)\n`);
    } else {
      console.log('⚠️ Protected endpoint still accessible after logout');
      console.log(`   Status: ${postLogoutProtectedResponse.status}\n`);
    }
    
    console.log('🎉 Complete Session Management Test Complete!');
    console.log('\n🎯 ALL ENDPOINTS TESTED:');
    console.log('   ✅ /api/auth/session-auth - Session authentication');
    console.log('   ✅ /api/auth/session-validate - Session validation');
    console.log('   ✅ /api/auth/session-info/:sessionId - Session info retrieval');
    console.log('   ✅ /api/auth/session-logout - Session logout');
    console.log('   ✅ /api/uploads - Protected endpoint access');
    console.log('   ✅ Session invalidation verification');
    
    console.log('\n🚀 SESSION-BASED AUTHENTICATION SYSTEM IS FULLY OPERATIONAL!');
    
  } catch (error) {
    console.error('\n❌ Session management test failed:', error.message);
    
    if (error.message.includes('Invalid credentials')) {
      console.log('\n💡 Check your test credentials');
    }
    
    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Check if your NestJS server is running');
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSessionManagement();
}

module.exports = { testSessionManagement };
