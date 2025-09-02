const { Client, Databases, Users, Query } = require('node-appwrite');

// Load environment variables
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const users = new Users(client);

async function debugVerification() {
  try {
    const email = 'amir.devel@gmail.com';
    console.log(`🔍 Debugging verification for: ${email}`);
    
    // 1. Find user by email
    console.log('\n1. Finding user by email...');
    const userList = await users.list([Query.equal('email', email)]);
    
    if (userList.users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userList.users[0];
    console.log(`✅ User found: ${user.$id}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔐 Appwrite emailVerification: ${user.emailVerification}`);
    console.log(`📅 Created: ${user.$createdAt}`);
    
    // 2. Check database verification tokens
    console.log('\n2. Checking database verification tokens...');
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = process.env.APPWRITE_COLLECTION_EMAIL_VERIFICATIONS || 'email_verifications';
    
    if (!databaseId || !collectionId) {
      console.log('❌ Missing database configuration:');
      console.log(`   Database ID: ${databaseId}`);
      console.log(`   Collection ID: ${collectionId}`);
      return;
    }
    
    try {
      const tokenDocs = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('userId', user.$id),
          Query.equal('used', true)
        ]
      );
      
      console.log(`📊 Found ${tokenDocs.documents.length} used verification tokens`);
      
      if (tokenDocs.documents.length > 0) {
        console.log('📋 Token details:');
        tokenDocs.documents.forEach((doc, index) => {
          console.log(`   ${index + 1}. Token: ${doc.$id}`);
          console.log(`      Used: ${doc.used}`);
          console.log(`      Created: ${doc.$createdAt}`);
        });
      }
      
      // 3. Check all tokens for this user (used and unused)
      console.log('\n3. Checking all tokens for this user...');
      const allTokens = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal('userId', user.$id)]
      );
      
      console.log(`📊 Total tokens found: ${allTokens.documents.length}`);
      allTokens.documents.forEach((doc, index) => {
        console.log(`   ${index + 1}. Token: ${doc.$id}`);
        console.log(`      Used: ${doc.used}`);
        console.log(`      Created: ${doc.$createdAt}`);
      });
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
    }
    
    // 4. Summary
    console.log('\n4. Verification Summary:');
    const appwriteVerified = user.emailVerification;
    const hasUsedTokens = tokenDocs?.documents?.length > 0;
    
    console.log(`   Appwrite native verification: ${appwriteVerified}`);
    console.log(`   Has used verification tokens: ${hasUsedTokens}`);
    console.log(`   Final verification status: ${appwriteVerified || hasUsedTokens}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the debug function
debugVerification();
