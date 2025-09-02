const { Client, Databases, Query } = require('node-appwrite');

// Appwrite configuration
const client = new Client()
  .setEndpoint('http://app.arzansite.com/v1')
  .setProject('6898b35e003067cd7b43')
  .setKey('standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4');

const databases = new Databases(client);

async function checkPasswordResetToken() {
  try {
    console.log('🔍 Checking password reset tokens for test@example.com...');
    
    // Get the password_resets collection ID
    const databaseId = '6899993d001b0b35b6b5';
    const collectionId = 'password_resets';
    
    // Query for the most recent password reset token
    const result = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal('email', 'test@example.com'),
        Query.orderDesc('createdAt')
      ]
    );
    
    if (result.documents.length === 0) {
      console.log('❌ No password reset tokens found for test@example.com');
      return;
    }
    
    const latestToken = result.documents[0];
    console.log('✅ Found password reset token:');
    console.log('   Token:', latestToken.token);
    console.log('   Email:', latestToken.email);
    console.log('   User ID:', latestToken.userId);
    console.log('   Created:', latestToken.createdAt);
    console.log('   Expires:', latestToken.expiresAt);
    console.log('   Used:', latestToken.used);
    
    // Test the token with the reset-password endpoint
    console.log('\n🧪 Testing the token with reset-password endpoint...');
    
    const testPayload = {
      token: latestToken.token,
      newPassword: 'NewTestPassword123!'
    };
    
    console.log('   Payload:', JSON.stringify(testPayload, null, 2));
    
  } catch (error) {
    console.error('❌ Error checking password reset token:', error.message);
  }
}

checkPasswordResetToken();
