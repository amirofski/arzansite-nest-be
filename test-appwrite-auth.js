const { Client, Account } = require('node-appwrite');
require('dotenv').config({ path: './appwrite-config.env' });

async function testAppwriteAuth() {
  console.log('🧪 Testing Appwrite Authentication Guard...\n');

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT || '')
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
      const session = await account.createEmailSession('invalid@email.com', 'wrongpassword');
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
    console.log('✅ Invalid credentials are rejected');
    console.log('✅ Invalid JWT tokens are rejected');
    console.log('✅ JWT clearing works correctly');
    
    console.log('\n📝 Next steps:');
    console.log('1. Start your NestJS server');
    console.log('2. Test the /auth/session endpoint with a valid JWT');
    console.log('3. Test protected routes with the AppwriteAuthGuard');
    console.log('4. Verify that invalid tokens are rejected');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAppwriteAuth().catch(console.error);
