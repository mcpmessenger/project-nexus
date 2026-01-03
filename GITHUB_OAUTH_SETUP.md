# GitHub OAuth Setup Guide

## Step 1: Create GitHub OAuth App

1. Go to GitHub → **Settings** → **Developer settings** → **OAuth Apps**
   - Or visit: https://github.com/settings/developers

2. Click **"New OAuth App"**

3. Fill in the form:
   - **Application name**: `Project Nexus` (or any name you prefer)
   - **Homepage URL**: Your app URL
     - Production: `https://your-domain.vercel.app` (or your production URL)
     - Development: `http://localhost:3000`
   - **Authorization callback URL**: 
     ```
     https://uoudazbkzzayjjrqfwnc.supabase.co/auth/v1/callback
     ```
     ⚠️ **Important**: Replace `uoudazbkzzayjjrqfwnc` with your actual Supabase project reference ID if different

4. Click **"Register application"**

5. On the next page:
   - **Copy the Client ID** (you'll need this)
   - **Click "Generate a new client secret"**
   - **Copy the Client secret immediately** (you won't be able to see it again!)
   - If you lose it, generate a new one (and disable the old one)

## Step 2: Configure in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **GitHub** in the list
5. Toggle **GitHub** to enable it
6. Enter:
   - **Client ID (for OAuth App)**: Paste the Client ID from GitHub
   - **Client Secret (for OAuth App)**: Paste the Client Secret from GitHub
7. Click **Save**

## Step 3: Verify Configuration

1. Make sure your Supabase project's Site URL is set correctly:
   - Go to **Authentication** → **URL Configuration**
   - **Site URL** should match your app's URL (e.g., `http://localhost:3000` for dev)
   - **Redirect URLs** should include:
     - `http://localhost:3000/auth/callback` (for development)
     - `https://your-domain.vercel.app/auth/callback` (for production)

2. Test the GitHub OAuth flow:
   - Click the avatar icon in the top right
   - Click "Connect with GitHub"
   - You should be redirected to GitHub to authorize
   - After authorization, you should be redirected back to your app

## Troubleshooting

- **"redirect_uri_mismatch" error**: Make sure the callback URL in GitHub exactly matches: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
- **"Invalid client" error**: Verify the Client ID and Client Secret are correct in Supabase
- **Not redirecting back**: Check that your Site URL and Redirect URLs are configured correctly in Supabase

## Security Notes

- Never commit OAuth secrets to your repository
- Use environment variables if storing secrets locally
- Rotate secrets periodically
- Keep the callback URL secret secure (though it's visible in your code)
