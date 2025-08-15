// Test the exact validation logic from ZarinPal service
function testValidationLogic() {
  console.log('🧪 Testing ZarinPal Validation Logic Step by Step...\n');
  
  // Simulate the exact data from the error
  const paymentData = {
    amount: 1000000,
    description: 'gdfgfdgdfg',
    callbackUrl: 'https://arzansite.com/wallet/deposit/callback',
    mobile: undefined,
    email: 'amir.devel@gmail.com',
    orderId: 'deposit_689e28fe002e2a63e1c1_1755258012046_1000000',
    currency: undefined
  };
  
  const merchantId = '2c60c8d0-53da-4ace-baf2-00bdda39a816';
  
  console.log('📊 Input Data:');
  console.log(JSON.stringify(paymentData, null, 2));
  console.log(`Merchant ID: ${merchantId}\n`);
  
  try {
    // Step 1: Check merchant ID
    console.log('🔍 Step 1: Merchant ID Validation');
    if (!merchantId) {
      throw new Error('ZarinPal payment gateway not configured');
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(merchantId)) {
      throw new Error('Invalid merchant ID format');
    }
    console.log('✅ Merchant ID validation passed\n');
    
    // Step 2: Amount validation
    console.log('🔍 Step 2: Amount Validation');
    console.log(`Amount: ${paymentData.amount} (type: ${typeof paymentData.amount})`);
    
    if (paymentData.amount < 1000) {
      throw new Error('Minimum payment amount is 1,000 Rials');
    }
    
    if (!Number.isInteger(paymentData.amount) || paymentData.amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }
    
    if (paymentData.amount > 999999999) {
      throw new Error('Amount is too high (maximum 999,999,999 Rials)');
    }
    
    console.log('✅ Amount validation passed\n');
    
    // Step 3: Callback URL validation
    console.log('🔍 Step 3: Callback URL Validation');
    console.log(`Callback URL: ${paymentData.callbackUrl}`);
    
    try {
      const callbackUrl = new URL(paymentData.callbackUrl);
      console.log(`✅ Callback URL parsed successfully: ${callbackUrl.toString()}`);
      
      // Check if it's HTTPS (production mode)
      const isSandbox = false; // Simulating production mode
      if (!isSandbox && callbackUrl.protocol !== 'https:') {
        throw new Error('Callback URL must use HTTPS in production');
      }
      console.log('✅ HTTPS validation passed\n');
      
    } catch (urlError) {
      throw new Error(`Invalid callback URL format: ${paymentData.callbackUrl}`);
    }
    
    // Step 4: Description validation
    console.log('🔍 Step 4: Description Validation');
    console.log(`Description: "${paymentData.description}"`);
    
    if (paymentData.description.length > 255) {
      throw new Error('Description is too long (maximum 255 characters)');
    }
    
    if (paymentData.description.trim().length === 0) {
      throw new Error('Description cannot be empty');
    }
    
    if (paymentData.description.trim().length < 3) {
      throw new Error('Description is too short (minimum 3 characters)');
    }
    
    // Clean description
    const cleanRegex = /[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s\-\.،]/g;
    const cleanDescription = paymentData.description.trim().replace(cleanRegex, '');
    
    console.log(`Original description: "${paymentData.description}"`);
    console.log(`Cleaned description: "${cleanDescription}"`);
    console.log(`Description length before: ${paymentData.description.length}, after: ${cleanDescription.length}`);
    
    if (cleanDescription.length === 0) {
      throw new Error('Description contains only invalid characters');
    }
    
    if (cleanDescription.length < 3) {
      throw new Error('Description is too short after cleaning (minimum 3 characters)');
    }
    
    console.log('✅ Description validation passed\n');
    
    // Step 5: Build payment request
    console.log('🔍 Step 5: Building Payment Request');
    
    const paymentRequest = {
      merchant_id: merchantId,
      amount: paymentData.amount,
      description: cleanDescription,
      callback_url: paymentData.callbackUrl,
      metadata: {},
    };
    
    // Add metadata
    if (paymentData.mobile) {
      const mobileRegex = /^09[0-9]{9}$/;
      if (!mobileRegex.test(paymentData.mobile)) {
        throw new Error('Invalid mobile number format (should start with 09 and be 11 digits)');
      }
      paymentRequest.metadata.mobile = paymentData.mobile;
    }
    
    if (paymentData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paymentData.email)) {
        throw new Error('Invalid email format');
      }
      paymentRequest.metadata.email = paymentData.email;
    }
    
    if (paymentData.orderId) {
      if (paymentData.orderId.length > 100) {
        throw new Error('Order ID is too long (maximum 100 characters)');
      }
      const cleanOrderId = paymentData.orderId.replace(/[^\w\-_]/g, '');
      if (cleanOrderId.length === 0) {
        throw new Error('Order ID contains only invalid characters');
      }
      paymentRequest.metadata.order_id = cleanOrderId;
    }
    
    // Only include metadata if it has content
    if (Object.keys(paymentRequest.metadata).length === 0) {
      delete paymentRequest.metadata;
    }
    
    console.log('✅ Payment request built successfully');
    console.log('Final payment request:', JSON.stringify(paymentRequest, null, 2));
    
    console.log('\n🎉 All validations passed! The request should work.');
    
  } catch (error) {
    console.log(`❌ Validation failed: ${error.message}`);
    console.log(`Error occurred at: ${error.stack.split('\n')[1]}`);
  }
}

// Run the test
testValidationLogic();
