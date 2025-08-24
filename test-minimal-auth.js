const fs = require('fs');
const path = require('path');

// Check if the compiled auth service exists
const authServicePath = path.join(__dirname, 'dist', 'src', 'auth', 'auth.service.js');

if (fs.existsSync(authServicePath)) {
  console.log('✅ Compiled auth service exists');
  
  // Read the file and check for resetPassword method
  const content = fs.readFileSync(authServicePath, 'utf8');
  
  if (content.includes('resetPassword')) {
    console.log('✅ resetPassword method found in compiled file');
  } else {
    console.log('❌ resetPassword method NOT found in compiled file');
    
    // Check what methods are available
    const methodMatches = content.match(/async\s+(\w+)\s*\(/g);
    if (methodMatches) {
      console.log('📋 Available methods:');
      methodMatches.forEach(match => {
        const methodName = match.replace(/async\s+(\w+)\s*\(.*/, '$1');
        console.log(`  - ${methodName}`);
      });
    }
  }
  
  // Check file size
  const stats = fs.statSync(authServicePath);
  console.log(`📊 File size: ${stats.size} bytes`);
  
} else {
  console.log('❌ Compiled auth service does not exist');
}