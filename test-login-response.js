#!/usr/bin/env node

/**
 * Test Login Response
 * 
 * This script tests the login endpoint to see what response structure is returned
 * and helps debug the token storage issue
 */

const fetch = require('node-fetch');

// Configuration
const config = {
  backendUrl: 'https://nest.arzansite.com',
  testEmail: 'amir.devel@gmail.com',
  testPassword: 'u9uAP426wSFqev'
};

async function testLoginResponse() {
  console.log('🧪 Testing Login Response Structure...\n');
  
  try {
    // Step 1: Test login endpoint
    console.log('1️⃣ Testing login endpoint...');
    
    const loginResponse = await fetch(`${config.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: config.testEmail,
        password: config.testPassword
      }),
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Status Text: ${loginResponse.statusText}`);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log(`   Error: ${errorText}`);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful!\n');
    
    // Step 2: Analyze the response structure
    console.log('2️⃣ Analyzing response structure...');
    console.log('   Response keys:', Object.keys(loginData));
    console.log('   Success:', loginData.success);
    
    if (loginData.data) {
      console.log('   Data keys:', Object.keys(loginData.data));
      
      // Check for tokens
      if (loginData.data.access_token) {
        console.log('   ✅ Access token found');
        console.log(`   Token length: ${loginData.data.access_token.length}`);
        console.log(`   Token preview: ${loginData.data.access_token.substring(0, 50)}...`);
      } else {
        console.log('   ❌ No access_token in data');
      }
      
      if (loginData.data.refresh_token) {
        console.log('   ✅ Refresh token found');
        console.log(`   Token length: ${loginData.data.refresh_token.length}`);
        console.log(`   Token preview: ${loginData.data.refresh_token.substring(0, 50)}...`);
      } else {
        console.log('   ❌ No refresh_token in data');
      }
      
      // Check for user info
      if (loginData.data.user) {
        console.log('   ✅ User info found');
        console.log(`   User ID: ${loginData.data.user.id}`);
        console.log(`   User email: ${loginData.data.user.email}`);
      } else {
        console.log('   ❌ No user info in data');
      }
    } else {
      console.log('   ❌ No data object in response');
    }
    
    console.log('');
    
    // Step 3: Test protected endpoint with the token
    if (loginData.data && loginData.data.access_token) {
      console.log('3️⃣ Testing protected endpoint with token...');
      
      const profileResponse = await fetch(`${config.backendUrl}/api/profiles/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.data.access_token}`,
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
      console.log('3️⃣ Skipping protected endpoint test - no token available');
    }
    
    console.log('\n📋 Response Analysis Summary:');
    console.log('   ✅ Login endpoint working');
    console.log(`   ${loginData.data && loginData.data.access_token ? '✅' : '❌'} Access token present`);
    console.log(`   ${loginData.data && loginData.data.refresh_token ? '✅' : '❌'} Refresh token present`);
    console.log(`   ${loginData.data && loginData.data.user ? '✅' : '❌'} User info present`);
    
    if (loginData.data && loginData.data.access_token) {
      console.log('\n💡 Frontend should extract:');
      console.log(`   - access_token: ${loginData.data.access_token.substring(0, 50)}...`);
      console.log(`   - refresh_token: ${loginData.data.refresh_token ? loginData.data.refresh_token.substring(0, 50) + '...' : 'none'}`);
      console.log(`   - user: ${JSON.stringify(loginData.data.user)}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Check if your backend server is running');
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testLoginResponse();
}

module.exports = { testLoginResponse };
