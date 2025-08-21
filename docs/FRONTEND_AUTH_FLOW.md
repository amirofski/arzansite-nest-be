# 🔐 Frontend Authentication Flow - Remove Appwrite Dependency

## 🎯 **Objective**
Remove the frontend's direct dependency on Appwrite and route all authentication through the NestJS backend.

## 🚀 **New Authentication Flow**

### **Before (Current Problem):**
```
Frontend → Appwrite (Direct) → Gets Appwrite JWT
Frontend → NestJS API → Sends Appwrite JWT → ❌ 401 Unauthorized
```

### **After (Solution):**
```
Frontend → Appwrite (Direct) → Gets Appwrite JWT
Frontend → NestJS /auth/exchange-jwt → Sends Appwrite JWT → Gets Backend JWT
Frontend → NestJS API → Sends Backend JWT → ✅ 200 Success
```

## 🛠️ **Implementation Steps**

### **Step 1: Update Frontend Authentication Service**

Replace your current authentication service with this new flow:

```typescript
// auth.service.ts
export class AuthService {
  private backendJwt: string | null = null;
  private refreshToken: string | null = null;

  // 1. User logs in via Appwrite (keep existing)
  async loginWithAppwrite(email: string, password: string) {
    try {
      // Your existing Appwrite login code
      const appwriteClient = new Client()
        .setEndpoint('https://your-appwrite-endpoint/v1')
        .setProject('your-project-id');
      
      const account = new Account(appwriteClient);
      const session = await account.createEmailPasswordSession(email, password);
      
      // 2. Get Appwrite JWT
      const appwriteJwt = await account.createJWT();
      
      // 3. Exchange for Backend JWT
      const backendAuth = await this.exchangeForBackendJwt(appwriteJwt);
      
      // 4. Store backend JWT
      this.backendJwt = backendAuth.access_token;
      this.refreshToken = backendAuth.refresh_token;
      
      // Store in localStorage or secure storage
      localStorage.setItem('backend_jwt', this.backendJwt);
      localStorage.setItem('refresh_token', this.refreshToken);
      
      return backendAuth;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // 3. Exchange Appwrite JWT for Backend JWT
  private async exchangeForBackendJwt(appwriteJwt: string) {
    try {
      const response = await fetch('https://nest.arzansite.com/api/auth/exchange-jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appwriteJwt }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange JWT');
      }

      return await response.json();
    } catch (error) {
      console.error('JWT exchange failed:', error);
      throw error;
    }
  }

  // 4. Get Backend JWT for API calls
  getBackendJwt(): string | null {
    if (!this.backendJwt) {
      this.backendJwt = localStorage.getItem('backend_jwt');
    }
    return this.backendJwt;
  }

  // 5. Make authenticated API calls
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const jwt = this.getBackendJwt();
    if (!jwt) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshBackendJwt();
      // Retry the request
      return this.makeAuthenticatedRequest(url, options);
    }

    return response;
  }

  // 6. Refresh Backend JWT
  private async refreshBackendJwt() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('https://nest.arzansite.com/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      this.backendJwt = data.access_token;
      localStorage.setItem('backend_jwt', this.backendJwt);

      return data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Redirect to login
      this.logout();
      throw error;
    }
  }

  // 7. Logout
  logout() {
    this.backendJwt = null;
    this.refreshToken = null;
    localStorage.removeItem('backend_jwt');
    localStorage.removeItem('refresh_token');
    
    // Also logout from Appwrite if needed
    // Your existing Appwrite logout code
  }
}
```

### **Step 2: Update API Service Calls**

Replace all your direct API calls with authenticated calls:

```typescript
// Before (Direct API call)
const response = await fetch('https://nest.arzansite.com/api/uploads');

// After (Authenticated API call)
const response = await this.authService.makeAuthenticatedRequest('https://nest.arzansite.com/api/uploads');
```

### **Step 3: Update File Upload Service**

```typescript
// upload.service.ts
export class UploadService {
  constructor(private authService: AuthService) {}

  async uploadFile(file: File, orderId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (orderId) {
      formData.append('orderId', orderId);
    }

    const response = await this.authService.makeAuthenticatedRequest(
      'https://nest.arzansite.com/api/uploads',
      {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData
        },
      }
    );

    return response.json();
  }
}
```

### **Step 4: Update Orders Service**

```typescript
// orders.service.ts
export class OrdersService {
  constructor(private authService: AuthService) {}

  async getOrders(mine: boolean = true) {
    const response = await this.authService.makeAuthenticatedRequest(
      `https://nest.arzansite.com/api/orders?mine=${mine}`
    );
    return response.json();
  }

  async createOrder(orderData: any) {
    const response = await this.authService.makeAuthenticatedRequest(
      'https://nest.arzansite.com/api/orders',
      {
        method: 'POST',
        body: JSON.stringify(orderData),
      }
    );
    return response.json();
  }
}
```

## 🔄 **Token Refresh Strategy**

The backend JWT expires after 1 hour (configurable). Implement automatic refresh:

```typescript
// Add to your app initialization
setInterval(() => {
  // Check if token expires soon (e.g., in 5 minutes)
  const jwt = this.authService.getBackendJwt();
  if (jwt) {
    try {
      const decoded = JSON.parse(atob(jwt.split('.')[1]));
      const expiresIn = decoded.exp * 1000 - Date.now();
      
      if (expiresIn < 5 * 60 * 1000) { // Less than 5 minutes
        this.authService.refreshBackendJwt();
      }
    } catch (error) {
      console.error('Failed to decode JWT:', error);
    }
  }
}, 60000); // Check every minute
```

## 🚨 **Error Handling**

```typescript
// Add to your HTTP interceptor or error handler
if (response.status === 401) {
  // Try to refresh token
  try {
    await this.authService.refreshBackendJwt();
    // Retry the original request
    return this.retryRequest(originalRequest);
  } catch (error) {
    // Redirect to login
    this.router.navigate(['/login']);
    throw error;
  }
}
```

## ✅ **Testing the New Flow**

1. **Test Login:**
   ```typescript
   await this.authService.loginWithAppwrite('user@example.com', 'password');
   // Should get backend JWT
   ```

2. **Test Protected Endpoint:**
   ```typescript
   const uploads = await this.authService.makeAuthenticatedRequest(
     'https://nest.arzansite.com/api/uploads'
   );
   // Should return 200 with data
   ```

3. **Test Token Refresh:**
   ```typescript
   // Wait for token to expire or manually expire it
   await this.authService.refreshBackendJwt();
   // Should get new access token
   ```

## 🔧 **Backend Endpoints Available**

- `POST /api/auth/exchange-jwt` - Exchange Appwrite JWT for Backend JWT
- `POST /api/auth/refresh` - Refresh expired backend JWT
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/me` - Get current user info

## 🎉 **Benefits of This Approach**

1. **Centralized Authentication:** All auth logic in one place
2. **Consistent JWT Format:** Same token format across all endpoints
3. **Better Security:** Backend controls token lifecycle
4. **Easier Debugging:** Single point of auth failure
5. **Scalable:** Easy to add more auth features

## 🚀 **Migration Checklist**

- [ ] Update authentication service
- [ ] Replace direct API calls with authenticated calls
- [ ] Implement token refresh logic
- [ ] Update error handling
- [ ] Test all protected endpoints
- [ ] Remove direct Appwrite API calls (except login)
- [ ] Update documentation

## 📝 **Environment Variables**

Ensure your frontend has:
```env
NESTJS_API_URL=https://nest.arzansite.com
APPWRITE_ENDPOINT=https://your-appwrite-endpoint/v1
APPWRITE_PROJECT_ID=your-project-id
```

This new flow will eliminate the 401 errors you're experiencing and provide a clean, maintainable authentication system!
