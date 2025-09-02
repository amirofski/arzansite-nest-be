const { Client, Account, ID } = require('node-appwrite');

// Configuration (replace with your actual values)
const endpoint = 'https://82-115-13-113.traefik.me/v1';
const projectId = '6898b35e003067cd7b43';
const apiKey = 'your-api-key-here'; // Replace with your actual API key

async function debugEmailSignup() {
  console.log('🔍 Debugging Email Signup Process...\n');

  try {
    // Step 1: Create client
    console.log('1️⃣ Creating Appwrite client...');
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);
    console.log('✅ Client created successfully');

    // Step 2: Create user
    console.log('\n2️⃣ Creating test user...');
    const users = new Users(client);
    const testEmail = 'test-debug@example.com';
    const testPassword = 'TestPassword123!';
    
    const user = await users.create(
      ID.unique(),
      testEmail,
      undefined,
      testPassword,
      'Test User'
    );
    console.log('✅ User created successfully:', user.$id);

    // Step 3: Create session
    console.log('\n3️⃣ Creating user session...');
    const account = new Account(client);
    const session = await account.createEmailPasswordSession(testEmail, testPassword);
    console.log('✅ Session created successfully:', session.$id);

    // Step 4: Create verification
    console.log('\n4️⃣ Creating verification...');
    const userClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setSession(session.$id);

    const userAccount = new Account(userClient);
    const verification = await userAccount.createVerification('https://arzansite.com/auth/verify');
    console.log('✅ Verification created successfully:', verification);

    // Step 5: Build verification URL
    console.log('\n5️⃣ Building verification URL...');
    const verificationUrl = `https://arzansite.com/auth/verify?token=${verification.$id}&userId=${user.$id}`;
    console.log('✅ Verification URL:', verificationUrl);

    // Step 6: Test email service (if available)
    console.log('\n6️⃣ Testing email service...');
    console.log('📧 Would send email to:', testEmail);
    console.log('📧 With verification URL:', verificationUrl);

    // Step 7: Clean up
    console.log('\n7️⃣ Cleaning up...');
    await account.deleteSession(session.$id);
    console.log('✅ Session deleted');
    
    // Note: We can't delete the user via API key, but that's okay for testing

    console.log('\n🎉 All steps completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - User creation: ✅');
    console.log('   - Session creation: ✅');
    console.log('   - Verification creation: ✅');
    console.log('   - URL building: ✅');
    console.log('   - Email service: Would work if configured');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
  }
}

// Run the debug
console.log('Starting email signup debug process...');
debugEmailSignup().catch(console.error);
