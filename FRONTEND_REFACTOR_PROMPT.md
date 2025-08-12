# Frontend Refactor Prompt for Cursor

## Overview

Your backend has been successfully refactored to use NestJS as the exclusive proxy for Appwrite. All Appwrite-related functionality is now accessed through RESTful API endpoints. You need to refactor your frontend to remove direct Appwrite and Supabase usage and replace it with HTTP requests to the new NestJS backend.

## 🎯 Main Objectives

1. **Remove Direct Appwrite SDK** - Uninstall and remove all Appwrite client SDK usage
2. **Remove Supabase** - Completely eliminate Supabase client and related code
3. **Implement HTTP API Client** - Create a typed API client for all backend communication
4. **Update Authentication** - Replace Appwrite auth with JWT-based authentication
5. **Refactor Feature Modules** - Update all components to use the new API endpoints

## 🗑️ Removal Tasks

### 1. Uninstall Dependencies

```bash
npm uninstall appwrite supabase @supabase/supabase-js
npm uninstall @supabase/auth-helpers-react @supabase/auth-helpers-nextjs
```

### 2. Remove Direct SDK Imports

Search and remove all imports like:
```typescript
import { Client, Account, Databases, Storage } from 'appwrite';
import { createClient } from '@supabase/supabase-js';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
```

### 3. Delete Supabase Configuration Files

- Remove `.env.local` Supabase variables
- Delete `lib/supabase.ts` or similar
- Remove Supabase context providers

## 🏗️ New Architecture Implementation

### 1. Create Typed API Client

Create `lib/api-client.ts`:

```typescript
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
  session?: any;
}

export interface User {
  id: string;
  email: string;
  emailVerification?: boolean;
  $createdAt?: string;
}

// API Client class
export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry the original request
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.getAuthToken()}`;
            return this.client(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async signUp(email: string, password: string, metadata?: any): Promise<ApiResponse> {
    const response = await this.client.post('/auth/signup', {
      email,
      password,
      metadata,
    });
    return response.data;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    this.setAuthTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  }

  async signOut(): Promise<void> {
    await this.client.post('/auth/logout');
    this.clearAuthTokens();
  }

  async getMe(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Database methods
  async createDocument<T = any>(
    collectionId: string,
    data: T,
    documentId?: string
  ): Promise<T> {
    const response = await this.client.post(`/db/${collectionId}`, {
      data,
      documentId,
    });
    return response.data;
  }

  async getDocument<T = any>(
    collectionId: string,
    documentId: string
  ): Promise<T> {
    const response = await this.client.get(`/db/${collectionId}/${documentId}`);
    return response.data;
  }

  async updateDocument<T = any>(
    collectionId: string,
    documentId: string,
    data: Partial<T>
  ): Promise<T> {
    const response = await this.client.put(`/db/${collectionId}/${documentId}`, {
      data,
    });
    return response.data;
  }

  async deleteDocument(
    collectionId: string,
    documentId: string
  ): Promise<void> {
    await this.client.delete(`/db/${collectionId}/${documentId}`);
  }

  async listDocuments<T = any>(
    collectionId: string,
    queries?: string[]
  ): Promise<{ documents: T[]; total: number }> {
    const response = await this.client.get(`/db/${collectionId}`, {
      params: { queries },
    });
    return response.data;
  }

  // Storage methods
  async uploadFile(bucketId: string, file: File): Promise<{ fileId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post(`/storage/upload/${bucketId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getFile(bucketId: string, fileId: string): Promise<any> {
    const response = await this.client.get(`/storage/${bucketId}/${fileId}`);
    return response.data;
  }

  async deleteFile(bucketId: string, fileId: string): Promise<void> {
    await this.client.delete(`/storage/${bucketId}/${fileId}`);
  }

  async listFiles(bucketId: string, queries?: string[]): Promise<any> {
    const response = await this.client.get(`/storage/${bucketId}`, {
      params: { queries },
    });
    return response.data;
  }

  async getFileUrl(bucketId: string, fileId: string): Promise<{ url: string }> {
    const response = await this.client.get(`/storage/${bucketId}/${fileId}/url`);
    return response.data;
  }

  // Functions
  async executeFunction(
    functionId: string,
    data?: any,
    xAsync?: boolean
  ): Promise<any> {
    const response = await this.client.post('/functions/execute', {
      functionId,
      data,
      xAsync,
    });
    return response.data;
  }

  // Messaging
  async createTopic(
    topicId: string,
    name: string,
    subscribe: string[]
  ): Promise<any> {
    const response = await this.client.post('/messaging/topics', {
      topicId,
      name,
      subscribe,
    });
    return response.data;
  }

  async sendMessage(
    topicId: string,
    message: string,
    data?: any
  ): Promise<any> {
    const response = await this.client.post(`/messaging/topics/${topicId}/messages`, {
      message,
      data,
    });
    return response.data;
  }

  // Token management
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private setAuthTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  private clearAuthTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await this.client.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      this.setAuthTokens(
        response.data.access_token,
        response.data.refresh_token
      );
      return true;
    } catch (error) {
      this.clearAuthTokens();
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
```

### 2. Create Authentication Context

Create `contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, User } from '../lib/api-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const userData = await apiClient.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.signIn(email, password);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      await apiClient.signUp(email, password, metadata);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      // Clear tokens anyway
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiClient.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 3. Update Environment Variables

Update `.env.local`:

```env
# Remove Supabase variables
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...

# Add new API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Update App Component

Wrap your app with the new AuthProvider:

```typescript
// pages/_app.tsx or app/layout.tsx
import { AuthProvider } from '../contexts/AuthContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
```

## 🔄 Feature Module Refactoring

### 1. Authentication Components

Update login/signup forms:

```typescript
// components/auth/LoginForm.tsx
import { useAuth } from '../../contexts/AuthContext';

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // Redirect or show success
    } catch (error) {
      // Handle error
    }
  };

  // ... rest of component
}
```

### 2. Database Operations

Replace Appwrite database calls:

```typescript
// Before (Appwrite)
const databases = new Databases(client);
const document = await databases.createDocument(
  databaseId,
  collectionId,
  ID.unique(),
  data
);

// After (NestJS API)
const document = await apiClient.createDocument(collectionId, data);
```

### 3. Storage Operations

Replace Appwrite storage calls:

```typescript
// Before (Appwrite)
const storage = new Storage(client);
const file = await storage.createFile(bucketId, ID.unique(), inputFile);

// After (NestJS API)
const result = await apiClient.uploadFile(bucketId, fileInput.files[0]);
```

### 4. Function Execution

Replace Appwrite function calls:

```typescript
// Before (Appwrite)
const functions = new Functions(client);
const execution = await functions.createExecution(functionId, data);

// After (NestJS API)
const execution = await apiClient.executeFunction(functionId, data);
```

## 🧪 Testing and Validation

### 1. Test Authentication Flow

1. Test user registration
2. Test login/logout
3. Test token refresh
4. Test protected routes

### 2. Test API Endpoints

1. Test database CRUD operations
2. Test file operations (note: upload is placeholder)
3. Test function execution
4. Test messaging features

### 3. Error Handling

1. Test invalid credentials
2. Test expired tokens
3. Test network errors
4. Test validation errors

## 🚀 Migration Checklist

- [ ] Uninstall Appwrite and Supabase dependencies
- [ ] Remove all direct SDK imports and usage
- [ ] Create new API client with proper typing
- [ ] Implement new authentication context
- [ ] Update all authentication components
- [ ] Refactor database operations
- [ ] Refactor storage operations
- [ ] Refactor function executions
- [ ] Refactor messaging features
- [ ] Update environment variables
- [ ] Test all functionality
- [ ] Update documentation
- [ ] Remove unused code and files

## 📝 Important Notes

1. **File Upload Limitation**: The current backend has placeholder file upload due to InputFile limitations. You may need to implement a workaround or wait for backend updates.

2. **Real-time Features**: WebSocket support is not yet implemented. Consider using polling or implementing real-time features later.

3. **Error Handling**: Implement comprehensive error handling for all API calls.

4. **Type Safety**: Leverage TypeScript for better type safety with the new API client.

5. **Performance**: Consider implementing request caching and optimization strategies.

## 🔮 Future Enhancements

After the initial refactor, consider:

1. Implementing request/response caching
2. Adding offline support
3. Implementing real-time features with WebSockets
4. Adding comprehensive error tracking
5. Implementing request queuing for offline scenarios

## 📚 Additional Resources

- [Backend API Reference](./APPWRITE_API_REFERENCE.md)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Axios Documentation](https://axios-http.com/)

This refactor will provide a cleaner, more maintainable architecture with better separation of concerns and improved type safety.
