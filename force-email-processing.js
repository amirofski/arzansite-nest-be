const { Client, Databases, ID, Query } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function forceProcessEmailOutbox() {
  try {
    console.log('🔍 Force processing email outbox...');
    
    // Get pending emails
    const result = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      'email_outbox',
      [Query.equal('status', 'pending'), Query.limit(10)]
    );
    
    console.log(`Found ${result.total} pending emails`);
    
    for (const item of result.documents) {
      console.log(`\nProcessing email: ${item.type} for ${item.entity_id}`);
      
      // Force it to be ready by updating created_at to 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      try {
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          'email_outbox',
          item.$id,
          {
            created_at: twoMinutesAgo
          }
        );
        console.log(`  ✅ Updated created_at to ${twoMinutesAgo}`);
        
        // Now mark it as sent
        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          'email_outbox',
          item.$id,
          {
            status: 'sent',
            sent_at: new Date().toISOString()
          }
        );
        console.log(`  ✅ Marked as sent`);
      } catch (error) {
        console.error(`  ❌ Error updating:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error processing email outbox:', error.message);
  }
}

async function main() {
  await forceProcessEmailOutbox();
}

main().catch(console.error);
