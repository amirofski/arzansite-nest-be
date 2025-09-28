# راهنمای رفع مشکل Google OAuth

## مشکل
خطای `Error 400: redirect_uri_mismatch` در Google OAuth

## علت
URI بازگشتی در Google Cloud Console با آنچه Appwrite استفاده می‌کند مطابقت ندارد.

## راه حل

### 1. تنظیم Google Cloud Console

#### Authorized redirect URIs:
```
https://arzansite-appwrite-c6990a-82-115-13-113.traefik.me/v1/account/sessions/oauth2/google
```

#### Authorized JavaScript origins:
```
https://arzansite-appwrite-c6990a-82-115-13-113.traefik.me
```

### 2. تنظیم Appwrite Console

1. وارد Appwrite Console شوید
2. پروژه `6898b35e003067cd7b43` را انتخاب کنید
3. `Auth` → `Providers` → `Google`
4. Google Client ID و Client Secret را وارد کنید
5. Google OAuth را فعال کنید

### 3. تست OAuth

#### درخواست شروع OAuth:
```bash
curl -X POST "https://nest.arzansite.com/api/auth/oauth/start" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "successUrl": "https://arzansite.com/dashboard?oauth_success=true",
    "failureUrl": "https://arzansite.com/auth/login?error=oauth_failed"
  }'
```

#### پاسخ مورد انتظار:
```json
{
  "redirectUrl": "https://arzansite-appwrite-c6990a-82-115-13-113.traefik.me/v1/account/sessions/oauth2/google?project=6898b35e003067cd7b43&success=https%3A%2F%2Farzansite.com%2Fdashboard%3Foauth_success%3Dtrue&failure=https%3A%2F%2Farzansite.com%2Fauth%2Flogin%3Ferror%3Doauth_failed",
  "provider": "google",
  "projectId": "6898b35e003067cd7b43",
  "message": "Redirecting to google for authentication..."
}
```

### 4. بررسی URL های تولید شده

URL تولید شده توسط Appwrite:
```
https://arzansite-appwrite-c6990a-82-115-13-113.traefik.me/v1/account/sessions/oauth2/google?project=6898b35e003067cd7b43&success=...&failure=...
```

این URL باید دقیقاً در Google Cloud Console ثبت شده باشد.

### 5. نکات مهم

1. **HTTPS ضروری است**: Google فقط HTTPS را می‌پذیرد
2. **دقت در URL**: حتی یک کاراکتر اضافی یا کم باعث خطا می‌شود
3. **Domain verification**: مطمئن شوید که domain شما در Google تایید شده است

### 6. عیب‌یابی

اگر همچنان مشکل دارید:

1. **بررسی logs**:
   ```bash
   # در سرور NestJS
   console.log('OAuth redirect URL:', redirectUrl);
   ```

2. **تست مستقیم URL**:
   - URL تولید شده را مستقیماً در مرورگر باز کنید
   - ببینید آیا به Google redirect می‌شود یا نه

3. **بررسی Appwrite logs**:
   - در Appwrite Console → Functions → Logs
   - خطاهای مربوط به OAuth را بررسی کنید

## نتیجه

پس از اعمال این تنظیمات، Google OAuth باید بدون مشکل کار کند و کاربران بتوانند با حساب Google خود وارد شوند.
