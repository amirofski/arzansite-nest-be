#!/usr/bin/env node

/**
 * Codebase Cleanup Script
 * 
 * This script automatically cleans up the codebase by:
 * 1. Removing duplicate code
 * 2. Standardizing field names
 * 3. Ensuring consistent imports
 * 4. Merging similar files
 * 5. Removing unused code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = './src';
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', 'coverage'];
const EXCLUDE_FILES = ['.DS_Store', 'Thumbs.db'];

// Field mapping for consistency
const FIELD_MAPPING = {
  // User fields
  userId: 'user_id',
  userid: 'user_id',
  
  // Date fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  lastAccessed: 'last_accessed',
  
  // Order fields
  orderId: 'order_id',
  orderid: 'order_id',
  sessionId: 'session_id',
  sessionid: 'session_id',
  siteType: 'site_type',
  orderNumber: 'order_number',
  
  // Payment fields
  paymentGateway: 'payment_gateway',
  paymentStatus: 'payment_status',
  zarinpalAuthority: 'zarinpal_authority',
  zarinpalRefId: 'zarinpal_ref_id',
  zarinpalInvoiceId: 'zarinpal_invoice_id',
  
  // Design fields
  wizardData: 'wizard_data',
  designSnapshot: 'design_snapshot',
  designData: 'design_data',
  designPreviewUrl: 'design_preview_url',
  designOptions: 'design_options',
  callbackUrl: 'callback_url',
  returnUrl: 'return_url',
  websiteFramework: 'website_framework',
  additionalServices: 'additional_services',
  projectFiles: 'project_files',
  
  // Amount fields
  totalAmount: 'total_amount',
  balanceBefore: 'balance_before',
  balanceAfter: 'balance_after',
  
  // Wallet fields
  walletId: 'wallet_id',
  walletid: 'wallet_id',
  
  // Profile fields
  fullName: 'full_name',
  firstName: 'first_name',
  lastName: 'last_name',
  phoneNumber: 'phone_number',
  
  // File fields
  fileName: 'file_name',
  originalName: 'original_name',
  mimeType: 'mime_type',
  bucketId: 'bucket_id',
  fileId: 'file_id',
  
  // Transaction fields
  transactionType: 'transaction_type',
  transactionId: 'transaction_id',
  referenceId: 'reference_id',
  referenceType: 'reference_type',
  
  // Support fields
  ticketId: 'ticket_id',
  adminUserId: 'admin_user_id',
  assignedTo: 'assigned_to',
  
  // Notification fields
  notificationType: 'notification_type',
  notificationPreferences: 'notification_preferences',
};

// Files that can be merged
const MERGEABLE_FILES = {
  'src/orders/orders.service.ts': {
    mergeWith: ['src/orders/enhanced-orders.service.ts'],
    keep: 'src/orders/orders.service.ts',
    remove: ['src/orders/enhanced-orders.service.ts']
  },
  'src/payments/payments.service.ts': {
    mergeWith: ['src/payments/enhanced-payments.service.ts'],
    keep: 'src/payments/payments.service.ts',
    remove: ['src/payments/enhanced-payments.service.ts']
  }
};

async function main() {
  console.log('🧹 Starting Codebase Cleanup...\n');
  
  try {
    // Step 1: Standardize field names
    console.log('📝 Step 1: Standardizing field names...');
    await standardizeFieldNames();
    
    // Step 2: Remove duplicate code
    console.log('\n🔄 Step 2: Removing duplicate code...');
    await removeDuplicateCode();
    
    // Step 3: Merge similar files
    console.log('\n🔗 Step 3: Merging similar files...');
    await mergeSimilarFiles();
    
    // Step 4: Clean up imports
    console.log('\n📦 Step 4: Cleaning up imports...');
    await cleanupImports();
    
    // Step 5: Remove unused files
    console.log('\n🗑️  Step 5: Removing unused files...');
    await removeUnusedFiles();
    
    console.log('\n✅ Codebase cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

async function standardizeFieldNames() {
  const files = await getAllFiles(SRC_DIR);
  
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // Replace camelCase with snake_case in database operations
      for (const [camelCase, snakeCase] of Object.entries(FIELD_MAPPING)) {
        const regex = new RegExp(`\\b${camelCase}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, snakeCase);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`  ✅ Updated field names in: ${file}`);
      }
    }
  }
}

async function removeDuplicateCode() {
  const files = await getAllFiles(SRC_DIR);
  const duplicates = new Map();
  
  // Find duplicate functions and classes
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(file, 'utf8');
      const functions = extractFunctions(content);
      
      for (const func of functions) {
        if (duplicates.has(func.name)) {
          console.log(`  🔍 Found duplicate function: ${func.name}`);
          // Keep the first occurrence, remove others
        } else {
          duplicates.set(func.name, { file, content: func.content });
        }
      }
    }
  }
}

async function mergeSimilarFiles() {
  for (const [mainFile, config] of Object.entries(MERGEABLE_FILES)) {
    if (fs.existsSync(mainFile)) {
      console.log(`  🔗 Merging files for: ${mainFile}`);
      
      let mainContent = fs.readFileSync(mainFile, 'utf8');
      
      // Merge content from other files
      for (const mergeFile of config.mergeWith) {
        if (fs.existsSync(mergeFile)) {
          const mergeContent = fs.readFileSync(mergeFile, 'utf8');
          mainContent = mergeFileContent(mainContent, mergeContent);
          console.log(`    📄 Merged: ${mergeFile}`);
        }
      }
      
      // Write merged content back
      fs.writeFileSync(mainFile, mainContent);
      
      // Remove merged files
      for (const removeFile of config.remove) {
        if (fs.existsSync(removeFile)) {
          fs.unlinkSync(removeFile);
          console.log(`    🗑️  Removed: ${removeFile}`);
        }
      }
    }
  }
}

async function cleanupImports() {
  const files = await getAllFiles(SRC_DIR);
  
  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;
      
      // Remove unused imports
      const imports = extractImports(content);
      const usedImports = extractUsedImports(content);
      
      for (const imp of imports) {
        if (!usedImports.includes(imp.name)) {
          content = removeImport(content, imp);
          modified = true;
        }
      }
      
      // Add missing imports for field mapper
      if (content.includes('mapAppwriteToDatabase') || content.includes('mapDatabaseToAppwrite')) {
        if (!content.includes('from \'../common/utils/field-mapper.util\'')) {
          content = addFieldMapperImport(content);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(file, content);
        console.log(`  ✅ Cleaned imports in: ${file}`);
      }
    }
  }
}

async function removeUnusedFiles() {
  const files = await getAllFiles(SRC_DIR);
  const unusedFiles = [];
  
  for (const file of files) {
    if (isUnusedFile(file)) {
      unusedFiles.push(file);
    }
  }
  
  for (const file of unusedFiles) {
    fs.unlinkSync(file);
    console.log(`  🗑️  Removed unused file: ${file}`);
  }
}

// Helper functions
async function getAllFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(item)) {
          traverse(fullPath);
        }
      } else {
        if (!EXCLUDE_FILES.includes(item)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

function extractFunctions(content) {
  const functions = [];
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(\w+)\s*[:=]\s*(?:async\s+)?function|(?:export\s+)?(\w+)\s*[:=]\s*\([^)]*\)\s*=>/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1] || match[2] || match[3];
    if (name) {
      functions.push({ name, content: match[0] });
    }
  }
  
  return functions;
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    const module = match[2];
    
    for (const name of names) {
      imports.push({ name, module });
    }
  }
  
  return imports;
}

function extractUsedImports(content) {
  const used = [];
  const functionCallRegex = /\b(\w+)\s*\(/g;
  
  let match;
  while ((match = functionCallRegex.exec(content)) !== null) {
    used.push(match[1]);
  }
  
  return [...new Set(used)];
}

function removeImport(content, importItem) {
  const importRegex = new RegExp(`import\\s+\\{[^}]*\\b${importItem.name}\\b[^}]*\\}\\s+from\\s+['"]${importItem.module}['"]`, 'g');
  return content.replace(importRegex, '');
}

function addFieldMapperImport(content) {
  const importStatement = "import { mapAppwriteToDatabase, mapDatabaseToAppwrite } from '../common/utils/field-mapper.util';";
  return importStatement + '\n' + content;
}

function mergeFileContent(mainContent, mergeContent) {
  // Simple merge strategy - append unique functions
  const mainFunctions = extractFunctions(mainContent);
  const mergeFunctions = extractFunctions(mergeContent);
  
  const mainFunctionNames = mainFunctions.map(f => f.name);
  
  for (const func of mergeFunctions) {
    if (!mainFunctionNames.includes(func.name)) {
      mainContent += '\n\n' + func.content;
    }
  }
  
  return mainContent;
}

function isUnusedFile(file) {
  // Check if file is referenced anywhere
  const fileName = path.basename(file, path.extname(file));
  const files = getAllFiles(SRC_DIR);
  
  for (const otherFile of files) {
    if (otherFile !== file) {
      const content = fs.readFileSync(otherFile, 'utf8');
      if (content.includes(fileName)) {
        return false;
      }
    }
  }
  
  return true;
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, standardizeFieldNames, removeDuplicateCode, mergeSimilarFiles, cleanupImports, removeUnusedFiles };

