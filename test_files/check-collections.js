const { Client, Databases } = require('node-appwrite');

// Appwrite configuration
const client = new Client()
  .setEndpoint('http://app.arzansite.com/v1')
  .setProject('6898b35e003067cd7b43')
  .setKey('standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4');

const databases = new Databases(client);

async function checkCollections() {
  try {
    console.log('🔍 Checking collections in database...');
    
    const databaseId = '6899993d001b0b35b6b5';
    
    const result = await databases.listCollections(databaseId);
    
    console.log(`✅ Found ${result.collections.length} collections:`);
    
    result.collections.forEach(collection => {
      console.log(`   - ${collection.name} (ID: ${collection.$id})`);
    });
    
    // Check if password_resets collection exists
    const passwordResetsCollection = result.collections.find(c => 
      c.name === 'password_resets' || c.$id === 'password_resets'
    );
    
    if (passwordResetsCollection) {
      console.log('\n✅ password_resets collection found!');
      console.log(`   Name: ${passwordResetsCollection.name}`);
      console.log(`   ID: ${passwordResetsCollection.$id}`);
    } else {
      console.log('\n❌ password_resets collection not found!');
      console.log('   This might be why the password reset tokens are not being stored.');
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error.message);
  }
}

checkCollections();
