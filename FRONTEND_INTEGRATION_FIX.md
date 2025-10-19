# راهنمای رفع خطاهای Frontend Integration

## 🔍 **مشکلات شناسایی شده:**

### 1. **WebSocket Connection Error (Frontend)**
```
WebSocket connection to 'wss://app.arzansite.com/v1/realtime?project=app&channels%5B%5D=databases.database.collections.notifications.documents' failed
```

**علت**: Frontend سعی می‌کند به Appwrite Realtime متصل شود اما اتصال برقرار نمی‌شود.

**راه حل**:
```typescript
// در frontend، بررسی کنید که Appwrite client درست تنظیم شده باشد:
import { Client, Databases, Realtime } from 'appwrite';

const client = new Client()
  .setEndpoint('https://app.arzansite.com/v1') // یا endpoint صحیح
  .setProject('app');

const realtime = new Realtime(client);
const databases = new Databases(client);

// اتصال به Realtime
realtime.subscribe('databases.database.collections.notifications.documents', (response) => {
  console.log('Realtime notification:', response);
});
```

### 2. **Order Creation Response Error (Frontend)**
```
Response received: {status: 201, statusText: '', ok: true, headers: {…}}
Error creating order: Error: سفارش ایجاد نشد
```

**علت**: Frontend انتظار response format خاصی دارد اما backend چیز دیگری برمی‌گرداند.

**راه حل Backend** (انجام شده):
```typescript
// Response format استاندارد شده:
{
  success: true,
  data: {
    orderId: "order_123",
    status: "pending",
    payment: {
      redirectUrl: "https://zarinpal.com/...",
      id: "authority_123"
    }
  },
  message: "Order created successfully"
}
```

**راه حل Frontend**:
```typescript
// در frontend، response را درست پردازش کنید:
const createOrder = async (orderData) => {
  try {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    
    console.log('Order creation response:', result); // Debug log
    
    // بررسی success flag
    if (result.success && result.data) {
      console.log('Order created:', result.data);
      
      // هدایت به صفحه پرداخت
      if (result.data.payment && result.data.payment.redirectUrl) {
        window.location.href = result.data.payment.redirectUrl;
      }
      
      return result.data; // Return the data object
    } else {
      throw new Error(result.message || 'Order creation failed');
    }
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// استفاده در component:
const handleCompleteOrder = async (orderData) => {
  try {
    const orderResponse = await createOrder(orderData);
    
    // بررسی order ID
    if (orderResponse.orderId) {
      console.log('Order ID:', orderResponse.orderId);
      // ادامه فرآیند...
    } else {
      throw new Error('شناسه سفارش در پاسخ دریافت نشد');
    }
  } catch (error) {
    console.error('Error in handleCompleteOrder:', error);
    throw error;
  }
};
```

## 🛠️ **تنظیمات مورد نیاز:**

### 1. **Appwrite Configuration (Frontend)**
```typescript
// appwrite.config.ts
export const appwriteConfig = {
  endpoint: 'https://app.arzansite.com/v1', // یا endpoint صحیح
  projectId: 'your-project-id',
  databaseId: 'your-database-id',
  collections: {
    notifications: 'notifications',
    orders: 'orders',
    // ...
  }
};
```

### 2. **Environment Variables (Frontend)**
```env
VITE_APPWRITE_ENDPOINT=https://app.arzansite.com/v1
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_COLLECTION_NOTIFICATIONS=notifications
```

### 3. **Error Handling (Frontend)**
```typescript
// error-handler.ts
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    switch (status) {
      case 400:
        return `خطا در درخواست: ${data.message}`;
      case 401:
        return 'لطفاً دوباره وارد شوید';
      case 403:
        return 'دسترسی غیرمجاز';
      case 404:
        return 'منبع مورد نظر یافت نشد';
      case 500:
        return 'خطای سرور. لطفاً بعداً تلاش کنید';
      default:
        return data.message || 'خطای ناشناخته';
    }
  } else if (error.request) {
    // Network error
    return 'خطا در اتصال به سرور';
  } else {
    // Other error
    return error.message || 'خطای ناشناخته';
  }
};
```

## 🔧 **تست و Debug:**

### 1. **بررسی Network Tab**
- در Developer Tools، Network tab را بررسی کنید
- درخواست‌های API را چک کنید
- Response headers و body را بررسی کنید

### 2. **بررسی Console Logs**
```typescript
// اضافه کردن logging
console.log('Request data:', orderData);
console.log('Response status:', response.status);
console.log('Response data:', result);
```

### 3. **بررسی Appwrite Console**
- در Appwrite Console، Realtime settings را بررسی کنید
- Collection permissions را چک کنید
- Project settings را بررسی کنید

## 📋 **چک‌لیست رفع مشکل:**

- [ ] Appwrite endpoint صحیح است
- [ ] Project ID صحیح است
- [ ] Database ID صحیح است
- [ ] Collection permissions درست است
- [ ] Frontend response handling درست است
- [ ] Error handling پیاده‌سازی شده
- [ ] WebSocket connection درست تنظیم شده
- [ ] Environment variables تنظیم شده

## 🚀 **نتیجه:**

با این تنظیمات، خطاهای Frontend برطرف خواهند شد و سیستم به درستی کار خواهد کرد.
