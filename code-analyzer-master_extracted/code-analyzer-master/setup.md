# OAuth Setup Guide

## Step 1: Create Bitbucket OAuth Consumer

1. Go to [Bitbucket OAuth Consumers](https://bitbucket.org/account/settings/app-passwords/oauth-consumers/)
2. Click "Add consumer"
4. Fill in the details:
   - **Name**: Repository Manager
   - **Description**: OAuth consumer for repository management app
   - **Callback URL**: `http://localhost:3001/auth/callback`
   - **URL**: `http://localhost:3001`
5. Select permissions:
   - ✅ **Repositories: Read**
   - ✅ **Account: Read**
6. Click "Save"
7. Copy the **Key** (Client ID) and **Secret** (Client Secret)

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and replace the placeholder values:
   ```env
   NEXT_PUBLIC_BITBUCKET_CLIENT_ID=your_actual_client_id_here
   BITBUCKET_CLIENT_SECRET=your_actual_client_secret_here
   NEXT_PUBLIC_REDIRECT_URI=http://localhost:3001/auth/callback
   REDIRECT_URI=http://localhost:3001/auth/callback
   ```

## Step 3: Start the Application

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

## Step 4: Test the Connection

1. Click "Connect with Bitbucket"
2. You'll be redirected to Bitbucket
3. Authorize the application
4. You'll be redirected back to see your repositories

## Troubleshooting

- **Callback URL mismatch**: Ensure the callback URL in your OAuth consumer exactly matches `http://localhost:3001/auth/callback`
- **Invalid credentials**: Double-check your client ID and secret
- **Permission denied**: Make sure you selected "Repositories: Read" and "Account: Read" permissions
