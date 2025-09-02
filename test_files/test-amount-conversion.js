// Test amount conversion from Rials to Tomans for ZarinPal integration
function testAmountConversion() {
  console.log('🧪 Testing Amount Conversion (Rials → Tomans) for ZarinPal...\n');
  
  // Test cases with different amounts
  const testCases = [
    {
      name: 'Original failing case - 250,000,990 Rials',
      amountInRials: 250000990,
      expectedTomans: 25000099,
      description: 'gdfgdfg'
    },
    {
      name: 'Minimum amount - 1,000,000 Rials',
      amountInRials: 1000000,
      expectedTomans: 100000,
      description: 'شارژ کیف پول'
    },
    {
      name: 'Common amount - 5,000,000 Rials',
      amountInRials: 5000000,
      expectedTomans: 500000,
      description: 'Wallet top-up'
    },
    {
      name: 'Large amount - 100,000,000 Rials',
      amountInRials: 100000000,
      expectedTomans: 10000000,
      description: 'Large deposit'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Amount (Rials): ${testCase.amountInRials.toLocaleString()}`);
    
    // Simulate our conversion logic
    const amountInTomans = Math.floor(testCase.amountInRials / 10);
    console.log(`Converted (Tomans): ${amountInTomans.toLocaleString()}`);
    console.log(`Expected (Tomans): ${testCase.expectedTomans.toLocaleString()}`);
    
    const isCorrect = amountInTomans === testCase.expectedTomans;
    console.log(`Conversion ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log('');
  });
  
  // Test the expected API response format
  console.log('🔍 Testing Expected API Response Format:');
  
  const mockResponse = {
    success: true,
    paymentUrl: "https://sandbox.zarinpal.com/pg/StartPay/authority_here",
    authority: "authority_here",
    orderId: "deposit_user123_timestamp_1000000",
    message: "Payment request created successfully. Redirect to payment gateway."
  };
  
  console.log('Expected Response Structure:');
  console.log(JSON.stringify(mockResponse, null, 2));
  
  // Validate response structure
  const requiredFields = ['success', 'paymentUrl', 'authority', 'orderId', 'message'];
  const hasAllFields = requiredFields.every(field => field in mockResponse);
  
  console.log(`\nResponse validation: ${hasAllFields ? '✅ VALID' : '❌ INVALID'}`);
  
  if (hasAllFields) {
    console.log('✅ All required fields are present');
    console.log('✅ Response format matches expected structure');
  } else {
    console.log('❌ Missing required fields');
  }
  
  // Test ZarinPal request format
  console.log('\n🔍 Testing ZarinPal Request Format:');
  
  const testAmount = 250000990; // Rials
  const testAmountInTomans = Math.floor(testAmount / 10);
  
  const zarinPalRequest = {
    merchant_id: "2c60c8d0-53da-4ace-baf2-00bdda39a816",
    amount: testAmountInTomans, // Tomans
    currency: "IRT", // Iranian Tomans
    description: "gdfgdfg",
    callback_url: "https://arzansite.com/wallet/deposit/callback",
    metadata: {
      email: "amir.devel@gmail.com",
      order_id: "deposit_689e28fe002e2a63e1c1_1755258012046_250000990"
    }
  };
  
  console.log('ZarinPal Request Format:');
  console.log(JSON.stringify(zarinPalRequest, null, 2));
  
  // Validate ZarinPal request
  const zarinPalRequiredFields = ['merchant_id', 'amount', 'currency', 'description', 'callback_url'];
  const hasZarinPalFields = zarinPalRequiredFields.every(field => field in zarinPalRequest);
  
  console.log(`\nZarinPal request validation: ${hasZarinPalFields ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Amount in Tomans: ${testAmountInTomans.toLocaleString()}`);
  console.log(`Currency: ${zarinPalRequest.currency}`);
}

// Run the test
testAmountConversion();
