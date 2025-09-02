# 🚀 Frontend Wizard Integration Guide

## 📋 Overview

This guide explains how to integrate with the `/api/wizard/complete-order` endpoint to create website orders from the wizard interface.

## 🔑 Authentication

**Required**: JWT Bearer Token in Authorization header
```typescript
const headers = {
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
};
```

## 📤 API Endpoint

```http
POST /api/wizard/complete-order
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 📊 Request Structure

### Complete Request Body
```typescript
interface CompleteOrderRequest {
  session_id: string;           // Wizard session identifier
  order: {
    title: string;              // Website title (e.g., "وب‌سایت شخصی - dsfsdfsd")
    description: string;        // Website description (e.g., "پروژه ذخیره شده")
    priceTomans: number;        // Price in Tomans (e.g., 4700000)
    comments?: string;          // Optional comments (e.g., "پروژه ذخیره شده - دامنه: dsfsdfsd.ir")
    site_type?: 'personal' | 'business'; // Optional site type
  };
  design_snapshot: {
    websiteFramework: {
      dynamicDesign: {
        pages: Array<{
          id: string;
          name: string;
          sections: Array<{
            id: string;
            section_type: string;
            layout_id: string;
            order: number;
            custom_data: Record<string, any>;
          }>;
          canvas_dimensions: {
            width: number;
            height: number;
          };
        }>;
        current_page_id: string;
      };
    };
    branding: {
      primaryColor: string;
      fontFamily: string;
      logo?: string;
    };
    additionalServices: {
      socialMediaIntegration: boolean;
      seoOptimization: boolean;
      analyticsSetup: boolean;
      maintenancePlan: boolean;
      rushDelivery: boolean;
    };
    domains: {
      primary_domain: string;
      additional_domains: string[];
    };
    pricing: {
      additionalServices: Record<string, boolean>;
      customizationLevel: number[];
      rushDelivery: boolean;
      totalPrice: number;
    };
    paymentOptions: Record<string, any>;
  };
}
```

### Example Request
```typescript
const requestBody = {
  session_id: "wizard_1756742357515",
  order: {
    title: "وب‌سایت شخصی - dsfsdfsd",
    description: "پروژه ذخیره شده",
    priceTomans: 4700000,
    comments: "پروژه ذخیره شده - دامنه: dsfsdfsd.ir",
    site_type: "personal"
  },
  design_snapshot: {
    websiteFramework: {
      dynamicDesign: {
        pages: [
          {
            id: "main",
            name: "صفحه اصلی",
            sections: [
              {
                id: "headers-1755528540637",
                section_type: "headers",
                layout_id: "headers-36",
                order: 0,
                custom_data: {}
              },
              {
                id: "footer-1755528549407",
                section_type: "footer",
                layout_id: "footer-25",
                order: 1,
                custom_data: {}
              }
            ],
            canvas_dimensions: {
              width: 1200,
              height: 800
            }
          }
        ],
        current_page_id: "main"
      }
    },
    branding: {
      primaryColor: "#8B5CF6",
      fontFamily: "vazir",
      logo: ""
    },
    additionalServices: {
      socialMediaIntegration: true,
      seoOptimization: true,
      analyticsSetup: true,
      maintenancePlan: true,
      rushDelivery: true
    },
    domains: {
      primary_domain: "dsfsdfsd",
      additional_domains: []
    },
    pricing: {
      additionalServices: {
        socialMediaIntegration: true,
        seoOptimization: true,
        analyticsSetup: true,
        maintenancePlan: true,
        rushDelivery: true
      },
      customizationLevel: [3],
      rushDelivery: false,
      totalPrice: 4700000
    },
    paymentOptions: {}
  }
};
```

## 📥 Response Structure

### Success Response (200)
```typescript
interface CompleteOrderResponse {
  success: true;
  order_id: string;
  invoiceId: string;
  message: string;
  order: {
    id: string;
    title: string;
    description: string;
    price: number;              // Price in Rials (Tomans × 10)
    status: 'pending';
    user_id: string;
    created_at: string;
    updated_at: string;
  };
  invoice: {
    id: string;
    order_id: string;
    user_id: string;
    amount: number;             // Amount in Rials
    dueDate: string;            // Due date (30 days from creation)
    status: 'pending';
    description: string;
    created_at: string;
    updated_at: string;
  };
}
```

### Error Response (400/500)
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
}
```

## 🎯 Frontend Implementation

### 1. Basic Integration
```typescript
class WizardService {
  private baseUrl = 'https://nest.arzansite.com/api';
  private jwtToken: string;

  constructor(jwtToken: string) {
    this.jwtToken = jwtToken;
  }

  async completeOrder(request: CompleteOrderRequest): Promise<CompleteOrderResponse> {
    const response = await fetch(`${this.baseUrl}/wizard/complete-order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to complete order');
    }

    return response.json();
  }
}
```

### 2. React Hook Example
```typescript
import { useState } from 'react';

interface UseWizardOrder {
  completeOrder: (request: CompleteOrderRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
  orderData: CompleteOrderResponse | null;
}

export function useWizardOrder(jwtToken: string): UseWizardOrder {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<CompleteOrderResponse | null>(null);

  const completeOrder = async (request: CompleteOrderRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wizard/complete-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete order');
      }

      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { completeOrder, loading, error, orderData };
}
```

### 3. React Component Example
```typescript
import React from 'react';
import { useWizardOrder } from './useWizardOrder';

interface WizardCompleteOrderProps {
  jwtToken: string;
  sessionId: string;
  orderData: any;
  designSnapshot: any;
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
}

export function WizardCompleteOrder({
  jwtToken,
  sessionId,
  orderData,
  designSnapshot,
  onSuccess,
  onError
}: WizardCompleteOrderProps) {
  const { completeOrder, loading, error, orderData: responseData } = useWizardOrder(jwtToken);

  const handleCompleteOrder = async () => {
    try {
      const request = {
        session_id: sessionId,
        order: {
          title: orderData.title,
          description: orderData.description,
          priceTomans: orderData.priceTomans,
          comments: orderData.comments,
          site_type: orderData.site_type
        },
        design_snapshot: designSnapshot
      };

      await completeOrder(request);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to complete order');
    }
  };

  // Handle successful order creation
  React.useEffect(() => {
    if (responseData?.success && responseData.order_id) {
      onSuccess(responseData.order_id);
    }
  }, [responseData, onSuccess]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  return (
    <div>
      <button 
        onClick={handleCompleteOrder}
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Creating Order...' : 'Complete Order'}
      </button>
      
      {error && (
        <div className="alert alert-danger mt-3">
          Error: {error}
        </div>
      )}
    </div>
  );
}
```

## ⚠️ Important Notes

### 1. User ID Handling
- **DO NOT** send `user_id` in the request body
- The backend automatically uses the authenticated user's ID from the JWT token
- This ensures security and prevents user impersonation

### 2. Price Conversion
- Send price in **Tomans** (`priceTomans`)
- Backend automatically converts to **Rials** (×10) for storage
- Response shows price in Rials

### 3. Design Snapshot
- The complete design data is stored in the `wizard_data` field
- This field can handle large JSON objects
- Individual components (website_framework, additional_services) are stored separately for easier querying

### 4. Session Management
- Each wizard session should have a unique `session_id`
- Use timestamp-based IDs: `wizard_${Date.now()}`
- Session ID is used to track progress and link orders

## 🔍 Error Handling

### Common Errors

1. **Authentication Errors (401)**
   ```typescript
   if (response.status === 401) {
     // Redirect to login or refresh token
     handleAuthenticationError();
   }
   ```

2. **Validation Errors (400)**
   ```typescript
   if (response.status === 400) {
     const errorData = await response.json();
     // Show validation errors to user
     showValidationErrors(errorData.errors);
   }
   ```

3. **Server Errors (500)**
   ```typescript
   if (response.status >= 500) {
     // Show generic error message
     showErrorMessage('Server error. Please try again later.');
   }
   ```

## 🎉 Success Flow

1. **Order Created**: Order appears in user's dashboard immediately
2. **Invoice Generated**: Pending invoice created automatically
3. **Email Sent**: Confirmation emails sent to user and admin
4. **Status Tracking**: Order status can be tracked via order ID

## 📱 Mobile Considerations

- Ensure design snapshot data doesn't exceed reasonable size limits
- Consider compressing large JSON data before sending
- Implement retry logic for network failures
- Show loading states during API calls

## 🧪 Testing

### Test Data
```typescript
const testRequest = {
  session_id: `test_${Date.now()}`,
  order: {
    title: "Test Website",
    description: "Test description",
    priceTomans: 1000000,
    comments: "Test comment",
    site_type: "personal"
  },
  design_snapshot: {
    // Minimal test data
    websiteFramework: { test: true },
    branding: { primaryColor: "#000000" },
    additionalServices: { seoOptimization: true },
    domains: { primary_domain: "test" },
    pricing: { totalPrice: 1000000 },
    paymentOptions: {}
  }
};
```

### Validation
- Test with various design snapshot sizes
- Verify price conversion (Tomans → Rials)
- Check error handling for invalid data
- Test authentication flow

---

## 📞 Support

For questions or issues with this integration:
1. Check the API response for specific error messages
2. Verify JWT token is valid and not expired
3. Ensure all required fields are provided
4. Check network connectivity and CORS settings

**Happy coding! 🚀**
