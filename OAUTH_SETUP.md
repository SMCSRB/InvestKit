# OAuth Setup Guide

## Overview
InvestKit now supports social login with Google and GitHub using NextAuth.js.

## Setup Instructions

### 1. Generate NEXTAUTH_SECRET
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```
Copy the output and add it to `.env.local`:
```
NEXTAUTH_SECRET=your_generated_secret_here
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing one)
3. Enable **Google+ API**
4. Go to **Credentials** → Create OAuth 2.0 Client ID
5. Select **Web application**
6. Add authorized redirect URI:
   - `http://192.168.1.201:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

7. Copy the **Client ID** and **Client Secret**
8. Add to `.env.local`:
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. GitHub OAuth Setup

1. Go to [GitHub Settings → Developers](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: InvestKit
   - **Homepage URL**: `http://192.168.1.201:3000` (development)
   - **Authorization callback URL**: `http://192.168.1.201:3000/api/auth/callback/github`

4. Copy the **Client ID** and generate a **Client Secret**
5. Add to `.env.local`:
```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 4. Update NEXTAUTH_URL
Make sure to update the URL in `.env.local`:
```
NEXTAUTH_URL=http://192.168.1.201:3000
```

For production, change to:
```
NEXTAUTH_URL=https://yourdomain.com
```

## Testing

1. Restart your Next.js dev server:
```bash
npm run dev
```

2. Go to `/login` or `/signup`
3. Click "Google" or "GitHub" button
4. You should be redirected to the OAuth provider
5. After authentication, you'll be redirected back to the app

## Backend Integration

Currently, the OAuth flow creates a session but doesn't sync with your backend database.

To fully integrate:
1. Modify the `signIn` callback in `app/api/auth/[...nextauth]/route.js`
2. Make a call to your backend API to create/update the user
3. Store the OAuth provider ID in your database

Example:
```javascript
async signIn({ user, account, profile }) {
  // Make API call to your backend to register/update user
  const response = await fetch('http://192.168.1.201:5000/api/auth/oauth-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      name: user.name,
      image: user.image,
      provider: account.provider,
      providerId: account.providerAccountId,
    }),
  });
  return true;
}
```

## Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Setup](https://next-auth.js.org/providers/google)
- [GitHub OAuth Setup](https://next-auth.js.org/providers/github)
