#!/usr/bin/env node

/**
 * User Email Verification Script
 * 
 * This script helps verify a user's email in Appwrite so they can create JWTs
 * and access the authentication system.
 */

const { Client, Account, Users } = require('node-appwrite');

// Configuration
const config = {
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1',
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  appwriteApiKey: process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4',
  testEmail: process.env.TEST_EMAIL || 'amir.devel@gmail.com',
  testPassword: process.env.TEST_PASSWORD || 'u9uAP426RwSFqev'
};

async function verifyUserEmail() {
  console.log('🔐 User Email Verification Script\n');
  
  try {
    // Step 1: Create admin client (using API key)
    console.log('1️⃣ Creating admin client...');
    const adminClient = new Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId)
      .setKey(config.appwriteApiKey);
    
    const adminUsers = new Users(adminClient);
    
    // Step 2: Find the user by email
    console.log('2️⃣ Finding user by email...');
    const users = await adminUsers.list();
    
    // Filter users manually
    const targetUser = users.users.find(u => u.email === config.testEmail);
    
    if (!targetUser) {
      throw new Error(`No user found with email: ${config.testEmail}`);
    }
    
    const user = targetUser;
    console.log('✅ User found');
    console.log(`   User ID: ${user.$id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerification}`);
    console.log(`   Created: ${user.$createdAt}`);
    console.log(`   Status: ${user.status}\n`);
    
    // Step 3: Check if email is already verified
    if (user.emailVerification) {
      console.log('✅ User email is already verified!');
      console.log('   You can now run the JWT exchange test.');
      return;
    }
    
    // Step 4: Verify the user's email (admin operation)
    console.log('3️⃣ Verifying user email (admin operation)...');
    try {
      const updatedUser = await adminUsers.updateEmailVerification(user.$id, true);
      console.log('✅ Email verification successful!');
      console.log(`   User ID: ${updatedUser.$id}`);
      console.log(`   Email Verified: ${updatedUser.emailVerification}`);
      console.log(`   Updated: ${updatedUser.$updatedAt}\n`);
      
      console.log('🎉 User email is now verified!');
      console.log('   You can now run the JWT exchange test:');
      console.log('   node test-jwt-exchange.js');
      
    } catch (verifyError) {
      console.log('❌ Failed to verify email:', verifyError.message);
      
      if (verifyError.message.includes('permission')) {
        console.log('\n💡 This appears to be a permission issue');
        console.log('   Possible solutions:');
        console.log('   1. Check if your API key has the right permissions');
        console.log('   2. Ensure the API key has "users.write" scope');
        console.log('   3. Check Appwrite project settings');
      }
      
      throw verifyError;
    }
    
  } catch (error) {
    console.error('\n❌ Email verification failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Tip: Check your Appwrite API key');
      console.log('   Make sure you have:');
      console.log('   1. The correct API key');
      console.log('   2. API key with admin permissions');
      console.log('   3. API key with "users.write" scope');
    }
    
    if (error.message.includes('permission')) {
      console.log('\n💡 Tip: Permission denied');
      console.log('   Your API key might not have the right permissions');
      console.log('   Check Appwrite console for API key settings');
    }
    
    process.exit(1);
  }
}

// Alternative method: Manual verification instructions
function showManualVerificationSteps() {
  console.log('\n📋 Manual Email Verification Steps:');
  console.log('1. Go to your Appwrite console');
  console.log('2. Navigate to Users section');
  console.log('3. Find the user with email:', config.testEmail);
  console.log('4. Click on the user');
  console.log('5. Look for "Email Verification" field');
  console.log('6. Change it from "false" to "true"');
  console.log('7. Save the changes');
  console.log('8. Run the JWT exchange test again');
}

// Run the verification
if (require.main === module) {
  verifyUserEmail().catch(() => {
    console.log('\n🔄 If automatic verification fails, you can verify manually:');
    showManualVerificationSteps();
  });
}

module.exports = { verifyUserEmail, showManualVerificationSteps };
