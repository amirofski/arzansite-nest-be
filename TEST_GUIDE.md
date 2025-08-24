# Authentication System Testing Guide

This guide provides comprehensive instructions for testing the NestJS authentication system, including registration, login, password reset, email verification, and all related functionality.

## 📋 Overview

The testing suite includes:

- **Unit Tests**: Individual component testing using Jest
- **E2E Tests**: End-to-end testing using Supertest
- **Integration Tests**: Comprehensive flow testing
- **Manual Testing Scripts**: Standalone test scripts for specific scenarios

## 🚀 Quick Start

### Prerequisites

1. **Backend Server Running**: Ensure your NestJS server is running
   ```bash
   npm run start:dev
   ```

2. **Environment Setup**: Verify all environment variables are configured
   ```bash
   # Check your .env file contains:
   APPWRITE_ENDPOINT=http://app.arzansite.com/v1
   APPWRITE_PROJECT_ID=your-project-id
   APPWRITE_API_KEY=your-api-key
   APPWRITE_DATABASE_ID=your-database-id
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   ```

3. **Database Schema**: Ensure Appwrite collections are created
   ```bash
   npm run appwrite:schema
   ```

### Run All Tests

```bash
# Run the comprehensive test suite
node run-auth-tests.js
```

This will execute:
1. Unit tests (Jest)
2. E2E tests (Jest + Supertest)
3. Integration tests (Custom script)

## 🧪 Individual Test Types

### 1. Unit Tests

```bash
# Run Jest unit tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch
```

**What it tests:**
- Individual service methods
- Controller endpoints
- DTO validation
- Guard functionality
- Interceptor behavior

### 2. E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

**What it tests:**
- Complete HTTP request/response cycles
- Authentication flows
- Error handling
- Input validation
- JWT token management

### 3. Integration Tests

```bash
# Run comprehensive integration tests
node test-auth-system.js
```

**What it tests:**
- Complete user journey flows
- Cross-service integration
- Email functionality
- Session management
- OAuth providers
- Security measures

## 📊 Test Coverage

### Authentication Features Tested

#### ✅ User Registration
- [x] Valid user registration
- [x] Duplicate email handling
- [x] Invalid email format validation
- [x] Weak password rejection
- [x] Missing field validation
- [x] Email verification sending

#### ✅ User Login
- [x] Valid credential authentication
- [x] Invalid password handling
- [x] Non-existent user handling
- [x] JWT token generation
- [x] Refresh token creation

#### ✅ JWT Token Management
- [x] Access token validation
- [x] Protected route access
- [x] Token refresh functionality
- [x] Invalid token handling
- [x] Token expiration

#### ✅ Email Verification
- [x] Verification email sending
- [x] Token validation
- [x] Status checking
- [x] Invalid token handling

#### ✅ Password Reset
- [x] Reset email sending
- [x] Token generation
- [x] Password update process
- [x] Invalid token handling
- [x] Security measures (no user enumeration)

#### ✅ Session Management
- [x] Session creation
- [x] Session validation
- [x] Session authentication
- [x] Session logout
- [x] Session info retrieval

#### ✅ OAuth Integration
- [x] Provider listing
- [x] OAuth flow initiation
- [x] Callback handling

#### ✅ Security & Error Handling
- [x] Input sanitization
- [x] SQL injection prevention
- [x] Rate limiting
- [x] Error message security
- [x] Malformed request handling

## 🔧 Test Configuration

### Environment Variables for Testing

```env
# Test-specific configuration
TEST_BASE_URL=http://localhost:3000
NODE_ENV=test

# Database (use test database if available)
APPWRITE_DATABASE_ID=test-database-id

# Email (use test SMTP or mock)
SMTP_HOST=localhost
SMTP_PORT=1025  # For MailHog or similar
```

### Test Data Management

The tests automatically generate unique test data:
- Email addresses include timestamps to avoid conflicts
- Test users are created with predictable patterns
- Cleanup is attempted after test completion

## 📝 Test Files Structure

```
test/
├── auth.e2e-spec.ts              # Comprehensive E2E tests
├── auth-integration.e2e-spec.ts  # Integration flow tests
├── app.e2e-spec.ts               # Basic application tests
└── jest-e2e.json                 # E2E Jest configuration

Root directory:
├── test-auth-system.js            # Standalone integration tests
├── run-auth-tests.js              # Test runner script
└── TEST_GUIDE.md                  # This guide
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **Connection Refused Errors**
```bash
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**Solution**: Ensure your NestJS server is running on port 3000

#### 2. **Appwrite Connection Errors**
```bash
Error: Invalid API key or endpoint
```
**Solution**: 
- Check your Appwrite endpoint URL
- Verify API key has correct permissions
- Ensure database ID is correct

#### 3. **SMTP Errors**
```bash
Error: Failed to send email
```
**Solution**:
- Verify SMTP configuration
- Check SMTP credentials
- Test SMTP connection manually

#### 4. **Database Schema Errors**
```bash
Error: Collection not found
```
**Solution**:
```bash
npm run appwrite:schema
```

#### 5. **Test User Conflicts**
```bash
Error: User already exists
```
**Solution**: Tests use timestamped emails to avoid conflicts, but you may need to clean up test data manually

### Debug Mode

Run tests with debug output:

```bash
# Enable debug logging
DEBUG=* node test-auth-system.js

# For Jest tests
npm run test:debug
```

## 📈 Interpreting Test Results

### Success Indicators

```bash
✅ PASS: User registration should succeed with valid data
✅ PASS: Login should return access token
✅ PASS: Password reset request should succeed
```

### Failure Analysis

```bash
❌ FAIL: Protected resource access should work with valid token
```

**Common causes:**
1. JWT secret mismatch
2. Token expiration
3. Invalid token format
4. Missing authorization header

### Performance Metrics

The test runner provides timing information:
```bash
Total Duration: 45.32s
Success Rate: 95.83%
```

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Authentication Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: node run-auth-tests.js
```

## 📚 Additional Resources

### Frontend Testing

Since you plan to communicate only through NestJS, ensure your frontend tests:

1. **Mock Appwrite SDK calls** - Replace with HTTP calls to your NestJS API
2. **Test API integration** - Verify all endpoints work correctly
3. **Handle JWT tokens** - Store and refresh tokens properly
4. **Error handling** - Handle API errors gracefully

### Example Frontend Test

```javascript
// Instead of direct Appwrite SDK usage:
// const session = await account.createEmailPasswordSession(email, password);

// Use your NestJS API:
const response = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const data = await response.json();
```

## 🎯 Best Practices

1. **Run tests before deployment**
2. **Keep test data isolated**
3. **Clean up after tests**
4. **Monitor test performance**
5. **Update tests when adding features**
6. **Use descriptive test names**
7. **Test both success and failure scenarios**

## 📞 Support

If tests fail or you encounter issues:

1. Check the error messages carefully
2. Verify your environment configuration
3. Ensure all dependencies are installed
4. Check Appwrite console for any issues
5. Review the server logs for additional context

---

**Happy Testing! 🚀**

Your authentication system should now be thoroughly tested and ready for production use.
