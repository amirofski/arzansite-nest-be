# 📧 Email API Testing Guide

## Base URL: `https://nest.arzansite.com/api`

### 🔧 Environment Variables for Postman

Set these in your Postman environment:
```
base_url: https://nest.arzansite.com/api
access_token: (from login)
admin_access_token: (admin user login)
```

---

## 🚀 Email Service Endpoints

### 1. **Check Email Service Status**
```http
GET {{base_url}}/email/status
Authorization: Bearer {{admin_access_token}}
```

**Expected Response:**
```json
{
  "service": "custom_smtp",
  "status": "active",
  "host": "37-58-50-28.cprapid.com",
  "port": 465,
  "secure": true
}
```

### 2. **Send Test Email**
```http
POST {{base_url}}/email/test
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email from ArzanSite",
  "html": "<h1>Hello!</h1><p>This is a test email from ArzanSite.</p>",
  "text": "Hello! This is a test email from ArzanSite."
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

### 3. **Send Welcome Email Template**
```http
POST {{base_url}}/email/template
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "to": "newuser@example.com",
  "template": "welcome",
  "data": {
    "userName": "John Doe"
  }
}
```

### 4. **Send Email Verification Template**
```http
POST {{base_url}}/email/template
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "to": "user@example.com",
  "template": "verification",
  "data": {
    "verificationUrl": "https://arzansite.com/verify-email?token=abc123",
    "userName": "John"
  }
}
```

### 5. **Send Password Reset Template**
```http
POST {{base_url}}/email/template
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "to": "user@example.com",
  "template": "password-reset",
  "data": {
    "resetUrl": "https://arzansite.com/reset-password?token=xyz789",
    "userName": "John"
  }
}
```

### 6. **Send Order Notification Template**
```http
POST {{base_url}}/email/template
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "to": "customer@example.com",
  "template": "order-notification",
  "data": {
    "orderData": {
      "id": "order-123",
      "title": "Website Design Project",
      "price": 1500,
      "status": "in_progress",
      "description": "Modern responsive website"
    }
  }
}
```

### 7. **Send Payment Notification Template**
```http
POST {{base_url}}/email/template
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json

{
  "to": "customer@example.com",
  "template": "payment-notification",
  "data": {
    "paymentData": {
      "id": "payment-456",
      "amount": 1500,
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z",
      "order_title": "Website Design Project"
    }
  }
}
```

### 8. **Get Email Logs**
```http
GET {{base_url}}/email/logs?limit=10&offset=0&success=true&template_type=welcome
Authorization: Bearer {{admin_access_token}}
```

---

## 🔐 Authentication Email Endpoints

### 9. **Forgot Password**
```http
POST {{base_url}}/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Expected Response:**
```json
{
  "message": "Password reset email sent. Please check your email."
}
```

### 10. **Send Welcome Email to User**
```http
POST {{base_url}}/auth/welcome-email/{{user_id}}
Authorization: Bearer {{admin_access_token}}
```

**Expected Response:**
```json
{
  "message": "Welcome email sent successfully."
}
```

---

## 📋 Complete Testing Workflow

### **Step 1: Setup**
1. Login as admin user to get `admin_access_token`
2. Set environment variables in Postman

### **Step 2: Test Email Service**
1. Check email service status
2. Send test email
3. Verify email delivery

### **Step 3: Test Email Templates**
1. Send welcome email template
2. Send verification email template
3. Send password reset template
4. Send order notification template
5. Send payment notification template

### **Step 4: Test Authentication Integration**
1. Register new user (triggers verification email)
2. Request password reset
3. Send welcome email manually

### **Step 5: Monitor Email Logs**
1. Check email logs for delivery status
2. Verify email tracking in database

---

## 🎨 Email Templates Preview

### **Welcome Email**
- Beautiful gradient header
- Personalized greeting
- Feature highlights
- Call-to-action button
- Contact information

### **Email Verification**
- Clear verification instructions
- Secure verification link
- 24-hour expiration notice
- Fallback text link

### **Password Reset**
- Security-focused design
- 1-hour expiration notice
- Clear reset instructions
- Security warnings

### **Order Notifications**
- Order status updates
- Order details summary
- Direct link to order
- Professional branding

### **Payment Notifications**
- Payment status updates
- Transaction details
- Payment history link
- Secure transaction info

---

## 🔧 Troubleshooting

### **Common Issues:**

1. **SMTP Connection Failed**
   - Check SMTP credentials
   - Verify port and security settings
   - Test SMTP server connectivity

2. **Email Not Delivered**
   - Check spam folder
   - Verify recipient email address
   - Check email logs for errors

3. **Template Not Found**
   - Verify template name spelling
   - Check required data fields
   - Ensure admin permissions

4. **Authentication Required**
   - Login as admin user
   - Check JWT token validity
   - Verify user role permissions

### **Debug Commands:**

```bash
# Check SMTP connection
telnet 37-58-50-28.cprapid.com 465

# Test email sending
curl -X POST https://nest.arzansite.com/api/email/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "html": "<h1>Test</h1>"
  }'
```

---

## 📊 Email Analytics

The email service automatically logs:
- ✅ Successful email deliveries
- ❌ Failed email attempts
- 📊 Template usage statistics
- 🕒 Delivery timestamps
- 👤 User associations

All email logs are stored in the `email_logs` table for monitoring and analytics.

---

## 🚀 Production Deployment

### **Environment Variables:**
```bash
SMTP_HOST=37-58-50-28.cprapid.com
SMTP_PORT=465
SMTP_USER=info@arzansite.com
SMTP_PASS=Cya6enCC5rPcs5G
SMTP_FROM=info@arzansite.com
SMTP_SENDER_NAME=ArzanSite
SMTP_SECURITY=ssl
```

### **Docker Deployment:**
```bash
docker-compose up -d
```

### **Health Check:**
```bash
curl https://nest.arzansite.com/api/email/status
```

Your custom SMTP email service is now fully integrated and ready for production use! 🎉
