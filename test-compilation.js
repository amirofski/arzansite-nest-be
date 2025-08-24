const fs = require('fs');
const path = require('path');

// Read the TypeScript file
const tsFile = fs.readFileSync('src/auth/auth.service.ts', 'utf8');

// Check if the resetPassword method exists
if (tsFile.includes('async resetPassword')) {
  console.log('✅ resetPassword method found in TypeScript file');
} else {
  console.log('❌ resetPassword method NOT found in TypeScript file');
}

// Check if the createTemporarySession method exists
if (tsFile.includes('async createTemporarySession')) {
  console.log('✅ createTemporarySession method found in TypeScript file');
} else {
  console.log('❌ createTemporarySession method NOT found in TypeScript file');
}

// Check for syntax issues
try {
  // Try to parse the file as JavaScript (basic syntax check)
  const lines = tsFile.split('\n');
  let lineNumber = 0;
  let inMethod = false;
  let braceCount = 0;
  
  for (const line of lines) {
    lineNumber++;
    if (line.includes('async resetPassword')) {
      console.log(`🔍 Found resetPassword method at line ${lineNumber}`);
      inMethod = true;
      braceCount = 0;
    }
    
    if (inMethod) {
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      
      if (braceCount === 0 && inMethod) {
        console.log(`✅ Method appears to be properly closed at line ${lineNumber}`);
        break;
      }
    }
  }
} catch (error) {
  console.error('❌ Error parsing file:', error.message);
}
