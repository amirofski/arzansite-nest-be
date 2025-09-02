const fs = require('fs');
const path = require('path');

// Field mapping for codebase refactoring
const FIELD_MAPPING = {
  // User identification
  'userId': 'user_id',
  'userid': 'user_id',
  
  // Timestamps
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'completedAt': 'completed_at',
  'lastAccessed': 'last_accessed',
  
  // Order related
  'orderId': 'order_id',
  'orderid': 'order_id',
  'sessionId': 'session_id',
  'sessionid': 'session_id',
  'siteType': 'site_type',
  
  // Payment related
  'paymentGateway': 'payment_gateway',
  'zarinpalAuthority': 'zarinpal_authority',
  'zarinpalRefId': 'zarinpal_ref_id',
  
  // Design related
  'wizardData': 'wizard_data',
  'designSnapshot': 'design_snapshot',
  'callbackUrl': 'callback_url',
  'returnUrl': 'return_url',
  'websiteFramework': 'website_framework',
  'additionalServices': 'additional_services',
  'projectFiles': 'project_files',
  
  // Amount and pricing
  'totalAmount': 'total_amount',
  
  // Wallet related
  'walletId': 'wallet_id',
  'walletid': 'wallet_id',
  
  // Profile related
  'fullName': 'full_name',
  
  // File related
  'fileName': 'file_name',
  'originalName': 'original_name',
  'mimeType': 'mime_type',
  'bucketId': 'bucket_id',
  'fileId': 'file_id'
};

// Directories to process
const DIRECTORIES_TO_PROCESS = [
  'src',
  'test',
  'scripts'
];

// File extensions to process
const FILE_EXTENSIONS = ['.ts', '.js', '.json', '.md'];

// Files to exclude
const EXCLUDED_FILES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'refactor-to-user-id.js',
  'refactor-codebase-to-user-id.js'
];

let totalFilesProcessed = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Check if file is in excluded directories
  for (const excluded of EXCLUDED_FILES) {
    if (dirName.includes(excluded) || fileName.includes(excluded)) {
      return false;
    }
  }
  
  // Check file extension
  const ext = path.extname(filePath);
  return FILE_EXTENSIONS.includes(ext);
}

function refactorFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileReplacements = 0;
    
    // Apply all field mappings
    for (const [oldField, newField] of Object.entries(FIELD_MAPPING)) {
      // Create regex patterns for different contexts
      const patterns = [
        // Variable declarations and assignments
        new RegExp(`\\b${oldField}\\b`, 'g'),
        // Object property access
        new RegExp(`\\.${oldField}\\b`, 'g'),
        // Object property definitions
        new RegExp(`['"]${oldField}['"]`, 'g'),
        // Template literals
        new RegExp(`\\$\\{${oldField}\\}`, 'g'),
        // Function parameters
        new RegExp(`\\(${oldField}\\b`, 'g'),
        // Array access
        new RegExp(`\\[${oldField}\\]`, 'g')
      ];
      
      for (const pattern of patterns) {
        const matches = newContent.match(pattern);
        if (matches) {
          newContent = newContent.replace(pattern, (match) => {
            if (match.startsWith('.')) {
              return `.${newField}`;
            } else if (match.startsWith('[') && match.endsWith(']')) {
              return `[${newField}]`;
            } else if (match.startsWith('(')) {
              return `(${newField}`;
            } else if (match.startsWith('${') && match.endsWith('}')) {
              return `\${${newField}}`;
            } else if (match.startsWith("'") || match.startsWith('"')) {
              return match.replace(oldField, newField);
            } else {
              return newField;
            }
          });
          fileReplacements += matches.length;
        }
      }
    }
    
    // Write file if changes were made
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  ✅ Updated ${filePath} (${fileReplacements} replacements)`);
      totalReplacements += fileReplacements;
    }
    
    totalFilesProcessed++;
    
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}: ${error.message}`);
  }
}

function processDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!EXCLUDED_FILES.includes(item)) {
          processDirectory(fullPath);
        }
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        refactorFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`  ❌ Error processing directory ${dirPath}: ${error.message}`);
  }
}

function refactorCodebaseToUserId() {
  console.log('🚀 Starting codebase refactoring to user_id...');
  console.log('📋 This will update all TypeScript/JavaScript files to use snake_case field names\n');
  
  try {
    // Process each directory
    for (const dir of DIRECTORIES_TO_PROCESS) {
      if (fs.existsSync(dir)) {
        console.log(`📁 Processing directory: ${dir}`);
        processDirectory(dir);
      } else {
        console.log(`⚠️  Directory not found: ${dir}`);
      }
    }
    
    console.log('\n🎉 Codebase refactoring completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  • Files processed: ${totalFilesProcessed}`);
    console.log(`  • Total replacements: ${totalReplacements}`);
    console.log(`  • All field names standardized to snake_case`);
    
    console.log('\n🎯 Next steps:');
    console.log('1. Review the changes made to your codebase');
    console.log('2. Run your test suite to ensure functionality is preserved');
    console.log('3. Update any hardcoded field references in your code');
    console.log('4. Test your application thoroughly');
    console.log('5. Update frontend code to match the new field names');
    
  } catch (error) {
    console.error('❌ Codebase refactoring failed:', error.message);
    throw error;
  }
}

// Run the refactoring
if (require.main === module) {
  refactorCodebaseToUserId()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Refactoring failed:', error);
      process.exit(1);
    });
}

module.exports = { refactorCodebaseToUserId };

