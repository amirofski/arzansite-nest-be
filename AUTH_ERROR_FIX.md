# راهنمای حل مشکل Authentication Error

## 🚨 **خطای شناسایی شده:**
```
Error in AuthService.signIn
TypeError: xe.isRetryable is not a function
```

## 🔍 **علت مشکل:**
این خطا معمولاً مربوط به موارد زیر است:
1. **Appwrite SDK Version**: مشکل compatibility با node-appwrite
2. **Error Handling**: عدم مدیریت صحیح errors
3. **Network Issues**: مشکلات شبکه یا timeout
4. **Configuration**: تنظیمات نادرست Appwrite

## 🛠️ **راه حل‌های پیاده‌سازی شده:**

### 1. **بهبود Error Handling در AppwriteService**
```typescript
async createSession(email: string, password: string): Promise<any> {
  try {
    return await this.account.createEmailPasswordSession(email, password);
  } catch (error: any) {
    // Handle Appwrite SDK errors properly
    if (error.code === 401) {
      throw new UnauthorizedException('Invalid email or password');
    } else if (error.code === 429) {
      throw new BadRequestException('Too many login attempts. Please try again later.');
    } else if (error.code === 400) {
      throw new BadRequestException('Invalid request parameters');
    } else {
      // Log the full error for debugging
      console.error('Appwrite session creation error:', {
        message: error.message,
        code: error.code,
        type: error.type
      });
      throw new BadRequestException('Authentication failed. Please check your credentials.');
    }
  }
}
```

### 2. **بهبود Error Handling در AuthService**
```typescript
async signIn(signInDto: SignInDto) {
  try {
    const session = await this.appwriteService.createSession(
      signInDto.email,
      signInDto.password
    );
    // ... rest of the logic
  } catch (error: any) {
    // Handle specific error types
    if (error instanceof UnauthorizedException) {
      throw error; // Re-throw authentication errors
    } else if (error instanceof BadRequestException) {
      throw error; // Re-throw validation errors
    } else {
      // Log unexpected errors for debugging
      console.error('Unexpected error in signIn:', error);
      throw new UnauthorizedException('Authentication failed. Please try again.');
    }
  }
}
```

## 🔧 **تنظیمات اضافی:**

### 1. **Appwrite Client Configuration**
```typescript
// در appwrite.config.ts
export const appwriteConfig = {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  // اضافه کردن timeout و retry settings
  timeout: 30000, // 30 seconds
  retries: 3
};
```

### 2. **Environment Variables**
```env
# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key

# Database Configuration
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_COLLECTION_USERS=users
APPWRITE_COLLECTION_AUTH_TOKENS=auth_tokens

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
```

### 3. **Network Configuration**
```typescript
// در appwrite.service.ts
private async initializeClient() {
  this.client = new Client()
    .setEndpoint(this.config.endpoint)
    .setProject(this.config.projectId)
    .setKey(this.config.apiKey)
    .setSelfSigned(true); // برای development

  // اضافه کردن timeout
  this.client.timeout = 30000;
}
```

## 🚀 **تست و Debug:**

### 1. **Logging Configuration**
```typescript
// اضافه کردن detailed logging
console.log('🔍 Appwrite client initialized:', {
  endpoint: this.config.endpoint,
  projectId: this.config.projectId,
  hasApiKey: !!this.config.apiKey
});
```

### 2. **Error Monitoring**
```typescript
// اضافه کردن error tracking
catch (error: any) {
  console.error('🔴 Appwrite Error Details:', {
    message: error.message,
    code: error.code,
    type: error.type,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}
```

### 3. **Health Check**
```typescript
// اضافه کردن health check برای Appwrite
async healthCheck(): Promise<boolean> {
  try {
    await this.users.list();
    return true;
  } catch (error) {
    console.error('Appwrite health check failed:', error);
    return false;
  }
}
```

## 📋 **چک‌لیست عیب‌یابی:**

### Backend
- [ ] Appwrite SDK version مناسب
- [ ] Environment variables صحیح
- [ ] Network connectivity
- [ ] Error handling بهبود یافته
- [ ] Logging مناسب

### Frontend
- [ ] Error handling در API calls
- [ ] User-friendly error messages
- [ ] Retry mechanism
- [ ] Loading states

### Appwrite Console
- [ ] Project configuration
- [ ] Database permissions
- [ ] User authentication settings
- [ ] API keys validity

## 🔍 **Debugging Steps:**

### 1. **Check Appwrite Connection**
```bash
# Test API connectivity
curl -X GET "https://cloud.appwrite.io/v1/health" \
  -H "X-Appwrite-Project: your_project_id"
```

### 2. **Check Environment Variables**
```bash
# در backend
console.log('Environment check:', {
  endpoint: process.env.APPWRITE_ENDPOINT,
  projectId: process.env.APPWRITE_PROJECT_ID,
  hasApiKey: !!process.env.APPWRITE_API_KEY
});
```

### 3. **Test Authentication Flow**
```bash
# Test signin endpoint
curl -X POST "https://nest.arzansite.com/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## 🎯 **نتیجه:**

با این تغییرات:
- ✅ Error handling بهبود یافت
- ✅ Appwrite SDK errors مدیریت می‌شوند
- ✅ User-friendly error messages
- ✅ Better debugging capabilities

**مشکل `isRetryable` باید حل شود!** 🎉

## 🚨 **اگر مشکل ادامه داشت:**

### 1. **Update Appwrite SDK**
```bash
npm update node-appwrite
```

### 2. **Clear Cache**
```bash
npm run build
rm -rf node_modules
npm install
```

### 3. **Check Appwrite Console**
- بررسی project settings
- بررسی API keys
- بررسی database permissions
