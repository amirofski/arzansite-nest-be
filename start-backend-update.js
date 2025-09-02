#!/usr/bin/env node

/**
 * 🚀 Backend Update Quick Start Script
 * 
 * This script helps you get started with updating your NestJS backend
 * to work with the new Appwrite database structure.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Backend Update Quick Start');
console.log('=============================');
console.log('');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.log('❌ Error: This script must be run from your NestJS project root directory');
  console.log('   Please navigate to your project folder and run this script again');
  process.exit(1);
}

// Check for key files
const keyFiles = [
  'src/appwrite/appwrite.config.ts',
  'src/auth/auth.service.ts',
  'src/wizard/wizard.service.ts',
  'src/orders/orders.service.ts'
];

console.log('🔍 Checking project structure...');
let missingFiles = [];
keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} (missing)`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('');
  console.log('⚠️  Some key files are missing. Please ensure you\'re in the correct project directory.');
  process.exit(1);
}

console.log('');
console.log('✅ Project structure looks good!');
console.log('');

// Check environment file
const envFile = '.env';
if (fs.existsSync(envFile)) {
  console.log('📋 Environment file found');
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  // Check for old collection IDs
  const oldCollectionPatterns = [
    /APPWRITE_COLLECTION_USER_ROLES/,
    /APPWRITE_COLLECTION_ORDERS/,
    /APPWRITE_COLLECTION_PAYMENTS/
  ];
  
  let hasOldCollections = false;
  oldCollectionPatterns.forEach(pattern => {
    if (pattern.test(envContent)) {
      hasOldCollections = true;
    }
  });
  
  if (hasOldCollections) {
    console.log('⚠️  Old collection IDs found in .env file');
    console.log('   You need to update these to the new structure');
  } else {
    console.log('✅ Environment file looks up to date');
  }
} else {
  console.log('❌ .env file not found');
  console.log('   Please create one with your Appwrite configuration');
}

console.log('');
console.log('📋 Next Steps:');
console.log('===============');
console.log('');
console.log('1. 📝 Update your .env file with new collection IDs');
console.log('   (See BACKEND_UPDATE_TASK_LIST.md Task 1.1)');
console.log('');
console.log('2. ⚙️  Update src/appwrite/appwrite.config.ts');
console.log('   (See BACKEND_UPDATE_TASK_LIST.md Task 1.2)');
console.log('');
console.log('3. 🔐 Update src/auth/auth.service.ts');
console.log('   (See BACKEND_UPDATE_TASK_LIST.md Task 2.1)');
console.log('');
console.log('4. 🧙 Update src/wizard/wizard.service.ts');
console.log('   (See BACKEND_UPDATE_TASK_LIST.md Task 2.2)');
console.log('');
console.log('5. 🧪 Test the authentication flow');
console.log('   (See BACKEND_UPDATE_TASK_LIST.md Task 5.1)');
console.log('');
console.log('📚 Documentation Files:');
console.log('=======================');
console.log('');
console.log('• BACKEND_UPDATE_TASK_LIST.md - Complete task breakdown');
console.log('• FIELD_NAME_MAPPING_GUIDE.md - Field name mappings');
console.log('• FINAL_OPTIMIZATION_REPORT.md - Database structure details');
console.log('');
console.log('🚨 Critical Notes:');
console.log('==================');
console.log('');
console.log('• Your old database structure is completely gone');
console.log('• All field names now use snake_case');
console.log('• Some fields have been removed or renamed');
console.log('• New required fields must be provided');
console.log('');
console.log('⏱️  Estimated Time: 8-10 hours');
console.log('🎯 Priority: Start with Phase 1 (Environment & Configuration)');
console.log('');
console.log('Good luck with your backend update! 🚀');
console.log('');
console.log('Need help? Check the documentation files above or review the error messages carefully.');
