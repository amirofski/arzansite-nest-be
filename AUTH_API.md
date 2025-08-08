# Authentication API Endpoints

This document describes the authentication endpoints implemented in the NestJS backend.

## User Registration

### POST /auth/signup

Creates a new user account and sends a verification email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "company": "Example Corp"
  }
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "first_name": "John",
      "last_name": "Doe",
      "company": "Example Corp"
    },
    "email_confirmed_at": null,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "verificationToken": "abc123..."
}
```

**Notes:**
- The `metadata` field is optional and can contain any additional user information
- A verification email is automatically sent to the user's email address
- The `verificationToken` should be used to verify the email address

## Email Verification

### POST /auth/verify-email

Verifies a user's email address using the verification token.

**Request Body:**
```json
{
  "token": "abc123..."
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

**Notes:**
- The verification token is valid for 24 hours
- Once verified, the user's email is marked as confirmed
- The verification token is invalidated after successful verification

## Error Responses

Both endpoints return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input data (missing fields, invalid email format, etc.)
- `400 Bad Request`: Invalid or expired verification token
- `500 Internal Server Error`: Server-side errors

**Example Error Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid verification token",
  "error": "Bad Request"
}
```

## Implementation Details

### Token Generation
- Verification tokens are cryptographically secure random strings (32 bytes)
- Tokens are stored in user metadata with creation timestamp
- Tokens expire after 24 hours

### Email Verification Process
1. User signs up and receives a verification token
2. User clicks the verification link in their email (frontend handles this)
3. Frontend calls `/auth/verify-email` with the token
4. Backend validates the token and confirms the user's email
5. User can now log in and access protected resources

### Security Features
- Tokens are single-use and invalidated after verification
- Token expiration prevents indefinite access
- Secure token generation using Node.js crypto module
- Input validation using class-validator decorators
