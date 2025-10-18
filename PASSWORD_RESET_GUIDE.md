# راهنمای کامل ریست پسورد - Frontend Integration

## مشکل فعلی
ایمیل ریست پسورد ارسال نمی‌شود چون **SMTP تنظیم نشده**. سیستم از `email-outbox.service` استفاده می‌کند که ایمیل‌ها را در صف قرار می‌دهد و بعداً پردازش می‌کند.

## راه حل‌ها

### 1. تنظیم SMTP در `.env`
```env
# SMTP Configuration (Required)
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM=your-email@domain.com
SMTP_SECURITY=starttls

# Frontend URL (Required)
FRONTEND_URL=https://arzansite.com

# Appwrite Collections (Required)
APPWRITE_COLLECTION_EMAIL_OUTBOX=email_outbox
```

### 2. ایجاد کالکشن email_outbox در Appwrite
```javascript
// Schema for email_outbox collection
{
  "type": "string",           // email type (password_reset, welcome, etc.)
  "entity_id": "string",      // user email or ID
  "payload": "string",        // JSON string of email data
  "status": "string",         // pending, sent, failed
  "attempts": "integer",      // retry count
  "error_message": "string",  // error details
  "created_at": "string",     // ISO timestamp
  "sent_at": "string"         // ISO timestamp when sent
}
```

## API Endpoints

### 1. درخواست ریست پسورد
```http
POST /api/auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent.",
    "emailSent": true
  }
}
```

### 2. تکمیل ریست پسورد
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "email": "user@example.com",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Frontend Implementation

### 1. صفحه درخواست ریست پسورد
```typescript
// components/PasswordResetRequest.tsx
import { useState } from 'react';

export default function PasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('اگر حساب کاربری با این ایمیل وجود داشته باشد، لینک ریست پسورد ارسال شده است.');
      } else {
        setMessage('خطا در ارسال ایمیل. لطفاً دوباره تلاش کنید.');
      }
    } catch (error) {
      setMessage('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">ریست پسورد</h2>
      
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          ایمیل
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'در حال ارسال...' : 'ارسال لینک ریست'}
      </button>
      
      {message && (
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      )}
    </form>
  );
}
```

### 2. صفحه تکمیل ریست پسورد
```typescript
// components/PasswordResetForm.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PasswordResetForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setMessage('لینک ریست پسورد نامعتبر است.');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage('رمزهای عبور مطابقت ندارند.');
      return;
    }
    
    if (newPassword.length < 8) {
      setMessage('رمز عبور باید حداقل 8 کاراکتر باشد.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('رمز عبور با موفقیت تغییر کرد!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage(data.message || 'خطا در تغییر رمز عبور.');
      }
    } catch (error) {
      setMessage('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">خطا</h2>
        <p className="text-red-600">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">تغییر رمز عبور</h2>
      
      <div className="mb-4">
        <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
          رمز عبور جدید
        </label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
          تأیید رمز عبور
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'در حال تغییر...' : 'تغییر رمز عبور'}
      </button>
      
      {message && (
        <p className={`mt-4 text-sm ${message.includes('موفقیت') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </form>
  );
}
```

### 3. Routing
```typescript
// App.tsx or router configuration
import { Routes, Route } from 'react-router-dom';
import PasswordResetRequest from './components/PasswordResetRequest';
import PasswordResetForm from './components/PasswordResetForm';

function App() {
  return (
    <Routes>
      <Route path="/forgot-password" element={<PasswordResetRequest />} />
      <Route path="/reset-password" element={<PasswordResetForm />} />
      {/* other routes */}
    </Routes>
  );
}
```

## تست و Debug

### 1. بررسی وضعیت SMTP
```bash
# در لاگ‌های سرور دنبال این پیام‌ها بگردید:
# ✅ SMTP connection verified successfully
# ❌ SMTP is disabled. Cannot send email.
```

### 2. بررسی صف ایمیل
```javascript
// برای تست، می‌توانید مستقیماً ایمیل ارسال کنید:
const response = await fetch('/api/email/send-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    to: 'test@example.com',
    template: 'password-reset',
    data: {
      resetUrl: 'https://arzansite.com/reset-password?token=test123&email=test@example.com',
      userName: 'Test User'
    }
  })
});
```

### 3. بررسی کالکشن email_outbox
```javascript
// در Appwrite Console، کالکشن email_outbox را بررسی کنید:
// - آیا رکوردهای جدید ایجاد می‌شوند؟
// - وضعیت status چیست؟ (pending, sent, failed)
// - آیا error_message وجود دارد؟
```

## نکات مهم

1. **امنیت**: لینک ریست پسورد 24 ساعت اعتبار دارد
2. **Rate Limiting**: درخواست‌های مکرر محدود می‌شوند
3. **SMTP**: حتماً SMTP را تنظیم کنید، در غیر این صورت ایمیل ارسال نمی‌شود
4. **Frontend URL**: `FRONTEND_URL` باید صحیح باشد تا لینک‌ها درست کار کنند
5. **HTTPS**: در production از HTTPS استفاده کنید

## عیب‌یابی

### مشکل: ایمیل ارسال نمی‌شود
- ✅ SMTP تنظیمات را بررسی کنید
- ✅ کالکشن email_outbox را بررسی کنید
- ✅ لاگ‌های سرور را بررسی کنید

### مشکل: لینک کار نمی‌کند
- ✅ FRONTEND_URL را بررسی کنید
- ✅ token و email در URL موجود باشد
- ✅ token منقضی نشده باشد (24 ساعت)

### مشکل: رمز عبور تغییر نمی‌کند
- ✅ token معتبر باشد
- ✅ رمز عبور حداقل 8 کاراکتر باشد
- ✅ کاربر با ایمیل موجود باشد
