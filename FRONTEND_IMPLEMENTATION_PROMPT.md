# Frontend Implementation Prompt for ArzanSite Authentication

## Overview
You need to implement a complete authentication system for ArzanSite frontend that integrates with the NestJS backend API. The backend now uses Supabase's native authentication system with custom email verification.

## Backend API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. User Registration
```typescript
POST /auth/signup
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "first_name": "John",
    "last_name": "Doe",
    "company": "Example Corp"
  }
}

Response:
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": { ... },
    "email_confirmed_at": null,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 2. Email Verification
```typescript
POST /auth/verify-email
Content-Type: application/json

Request Body:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "message": "Email verified successfully"
}
```

#### 3. User Login
```typescript
POST /auth/login
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### 4. Token Refresh
```typescript
POST /auth/refresh
Content-Type: application/json

Request Body:
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 5. User Logout
```typescript
POST /auth/logout
Authorization: Bearer <access_token>

Response:
{
  "message": "Successfully signed out"
}
```

#### 6. Get Current User
```typescript
GET /auth/me
Authorization: Bearer <access_token>

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "user"
}
```

#### 7. Forgot Password
```typescript
POST /auth/forgot-password
Content-Type: application/json

Request Body:
{
  "email": "user@example.com"
}

Response:
{
  "message": "Password reset email sent. Please check your email."
}
```

## Frontend Implementation Requirements

### 1. Authentication Flow

#### Registration Flow:
1. User fills out registration form
2. Frontend calls `/auth/signup` with user data
3. Backend creates user and sends verification email
4. Frontend shows "Check your email" message
5. User clicks verification link in email
6. Frontend extracts token from URL and calls `/auth/verify-email`
7. User is redirected to login page after successful verification

#### Login Flow:
1. User enters email and password
2. Frontend calls `/auth/login`
3. Store tokens in secure storage (httpOnly cookies or secure localStorage)
4. Redirect to dashboard

#### Token Management:
1. Store access_token and refresh_token securely
2. Implement automatic token refresh before expiration
3. Handle 401 responses by attempting token refresh
4. Redirect to login if refresh fails

### 2. Required Pages/Components

#### Pages:
- `/signup` - User registration form
- `/login` - User login form
- `/verify-email` - Email verification page
- `/forgot-password` - Password reset request form
- `/reset-password` - Password reset form
- `/dashboard` - Protected dashboard (requires authentication)

#### Components:
- `AuthForm` - Reusable form component for login/signup
- `ProtectedRoute` - Route guard for authenticated pages
- `AuthProvider` - Context provider for authentication state
- `TokenManager` - Service for token management

### 3. State Management

#### Authentication State:
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface User {
  id: string;
  email: string;
  role: string;
  user_metadata?: any;
}
```

#### Required Actions:
- `login(email, password)`
- `signup(email, password, metadata)`
- `verifyEmail(token)`
- `logout()`
- `refreshToken()`
- `getCurrentUser()`
- `forgotPassword(email)`

### 4. Error Handling

#### Common Error Responses:
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid credentials or expired token
- `500 Internal Server Error` - Server errors

#### Error Messages:
- Display user-friendly error messages
- Handle network errors gracefully
- Show loading states during API calls

### 5. Security Considerations

#### Token Storage:
- Use httpOnly cookies for production
- Use secure localStorage for development
- Never store tokens in regular cookies or sessionStorage

#### Token Refresh:
- Implement automatic refresh 5 minutes before expiration
- Handle concurrent refresh requests
- Clear tokens on logout

#### CSRF Protection:
- Include CSRF tokens in requests if required
- Validate all form submissions

### 6. UI/UX Requirements

#### Design:
- Modern, clean interface matching ArzanSite brand
- Responsive design for mobile and desktop
- Accessible forms with proper labels and error messages
- Loading indicators for all async operations

#### User Experience:
- Clear error messages and validation feedback
- Smooth transitions between pages
- Remember user's intended destination after login
- Auto-focus on first form field

### 7. Testing Requirements

#### Unit Tests:
- Test all authentication functions
- Mock API calls and responses
- Test error handling scenarios

#### Integration Tests:
- Test complete authentication flows
- Test token refresh mechanism
- Test protected route access

#### E2E Tests:
- Test registration and verification flow
- Test login and logout flow
- Test password reset flow

### 8. Environment Configuration

#### Required Environment Variables:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=ArzanSite
VITE_APP_URL=http://localhost:5173
```

### 9. API Documentation

The backend includes Swagger documentation available at:
```
http://localhost:3000/api/docs
```

Use this to test API endpoints and understand the complete API specification.

## Implementation Checklist

- [ ] Set up authentication context/provider
- [ ] Implement token management service
- [ ] Create authentication forms (login/signup)
- [ ] Implement email verification flow
- [ ] Add protected route guards
- [ ] Implement token refresh mechanism
- [ ] Add error handling and loading states
- [ ] Create password reset functionality
- [ ] Add logout functionality
- [ ] Implement user profile management
- [ ] Add comprehensive error handling
- [ ] Write unit and integration tests
- [ ] Test complete authentication flows
- [ ] Implement security best practices
- [ ] Add accessibility features
- [ ] Optimize for mobile devices

## Example Implementation Structure

```typescript
// services/auth.service.ts
export class AuthService {
  async signup(data: SignupData): Promise<AuthResponse>
  async login(credentials: LoginCredentials): Promise<AuthResponse>
  async verifyEmail(token: string): Promise<void>
  async refreshToken(): Promise<TokenResponse>
  async logout(): Promise<void>
  async getCurrentUser(): Promise<User>
}

// contexts/auth.context.tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }>
export const useAuth: () => AuthContextType

// components/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<{ children: React.ReactNode }>

// pages/SignupPage.tsx
export const SignupPage: React.FC

// pages/LoginPage.tsx
export const LoginPage: React.FC

// pages/VerifyEmailPage.tsx
export const VerifyEmailPage: React.FC
```

## Notes

1. The backend uses Supabase's native authentication system
2. Email verification tokens are JWT tokens from Supabase
3. All API responses are wrapped in a standard format
4. The backend includes comprehensive Swagger documentation
5. CORS is configured for development and production domains
6. All endpoints include proper validation and error handling

Start with the authentication context and token management, then build the UI components around these core services.
