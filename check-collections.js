const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkCollections() {
  try {
    const res = await databases.listCollections(process.env.APPWRITE_DATABASE_ID);
    console.log('Collections:');
    res.collections.forEach(c => {
      console.log(`- ${c.name} (${c.$id})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCollections();


