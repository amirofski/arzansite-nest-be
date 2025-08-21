# 🔧 File Upload Configuration Guide

## Overview
This guide covers all configuration layers needed to ensure your file upload system can handle 30MB files without errors.

## 🚨 **Common Upload Errors & Solutions**

### **Error: "413 Request Entity Too Large"**
- **Cause**: Nginx/Proxy body size limit
- **Solution**: Increase `client_max_body_size` in Nginx

### **Error: "Payload too large"**
- **Cause**: NestJS body parser limit
- **Solution**: Increase body parser limits in main.ts

### **Error: "File too large"**
- **Cause**: Multer file size limit
- **Solution**: Update Multer configuration

---

## 🏗️ **Layer-by-Layer Configuration**

### **Layer 1: Nginx/Reverse Proxy Configuration**

#### **Global Nginx Configuration** (`/etc/nginx/nginx.conf`)
```nginx
http {
    # Global client body size limit
    client_max_body_size 30M;
    
    # Increase timeouts for large uploads
    client_body_timeout 120s;
    client_header_timeout 120s;
    
    # Other settings...
}
```

#### **Site-Specific Configuration** (`/etc/nginx/sites-available/arzansite`)
```nginx
server {
    listen 80;
    server_name nest.arzansite.com;
    
    # API endpoints with file upload support
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # File upload specific settings
        client_max_body_size 30M;
        client_body_timeout 120s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        
        # Handle large file uploads
        proxy_request_buffering off;
        proxy_buffering off;
    }
    
    # Specific optimization for uploads endpoint
    location /api/uploads {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Maximum file upload settings
        client_max_body_size 30M;
        client_body_timeout 300s;  # 5 minutes for very large files
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        
        # Disable buffering for large uploads
        proxy_request_buffering off;
        proxy_buffering off;
        
        # Increase buffer sizes
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
```

#### **Apply Nginx Changes**
```bash
# Test configuration
sudo nginx -t

# Reload Nginx (graceful restart)
sudo systemctl reload nginx

# Or restart completely
sudo systemctl restart nginx
```

---

### **Layer 2: NestJS Application Configuration**

#### **Updated main.ts** ✅ **COMPLETED**
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Increase body parser limits for file uploads
  app.use(bodyParser.json({ limit: '30mb' }));
  app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }));
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });
  
  // Global pipes and interceptors...
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📁 File upload limit: 30MB`);
  console.log(`🔐 API prefix: /api`);
}

bootstrap();
```

#### **Updated Uploads Module** ✅ **COMPLETED**
```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 30 * 1024 * 1024, // 30MB limit
        files: 10, // Max 10 files per request
        fieldSize: 1024 * 1024, // 1MB for form fields
      },
      fileFilter: (req, file, cb) => {
        // Allow specific file types
        const allowedMimes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'application/zip', 'application/x-rar-compressed'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
      },
    }),
    AppwriteModule,
  ],
  // ... rest of module config
})
export class UploadsModule {}
```

---

### **Layer 3: Environment Variables**

#### **Add to .env file**
```env
# File Upload Configuration
MAX_FILE_SIZE=31457280
UPLOAD_TIMEOUT=120000
MAX_FILES_PER_REQUEST=10

# Nginx/Proxy Settings
NGINX_CLIENT_MAX_BODY_SIZE=30M
NGINX_UPLOAD_TIMEOUT=120s

# Appwrite Storage Buckets
APPWRITE_BUCKET_DOCUMENTS=689ee991001e4f3cb8e5
APPWRITE_BUCKET_DESIGNS=689ee97c0039e19e0e2f
APPWRITE_BUCKET_AVATARS=689ee98a0019563fff62
```

---

### **Layer 4: Docker Configuration (if applicable)**

#### **docker-compose.yml**
```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    environment:
      - NGINX_CLIENT_MAX_BODY_SIZE=30M
    command: >
      sh -c "echo 'client_max_body_size 30M;' >> /etc/nginx/nginx.conf &&
             nginx -g 'daemon off;'"
  
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MAX_FILE_SIZE=31457280
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: unless-stopped
```

---

## 🧪 **Testing Your Configuration**

### **1. Test File Upload Endpoint**
```bash
# Test with a large file (e.g., 25MB)
curl -X POST http://nest.arzansite.com/api/uploads \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@large-file.pdf" \
  -F "fileType=document"
```

### **2. Check Nginx Configuration**
```bash
# Test Nginx config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### **3. Monitor Application Logs**
```bash
# View application logs
tail -f logs/app.log

# Check for upload-related errors
grep -i "upload\|file\|size" logs/app.log
```

---

## 🔍 **Troubleshooting Common Issues**

### **Issue 1: Still Getting 413 Errors**
```bash
# Check if Nginx is actually using your config
sudo nginx -T | grep client_max_body_size

# Restart Nginx completely
sudo systemctl stop nginx
sudo systemctl start nginx
```

### **Issue 2: Application Timeouts**
```bash
# Check if your app is receiving the request
tail -f logs/app.log

# Verify the request reaches your NestJS app
netstat -tlnp | grep :3000
```

### **Issue 3: File Size Validation Errors**
```bash
# Check Multer configuration
grep -r "fileSize" src/uploads/

# Verify environment variables
echo $MAX_FILE_SIZE
```

---

## 📊 **Performance Optimization Tips**

### **1. Nginx Optimizations**
```nginx
# Enable gzip compression for text files
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Increase worker connections
worker_connections 1024;

# Enable keepalive
keepalive_timeout 65;
keepalive_requests 100;
```

### **2. Application Optimizations**
```typescript
// Use streaming for very large files
// Implement chunked uploads for files > 100MB
// Add progress tracking for better UX
```

---

## ✅ **Configuration Checklist**

- [ ] **Nginx**: `client_max_body_size 30M` set
- [ ] **Nginx**: Timeouts increased to 120s+
- [ ] **NestJS**: Body parser limits set to 30mb
- [ ] **Multer**: File size limit set to 30MB
- [ ] **Environment**: MAX_FILE_SIZE variable set
- [ ] **Appwrite**: Storage buckets configured
- [ ] **CORS**: Proper origins configured
- [ ] **Testing**: Large file upload tested successfully

---

## 🚀 **Next Steps**

1. **Apply Nginx Configuration**: Update your reverse proxy settings
2. **Restart Services**: Reload Nginx and restart your NestJS app
3. **Test Uploads**: Try uploading files of various sizes
4. **Monitor Performance**: Watch for any timeout or memory issues
5. **Scale if Needed**: Consider implementing chunked uploads for very large files

---

**Status**: ✅ **BACKEND CONFIGURATION COMPLETED**
**Next**: Configure Nginx/Proxy settings
**Last Updated**: 2025-08-17
**Version**: 1.0.0
