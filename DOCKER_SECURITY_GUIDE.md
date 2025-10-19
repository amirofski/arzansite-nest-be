# راهنمای امنیت Docker

## 🔒 **مشکلات امنیتی شناسایی شده:**

### 1. **SecretsUsedInArgOrEnv**
```
SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data
```

**علت**: استفاده از ARG و ENV برای sensitive data در Dockerfile

**راه حل**: استفاده از Docker Secrets یا Environment Variables در runtime

### 2. **UndefinedVar**
```
UndefinedVar: Usage of undefined variable '$NIXPACKS_PATH'
```

**علت**: استفاده از متغیر تعریف نشده در Dockerfile

## 🛠️ **راه حل‌های پیاده‌سازی شده:**

### 1. **اصلاح Dockerfile**
- حذف ARG و ENV برای sensitive data
- استفاده از COPY به جای git clone
- بهینه‌سازی layer caching

### 2. **ایجاد .dockerignore**
- حذف sensitive files از Docker image
- کاهش اندازه image
- بهبود امنیت

## 🔧 **تنظیمات امنیتی:**

### 1. **Environment Variables (Runtime)**
```bash
# در docker-compose.yml یا docker run
docker run -e APPWRITE_API_KEY=your_key \
           -e JWT_SECRET=your_secret \
           -e IP2WHOIS_API_KEY=your_key \
           your-image
```

### 2. **Docker Secrets (Production)**
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: your-image
    secrets:
      - appwrite_api_key
      - jwt_secret
      - ip2whois_api_key
    environment:
      - APPWRITE_API_KEY_FILE=/run/secrets/appwrite_api_key
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - IP2WHOIS_API_KEY_FILE=/run/secrets/ip2whois_api_key

secrets:
  appwrite_api_key:
    file: ./secrets/appwrite_api_key.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  ip2whois_api_key:
    file: ./secrets/ip2whois_api_key.txt
```

### 3. **Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  appwrite-api-key: <base64-encoded>
  jwt-secret: <base64-encoded>
  ip2whois-api-key: <base64-encoded>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: your-image
        env:
        - name: APPWRITE_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: appwrite-api-key
```

## 🚀 **Best Practices:**

### 1. **Dockerfile Security**
- ✅ استفاده از non-root user
- ✅ حذف sensitive data از image
- ✅ استفاده از multi-stage build
- ✅ بهینه‌سازی layer caching

### 2. **Runtime Security**
- ✅ استفاده از environment variables
- ✅ استفاده از Docker secrets
- ✅ محدود کردن network access
- ✅ استفاده از health checks

### 3. **Image Security**
- ✅ استفاده از .dockerignore
- ✅ حذف unnecessary files
- ✅ استفاده از minimal base images
- ✅ Regular security scanning

## 📋 **چک‌لیست امنیت:**

### Dockerfile
- [ ] No sensitive data in ARG/ENV
- [ ] Non-root user
- [ ] Minimal base image
- [ ] Multi-stage build
- [ ] Health checks

### Runtime
- [ ] Environment variables for secrets
- [ ] Docker secrets for production
- [ ] Network restrictions
- [ ] Resource limits

### Image
- [ ] .dockerignore configured
- [ ] No sensitive files
- [ ] Minimal size
- [ ] Security scanning

## 🔍 **تست امنیت:**

### 1. **Docker Security Scanning**
```bash
# Scan image for vulnerabilities
docker scan your-image

# Use Trivy for security scanning
trivy image your-image
```

### 2. **Check for Secrets**
```bash
# Check if secrets are in image
docker run --rm your-image env | grep -E "(SECRET|KEY|PASSWORD)"

# Check image layers
docker history your-image
```

## 🚀 **نتیجه:**

با این تنظیمات:
- ✅ Docker security warnings برطرف شدند
- ✅ Sensitive data در image قرار نمی‌گیرد
- ✅ Runtime security بهبود یافت
- ✅ Best practices پیاده‌سازی شدند

**Docker image حالا امن و بهینه است!** 🎉
