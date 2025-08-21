# OAuth Setup Guide for ArzanSite

## Quick Setup Steps

### 1. GitHub OAuth App Configuration

1. **Go to GitHub Developer Settings**
   - Visit: https://github.com/settings/developers
   - Click "New OAuth App"

2. **Fill in the OAuth App details**
   ```
   Application name: ArzanSite
   Homepage URL: https://arzansite.com
   Application description: ArzanSite OAuth Authentication
   Authorization callback URL: https://arzansite.com/api/auth/oauth/github/callback
   ```

3. **Register the application**
   - Click "Register application"
   - Copy the **Client ID** and **Client Secret**

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_REDIRECT_URI=https://arzansite.com/api/auth/oauth/github/callback
```

### 3. Appwrite OAuth Configuration

1. **Login to Appwrite Console**
   - Go to your Appwrite project dashboard

2. **Navigate to Auth Settings**
   - Go to **Auth** → **Settings** → **OAuth2 Providers**

3. **Enable GitHub OAuth**
   - Toggle GitHub to **Enabled**
   - Enter your GitHub Client ID
   - Enter your GitHub Client Secret
   - Set callback URL to: `https://arzansite.com/api/auth/oauth/github/callback`

4. **Save Configuration**
   - Click "Save" to apply the OAuth settings

### 4. Test the Implementation

Run the test script to verify everything is working:

```bash
node test-oauth-endpoints.js
```

### 5. Frontend Integration

Add this button to your login page:

```html
<button onclick="startGitHubOAuth()" class="github-oauth-btn">
  Sign in with GitHub
</button>
```

```javascript
async function startGitHubOAuth() {
  try {
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
  } catch (error) {
    console.error('Failed to start GitHub OAuth:', error);
  }
}
```

## Troubleshooting

### Common Issues

1. **"Invalid OAuth provider" error**
   - Check that GitHub is enabled in Appwrite OAuth settings
   - Verify the provider name is exactly "github"

2. **"OAuth callback failed" error**
   - Ensure callback URL matches exactly in both GitHub and Appwrite
   - Check that your domain is accessible from the internet

3. **Session cookies not being set**
   - Verify HTTPS is enabled in production
   - Check CORS configuration
   - Ensure cookie domain settings are correct

### Debug Steps

1. **Check Appwrite logs**
   - Look for OAuth-related errors in Appwrite console

2. **Verify environment variables**
   - Ensure all OAuth variables are set correctly

3. **Test endpoints individually**
   - Use the test script to isolate issues

4. **Check network requests**
   - Use browser dev tools to monitor OAuth flow

## Security Notes

- Never commit OAuth secrets to version control
- Use environment variables for sensitive data
- Enable HTTPS in production
- Regularly rotate OAuth secrets
- Monitor OAuth usage for suspicious activity

## Next Steps

After successful OAuth setup:

1. **Add user profile creation**
   - Ensure user profiles are created after OAuth login

2. **Implement session refresh**
   - Add automatic session renewal

3. **Add additional providers**
   - Google, Facebook, Discord, etc.

4. **Implement OAuth account linking**
   - Allow users to link multiple OAuth accounts

5. **Add OAuth analytics**
   - Track OAuth usage and success rates
