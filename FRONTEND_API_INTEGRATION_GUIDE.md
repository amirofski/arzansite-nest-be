# 🌐 Frontend API Integration Guide

## Overview

This comprehensive guide provides instructions for implementing all API endpoints in your frontend application. The backend has been enhanced with improved data structures, snake_case naming conventions, and comprehensive error handling across all modules.

## 🚀 Key Updates Summary

### 1. Snake Case Naming Convention
- **Consistent Field Naming**: All API responses use `snake_case` for field names
- **Field Mapping**: Automatic conversion between frontend `camelCase` and backend `snake_case`
- **Type Safety**: Updated TypeScript interfaces for all endpoints

### 2. Enhanced Data Structures
- **Wizard**: New `sessionId` field, `design_snapshot` storage, automatic page/section counting
- **Orders**: Enhanced order management with progress tracking
- **Payments**: Improved payment processing with better error handling
- **Wallets**: Enhanced wallet functionality with transaction history
- **Authentication**: Robust session management and JWT handling

### 3. Comprehensive Error Handling
- **Standardized Error Responses**: Consistent error structure across all endpoints
- **Retry Mechanisms**: Built-in retry logic for failed requests
- **User-Friendly Messages**: Clear error messages for end users

## 📋 Implementation Steps

### Step 1: Core API Infrastructure

#### 1.1 Base API Service

```typescript
// services/api/baseApiService.ts
export class BaseApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async handleError(response: Response): Promise<Error> {
    let errorMessage = 'An unexpected error occurred';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    return new Error(errorMessage);
  }
}
```

#### 1.2 Field Mapper Utility

```typescript
// utils/fieldMapper.ts
export class FieldMapper {
  private static readonly FIELD_MAPPING = {
    // User fields
    userId: 'user_id',
    firstName: 'first_name',
    lastName: 'last_name',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    // Order fields
    orderId: 'order_id',
    orderNumber: 'order_number',
    totalAmount: 'total_amount',
    paymentStatus: 'payment_status',
    siteType: 'site_type',
    designSnapshot: 'design_snapshot',
    totalPages: 'total_pages',
    totalSections: 'total_sections',
    
    // Payment fields
    paymentId: 'payment_id',
    transactionId: 'transaction_id',
    refId: 'ref_id',
    authority: 'authority',
    
    // Wallet fields
    walletId: 'wallet_id',
    balanceBefore: 'balance_before',
    balanceAfter: 'balance_after',
    referenceId: 'reference_id',
    referenceType: 'reference_type',
    
    // Invoice fields
    invoiceId: 'invoice_id',
    dueDate: 'due_date',
    
    // Common fields
    id: 'id',
    status: 'status',
    description: 'description',
    amount: 'amount',
    currency: 'currency',
    comments: 'comments',
  };

  static toSnakeCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.toSnakeCase(item));
    if (typeof obj !== 'object') return obj;

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = this.FIELD_MAPPING[key as keyof typeof this.FIELD_MAPPING] || key;
      result[snakeKey] = this.toSnakeCase(value);
    }
    return result;
  }

  static toCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.toCamelCase(item));
    if (typeof obj !== 'object') return obj;

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.getCamelCaseKey(key);
      result[camelKey] = this.toCamelCase(value);
    }
    return result;
  }

  private static getCamelCaseKey(snakeKey: string): string {
    const reverseMapping = Object.fromEntries(
      Object.entries(this.FIELD_MAPPING).map(([camel, snake]) => [snake, camel])
    );
    return reverseMapping[snakeKey] || snakeKey;
  }
}
```

### Step 2: Authentication Service

```typescript
// services/auth/authService.ts
import { BaseApiService } from '../api/baseApiService';
import { FieldMapper } from '../../utils/fieldMapper';

export interface SignUpRequest {
  email: string;
  password: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    address?: string;
  };
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      role?: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export class AuthService extends BaseApiService {
  async signUp(request: SignUpRequest): Promise<AuthResponse> {
    const snakeCaseRequest = FieldMapper.toSnakeCase(request);
    return this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(snakeCaseRequest),
    });
  }

  async signIn(request: SignInRequest): Promise<AuthResponse> {
    const snakeCaseRequest = FieldMapper.toSnakeCase(request);
    return this.request<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(snakeCaseRequest),
    });
  }

  async signOut(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/signout', {
      method: 'POST',
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getMe(): Promise<{ user: any }> {
    const response = await this.request<{ user: any }>('/auth/me');
    return {
      user: FieldMapper.toCamelCase(response.user),
    };
  }

  async verifyEmail(token: string, userId?: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token, user_id: userId }),
    });
  }

  async sendPasswordReset(email: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }
}
```

### Step 3: Wizard Service

```typescript
// services/wizard/wizardService.ts
import { BaseApiService } from '../api/baseApiService';
import { FieldMapper } from '../../utils/fieldMapper';

export interface CompleteOrderRequest {
  sessionId: string;
  userId?: string;
  order: {
    title: string;
    description: string;
    priceTomans: number;
    comments?: string;
    siteType?: 'personal' | 'business';
  };
  designSnapshot: {
    websiteFramework: any;
    branding: any;
    additionalServices: any;
    domains: any;
    pricing: any;
    paymentOptions: any;
  };
}

export interface OrderResponse {
  success: boolean;
  orderId: string;
  invoiceId: string;
  message: string;
  order: {
    id: string;
    title: string;
    description: string;
    price: number;
    status: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    totalPages?: number;
    totalSections?: number;
  };
  invoice: {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    dueDate: string;
    status: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

export class WizardService extends BaseApiService {
  async completeOrder(request: CompleteOrderRequest): Promise<OrderResponse> {
    const snakeCaseRequest = FieldMapper.toSnakeCase(request);
    const response = await this.request<OrderResponse>('/wizard/complete-order', {
      method: 'POST',
      body: JSON.stringify(snakeCaseRequest),
    });
    
    return FieldMapper.toCamelCase(response);
  }

  async calculatePrice(request: any): Promise<{ price: number }> {
    const snakeCaseRequest = FieldMapper.toSnakeCase(request);
    const response = await this.request<{ price: number }>('/wizard/calculate-price', {
      method: 'POST',
      body: JSON.stringify(snakeCaseRequest),
    });
    
    return FieldMapper.toCamelCase(response);
  }

  async saveDesign(orderId: string, designData: any): Promise<{ success: boolean }> {
    const snakeCaseRequest = FieldMapper.toSnakeCase({
      orderId,
      designData,
    });
    
    return this.request<{ success: boolean }>('/wizard/save-design', {
      method: 'POST',
      body: JSON.stringify(snakeCaseRequest),
    });
  }

  async getDesign(orderId: string): Promise<{ design: any }> {
    const response = await this.request<{ design: any }>(`/wizard/design/${orderId}`);
    return {
      design: FieldMapper.toCamelCase(response.design),
    };
  }
}
```

## 🎯 Best Practices

### 1. Error Handling
```typescript
// utils/errorHandler.ts
export class ErrorHandler {
  static handle(error: any): string {
    if (error.message) {
      return error.message;
    }
    
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  static isRetryable(error: any): boolean {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status) || 
           error.message?.includes('network') ||
           error.message?.includes('timeout');
  }
}
```

### 2. Retry Logic
```typescript
// utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!ErrorHandler.isRetryable(error) || attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}
```

### 3. Loading States
```typescript
// hooks/useApi.ts
import { useState, useCallback } from 'react';
import { withRetry } from '../utils/retry';
import { ErrorHandler } from '../utils/errorHandler';

export function useApi<T, P extends any[]>(
  apiFunction: (...args: P) => Promise<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: P) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await withRetry(() => apiFunction(...args));
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = ErrorHandler.handle(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  return { data, loading, error, execute };
}
```

## 🚀 Deployment Checklist

- [ ] Update all TypeScript interfaces to use snake_case mapping
- [ ] Implement field mapper utility
- [ ] Update all API services with proper error handling
- [ ] Add retry logic for failed requests
- [ ] Implement loading states and error boundaries
- [ ] Test all endpoints with proper data transformation
- [ ] Validate authentication flow
- [ ] Test file upload functionality
- [ ] Verify payment processing
- [ ] Test wallet operations
- [ ] Validate order management
- [ ] Test support ticket system
- [ ] Perform cross-browser testing
- [ ] Test mobile responsiveness
- [ ] Validate accessibility compliance
- [ ] Update documentation

## 📞 Support

If you encounter any issues during implementation:

1. Check the browser console for error messages
2. Verify API endpoint URLs and authentication
3. Ensure all required fields are properly formatted
4. Test with different user scenarios
5. Contact the backend team for API-related issues

## 🔄 Version History

- **v1.0**: Initial API implementation
- **v1.1**: Added snake_case field mapping
- **v1.2**: Enhanced error handling and retry logic
- **v1.3**: Added comprehensive service coverage
- **v1.4**: Enhanced wizard functionality with session management

---

**Note**: This guide assumes you're using React with TypeScript. Adjust the code examples according to your frontend framework and requirements.
