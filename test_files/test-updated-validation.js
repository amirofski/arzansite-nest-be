// Test the updated validation logic with new amount limits
function testUpdatedValidation() {
  console.log('🧪 Testing Updated ZarinPal Validation Logic...\n');
  
  // Test cases with different amounts
  const testCases = [
    {
      name: 'Valid amount - 250,000,990 Rials',
      amount: 250000990,
      description: 'gdfgdfg',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'PASS'
    },
    {
      name: 'Valid amount - 1,000,000 Rials (minimum)',
      amount: 1000000,
      description: 'شارژ کیف پول',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'PASS'
    },
    {
      name: 'Valid amount - 999,999,999 Rials (under old limit)',
      amount: 999999999,
      description: 'Test payment',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'PASS'
    },
    {
      name: 'Valid amount - 1,000,000,000 Rials (new maximum)',
      amount: 1000000000,
      description: 'Large payment',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'PASS'
    },
    {
      name: 'Invalid amount - 1,000,000,001 Rials (over new limit)',
      amount: 1000000001,
      description: 'Too large payment',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'FAIL - Amount too high'
    },
    {
      name: 'Invalid amount - 999,999 Rials (under minimum)',
      amount: 999999,
      description: 'Too small payment',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'FAIL - Amount too low'
    },
    {
      name: 'Invalid amount - 0 Rials',
      amount: 0,
      description: 'Zero payment',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'FAIL - Amount must be positive'
    },
    {
      name: 'Invalid amount - -1000 Rials',
      amount: -1000,
      description: 'Negative payment',
      callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
      expected: 'FAIL - Amount must be positive'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Amount: ${testCase.amount.toLocaleString()} Rials`);
    console.log(`Description: "${testCase.description}"`);
    console.log(`Callback URL: ${testCase.callbackUrl}`);
    
    try {
      // Simulate validation logic
      let isValid = true;
      let errorMessage = '';
      
      // Amount validation
      if (testCase.amount < 1000) {
        isValid = false;
        errorMessage = 'Amount must be a positive integer';
      } else if (testCase.amount > 1000000000) {
        isValid = false;
        errorMessage = 'Amount is too high (maximum 1,000,000,000 Rials)';
      } else if (!Number.isInteger(testCase.amount) || testCase.amount <= 0) {
        isValid = false;
        errorMessage = 'Amount must be a positive integer';
      }
      
      // Description validation
      if (testCase.description.trim().length < 3) {
        isValid = false;
        errorMessage = 'Description is too short (minimum 3 characters)';
      }
      
      // Callback URL validation
      try {
        new URL(testCase.callbackUrl);
      } catch {
        isValid = false;
        errorMessage = 'Invalid callback URL format';
      }
      
      if (isValid) {
        console.log(`✅ Result: ${testCase.expected}`);
      } else {
        console.log(`❌ Result: ${errorMessage}`);
      }
      
    } catch (error) {
      console.log(`❌ Result: ${error.message}`);
    }
    
    console.log('');
  });
  
  // Test specific failing case from the error
  console.log('🔍 Testing Specific Failing Case from Error:');
  const failingCase = {
    amount: 250000990,
    description: 'gdfgdfg',
    callbackUrl: 'https://arzansite.com/wallet/deposit/callback'
  };
  
  console.log(`Amount: ${failingCase.amount.toLocaleString()} Rials`);
  console.log(`Description: "${failingCase.description}"`);
  console.log(`Callback URL: ${failingCase.callbackUrl}`);
  
  // Check if this should pass our validation
  const shouldPass = 
    failingCase.amount >= 1000 && 
    failingCase.amount <= 1000000000 && 
    Number.isInteger(failingCase.amount) && 
    failingCase.amount > 0 &&
    failingCase.description.trim().length >= 3;
  
  console.log(`Should pass validation: ${shouldPass ? '✅ YES' : '❌ NO'}`);
  
  if (shouldPass) {
    console.log('✅ This case should now pass our updated validation!');
  } else {
    console.log('❌ This case still fails validation');
  }
}

// Run the test
testUpdatedValidation();
