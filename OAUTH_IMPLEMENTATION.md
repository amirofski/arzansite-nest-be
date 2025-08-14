# OAuth Proxy Implementation

This document describes the OAuth authentication proxy implementation between your frontend, NestJS backend, and Appwrite.

## Overview

The backend acts as an OAuth proxy that:
1. **Initiates OAuth flow** - Creates OAuth sessions with providers via Appwrite
2. **Handles OAuth callbacks** - Processes successful OAuth authentication
3. **Manages sessions** - Stores secure HTTP-only cookies for session management
4. **Provides user info** - Endpoints to fetch authenticated user information

## Architecture

```
Frontend → NestJS Backend → Appwrite → OAuth Provider
    ↑           ↓              ↓
    └── Session Cookie ←── User Info
```

## API Endpoints

### 1. Initiate GitHub OAuth Flow
**POST** `/api/auth/oauth/github/start`

Starts the GitHub OAuth authentication flow.

**Parameters:**
- `successUrl` (body): URL to redirect after successful authentication
- `failureUrl` (body): URL to redirect after failed authentication

**Example Request:**
```json
{
  "successUrl": "https://arzansite.com/auth/oauth/callback",
  "failureUrl": "https://arzansite.com/auth/login?error=oauth_failed"
}
```

**Example Response:**
```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?client_id=...",
  "provider": "github",
  "message": "Redirecting to GitHub for authentication..."
}
```

### 2. GitHub OAuth Callback Handler
**POST** `/api/auth/oauth/github/callback`

Handles the GitHub OAuth callback from Appwrite after successful authentication.

**Request Body:**
- `userId`: User ID from Appwrite OAuth session
- `secret`: Session secret from Appwrite OAuth session

**Behavior:**
- Creates Appwrite session using the provided credentials
- Sets HTTP-only cookies for session management
- Redirects to frontend dashboard

### 4. OAuth Logout
**POST** `/api/auth/oauth/logout`

Logs out the current OAuth user and clears session cookies.

**Response:**
```json
{
  "message": "Successfully signed out from OAuth session"
}
```

### 5. Get Available OAuth Providers
**GET** `/api/auth/oauth/providers`

Returns list of available OAuth providers.

**Example Response:**
```json
{
  "providers": [
    {
      "name": "github",
      "displayName": "GitHub",
      "enabled": true,
      "description": "Sign in with your GitHub account"
    },
    {
      "name": "google",
      "displayName": "Google",
      "enabled": true,
      "description": "Sign in with your Google account"
    }
  ],
  "message": "Available OAuth providers retrieved successfully"
}
```

### 3. Get Current User from OAuth Session
**GET** `/api/auth/oauth/me`

Retrieves current user information from OAuth session cookie.

**Example Response:**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "user@example.com",
  "name": "John Doe",
  "emailVerification": true,
  "$createdAt": "2024-01-01T00:00:00.000Z",
  "$updatedAt": "2024-01-01T00:00:00.000Z",
  "prefs": {},
  "message": "User information retrieved from OAuth session"
}
```

## Session Management

### Cookies Set by OAuth Callback

1. **`appwrite_session`** (HTTP-only)
   - Contains the Appwrite session secret
   - Secure, HTTP-only cookie
   - 30-day expiration
   - Used for API authentication

2. **`user_info`** (Accessible by frontend)
   - Contains basic user information
   - Non-sensitive data only
   - 30-day expiration
   - Used for UI display

### Cookie Configuration

```typescript
// HTTP-only session cookie
res.cookie('appwrite_session', session.secret, {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
  domain: NODE_ENV === 'production' ? '.arzansite.com' : undefined,
});

// User info cookie (frontend accessible)
res.cookie('user_info', JSON.stringify({
  id: user.$id,
  email: user.email,
  name: user.name,
  emailVerification: user.emailVerification,
}), {
  httpOnly: false,
  secure: NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 30 * 1000, // 30 days
  domain: NODE_ENV === 'production' ? '.arzansite.com' : undefined,
});
```

## Frontend Integration

### 1. Initiate OAuth Login

```javascript
// Start GitHub OAuth flow
const startGitHubOAuth = async () => {
  try {
    const response = await fetch('/api/auth/oauth/github/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        successUrl: `${window.location.origin}/auth/oauth/callback`,
        failureUrl: `${window.location.origin}/auth/login?error=oauth_failed`,
      }),
    });
    
    const data = await response.json();
    
    // Redirect to OAuth provider
    window.location.href = data.redirectUrl;
  } catch (error) {
    console.error('Failed to start GitHub OAuth flow:', error);
  }
};
```

### 2. Handle OAuth Success

```javascript
// Check for OAuth success parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('oauth_success') === 'true') {
  // OAuth login successful
  console.log('OAuth login successful!');
  // Redirect to dashboard or show success message
}
```

### 3. Get User Information

```javascript
// Get current user from OAuth session
const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/auth/oauth/me', {
      credentials: 'include', // Include cookies
    });
    
    if (response.ok) {
      const user = await response.json();
      return user;
    } else {
      throw new Error('Not authenticated');
    }
  } catch (error) {
    console.error('Failed to get user info:', error);
    return null;
  }
};
```

### 4. Logout

```javascript
// Clear OAuth session
const oauthLogout = async () => {
  try {
    // Call OAuth logout endpoint to clear cookies
    await fetch('/api/auth/oauth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    
    // Also clear cookies on frontend as backup
    document.cookie = 'appwrite_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Redirect to login page
    window.location.href = '/auth/login';
  } catch (error) {
    console.error('OAuth logout failed:', error);
  }
};
```

## Appwrite Configuration

### 1. Enable OAuth Providers

In your Appwrite Console:

1. Go to **Auth** > **Settings** > **OAuth2 Providers**
2. Enable desired providers (GitHub, Google, etc.)
3. Configure each provider with:
   - Client ID
   - Client Secret
   - Redirect URI: `https://your-appwrite-domain/v1/account/sessions/oauth2/callback/{provider}`

### 2. Environment Variables

Add these to your `.env` file:

```env
# OAuth Configuration
OAUTH_GITHUB_ENABLED=true
OAUTH_GOOGLE_ENABLED=true
OAUTH_FACEBOOK_ENABLED=false
OAUTH_DISCORD_ENABLED=false
OAUTH_TWITCH_ENABLED=false

# Frontend URLs
FRONTEND_URL=https://arzansite.com
```

## Security Considerations

### 1. Cookie Security
- HTTP-only cookies prevent XSS attacks
- Secure flag ensures HTTPS-only transmission
- SameSite attribute prevents CSRF attacks
- Domain restriction limits cookie scope

### 2. Session Management
- Sessions expire after 30 days
- Session secrets are stored securely
- No sensitive data in frontend-accessible cookies

### 3. Error Handling
- Comprehensive error logging
- User-friendly error messages
- Secure error responses (no sensitive data leakage)

## Testing

### 1. Test OAuth Flow

```bash
# Test OAuth provider listing
curl -X GET http://localhost:3000/api/auth/oauth/providers

# Test GitHub OAuth flow initiation
curl -X POST http://localhost:3000/api/auth/oauth/github/start \
  -H "Content-Type: application/json" \
  -d '{
    "successUrl": "http://localhost:3000/auth/oauth/callback",
    "failureUrl": "http://localhost:3000/auth/login?error=oauth_failed"
  }'

# Test GitHub OAuth callback
curl -X POST http://localhost:3000/api/auth/oauth/github/callback \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your_user_id",
    "secret": "your_session_secret"
  }'

# Test OAuth logout
curl -X POST http://localhost:3000/api/auth/oauth/logout \
  -H "Content-Type: application/json"
```

### 2. Test Session Management

```bash
# Test user info retrieval (requires valid session cookie)
curl -X GET http://localhost:3000/api/auth/oauth/me \
  -H "Cookie: appwrite_session=your_session_secret"
```

## Troubleshooting

### Common Issues

1. **OAuth provider not configured in Appwrite**
   - Check Appwrite Console OAuth settings
   - Verify Client ID and Secret are correct
   - Ensure redirect URI is properly configured

2. **Cookie not being set**
   - Check CORS configuration
   - Verify cookie domain settings
   - Ensure HTTPS in production

3. **Session not persisting**
   - Check cookie expiration settings
   - Verify cookie domain and path
   - Ensure frontend includes credentials in requests

### Debug Logging

The implementation includes comprehensive logging:

```typescript
console.log(`🚀 Starting OAuth flow for provider: ${provider}`);
console.log(`✅ OAuth flow initiated for ${provider}, redirect URL generated`);
console.log(`🔄 Handling OAuth callback for user: ${userId}`);
console.log(`✅ OAuth session created for user: ${user.$id}`);
console.log(`✅ Redirecting to frontend: ${frontendUrl}/dashboard`);
```

## Future Enhancements

1. **Dynamic Provider Configuration**
   - Store provider settings in database
   - Enable/disable providers via admin interface

2. **Enhanced Session Management**
   - Session refresh mechanism
   - Multiple device session handling
   - Session analytics

3. **Additional Security Features**
   - Rate limiting for OAuth endpoints
   - IP-based session validation
   - Audit logging for OAuth events

4. **Provider-Specific Features**
   - Custom scopes for different providers
   - Provider-specific user data mapping
   - Social login buttons with provider branding
