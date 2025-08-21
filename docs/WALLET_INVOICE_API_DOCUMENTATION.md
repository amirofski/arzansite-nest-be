# Wallet & Invoice Management System - API Documentation

## Overview
This document provides comprehensive API documentation for the Wallet & Invoice Management System implemented in ArzanSite. All endpoints are documented with Swagger/OpenAPI and include proper authentication, validation, and error handling.

## 🔐 Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## 📚 Swagger Documentation
Access the interactive API documentation at: `/api/docs`

## 💰 Wallet Management Endpoints

### User Wallet Operations

#### GET `/api/wallets/me`
- **Description**: Get authenticated user's wallet information
- **Authentication**: Required (JWT)
- **Response**: Wallet details including balance, creation date, and last update

#### GET `/api/wallets/me/balance`
- **Description**: Get current wallet balance
- **Authentication**: Required (JWT)
- **Response**: Current balance amount

#### GET `/api/wallets/balance`
- **Description**: Alternative endpoint to get wallet balance
- **Authentication**: Required (JWT)
- **Response**: Current balance amount

#### GET `/api/wallets/me/transactions`
- **Description**: Get paginated list of wallet transactions
- **Authentication**: Required (JWT)
- **Query Parameters**:
  - `limit` (optional): Maximum transactions to return (default: 50)
  - `offset` (optional): Number of transactions to skip (default: 0)
- **Response**: Array of transaction objects

#### POST `/api/wallets/me/transactions`
- **Description**: Create a new wallet transaction
- **Authentication**: Required (JWT)
- **Body**: `CreateTransactionDto`
- **Response**: Created transaction details

#### POST `/api/wallets/me/deposit`
- **Description**: Request wallet deposit through payment gateway
- **Authentication**: Required (JWT)
- **Body**: 
  ```json
  {
    "amount": 1000000,
    "description": "Wallet top-up"
  }
  ```
- **Validation**: Minimum amount: 1,000,000 Rials
- **Response**: Payment gateway redirect URL and order details

#### POST `/api/wallets/me/deposit/verify`
- **Description**: Verify completed payment and credit wallet
- **Authentication**: Required (JWT)
- **Body**:
  ```json
  {
    "orderId": "deposit_user123_1701436800000_1000000",
    "authority": "123456789"
  }
  ```
- **Response**: Success confirmation with new balance

#### POST `/api/wallets/me/topup`
- **Description**: Top up wallet using verified RefId
- **Authentication**: Required (JWT)
- **Body**:
  ```json
  {
    "amount": 1000000,
    "refId": "PAY_REF_123456"
  }
  ```
- **Validation**: RefId must be unique and verified
- **Response**: Top-up confirmation with transaction ID and new balance

### Admin Wallet Operations

#### GET `/api/wallets/:userId`
- **Description**: Get any user's wallet (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Parameters**: `userId` - Target user ID
- **Response**: User's wallet information

#### GET `/api/wallets/:userId/transactions`
- **Description**: Get any user's transactions (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Parameters**: `userId` - Target user ID
- **Query Parameters**: `limit`, `offset`
- **Response**: Array of user's transactions

#### POST `/api/wallets/:userId/credit`
- **Description**: Credit user's wallet (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Parameters**: `userId` - Target user ID
- **Body**: Amount and optional description
- **Response**: Credit confirmation

#### POST `/api/wallets/:userId/debit`
- **Description**: Debit user's wallet (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Parameters**: `userId` - Target user ID
- **Body**: Amount and optional description
- **Validation**: Sufficient balance required
- **Response**: Debit confirmation

## 📄 Invoice Management Endpoints

### User Invoice Operations

#### POST `/api/invoices`
- **Description**: Create a new invoice for an order
- **Authentication**: Required (JWT)
- **Body**: `CreateInvoiceDto`
  ```json
  {
    "orderId": "order_123456",
    "amount": 5000000,
    "dueDate": "2024-12-31T23:59:59.000Z",
    "description": "Website design services"
  }
  ```
- **Response**: Created invoice with pending status
- **Email**: Invoice creation notification sent

#### GET `/api/invoices`
- **Description**: Get user's invoices with pagination
- **Authentication**: Required (JWT)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 20): Items per page
- **Response**: Array of user's invoices

#### GET `/api/invoices/:id`
- **Description**: Get specific invoice details
- **Authentication**: Required (JWT)
- **Parameters**: `id` - Invoice ID
- **Response**: Invoice details
- **Access Control**: Users can only access their own invoices

#### POST `/api/invoices/:id/pay`
- **Description**: Pay invoice from wallet balance
- **Authentication**: Required (JWT)
- **Parameters**: `id` - Invoice ID
- **Body**: `PayInvoiceDto`
  ```json
  {
    "refId": "PAY_REF_789",
    "paymentMethod": "wallet"
  }
  ```
- **Validation**: Invoice must be pending, sufficient wallet balance
- **Response**: Payment confirmation
- **Actions**: Generates receipt, sends confirmation email

### Admin Invoice Operations

#### GET `/api/invoices/admin/all`
- **Description**: Get all invoices with filtering (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 50): Items per page
  - `status` (optional): Filter by status
  - `userId` (optional): Filter by user ID
- **Response**: Array of all invoices with user profile enrichment

#### PUT `/api/invoices/:id`
- **Description**: Update invoice status/details (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Parameters**: `id` - Invoice ID
- **Body**: `UpdateInvoiceDto`
- **Response**: Updated invoice details

## 🧾 Digital Receipt Endpoints

### User Receipt Operations

#### GET `/api/receipts`
- **Description**: Get user's receipts with pagination
- **Authentication**: Required (JWT)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 20): Items per page
- **Response**: Array of user's receipts

#### GET `/api/receipts/:id`
- **Description**: Get specific receipt details
- **Authentication**: Required (JWT)
- **Parameters**: `id` - Receipt ID
- **Response**: Receipt details
- **Access Control**: Users can only access receipts for their own invoices

#### GET `/api/receipts/:id/download`
- **Description**: Download receipt in specified format
- **Authentication**: Required (JWT)
- **Parameters**: `id` - Receipt ID
- **Query Parameters**:
  - `format` (default: 'pdf'): Receipt format (pdf/html)
- **Response**: File download (PDF or HTML)
- **Headers**: Content-Type, Content-Disposition

### Admin Receipt Operations

#### GET `/api/receipts/admin/all`
- **Description**: Get all receipts with pagination (Admin only)
- **Authentication**: Required (JWT + Admin role)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 50): Items per page
- **Response**: Array of all receipts

## 👨‍💼 Administrative Endpoints

### Wallet Management

#### GET `/api/admin/wallets`
- **Description**: Get all user wallets with search and pagination
- **Authentication**: Required (JWT + Admin role)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 50): Items per page
  - `search` (optional): Search by user email or name
- **Response**: Array of wallets with user profile enrichment

#### POST `/api/admin/wallets/:id/adjust`
- **Description**: Adjust user wallet balance with audit trail
- **Authentication**: Required (JWT + Admin role)
- **Parameters**: `id` - Wallet ID
- **Body**: `WalletAdjustmentDto`
  ```json
  {
    "amount": 1000000,
    "type": "credit",
    "reason": "Customer service compensation",
    "notes": "Resolved billing dispute"
  }
  ```
- **Types**: credit, debit, correction
- **Response**: Adjustment details with balance before/after
- **Audit**: Creates record in wallet_adjustments collection

### Financial Overview

#### GET `/api/admin/invoices`
- **Description**: Get all invoices with filtering options
- **Authentication**: Required (JWT + Admin role)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 50): Items per page
  - `status` (optional): Filter by status
  - `userId` (optional): Filter by user ID
- **Response**: Array of invoices with user profile enrichment

#### GET `/api/admin/payments`
- **Description**: Get all payment transactions with filtering
- **Authentication**: Required (JWT + Admin role)
- **Query Parameters**:
  - `page` (default: 1): Page number
  - `limit` (default: 50): Items per page
  - `status` (optional): Filter by status
  - `userId` (optional): Filter by user ID
- **Response**: Array of transactions with user profile enrichment

#### GET `/api/admin/dashboard/stats`
- **Description**: Get key dashboard statistics
- **Authentication**: Required (JWT + Admin role)
- **Response**: `AdminDashboardStatsDto`
  ```json
  {
    "totalUsers": 150,
    "totalRevenue": 75000000,
    "pendingInvoices": 25,
    "overdueInvoices": 5,
    "totalTransactions": 450
  }
  ```

## 🔄 Scheduled Tasks

The system includes automated scheduled tasks that run in the background:

### Hourly Tasks
- **Overdue Invoice Check**: Identifies and marks overdue invoices
- **Email Notifications**: Sends overdue warnings to users

### Every 6 Hours
- **Auto-payment**: Processes pending invoices if sufficient wallet balance

### Daily Tasks (2 AM)
- **Maintenance**: Comprehensive system maintenance and cleanup

### Weekly Tasks (Sunday 9 AM)
- **Summary Reports**: Generates weekly financial summaries

### Monthly Tasks (1st of month, 3 AM)
- **Cleanup**: Archives old data and generates monthly reports

## 📧 Email Notifications

The system automatically sends email notifications for:

- **Wallet Top-up**: Confirmation after successful top-up
- **Invoice Created**: Notification when new invoice is generated
- **Invoice Paid**: Confirmation after successful payment
- **Invoice Overdue**: Warning when invoice becomes overdue
- **Receipt Created**: Notification when receipt is ready for download

## 🔒 Security Features

### Authentication & Authorization
- JWT token validation for all endpoints
- Role-based access control (RBAC)
- Admin-only endpoints properly protected

### Payment Security
- RefId validation prevents duplicate payments
- Minimum amount validation (1,000,000 Rials)
- Audit logging for all financial transactions

### Data Access Control
- Users can only access their own data
- Admin endpoints require proper role verification
- Input validation and sanitization

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly error message"
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## 🧪 Testing

### Test Data Examples
- **Minimum Amount**: 1,000,000 Rials
- **Sample RefId**: `PAY_REF_123456`
- **Sample Order ID**: `order_123456`
- **Sample Invoice ID**: `invoice_123456`

### Common Test Scenarios
1. **Wallet Top-up Flow**: Deposit → Verify → Top-up
2. **Invoice Payment Flow**: Create → Pay → Generate Receipt
3. **Admin Operations**: View all data, adjust balances, generate reports

## 🚀 Next Steps

1. **Frontend Integration**: Implement React components for all endpoints
2. **Payment Gateway**: Replace mock RefId verification with actual gateway
3. **Testing**: Comprehensive testing of all endpoints and business logic
4. **Monitoring**: Set up monitoring for scheduled tasks and system health
5. **Performance**: Optimize database queries and add caching where appropriate

---

**Documentation Version**: 1.0.0  
**Last Updated**: December 2024  
**API Version**: v1.0.0
