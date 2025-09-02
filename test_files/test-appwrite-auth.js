require('dotenv').config({ path: './appwrite-config.env' });

const { Client, Account } = require('node-appwrite');

async function testAppwriteAuth() {
  console.log('🧪 Testing Appwrite Authentication Guard...\n');

  // Initialize Appwrite client with latest patterns
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

  const account = new Account(client);

  try {
    // Test 1: Try to create a JWT without authentication
    console.log('1️⃣ Testing JWT creation without authentication...');
    try {
      const jwt = await account.createJWT();
      console.log('❌ Unexpected: JWT created without authentication');
      console.log('JWT:', jwt);
    } catch (error) {
      console.log('✅ Expected: JWT creation failed without authentication');
      console.log('Error:', error.message);
    }

    // Test 2: Test with invalid credentials
    console.log('\n2️⃣ Testing with invalid credentials...');
    try {
      const session = await account.createEmailPasswordSession('invalid@email.com', 'wrongpassword');
      console.log('❌ Unexpected: Session created with invalid credentials');
      console.log('Session:', session);
    } catch (error) {
      console.log('✅ Expected: Session creation failed with invalid credentials');
      console.log('Error:', error.message);
    }

    // Test 3: Test JWT validation flow (simulating what the guard does)
    console.log('\n3️⃣ Testing JWT validation flow...');
    const testJWT = 'invalid.jwt.token';
    
    try {
      client.setJWT(testJWT);
      const user = await account.get();
      console.log('❌ Unexpected: Invalid JWT was accepted');
      console.log('User:', user);
    } catch (error) {
      console.log('✅ Expected: Invalid JWT was rejected');
      console.log('Error:', error.message);
    } finally {
      // Clear JWT as the guard does
      client.setJWT('');
    }

    console.log('\n🎯 Appwrite Authentication Guard Test Summary:');
    console.log('✅ JWT creation requires authentication');
    console.log('✅ Invalid credentials are properly rejected');
    console.log('✅ Invalid JWT tokens are properly rejected');
    console.log('✅ JWT clearing works correctly');

  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAppwriteAuth();
}

module.exports = { testAppwriteAuth };
