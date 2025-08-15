# OAuth Implementation for ArzanSite Backend

## Overview

The backend has been successfully configured with OAuth endpoints for GitHub authentication. All required endpoints are implemented and ready for use.

## Implemented Endpoints

### 1. POST /api/auth/oauth/github/start
**Purpose**: Initiates the GitHub OAuth flow
**Request Body**:
```json
{
  "successUrl": "https://arzansite.com/auth/oauth/callback",
  "failureUrl": "https://arzansite.com/auth/login?error=oauth_failed"
}
```
**Response**:
```json
{
  "redirectUrl": "https://github.com/login/oauth/authorize?client_id=...",
  "provider": "github",
  "projectId": "6898b35e003067cd7b43",
  "message": "Redirecting to GitHub for authentication..."
}
```

### 2. POST /api/auth/oauth/github/callback
**Purpose**: Handles the OAuth callback from GitHub/Appwrite
**Request Body**:
```json
{
  "userId": "user_id_from_appwrite",
  "secret": "session_secret_from_appwrite"
}
```
**Response**: HTTP 302 redirect to frontend dashboard with session cookies set

### 3. GET /api/auth/oauth/me
**Purpose**: Gets current user information from OAuth session
**Request**: Requires `appwrite_session` cookie
**Response**:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "emailVerification": true,
  "$createdAt": "2024-01-01T00:00:00.000Z",
  "$updatedAt": "2024-01-01T00:00:00.000Z",
  "prefs": {},
  "message": "User information retrieved from OAuth session"
}
```

### 4. POST /api/auth/logout
**Purpose**: Logs out user with JWT token (for regular authentication)
**Request**: Requires JWT token in Authorization header
**Response**:
```json
{
  "message": "Successfully signed out"
}
```

### 5. POST /api/auth/oauth/logout
**Purpose**: Logs out OAuth user and clears session cookies
**Request**: No authentication required
**Response**:
```json
{
  "message": "Successfully signed out from OAuth session"
}
```

## Configuration Required

### 1. Environment Variables
Add these to your `.env` file:

```bash
# OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=https://arzansite.com/api/auth/oauth/github/callback
```

### 2. GitHub OAuth App Setup
1. Go to GitHub Developer Settings: https://github.com/settings/developers
2. Create a new OAuth App
3. Set the Authorization callback URL to: `https://arzansite.com/api/auth/oauth/github/callback`
4. Copy the Client ID and Client Secret to your environment variables

### 3. Appwrite OAuth Configuration
1. In your Appwrite console, go to Auth > Settings
2. Enable OAuth2 providers
3. Add GitHub as an OAuth provider
4. Configure the GitHub Client ID and Client Secret
5. Set the callback URL to match your backend endpoint

## How It Works

### 1. OAuth Flow Initiation
1. Frontend calls `/api/auth/oauth/github/start` with success/failure URLs
2. Backend constructs OAuth URL using Appwrite's OAuth2 flow
3. Frontend redirects user to the generated OAuth URL

### 2. OAuth Callback
1. User authenticates with GitHub
2. GitHub redirects to Appwrite with authorization code
3. Appwrite processes the OAuth flow and calls your backend callback
4. Backend creates a session and sets secure cookies
5. User is redirected to frontend dashboard

### 3. Session Management
- `appwrite_session`: HTTP-only cookie containing the session secret
- `user_info`: Non-HTTP-only cookie containing user information for frontend access
- Both cookies are secure and have appropriate expiration times

## Security Features

- HTTP-only cookies for sensitive session data
- Secure cookie flags in production
- Proper CORS configuration
- Session expiration (30 days)
- Input validation and sanitization

## Frontend Integration

### Starting OAuth Flow
```javascript
const response = await fetch('/api/auth/oauth/github/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    successUrl: 'https://arzansite.com/dashboard',
    failureUrl: 'https://arzansite.com/login?error=oauth_failed'
  })
});

const { redirectUrl } = await response.json();
window.location.href = redirectUrl;
```

### Getting User Info
```javascript
const response = await fetch('/api/auth/oauth/me');
const user = await response.json();
```

### Logging Out
```javascript
await fetch('/api/auth/oauth/logout', { method: 'POST' });
// Clear any frontend state
window.location.href = '/login';
```

## Testing

### 1. Test OAuth Flow
1. Start OAuth flow: `POST /api/auth/oauth/github/start`
2. Verify redirect URL is generated correctly
3. Test callback handling with mock data
4. Verify session cookies are set

### 2. Test Session Management
1. Get user info: `GET /api/auth/oauth/me`
2. Verify user data is returned correctly
3. Test logout: `POST /api/auth/oauth/logout`
4. Verify cookies are cleared

## Troubleshooting

### Common Issues

1. **OAuth callback not working**
   - Check GitHub OAuth app configuration
   - Verify callback URL matches exactly
   - Check Appwrite OAuth settings

2. **Session cookies not being set**
   - Verify cookie domain settings
   - Check HTTPS requirements in production
   - Ensure proper CORS configuration

3. **User profile not created**
   - Check database permissions
   - Verify profile service is working
   - Check error logs

### Debug Logging
The implementation includes comprehensive logging for debugging:
- OAuth flow initiation
- Callback handling
- Session creation
- Profile creation
- Error scenarios

## Next Steps

1. Configure GitHub OAuth app with your credentials
2. Update environment variables
3. Test the complete OAuth flow
4. Implement frontend integration
5. Add additional OAuth providers if needed (Google, Facebook, etc.)

## Additional OAuth Providers

The system is designed to support multiple OAuth providers:
- GitHub (implemented)
- Google (ready for implementation)
- Facebook (ready for implementation)
- Discord (ready for implementation)
- Twitch (ready for implementation)

To add a new provider, simply:
1. Configure the provider in Appwrite
2. Add environment variables for the new provider
3. The existing endpoints will work with the new provider
