#!/usr/bin/env node

/**
 * Fresh Session Test Script
 * 
 * This script tests authentication with a completely fresh session
 * to see if that resolves the permission issues.
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

async function testFreshSession() {
  console.log('🔄 Testing with Fresh Session...\n');
  
  try {
    // Step 1: Create Appwrite client
    console.log('1️⃣ Creating Appwrite client...');
    const client = new Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId);
    
    const account = new Account(client);
    
    // Step 2: Delete any existing sessions (if we had them)
    console.log('2️⃣ Attempting to clear any existing sessions...');
    try {
      // Note: This might fail if no sessions exist, which is fine
      await account.deleteSessions();
      console.log('✅ Existing sessions cleared');
    } catch (clearError) {
      console.log('ℹ️ No existing sessions to clear (this is normal)');
    }
    
    // Step 3: Create completely fresh session
    console.log('3️⃣ Creating fresh session...');
    const session = await account.createEmailPasswordSession(config.testEmail, config.testPassword);
    console.log('✅ Fresh session created');
    console.log(`   Session ID: ${session.$id}`);
    console.log(`   User ID: ${session.userId}\n`);
    
    // Step 4: Test session immediately
    console.log('4️⃣ Testing session immediately...');
    try {
      // Set the session on the client
      client.setSession(session.$id);
      const userInfo = await account.get();
      console.log('✅ Session working! User info retrieved');
      console.log(`   User ID: ${userInfo.$id}`);
      console.log(`   Email: ${userInfo.email}`);
      console.log(`   Email Verified: ${userInfo.emailVerification}`);
      console.log(`   Status: ${userInfo.status}`);
      console.log(`   Permissions: ${userInfo.$permissions ? userInfo.$permissions.join(', ') : 'None'}\n`);
      
      // Step 5: Try to create JWT
      console.log('5️⃣ Attempting to create JWT with fresh session...');
      try {
        const appwriteJwt = await account.createJWT();
        console.log('🎉 SUCCESS! JWT created with fresh session');
        console.log(`   JWT Length: ${appwriteJwt.length} characters`);
        console.log(`   JWT Preview: ${appwriteJwt.substring(0, 50)}...\n`);
        
        // Step 6: Test JWT exchange
        console.log('6️⃣ Testing JWT exchange with fresh JWT...');
        const exchangeResponse = await fetch(`${config.nestjsApiUrl}/api/auth/exchange-jwt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ appwriteJwt }),
        });
        
        if (exchangeResponse.ok) {
          const exchangeData = await exchangeResponse.json();
          console.log('🎉 JWT EXCHANGE SUCCESSFUL!');
          console.log(`   Backend Access Token: ${exchangeData.access_token.substring(0, 50)}...`);
          console.log(`   User ID: ${exchangeData.user.id}`);
          console.log(`   Email Verified: ${exchangeData.user.emailVerification}`);
          
          if (exchangeData.warning) {
            console.log(`   ⚠️ Warning: ${exchangeData.warning}`);
          }
          
          console.log('\n🎯 SOLUTION FOUND: Fresh session resolved the permission issue!');
          console.log('   The problem was likely an old session created before email verification.');
          
        } else {
          const errorText = await exchangeResponse.text();
          console.log('❌ JWT exchange still failed:', errorText);
          console.log('   This suggests a deeper issue than just session freshness.');
        }
        
      } catch (jwtError) {
        console.log('❌ JWT creation still failed:', jwtError.message);
        console.log('   This suggests the issue is not session-related.');
      }
      
    } catch (sessionError) {
      console.log('❌ Session still not working:', sessionError.message);
      console.log('   This suggests a deeper Appwrite configuration issue.');
    }
    
  } catch (error) {
    console.error('\n❌ Fresh session test failed:', error.message);
    
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
  testFreshSession();
}

module.exports = { testFreshSession };
