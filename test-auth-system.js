#!/usr/bin/env node

/**
 * Comprehensive Authentication System Test
 * 
 * This script tests the complete authentication flow including:
 * - User registration
 * - Email verification
 * - User login
 * - JWT token management
 * - Password reset
 * - Session management
 * - OAuth providers
 * 
 * Run with: node test-auth-system.js
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testUser = {
  email: `test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@example.com`,
  password: 'TestPassword123!',
  newPassword: 'NewTestPassword123!',
  name: 'Test User'
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    testResults.tests.push({ status: 'PASS', message });
    log(`✅ PASS: ${message}`, 'success');
  } else {
    testResults.failed++;
    testResults.tests.push({ status: 'FAIL', message });
    log(`❌ FAIL: ${message}`, 'error');
  }
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function testHealthCheck() {
  log('Testing health check endpoint...', 'info');
  
  const response = await makeRequest('GET', '/health');
  assert(response.success, 'Health check endpoint should be accessible');
  assert(response.data?.success === true, 'Health check should return success: true');
  assert(response.data?.data?.status === 'ok', 'Health check should return status: ok');
}

async function testUserRegistration() {
  log('Testing user registration...', 'info');
  
  const signUpData = {
    email: testUser.email,
    password: testUser.password,
    metadata: {
      name: testUser.name
    }
  };
  
  const response = await makeRequest('POST', '/auth/signup', signUpData);
  assert(response.success, 'User registration should succeed with valid data');
  assert(response.data?.success === true, 'Registration response should have success: true');
  assert(response.data?.data?.user?.email === testUser.email, 'Response should contain user email');
  assert(response.data?.data?.verificationEmailSent === true, 'Verification email should be sent');
  
  // Store user ID for later tests
  if (response.data?.data?.user?.id) {
    testUser.id = response.data.data.user.id;
  }
  
  // Test duplicate registration
  const duplicateResponse = await makeRequest('POST', '/auth/signup', signUpData);
  assert(!duplicateResponse.success, 'Duplicate registration should fail');
  assert(duplicateResponse.status === 400, 'Duplicate registration should return 400 status');
}

async function testInvalidRegistration() {
  log('Testing invalid registration scenarios...', 'info');
  
  // Test invalid email
  const invalidEmailResponse = await makeRequest('POST', '/auth/signup', {
    email: 'invalid-email',
    password: 'TestPassword123!',
    metadata: {}
  });
  assert(!invalidEmailResponse.success, 'Registration with invalid email should fail');
  assert(invalidEmailResponse.status === 400, 'Invalid email should return 400 status');
  
  // Test weak password
  const weakPasswordResponse = await makeRequest('POST', '/auth/signup', {
    email: `weak-${Date.now()}@example.com`,
    password: '123',
    metadata: {}
  });
  assert(!weakPasswordResponse.success, 'Registration with weak password should fail');
  assert(weakPasswordResponse.status === 400, 'Weak password should return 400 status');
  
  // Test missing fields
  const missingFieldsResponse = await makeRequest('POST', '/auth/signup', {});
  assert(!missingFieldsResponse.success, 'Registration with missing fields should fail');
  assert(missingFieldsResponse.status === 400, 'Missing fields should return 400 status');
}

async function testUserLogin() {
  log('Testing user login...', 'info');
  
  const loginData = {
    email: testUser.email,
    password: testUser.password
  };
  
  const response = await makeRequest('POST', '/auth/signin', loginData);
  assert(response.success, 'User login should succeed with valid credentials');
  assert(response.data?.success === true, 'Login response should have success: true');
  assert(response.data?.data?.access_token, 'Login should return access token');
  assert(response.data?.data?.refresh_token, 'Login should return refresh token');
  assert(response.data?.data?.user?.email === testUser.email, 'Login should return user data');
  
  // Store tokens for later tests
  if (response.data?.data) {
    testUser.accessToken = response.data.data.access_token;
    testUser.refreshToken = response.data.data.refresh_token;
  }
  
  // Test invalid credentials
  const invalidResponse = await makeRequest('POST', '/auth/signin', {
    email: testUser.email,
    password: 'WrongPassword123!'
  });
  assert(!invalidResponse.success, 'Login with invalid password should fail');
  assert(invalidResponse.status === 401, 'Invalid credentials should return 401 status');
  
  // Test non-existent user
  const nonExistentResponse = await makeRequest('POST', '/auth/signin', {
    email: 'nonexistent@example.com',
    password: 'TestPassword123!'
  });
  assert(!nonExistentResponse.success, 'Login with non-existent user should fail');
  assert(nonExistentResponse.status === 401, 'Non-existent user should return 401 status');
}

async function testJWTTokenManagement() {
  log('Testing JWT token management...', 'info');
  
  // Test accessing protected resource
  const meResponse = await makeRequest('GET', '/auth/me', null, {
    'Authorization': `Bearer ${testUser.accessToken}`
  });
  assert(meResponse.success, 'Protected resource access should work with valid token');
  assert(meResponse.data?.success === true, 'Me endpoint should return success: true');
  assert(meResponse.data?.data?.user?.email === testUser.email, 'Me endpoint should return user data');
  
  // Test invalid token
  const invalidTokenResponse = await makeRequest('GET', '/auth/me', null, {
    'Authorization': 'Bearer invalid-token'
  });
  assert(!invalidTokenResponse.success, 'Protected resource access should fail with invalid token');
  assert(invalidTokenResponse.status === 401, 'Invalid token should return 401 status');
  
  // Test missing authorization header
  const noAuthResponse = await makeRequest('GET', '/auth/me');
  assert(!noAuthResponse.success, 'Protected resource access should fail without authorization');
  assert(noAuthResponse.status === 401, 'Missing auth should return 401 status');
  
  // Test token refresh
  const refreshResponse = await makeRequest('POST', '/auth/refresh', {
    refresh_token: testUser.refreshToken
  });
  assert(refreshResponse.success, 'Token refresh should work with valid refresh token');
  assert(refreshResponse.data?.success === true, 'Refresh should return success: true');
  assert(refreshResponse.data?.data?.access_token, 'Refresh should return new access token');
  assert(refreshResponse.data?.data?.refresh_token, 'Refresh should return new refresh token');
  
  // Update tokens
  if (refreshResponse.data?.data) {
    testUser.accessToken = refreshResponse.data.data.access_token;
    testUser.refreshToken = refreshResponse.data.data.refresh_token;
  }
  
  // Test invalid refresh token
  const invalidRefreshResponse = await makeRequest('POST', '/auth/refresh', {
    refresh_token: 'invalid-refresh-token'
  });
  assert(!invalidRefreshResponse.success, 'Token refresh should fail with invalid refresh token');
  assert(invalidRefreshResponse.status === 401, 'Invalid refresh token should return 401 status');
}

async function testEmailVerification() {
  log('Testing email verification...', 'info');
  
  // Test email verification request
  const verificationResponse = await makeRequest('POST', '/auth/request-email-verification', {
    email: testUser.email,
    password: testUser.password
  });
  assert(verificationResponse.success, 'Email verification request should succeed');
  assert(verificationResponse.data?.success === true, 'Verification request should return success: true');
  assert(verificationResponse.data?.data?.message?.includes('verification email sent'), 'Should confirm email sent');
  
  // Test verification status check
  const statusResponse = await makeRequest('GET', `/auth/check-email-verification-status/${encodeURIComponent(testUser.email)}`);
  assert(statusResponse.success, 'Verification status check should succeed');
  assert(statusResponse.data?.success === true, 'Status check should return success: true');
  assert(statusResponse.data?.data?.hasOwnProperty('isVerified'), 'Status should include isVerified property');
  
  // Test invalid verification token
  const invalidVerifyResponse = await makeRequest('POST', '/auth/verify-email', {
    token: 'invalid-token-12345'
  });
  assert(!invalidVerifyResponse.success, 'Email verification should fail with invalid token');
  assert(invalidVerifyResponse.status === 400, 'Invalid verification token should return 400 status');
}

async function testPasswordReset() {
  log('Testing password reset...', 'info');
  
  // Test password reset request
  const resetRequestResponse = await makeRequest('POST', '/auth/password-reset', {
    email: testUser.email
  });
  assert(resetRequestResponse.success, 'Password reset request should succeed');
  assert(resetRequestResponse.data?.success === true, 'Reset request should return success: true');
  assert(resetRequestResponse.data?.data?.message?.includes('sent'), 'Should confirm reset email sent');
  
  // Test reset request for non-existent email (should still return success for security)
  const nonExistentResetResponse = await makeRequest('POST', '/auth/password-reset', {
    email: 'nonexistent@example.com'
  });
  assert(nonExistentResetResponse.success, 'Password reset for non-existent email should appear to succeed');
  assert(nonExistentResetResponse.data?.success === true, 'Non-existent reset should return success: true');
  
  // Test invalid email format
  const invalidEmailResetResponse = await makeRequest('POST', '/auth/password-reset', {
    email: 'invalid-email'
  });
  assert(!invalidEmailResetResponse.success, 'Password reset with invalid email should fail');
  assert(invalidEmailResetResponse.status === 400, 'Invalid email should return 400 status');
  
  // Test password reset with invalid token
  const invalidResetResponse = await makeRequest('POST', '/auth/reset-password', {
    token: 'invalid-reset-token',
    newPassword: testUser.newPassword
  });
  assert(!invalidResetResponse.success, 'Password reset should fail with invalid token');
  assert(invalidResetResponse.status === 400, 'Invalid reset token should return 400 status');
  assert(invalidResetResponse.error?.error?.includes('Invalid or expired reset token'), 'Should return appropriate error message');
}

async function testSessionManagement() {
  log('Testing session management...', 'info');
  
  // Test session creation
  const sessionResponse = await makeRequest('POST', '/auth/create-session', {
    email: testUser.email,
    password: testUser.password
  });
  assert(sessionResponse.success, 'Session creation should succeed');
  assert(sessionResponse.data?.success === true, 'Session creation should return success: true');
  assert(sessionResponse.data?.data?.sessionId, 'Session creation should return sessionId');
  
  const sessionId = sessionResponse.data?.data?.sessionId;
  
  if (sessionId) {
    // Test session validation
    const validateResponse = await makeRequest('POST', '/auth/validate-session', {
      sessionId: sessionId
    });
    assert(validateResponse.success, 'Session validation should succeed');
    assert(validateResponse.data?.success === true, 'Session validation should return success: true');
    assert(validateResponse.data?.data?.valid === true, 'Session should be valid');
    
    // Test session authentication
    const authResponse = await makeRequest('POST', '/auth/authenticate-session', {
      sessionId: sessionId,
      email: testUser.email
    });
    assert(authResponse.success, 'Session authentication should succeed');
    assert(authResponse.data?.success === true, 'Session auth should return success: true');
    assert(authResponse.data?.data?.user, 'Session auth should return user data');
    
    // Test session info
    const infoResponse = await makeRequest('GET', `/auth/session/${sessionId}/info`);
    assert(infoResponse.success, 'Session info retrieval should succeed');
    assert(infoResponse.data?.success === true, 'Session info should return success: true');
    
    // Test session logout
    const logoutResponse = await makeRequest('POST', '/auth/logout-session', {
      sessionId: sessionId
    });
    assert(logoutResponse.success, 'Session logout should succeed');
    assert(logoutResponse.data?.success === true, 'Session logout should return success: true');
    
    // Test validation of logged out session
    const invalidSessionResponse = await makeRequest('POST', '/auth/validate-session', {
      sessionId: sessionId
    });
    assert(!invalidSessionResponse.success, 'Logged out session should be invalid');
    assert(invalidSessionResponse.status === 400, 'Invalid session should return 400 status');
  }
}

async function testOAuthProviders() {
  log('Testing OAuth providers...', 'info');
  
  // Test getting available providers
  const providersResponse = await makeRequest('GET', '/auth/oauth/providers');
  assert(providersResponse.success, 'OAuth providers endpoint should be accessible');
  assert(providersResponse.data?.success === true, 'Providers should return success: true');
  assert(Array.isArray(providersResponse.data?.data?.providers), 'Should return providers array');
  
  // Test GitHub OAuth start
  const githubResponse = await makeRequest('POST', '/auth/oauth/github/start', {
    successUrl: 'https://example.com/success',
    failureUrl: 'https://example.com/failure'
  });
  assert(githubResponse.success, 'GitHub OAuth start should succeed');
  assert(githubResponse.data?.success === true, 'GitHub OAuth should return success: true');
  assert(githubResponse.data?.data?.authUrl, 'GitHub OAuth should return auth URL');
  assert(githubResponse.data?.data?.authUrl?.includes('github'), 'Auth URL should contain github');
}

async function testUserLogout() {
  log('Testing user logout...', 'info');
  
  // Test logout
  const logoutResponse = await makeRequest('POST', '/auth/signout', null, {
    'Authorization': `Bearer ${testUser.accessToken}`
  });
  assert(logoutResponse.success, 'User logout should succeed');
  assert(logoutResponse.data?.success === true, 'Logout should return success: true');
  assert(logoutResponse.data?.data?.message?.includes('logged out'), 'Should confirm logout');
  
  // Test accessing protected resource after logout
  const postLogoutResponse = await makeRequest('GET', '/auth/me', null, {
    'Authorization': `Bearer ${testUser.accessToken}`
  });
  assert(!postLogoutResponse.success, 'Protected resource should be inaccessible after logout');
  assert(postLogoutResponse.status === 401, 'Should return 401 after logout');
}

async function testErrorHandling() {
  log('Testing error handling and edge cases...', 'info');
  
  // Test malformed JSON
  try {
    const response = await axios.post(`${API_BASE}/auth/signin`, 'malformed json', {
      headers: { 'Content-Type': 'application/json' }
    });
    assert(false, 'Malformed JSON should be rejected');
  } catch (error) {
    assert(error.response?.status === 400, 'Malformed JSON should return 400 status');
  }
  
  // Test very long input
  const longString = 'a'.repeat(10000);
  const longInputResponse = await makeRequest('POST', '/auth/signup', {
    email: `${longString}@example.com`,
    password: 'TestPassword123!',
    metadata: {}
  });
  assert(!longInputResponse.success, 'Very long input should be rejected');
  assert(longInputResponse.status === 400, 'Long input should return 400 status');
  
  // Test SQL injection attempt
  const sqlInjectionResponse = await makeRequest('POST', '/auth/signin', {
    email: "admin@example.com'; DROP TABLE users; --",
    password: 'TestPassword123!'
  });
  assert(!sqlInjectionResponse.success, 'SQL injection attempt should fail');
  assert(sqlInjectionResponse.status === 400 || sqlInjectionResponse.status === 401, 'SQL injection should return error status');
}

async function runAllTests() {
  log('🚀 Starting Comprehensive Authentication System Test', 'info');
  log(`Testing against: ${BASE_URL}`, 'info');
  log(`Test user email: ${testUser.email}`, 'info');
  
  try {
    // Core functionality tests
    await testHealthCheck();
    await testUserRegistration();
    await testInvalidRegistration();
    await testUserLogin();
    await testJWTTokenManagement();
    await testEmailVerification();
    await testPasswordReset();
    await testSessionManagement();
    await testOAuthProviders();
    await testUserLogout();
    
    // Security and error handling tests
    await testErrorHandling();
    
  } catch (error) {
    log(`❌ Test execution failed: ${error.message}`, 'error');
    console.error(error);
  }
  
  // Print results summary
  log('\n' + '='.repeat(80), 'info');
  log('📊 TEST RESULTS SUMMARY', 'info');
  log('='.repeat(80), 'info');
  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`, testResults.failed > 0 ? 'warning' : 'success');
  
  if (testResults.failed > 0) {
    log('\n❌ FAILED TESTS:', 'error');
    testResults.tests.filter(test => test.status === 'FAIL').forEach(test => {
      log(`  - ${test.message}`, 'error');
    });
  }
  
  log('\n✅ Test execution completed!', 'success');
  log(`Test user created: ${testUser.email}`, 'info');
  log('Consider cleaning up test data in your database.', 'warning');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run tests
runAllTests();
