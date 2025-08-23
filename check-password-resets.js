const { Client, Databases, Query } = require('node-appwrite');

// Appwrite configuration
const client = new Client()
  .setEndpoint('http://app.arzansite.com/v1')
  .setProject('6898b35e003067cd7b43')
  .setKey('standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4');

const databases = new Databases(client);

async function checkPasswordResets() {
  try {
    console.log('🔍 Checking all documents in password_resets collection...');
    
    const databaseId = '6899993d001b0b35b6b5';
    const collectionId = 'password_resets';
    
    const result = await databases.listDocuments(
      databaseId,
      collectionId,
      [Query.orderDesc('createdAt')]
    );
    
    console.log(`✅ Found ${result.documents.length} password reset records:`);
    
    if (result.documents.length === 0) {
      console.log('   No password reset records found.');
      console.log('   This suggests the backend is not storing tokens properly.');
    } else {
      result.documents.forEach((doc, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`     ID: ${doc.$id}`);
        console.log(`     Email: ${doc.email}`);
        console.log(`     User ID: ${doc.userId}`);
        console.log(`     Token: ${doc.token}`);
        console.log(`     Created: ${doc.createdAt}`);
        console.log(`     Expires: ${doc.expiresAt}`);
        console.log(`     Used: ${doc.used}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking password resets:', error.message);
  }
}

checkPasswordResets();
