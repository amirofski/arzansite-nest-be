// Test description cleaning regex
function testDescriptionCleaning() {
  console.log('🧪 Testing Description Cleaning Regex...\n');
  
  const testDescriptions = [
    'gdfgfdgdfg',                                    // Original failing description
    'شارژ کیف پول - ۱,۰۰۰,۰۰۰ ریال',                // Persian text with numbers
    'شارژ کیف پول',                                  // Simple Persian text
    'Wallet Top-up - 1,000,000 Rials',              // English text with numbers
    'Test Payment',                                   // Simple English text
    'پرداخت تست',                                     // Persian text
    'Test123',                                        // Alphanumeric
    'Test-Description',                               // With hyphens
    'Test.Description',                               // With dots
    'Test, Description',                              // With commas
    'Test Description',                               // With spaces
    'شارژ کیف پول - ۳۰٬۰۰۰٬۰۰۰ تومان',              // Complex Persian with numbers
    'gdfgfdgdfg',                                     // Original failing one again
    '123456',                                         // Just numbers
    '!@#$%^&*()',                                     // Special characters only
    'شارژ کیف پول !@#$%',                            // Mixed valid/invalid
  ];
  
  // Our cleaning regex
  const cleanRegex = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s\-\.،]/g;
  
  testDescriptions.forEach((desc, index) => {
    const original = desc;
    const cleaned = desc.trim().replace(cleanRegex, '');
    const originalLength = desc.length;
    const cleanedLength = cleaned.length;
    const isValid = cleaned.length >= 3;
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Original: "${original}"`);
    console.log(`  Cleaned:  "${cleaned}"`);
    console.log(`  Length:   ${originalLength} → ${cleanedLength}`);
    console.log(`  Valid:    ${isValid ? '✅' : '❌'}`);
    console.log('');
  });
  
  // Test specific failing case
  console.log('🔍 Testing Specific Failing Case:');
  const failingDesc = 'gdfgfdgdfg';
  const cleanedFailing = failingDesc.trim().replace(cleanRegex, '');
  console.log(`Original: "${failingDesc}"`);
  console.log(`Cleaned:  "${cleanedFailing}"`);
  console.log(`Length:   ${failingDesc.length} → ${cleanedFailing.length}`);
  console.log(`Valid:    ${cleanedFailing.length >= 3 ? '✅' : '❌'}`);
  
  // Test Persian text
  console.log('\n🔍 Testing Persian Text:');
  const persianDesc = 'شارژ کیف پول - ۱,۰۰۰,۰۰۰ ریال';
  const cleanedPersian = persianDesc.trim().replace(cleanRegex, '');
  console.log(`Original: "${persianDesc}"`);
  console.log(`Cleaned:  "${cleanedPersian}"`);
  console.log(`Length:   ${persianDesc.length} → ${cleanedPersian.length}`);
  console.log(`Valid:    ${cleanedPersian.length >= 3 ? '✅' : '❌'}`);
}

// Run the test
testDescriptionCleaning();
