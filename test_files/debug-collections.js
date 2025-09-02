#!/usr/bin/env node

/**
 * Debug Appwrite Collections
 * 
 * This script checks the actual collection IDs in your Appwrite database
 */

const { Client, Databases } = require('node-appwrite');

// Load environment variables from .env manually
try {
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1);
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // ignore env load errors
}

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'http://app.arzansite.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';

async function debugCollections() {
  console.log('🔍 Debugging Appwrite Collections...\n');
  
  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Get database info
    console.log('1️⃣ Database Information:');
    const database = await databases.get(APPWRITE_DATABASE_ID);
    console.log(`   Database ID: ${database.$id}`);
    console.log(`   Database Name: ${database.name}\n`);

    // List all collections
    console.log('2️⃣ Collections in Database:');
    const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
    
    console.log(`   Total Collections: ${collections.total}\n`);
    
    collections.collections.forEach((collection, index) => {
      console.log(`   ${index + 1}. Collection: ${collection.name}`);
      console.log(`      ID: ${collection.$id}`);
      console.log(`      Document Security: ${collection.documentSecurity}`);
      console.log(`      Enabled: ${collection.enabled}`);
      console.log(`      Created: ${collection.$createdAt}`);
      console.log('');
    });

    // Check specific collections we need
    console.log('3️⃣ Checking Required Collections:');
    const requiredCollections = [
      'orders',
      'designs', 
      'wallets',
      'transactions',
      'profiles',
      'email_verifications',
      'password_resets'
    ];

    for (const collectionName of requiredCollections) {
      try {
        // Try to find collection by name
        const foundCollections = collections.collections.filter(c => c.name === collectionName);
        if (foundCollections.length > 0) {
          console.log(`   ✅ ${collectionName}: ${foundCollections[0].$id}`);
        } else {
          console.log(`   ❌ ${collectionName}: NOT FOUND`);
        }
      } catch (error) {
        console.log(`   ❌ ${collectionName}: ERROR - ${error.message}`);
      }
    }

    console.log('\n4️⃣ Environment Variables Check:');
    console.log(`   APPWRITE_DATABASE_ID: ${process.env.APPWRITE_DATABASE_ID}`);
    console.log(`   APPWRITE_COLLECTION_PASSWORD_RESETS: ${process.env.APPWRITE_COLLECTION_PASSWORD_RESETS}`);
    console.log(`   APPWRITE_COLLECTION_EMAIL_VERIFICATIONS: ${process.env.APPWRITE_COLLECTION_EMAIL_VERIFICATIONS}`);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the debug
if (require.main === module) {
  debugCollections();
}

module.exports = { debugCollections };
