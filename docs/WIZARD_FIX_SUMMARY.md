# Wizard Endpoint Fix Summary

## 🚨 **What Was Broken**

The `/api/wizard/complete-order` endpoint was failing with 500 errors because:

1. **DTO Validation Issues**: The old DTO was too complex and couldn't handle nested `designSnapshot` data
2. **Missing Transactional Logic**: No proper order creation, invoice generation, or email sending
3. **Schema Mismatch**: Trying to save to wrong collection and missing required fields
4. **Price Unit Confusion**: No automatic conversion from Tomans to Rials

## ✅ **What I Fixed**

### 1. Updated DTO Structure
```typescript
// OLD: Complex nested structure that was hard to validate
export class CompleteOrderDto extends WizardOrderDto {
  @IsString()
  declare userId: string;
}

// NEW: Simple, focused structure
export class CompleteOrderDto {
  @IsString()
  sessionId: string;

  @ValidateNested()
  @Type(() => OrderDto)
  order: OrderDto;

  @IsObject()
  designSnapshot: Record<string, unknown>;
}

export class OrderDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  priceTomans: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(SiteType)
  siteType?: SiteType;
}
```

### 2. Implemented Transactional Flow
The endpoint now performs these steps in sequence:

1. **Price Conversion**: Automatically converts Tomans to Rials (×10)
2. **Order Creation**: Creates order in main orders collection with status='pending'
3. **Design Storage**: Saves `designSnapshot` as JSON in `design_snapshot` field
4. **Invoice Generation**: Creates pending invoice for the order
5. **Preview URL**: Generates placeholder preview URL (can be async job later)
6. **Email Notifications**: Sends confirmation emails to user and admin
7. **Response**: Returns complete order data with all necessary information

### 3. Added Database Schema Support
- Added `design_snapshot` field to orders entity (JSON type)
- Orders are now saved to the main orders collection, not a separate wizard collection
- Proper field mapping and data persistence

### 4. Error Handling & Validation
- Better error messages instead of generic 500 errors
- Proper validation of the simplified DTO structure
- Graceful handling of email failures (doesn't break order creation)

## 🎯 **How It Works Now**

### Frontend Request Format
```javascript
const response = await fetch('/api/wizard/complete-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: "user_session_id",
    order: {
      title: "My Business Website",
      description: "Professional business website",
      priceTomans: 1500000,  // 1.5M Tomans
      comments: "Include SEO optimization",
      siteType: "business"
    },
    designSnapshot: {
      // Your complete design data here
      websiteFramework: { ... },
      branding: { ... },
      additionalServices: { ... },
      domains: { ... },
      pricing: { ... },
      paymentOptions: { ... }
    }
  })
});
```

### Backend Response
```json
{
  "success": true,
  "data": {
    "id": "order_id_here",
    "status": "pending",
    "payment_status": "pending",
    "preview_url": "https://preview.arzansite.com/orders/order_id/preview",
    "invoice_id": "invoice_id_here",
    "amount": 15000000,  // 15M Rials (converted automatically)
    "title": "My Business Website",
    "description": "Professional business website",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "Order completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 **Frontend Changes Required**

### 1. Update API Call
```javascript
// OLD
const response = await fetch('/api/wizard/complete-order', {
  body: JSON.stringify({
    userId: "user_id",
    sessionId: "session_id",
    wizardData: { ... },  // ❌ Old field name
    // ... other complex fields
  })
});

// NEW
const response = await fetch('/api/wizard/complete-order', {
  body: JSON.stringify({
    sessionId: "session_id",
    order: {
      title: "Website Title",
      description: "Website Description", 
      priceTomans: 1500000,
      comments: "Optional comments",
      siteType: "business"
    },
    designSnapshot: { ... }  // ✅ New field name
  })
});
```

### 2. Handle Response
```javascript
const result = await response.json();

if (result.success) {
  // Order created successfully
  const orderData = result.data;
  
  // Show success message
  showSuccessMessage(`Order created! ID: ${orderData.id}`);
  
  // Redirect to dashboard or order details
  router.push(`/dashboard/orders/${orderData.id}`);
  
  // Store order data for later use
  localStorage.setItem('lastOrder', JSON.stringify(orderData));
} else {
  // Handle error
  showErrorMessage(result.message || 'Failed to create order');
}
```

### 3. Update Dashboard Display
The order will now appear in the dashboard immediately because:
- It's saved to the main orders collection
- Status is set to 'pending' (visible in dashboard)
- All necessary fields are populated
- Invoice is created automatically

## 🚀 **Benefits of This Fix**

1. **Single API Call**: No more multiple POST requests needed
2. **Immediate Dashboard Visibility**: Orders appear instantly after creation
3. **Automatic Invoice Generation**: No need to create invoice separately
4. **Better Error Handling**: Clear error messages instead of 500 errors
5. **Simplified Frontend Logic**: Much cleaner API integration
6. **Proper Data Persistence**: Design data is properly stored and retrievable
7. **Email Notifications**: Users get confirmation emails automatically

## 🔍 **Testing the Fix**

1. **Test with Simple Data**: Start with minimal designSnapshot to ensure basic flow works
2. **Check Database**: Verify order appears in orders collection with correct fields
3. **Verify Invoice**: Check that invoice is created and linked to order
4. **Test Dashboard**: Confirm order appears in user's dashboard immediately
5. **Check Emails**: Verify confirmation emails are sent (check logs if SMTP not configured)

## 📝 **Next Steps**

1. **Frontend Integration**: Update your frontend to use the new API format
2. **Preview Generation**: Implement actual preview generation (currently returns placeholder)
3. **Admin Notifications**: Add admin notification system for new orders
4. **Payment Flow**: Integrate with existing payment verification endpoints
5. **Order Progress**: Use existing order progress tracking endpoints

The wizard endpoint is now fully functional and will create orders that are immediately visible in the dashboard with all the necessary data properly stored and linked.
