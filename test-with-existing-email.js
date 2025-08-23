const { Client, Databases, Query } = require('node-appwrite');

// Appwrite configuration
const client = new Client()
  .setEndpoint('http://app.arzansite.com/v1')
  .setProject('6898b35e003067cd7b43')
  .setKey('standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4');

const databases = new Databases(client);

async function testWithExistingEmail() {
  try {
    console.log('🔍 Testing password reset with existing email...');
    
    // Use an existing email from the database
    const testEmail = 'amir.devel@gmail.com';
    
    console.log(`📧 Using email: ${testEmail}`);
    
    // Step 1: Request password reset
    console.log('\n1️⃣ Requesting password reset...');
    
    const response = await fetch('https://nest.arzansite.com/api/auth/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });
    
    const result = await response.json();
    console.log('   Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('   ✅ Password reset request successful');
      
      // Step 2: Wait a moment for the token to be stored
      console.log('\n2️⃣ Waiting for token to be stored...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Get the latest token
      console.log('\n3️⃣ Getting the latest token...');
      
      const databaseId = '6899993d001b0b35b6b5';
      const collectionId = 'password_resets';
      
      const tokenResult = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('email', testEmail),
          Query.orderDesc('createdAt')
        ]
      );
      
      if (tokenResult.documents.length > 0) {
        const latestToken = tokenResult.documents[0];
        console.log('   ✅ Latest token found:');
        console.log(`      Token: ${latestToken.token}`);
        console.log(`      Created: ${latestToken.createdAt}`);
        console.log(`      Expires: ${latestToken.expiresAt}`);
        console.log(`      Used: ${latestToken.used}`);
        
        // Step 4: Test the reset-password endpoint
        console.log('\n4️⃣ Testing reset-password endpoint...');
        
        const resetResponse = await fetch('https://nest.arzansite.com/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: latestToken.token,
            newPassword: 'NewTestPassword123!'
          })
        });
        
        const resetResult = await resetResponse.json();
        console.log('   Reset response:', JSON.stringify(resetResult, null, 2));
        
        if (resetResult.success) {
          console.log('   ✅ Password reset successful!');
        } else {
          console.log('   ❌ Password reset failed:', resetResult.error);
        }
        
      } else {
        console.log('   ❌ No tokens found for this email');
      }
      
    } else {
      console.log('   ❌ Password reset request failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing with existing email:', error.message);
  }
}

testWithExistingEmail();
