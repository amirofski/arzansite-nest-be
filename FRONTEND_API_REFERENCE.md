# Frontend API Reference

## 🎯 **Wizard & Order Creation (Single Call Flow)**

### Complete Wizard Order
```http
POST /api/wizard/complete-order
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "sessionId": "user_session_id",
  "order": {
    "title": "My Business Website",
    "description": "Professional business website with modern design",
    "priceTomans": 1500000,
    "comments": "Please include SEO optimization",
    "siteType": "business"
  },
  "designSnapshot": {
    "websiteFramework": {
      "designMethod": "dynamic",
      "dynamicDesign": {
        "pages": [
          {
            "id": "page1",
            "name": "Home",
            "sections": [
              {
                "id": "hero",
                "sectionType": "hero",
                "layoutId": "hero-layout-1",
                "order": 1,
                "customData": {
                  "title": "Welcome to Our Business",
                  "subtitle": "Professional solutions for your needs"
                }
              }
            ],
            "canvasDimensions": {
              "width": 1920,
              "height": 1080
            }
          }
        ],
        "currentPageId": "page1"
      }
    },
    "branding": {
      "primaryColor": "#2563eb",
      "customColors": ["#1e40af", "#3b82f6"],
      "fontFamily": "Inter"
    },
    "additionalServices": {
      "seoOptimization": true,
      "socialMediaIntegration": false,
      "analyticsSetup": true,
      "backupService": true,
      "maintenancePlan": false,
      "rushDelivery": false
    },
    "domains": {
      "primaryDomain": "mybusiness",
      "additionalDomains": [
        {
          "domain": "mybusiness",
          "extension": ".ir",
          "price": 500000,
          "available": true
        }
      ]
    },
    "pricing": {
      "basePrice": 800000,
      "pagesCost": 200000,
      "sectionsCost": 100000,
      "additionalServicesCost": 300000,
      "domainCost": 500000,
      "totalPrice": 1900000,
      "monthlyPrice": 190000,
      "annualPrice": 1900000,
      "annualDiscount": 0.15
    },
    "paymentOptions": {
      "paymentCycle": "monthly",
      "autoRenewal": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_id_here",
    "status": "pending",
    "payment_status": "pending",
    "preview_url": "https://preview.arzansite.com/orders/order_id/preview",
    "invoice_id": "invoice_id_here",
    "amount": 19000000,
    "title": "My Business Website",
    "description": "Professional business website with modern design",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "Order completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 📋 **Orders Management**

### Get User Orders
```http
GET /api/orders/enhanced?status=pending&page=1&limit=20
Authorization: Bearer <jwt_token>
```

### Get Single Order
```http
GET /api/orders/enhanced/{orderId}
Authorization: Bearer <jwt_token>
```

## 💰 **Payment & Invoices**

### Request ZarinPal Payment
```http
POST /api/payments/enhanced/zarinpal/request
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "orderId": "order_id_here",
  "amount": 19000000,
  "description": "Payment for My Business Website",
  "callbackUrl": "https://yoursite.com/payment/callback",
  "userData": {
    "email": "user@example.com",
    "mobile": "+989123456789",
    "name": "John Doe"
  }
}
```

## 🏦 **Wallet Management**

### Get Wallet Balance
```http
GET /api/wallets/enhanced/balance
Authorization: Bearer <jwt_token>
```

### Process Wallet Payment for Order
```http
POST /api/wallets/enhanced/orders/{orderId}/pay
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 19000000,
  "description": "Payment for My Business Website"
}
```

## 🔐 **Authentication**

### User Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### Create Session
```http
POST /api/auth/create-session
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

## 📝 **Important Notes**

### Price Units
- **Frontend sends**: Prices in Tomans (e.g., 1500000 Tomans)
- **Backend stores**: Prices in Rials (e.g., 15000000 Rials)
- **Conversion**: 1 Toman = 10 Rials

### Single Call Flow
The `/api/wizard/complete-order` endpoint now:
1. Accepts nested `designSnapshot` data
2. Converts Tomans to Rials automatically
3. Creates order with status='pending'
4. Stores design data as JSON in `design_snapshot` field
5. Creates invoice automatically
6. Sends confirmation emails
7. Returns complete order data

### Frontend Changes Needed
1. Rename `wizardData` to `designSnapshot` when calling the endpoint
2. Send order as `{ title, description, priceTomans, comments, siteType }`
3. Keep single request - no additional POSTs needed
4. Handle the response to show order confirmation and redirect to dashboard
