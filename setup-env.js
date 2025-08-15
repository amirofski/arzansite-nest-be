const fs = require('fs');
const path = require('path');

// Collection IDs from our successful creation
const COLLECTION_IDS = {
  invoices: '689ef509414ad83cfff4',
  receipts: '689ef51d7e33bc965362',
  wallet_adjustments: '689ef52d80ad7cbe921d'
};

// Environment variables to add/update
const ENV_VARS = {
  'APPWRITE_COLLECTION_INVOICES': COLLECTION_IDS.invoices,
  'APPWRITE_COLLECTION_RECEIPTS': COLLECTION_IDS.receipts,
  'APPWRITE_COLLECTION_WALLET_ADJUSTMENTS': COLLECTION_IDS.wallet_adjustments
};

function updateEnvFile(filePath) {
  console.log(`📝 Updating ${filePath}...`);
  
  let content = '';
  let updated = false;
  
  // Read existing file if it exists
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }
  
  // Split into lines
  const lines = content.split('\n');
  const newLines = [];
  const existingVars = new Set();
  
  // Process existing lines
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      newLines.push(line);
      continue;
    }
    
    // Check if this is an environment variable
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      existingVars.add(key);
      
      // Update existing variable if it's one we want to set
      if (ENV_VARS[key]) {
        newLines.push(`${key}=${ENV_VARS[key]}`);
        updated = true;
        console.log(`  ✅ Updated ${key}=${ENV_VARS[key]}`);
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }
  
  // Add new variables that don't exist
  for (const [key, value] of Object.entries(ENV_VARS)) {
    if (!existingVars.has(key)) {
      newLines.push(`${key}=${value}`);
      updated = true;
      console.log(`  ➕ Added ${key}=${value}`);
    }
  }
  
  // Write back to file
  const newContent = newLines.join('\n');
  fs.writeFileSync(filePath, newContent);
  
  if (updated) {
    console.log(`✅ Successfully updated ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed for ${filePath}`);
  }
  
  return updated;
}

function main() {
  console.log('🔧 Setting up environment variables for Wallet & Invoice Management System...\n');
  
  const filesToUpdate = [
    '.env',
    'appwrite-config.env'
  ];
  
  let anyUpdated = false;
  
  for (const file of filesToUpdate) {
    if (fs.existsSync(file)) {
      const updated = updateEnvFile(file);
      anyUpdated = anyUpdated || updated;
    } else {
      console.log(`⚠️  File ${file} not found, skipping...`);
    }
    console.log('');
  }
  
  if (anyUpdated) {
    console.log('🎉 Environment setup completed!');
    console.log('');
    console.log('📋 Collection IDs configured:');
    console.log(`  • Invoices: ${COLLECTION_IDS.invoices}`);
    console.log(`  • Receipts: ${COLLECTION_IDS.receipts}`);
    console.log(`  • Wallet Adjustments: ${COLLECTION_IDS.wallet_adjustments}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('  1. Restart your application to load the new environment variables');
    console.log('  2. Test the API endpoints');
    console.log('  3. Check that the collection error is resolved');
  } else {
    console.log('ℹ️  All environment variables are already properly configured.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateEnvFile, COLLECTION_IDS };
