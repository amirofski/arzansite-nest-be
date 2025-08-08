# Authentication API Endpoints

This document describes the authentication endpoints implemented in the NestJS backend using Supabase's native authentication system.

## API Documentation

**Swagger UI**: Available at `http://localhost:3000/api/docs` when the server is running.

## User Registration

### POST /api/auth/signup

Creates a new user account and sends a verification email using Supabase's native authentication.

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
  "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**
- The `metadata` field is optional and can contain any additional user information
- A verification email is automatically sent to the user's email address
- The `verificationToken` is a JWT token from Supabase that should be used to verify the email address
- The backend uses Supabase's `confirmation_token` field in the `auth.users` table

## Email Verification

### POST /api/auth/verify-email

Verifies a user's email address using the Supabase verification token.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

**Notes:**
- The verification token is a JWT token from Supabase's authentication system
- Once verified, the user's email is marked as confirmed in the `auth.users` table
- The verification triggers Supabase's `handle_email_verification()` function
- Users can now log in and access protected resources

## User Login

### POST /api/auth/login

Authenticates a user with email and password using Supabase authentication.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": { ... },
    "email_confirmed_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Token Refresh

### POST /api/auth/refresh

Refreshes the access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## User Logout

### POST /api/auth/logout

Logs out the user and invalidates the session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "message": "Successfully signed out"
}
```

## Get Current User

### GET /api/auth/me

Retrieves information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user"
}
```

## Forgot Password

### POST /api/auth/forgot-password

Sends a password reset email to the user.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent. Please check your email."
}
```

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input data (missing fields, invalid email format, etc.)
- `401 Unauthorized`: Invalid credentials, expired token, or missing authentication
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

### Supabase Integration
- Uses Supabase's native authentication system
- Leverages the `auth.users` table with `confirmation_token` field
- Integrates with Supabase's email verification triggers
- Uses JWT tokens for authentication and verification

### Database Schema
The backend works with Supabase's `auth.users` table:
```sql
create table auth.users (
  id uuid not null,
  email character varying(255) null,
  encrypted_password character varying(255) null,
  email_confirmed_at timestamp with time zone null,
  confirmation_token character varying(255) null,
  confirmation_sent_at timestamp with time zone null,
  -- ... other fields
);
```

### Email Verification Process
1. User signs up and Supabase generates a confirmation token
2. Backend sends custom verification email with the token
3. User clicks the verification link in their email
4. Frontend calls `/api/auth/verify-email` with the token
5. Backend uses Supabase's `verifyOtp` method to confirm the email
6. Supabase updates `email_confirmed_at` and triggers verification events
7. User can now log in and access protected resources

### Security Features
- JWT tokens for secure authentication
- Automatic token refresh mechanism
- Input validation using class-validator decorators
- CORS protection for cross-origin requests
- Helmet.js for security headers
- Rate limiting and throttling protection

### Email Templates
- Custom email templates for verification and password reset
- Professional branding with ArzanSite design
- Responsive email layouts
- Clear call-to-action buttons

## Testing

### Swagger UI
Access the interactive API documentation at `http://localhost:3000/api/docs` to:
- View all available endpoints
- Test API calls directly from the browser
- See request/response schemas
- Understand authentication requirements

### Unit Tests
Comprehensive test coverage for all authentication methods:
- User registration and validation
- Email verification with various token types
- Login and token management
- Error handling scenarios

### Environment Variables
Required environment variables for the backend:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:5173
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Frontend Integration

For frontend implementation details, see `FRONTEND_IMPLEMENTATION_PROMPT.md` which includes:
- Complete authentication flow diagrams
- Required components and pages
- State management patterns
- Security best practices
- Testing requirements
