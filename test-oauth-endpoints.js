#!/usr/bin/env node

/**
 * Test script for OAuth endpoints
 * Run with: node test-oauth-endpoints.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testOAuthEndpoints() {
  console.log('🧪 Testing OAuth Endpoints...\n');

  try {
    // Test 1: Get OAuth providers
    console.log('1️⃣ Testing GET /api/auth/oauth/providers');
    const providersResponse = await fetch(`${BASE_URL}/api/auth/oauth/providers`);
    const providers = await providersResponse.json();
    console.log('✅ Providers endpoint:', providers);
    console.log('');

    // Test 2: Start GitHub OAuth flow
    console.log('2️⃣ Testing POST /api/auth/oauth/github/start');
    const startResponse = await fetch(`${BASE_URL}/api/auth/oauth/github/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        successUrl: 'https://arzansite.com/dashboard',
        failureUrl: 'https://arzansite.com/login?error=oauth_failed'
      })
    });
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ Start OAuth endpoint:', startData);
      console.log('🔗 Redirect URL:', startData.redirectUrl);
    } else {
      const error = await startResponse.text();
      console.log('❌ Start OAuth failed:', error);
    }
    console.log('');

    // Test 3: Test OAuth callback with mock data
    console.log('3️⃣ Testing POST /api/auth/oauth/github/callback (with mock data)');
    const callbackResponse = await fetch(`${BASE_URL}/api/auth/oauth/github/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'mock_user_id',
        secret: 'mock_session_secret'
      })
    });
    
    console.log('📊 Callback response status:', callbackResponse.status);
    console.log('📊 Callback response headers:', Object.fromEntries(callbackResponse.headers.entries()));
    
    if (callbackResponse.redirected) {
      console.log('✅ Callback redirected to:', callbackResponse.url);
    } else {
      const callbackData = await callbackResponse.text();
      console.log('📄 Callback response body:', callbackData);
    }
    console.log('');

    // Test 4: Test OAuth logout
    console.log('4️⃣ Testing POST /api/auth/oauth/logout');
    const logoutResponse = await fetch(`${BASE_URL}/api/auth/oauth/logout`, {
      method: 'POST'
    });
    
    if (logoutResponse.ok) {
      const logoutData = await logoutResponse.json();
      console.log('✅ Logout endpoint:', logoutData);
    } else {
      const error = await logoutResponse.text();
      console.log('❌ Logout failed:', error);
    }
    console.log('');

    // Test 5: Test OAuth me endpoint (should fail without session)
    console.log('5️⃣ Testing GET /api/auth/oauth/me (without session - should fail)');
    const meResponse = await fetch(`${BASE_URL}/api/auth/oauth/me`);
    
    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('✅ Me endpoint (unexpected success):', meData);
    } else {
      const error = await meResponse.text();
      console.log('✅ Me endpoint correctly failed (no session):', error);
    }
    console.log('');

    console.log('🎉 OAuth endpoint testing completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Configure GitHub OAuth app in GitHub Developer Settings');
    console.log('2. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your .env file');
    console.log('3. Configure OAuth in your Appwrite console');
    console.log('4. Test the complete OAuth flow with real GitHub authentication');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('⚠️  Fetch not available. Installing node-fetch...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install node-fetch', { stdio: 'inherit' });
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('❌ Failed to install node-fetch. Please run: npm install node-fetch');
    process.exit(1);
  }
}

// Run the tests
testOAuthEndpoints();
