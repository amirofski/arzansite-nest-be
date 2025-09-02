const axios = require('axios');

// Test ZarinPal API connection directly
async function testZarinPalConnection() {
  const merchantId = '2c60c8d0-53da-4ace-baf2-00bdda39a816';
  
  console.log('🧪 Testing ZarinPal API Connection...');
  console.log(`📍 Merchant ID: ${merchantId}`);
  
  // Test with production endpoint
  const productionUrl = 'https://payment.zarinpal.com/pg/v4/payment/request.json';
  
  const testRequest = {
    merchant_id: merchantId,
    amount: 1000,
    description: 'Test payment',
    callback_url: 'https://arzansite.com/wallet/deposit/callback'
  };
  
  console.log('\n📤 Test Request:');
  console.log(JSON.stringify(testRequest, null, 2));
  
  try {
    console.log(`\n🌐 Testing production endpoint: ${productionUrl}`);
    
    const response = await axios.post(productionUrl, testRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ArzanSite-Test/1.0',
      },
      timeout: 30000,
    });
    
    console.log('\n✅ Production API Response:');
    console.log(`Status: ${response.status}`);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Production API Error:');
    console.log(`Status: ${error.response?.status}`);
    console.log('Error:', error.message);
    
    if (error.response?.data) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // Test with sandbox endpoint
  const sandboxUrl = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json';
  
  try {
    console.log(`\n🌐 Testing sandbox endpoint: ${sandboxUrl}`);
    
    const response = await axios.post(sandboxUrl, testRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ArzanSite-Test/1.0',
      },
      timeout: 30000,
    });
    
    console.log('\n✅ Sandbox API Response:');
    console.log(`Status: ${response.status}`);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Sandbox API Error:');
    console.log(`Status: ${error.response?.status}`);
    console.log('Error:', error.message);
    
    if (error.response?.data) {
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // Test different request formats
  console.log('\n🔍 Testing different request formats...');
  
  // Test 1: Without metadata
  const testRequest1 = {
    merchant_id: merchantId,
    amount: 1000,
    description: 'Test payment',
    callback_url: 'https://arzansite.com/wallet/deposit/callback'
  };
  
  try {
    console.log('\n📤 Test 1 (No metadata):');
    console.log(JSON.stringify(testRequest1, null, 2));
    
    const response = await axios.post(productionUrl, testRequest1, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('✅ Success!');
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Failed:', error.response?.status, error.message);
  }
  
  // Test 2: With minimal metadata
  const testRequest2 = {
    merchant_id: merchantId,
    amount: 1000,
    description: 'Test payment',
    callback_url: 'https://arzansite.com/wallet/deposit/callback',
    metadata: {
      mobile: '09121234567'
    }
  };
  
  try {
    console.log('\n📤 Test 2 (With mobile metadata):');
    console.log(JSON.stringify(testRequest2, null, 2));
    
    const response = await axios.post(productionUrl, testRequest2, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });
    
    console.log('✅ Success!');
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Failed:', error.response?.status, error.message);
  }
}

// Run the test
testZarinPalConnection().catch(console.error);
