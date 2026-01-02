# Environment Variables Setup

## Quick Fix for "Invalid API key" Error

You need to set up your Supabase environment variables in a `.env.local` file.

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJhbG...`)

### Step 2: Create `.env.local` File

Create a file named `.env.local` in your project root (same folder as `package.json`).

### Step 3: Add These Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Replace the values** with your actual Supabase URL and anon key from Step 1.

### Step 4: Restart Your Dev Server

**Important**: After creating/updating `.env.local`, you MUST restart your Next.js dev server:

1. Stop the server (press `Ctrl+C` in the terminal)
2. Start it again: `npm run dev`
3. Refresh your browser

### Optional: Google OAuth Variables

If you want to use Google Workspace features, also add:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
ENCRYPTION_KEY=your-64-character-hex-key
```

To generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verify It's Working

After restarting, check:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Should NOT see "Invalid API key" errors
4. Visit http://localhost:3000/api/servers
5. Should see JSON data (not an error)

---

## 🚀 Setting Up Environment Variables in Vercel

If you're deploying to Vercel, you need to set environment variables in the Vercel dashboard.

### Step 1: Go to Vercel Project Settings

1. Go to https://vercel.com/dashboard
2. Select your **Project Nexus** project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Variables

**Minimum required for the app to work:**

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - Value: Your Supabase project URL (from Supabase Dashboard → Settings → API)
   - Example: `https://xxxxxxxxxxxxx.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Value: Your Supabase anon/public key (from Supabase Dashboard → Settings → API)
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

### Step 3: Add Optional Variables (for Google OAuth)

If you want Google Workspace features to work:

3. **`GOOGLE_CLIENT_ID`**
   - Value: Your Google OAuth Client ID
   - Format: `xxxxx.apps.googleusercontent.com`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

4. **`GOOGLE_CLIENT_SECRET`**
   - Value: Your Google OAuth Client Secret
   - Format: `GOCSPX-xxxxx`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

5. **`ENCRYPTION_KEY`**
   - Value: A 64-character hexadecimal string
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Environments: ✅ Production, ✅ Preview, ✅ Development

6. **`NEXT_PUBLIC_APP_URL`** (Optional)
   - Value: Your Vercel deployment URL
   - Example: `https://your-project.vercel.app`
   - Defaults to: `http://localhost:3000` if not set
   - Environments: ✅ Production, ✅ Preview, ✅ Development

### Step 4: Redeploy

After adding environment variables:

1. **Go to Deployments** tab in Vercel
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Wait for the deployment to complete

### Quick Checklist for Vercel

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] All variables are enabled for Production, Preview, and Development
- [ ] Deployment has been redeployed after adding variables

### Troubleshooting Vercel Deployments

**Error: "Internal Server Error"**
- ✅ Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- ✅ Verify the values are correct (no extra spaces)
- ✅ Make sure you redeployed after adding variables

**Error: "Invalid API key"**
- ✅ Double-check the Supabase anon key is correct
- ✅ Ensure the key is copied completely (they're very long)
- ✅ Check that the Supabase project is active

**Google OAuth not working**
- ✅ Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- ✅ Make sure `ENCRYPTION_KEY` is set (64-character hex string)
- ✅ Update Google OAuth redirect URI to: `https://your-domain.vercel.app/api/oauth/google/callback`
