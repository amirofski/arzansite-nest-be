# Wallet Payment Integration with Zarinpal

## Overview

This document describes the wallet payment integration that allows users to deposit funds into their wallets using the Zarinpal payment gateway. The integration supports minimum deposits of 1,000,000 Rials (10,000 Tomans) and provides a complete payment flow.

## Fixed Issues

### 1. Metadata Validation Error
**Problem**: `Invalid document structure: Attribute "metadata" has invalid type. Value must be a valid string and no longer than 8192 chars`

**Solution**: 
- Updated wallet service to stringify metadata before storing
- Added metadata size validation (max 8192 characters)
- Added metadata parsing when retrieving transactions

```typescript
// Before (causing error)
metadata: createTransactionDto.metadata,

// After (fixed)
metadata: createTransactionDto.metadata ? JSON.stringify(createTransactionDto.metadata) : null,
```

### 2. Minimum Amount Validation
**Requirement**: Users can charge wallets with minimum 1,000,000 Rials

**Implementation**:
- Added validation in DTO: `@Min(1000000)`
- Added validation in service logic
- Clear error messages for users

## API Endpoints

### 1. Create Wallet Deposit Request
**POST** `/api/wallets/me/deposit`

Initiates a wallet deposit payment request via Zarinpal.

**Request Body**:
```json
{
  "amount": 1000000,
  "description": "Wallet deposit"
}
```

**Response**:
```json
{
  "success": true,
  "paymentUrl": "https://www.zarinpal.com/pg/StartPay/authority_here",
  "authority": "authority_here",
  "orderId": "deposit_userId_timestamp_amount",
  "message": "Payment request created successfully. Redirect to payment gateway."
}
```

### 2. Verify Wallet Deposit
**POST** `/api/wallets/me/deposit/verify`

Verifies the payment and credits the wallet.

**Request Body**:
```json
{
  "orderId": "deposit_userId_timestamp_amount",
  "authority": "authority_from_zarinpal"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Wallet deposit successful!",
  "amount": 1000000,
  "refId": "zarinpal_ref_id",
  "newBalance": 1000000
}
```

### 3. Get Wallet Balance
**GET** `/api/wallets/me/balance`

**Response**:
```json
{
  "balance": 1000000
}
```

### 4. Get Wallet Transactions
**GET** `/api/wallets/me/transactions?limit=50&offset=0`

**Response**:
```json
[
  {
    "$id": "transaction_id",
    "user_id": "user_id",
    "wallet_id": "wallet_id",
    "type": "credit",
    "status": "completed",
    "amount": 1000000,
    "balance_before": 0,
    "balance_after": 1000000,
    "description": "Wallet deposit via Zarinpal - Ref ID: zarinpal_ref_id",
    "reference_id": "zarinpal_ref_id",
    "reference_type": "zarinpal_payment",
    "metadata": {
      "zarinpal_authority": "authority_here",
      "zarinpal_ref_id": "zarinpal_ref_id",
      "payment_gateway": "zarinpal"
    },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

## Frontend Integration

### 1. Create Deposit Request

```typescript
const createDeposit = async (amount: number, description?: string) => {
  try {
    const response = await fetch('/api/wallets/me/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        description: description || `Wallet deposit - ${amount.toLocaleString()} Rials`,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // Redirect to Zarinpal payment gateway
      window.location.href = result.paymentUrl;
    } else {
      throw new Error(result.message || 'Failed to create deposit request');
    }
  } catch (error) {
    console.error('Deposit request failed:', error);
    throw error;
  }
};
```

### 2. Handle Payment Callback

```typescript
// In your payment callback component
const handlePaymentCallback = async (authority: string, orderId: string) => {
  try {
    const response = await fetch('/api/wallets/me/deposit/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        orderId,
        authority,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // Show success message
      toast.success(`Deposit successful! New balance: ${result.newBalance.toLocaleString()} Rials`);
      // Update wallet balance in your app state
      updateWalletBalance(result.newBalance);
    } else {
      throw new Error(result.message || 'Payment verification failed');
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
    toast.error('Payment verification failed. Please contact support.');
  }
};
```

### 3. Payment Button Component

```typescript
import React, { useState } from 'react';

interface DepositButtonProps {
  amount: number;
  onSuccess?: (newBalance: number) => void;
  onError?: (error: string) => void;
}

export const DepositButton: React.FC<DepositButtonProps> = ({
  amount,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    if (amount < 1000000) {
      onError?.('Minimum deposit amount is 1,000,000 Rials (10,000 Tomans)');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/wallets/me/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          description: `Wallet deposit - ${amount.toLocaleString()} Rials`,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Redirect to Zarinpal
        window.location.href = result.paymentUrl;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDeposit}
      disabled={isLoading || amount < 1000000}
      className="deposit-button"
    >
      {isLoading ? 'Processing...' : `Deposit ${amount.toLocaleString()} Rials`}
    </button>
  );
};
```

## Security Features

### 1. Input Validation
- Minimum amount validation (1,000,000 Rials)
- Maximum metadata size validation (8,192 characters)
- User authentication required for all endpoints

### 2. Payment Security
- Zarinpal payment gateway integration
- Payment verification before wallet credit
- Unique order IDs for each transaction
- Comprehensive transaction logging

### 3. Data Protection
- Metadata stored as JSON strings in Appwrite
- Secure session management
- Input sanitization and validation

## Error Handling

### Common Error Responses

```json
// Minimum amount error
{
  "success": false,
  "message": "Minimum deposit amount is 1,000,000 Rials (10,000 Tomans)"
}

// Metadata size error
{
  "success": false,
  "message": "Metadata too large. Maximum size is 8192 characters when stringified."
}

// Payment verification error
{
  "success": false,
  "message": "Payment verification failed",
  "error": "Payment verification failed"
}
```

## Testing

### 1. Test Deposit Flow

```bash
# 1. Create deposit request
curl -X POST http://localhost:3000/api/wallets/me/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 1000000,
    "description": "Test deposit"
  }'

# 2. Verify payment (after Zarinpal callback)
curl -X POST http://localhost:3000/api/wallets/me/deposit/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderId": "deposit_userId_timestamp_amount",
    "authority": "authority_from_zarinpal"
  }'
```

### 2. Test Error Cases

```bash
# Test minimum amount validation
curl -X POST http://localhost:3000/api/wallets/me/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 500000,
    "description": "Invalid amount"
  }'
```

## Environment Configuration

Make sure these environment variables are set:

```env
# Zarinpal Configuration
ZARINPAL_MERCHANT_ID=your_merchant_id_here
ZARINPAL_SANDBOX=true  # Set to false for production

# Appwrite Configuration
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_COLLECTION_WALLETS=wallets
APPWRITE_COLLECTION_TRANSACTIONS=transactions

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

## Monitoring and Logging

### Transaction Logging
All wallet transactions are logged with:
- User ID
- Transaction type (credit/debit)
- Amount
- Balance before/after
- Reference information (Zarinpal authority, ref ID)
- Metadata (payment gateway info)

### Error Logging
- Payment request failures
- Verification failures
- Database errors
- Validation errors

## Future Enhancements

1. **Multiple Payment Gateways**: Support for other payment providers
2. **Recurring Deposits**: Scheduled wallet top-ups
3. **Deposit Limits**: Maximum deposit amounts
4. **Transaction History**: Enhanced transaction reporting
5. **Webhook Support**: Real-time payment notifications
6. **Refund Processing**: Automated refund handling

## Troubleshooting

### Common Issues

1. **Metadata Error**: Ensure metadata is properly stringified
2. **Minimum Amount**: Verify amount is at least 1,000,000 Rials
3. **Payment Verification**: Check Zarinpal authority and order ID format
4. **Database Connection**: Verify Appwrite database configuration

### Debug Steps

1. Check server logs for detailed error messages
2. Verify Zarinpal merchant ID configuration
3. Test with sandbox environment first
4. Validate order ID format for wallet deposits
5. Check wallet balance updates after successful payments
