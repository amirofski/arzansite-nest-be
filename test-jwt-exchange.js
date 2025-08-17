#!/usr/bin/env node

/**
 * Test Script for JWT Exchange Endpoint
 * 
 * This script tests the new /api/auth/exchange-jwt endpoint
 * to verify the authentication flow works correctly.
 */

const { Client, Account } = require('node-appwrite');

// Configuration - Update these with your actual values
const config = {
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1',
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  nestjsApiUrl: process.env.NESTJS_API_URL || 'http://localhost:3000',
  testEmail: process.env.TEST_EMAIL || 'amir.devel@gmail.com',
  testPassword: process.env.TEST_PASSWORD || 'u9uAP426RwSFqev'
};

async function testJwtExchange() {
  console.log('🔐 Testing JWT Exchange Flow...\n');
  
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
    console.log(`   User ID: ${session.userId}\n`);
    
    // Step 1.5: Try to get user info using session ID
    console.log('1️⃣.5️⃣ Trying to get user info using session ID...');
    try {
      // Set the session ID on the client
      client.setSession(session.$id);
      const userInfo = await account.get();
      console.log('✅ Session-based user info retrieved');
      console.log(`   User ID: ${userInfo.$id}`);
      console.log(`   Email: ${userInfo.email}`);
      console.log(`   Email Verified: ${userInfo.emailVerification}`);
      console.log(`   User Role: ${userInfo.$permissions ? userInfo.$permissions.join(', ') : 'No permissions'}\n`);
      
      // If we get here, the session is working
      console.log('🎯 Session is working! Now trying JWT creation...\n');
      
    } catch (sessionError) {
      console.log('❌ Session-based user info failed:', sessionError.message);
      console.log('🔄 This suggests the user needs email verification\n');
    }
    
    // Step 2: Try to get Appwrite JWT
    console.log('2️⃣ Attempting to get Appwrite JWT...');
    try {
      const appwriteJwt = await account.createJWT();
      console.log('✅ Appwrite JWT received');
      console.log(`   JWT Length: ${appwriteJwt.length} characters`);
      console.log(`   JWT Preview: ${appwriteJwt.substring(0, 50)}...\n`);
      
      // Continue with JWT exchange...
      await testJwtExchangeFlow(appwriteJwt);
      
    } catch (jwtError) {
      console.log('❌ Failed to create Appwrite JWT:', jwtError.message);
      
      // Try alternative approach - use session ID as JWT
      console.log('\n🔄 Trying alternative approach with session ID as JWT...');
      try {
        // Use the session ID as a JWT (some Appwrite setups allow this)
        const sessionJwt = session.$id;
        console.log('✅ Using session ID as JWT');
        console.log(`   Session ID: ${sessionJwt}\n`);
        
        await testJwtExchangeFlow(sessionJwt);
        
      } catch (sessionJwtError) {
        console.log('❌ Session ID approach also failed:', sessionJwtError.message);
        
        // Final attempt - try to create a JWT with the session ID
        console.log('\n🔄 Final attempt - creating JWT with session ID...');
        try {
          const sessionBasedJwt = await account.createJWT(session.$id);
          console.log('✅ Session-based JWT created successfully');
          console.log(`   JWT Length: ${sessionBasedJwt.length} characters`);
          
          await testJwtExchangeFlow(sessionBasedJwt);
          
        } catch (finalError) {
          console.log('❌ All JWT creation methods failed');
          console.log('\n💡 This user likely needs email verification before they can create JWTs');
          console.log('   Solutions:');
          console.log('   1. Verify the user email in Appwrite console');
          console.log('   2. Use the email verification endpoint: POST /api/auth/verify-email');
          console.log('   3. Check Appwrite project settings for email verification requirements');
          
          throw new Error(`All JWT creation methods failed. User needs email verification.`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('Invalid credentials')) {
      console.log('\n💡 Tip: Check your test email and password');
      console.log('   Current test credentials:');
      console.log(`   Email: ${config.testEmail}`);
      console.log(`   Password: ${config.testPassword}`);
    }
    
    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Tip: Make sure your NestJS server is running');
      console.log(`   Expected URL: ${config.nestjsApiUrl}`);
    }
    
    if (error.message.includes('missing scope (account)')) {
      console.log('\n💡 Tip: This is an Appwrite permission issue');
      console.log('   Possible causes:');
      console.log('   1. User email not verified');
      console.log('   2. User account not fully activated');
      console.log('   3. Appwrite project permissions misconfigured');
      console.log('   4. Session not properly established');
    }
    
    if (error.message.includes('needs email verification')) {
      console.log('\n💡 Tip: The user needs to verify their email first');
      console.log('   You can:');
      console.log('   1. Check Appwrite console for verification emails');
      console.log('   2. Use the verification endpoint: POST /api/auth/verify-email');
      console.log('   3. Manually verify the user in Appwrite console');
    }
    
    process.exit(1);
  }
}

async function testJwtExchangeFlow(appwriteJwt) {
  try {
    // Step 3: Exchange for Backend JWT
    console.log('3️⃣ Exchanging Appwrite JWT for Backend JWT...');
    const exchangeResponse = await fetch(`${config.nestjsApiUrl}/api/auth/exchange-jwt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ appwriteJwt }),
    });
    
    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      throw new Error(`JWT exchange failed: ${exchangeResponse.status} - ${errorText}`);
    }
    
    const exchangeData = await exchangeResponse.json();
    console.log('✅ JWT exchange successful');
    console.log(`   Backend Access Token: ${exchangeData.access_token.substring(0, 50)}...`);
    console.log(`   Backend Refresh Token: ${exchangeData.refresh_token.substring(0, 50)}...`);
    console.log(`   User ID: ${exchangeData.user.id}`);
    console.log(`   User Email: ${exchangeData.user.email}`);
    console.log(`   Email Verified: ${exchangeData.user.emailVerification}`);
    
    if (exchangeData.warning) {
      console.log(`   ⚠️ Warning: ${exchangeData.warning}`);
    }
    console.log('');
    
    // Step 4: Test protected endpoint with backend JWT
    console.log('4️⃣ Testing protected endpoint with Backend JWT...');
    const protectedResponse = await fetch(`${config.nestjsApiUrl}/api/uploads`, {
      headers: {
        'Authorization': `Bearer ${exchangeData.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (protectedResponse.ok) {
      console.log('✅ Protected endpoint accessible with Backend JWT');
      console.log(`   Status: ${protectedResponse.status}`);
      const uploadsData = await protectedResponse.json();
      console.log(`   Response: ${JSON.stringify(uploadsData, null, 2)}`);
    } else {
      console.log('❌ Protected endpoint still failing');
      console.log(`   Status: ${protectedResponse.status}`);
      const errorText = await protectedResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Step 5: Test token refresh
    console.log('\n5️⃣ Testing token refresh...');
    const refreshResponse = await fetch(`${config.nestjsApiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: exchangeData.refresh_token }),
    });
    
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      console.log('✅ Token refresh successful');
      console.log(`   New Access Token: ${refreshData.access_token.substring(0, 50)}...`);
    } else {
      console.log('❌ Token refresh failed');
      console.log(`   Status: ${refreshResponse.status}`);
      const errorText = await refreshResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    console.log('\n🎉 JWT Exchange Flow Test Complete!');
    
  } catch (error) {
    console.error('❌ JWT exchange flow failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testJwtExchange();
}

module.exports = { testJwtExchange };
