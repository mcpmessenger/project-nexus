# Environment Variables in Vercel - Best Practices

## ❌ DO NOT Upload .env Files

**Never commit or upload your `.env` file to:**
- GitHub (should be in `.gitignore`)
- Vercel (use the dashboard instead)
- Any public repository

## ✅ How to Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Select your **Project Nexus** project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Variables Manually

For each variable you need:

1. Click **"Add New"** button
2. Enter the **Key** (variable name):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GOOGLE_CLIENT_ID` (optional)
   - `GOOGLE_CLIENT_SECRET` (optional)
   - `ENCRYPTION_KEY` (optional)
   - `NEXT_PUBLIC_APP_URL` (optional)
3. Enter the **Value** (the actual value from your `.env.local`)
4. Select environments:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
5. Click **"Save"**

### Step 3: Redeploy

After adding/updating variables:
1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Required Variables for Project Nexus

**Minimum Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key

**Optional (for Google OAuth):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_KEY` (64-character hex string)
- `NEXT_PUBLIC_APP_URL` (your Vercel URL)

## Security Notes

1. **`NEXT_PUBLIC_*` variables** are exposed to the browser - safe for public keys
2. **Server-only variables** (without `NEXT_PUBLIC_`) are secure server-side
3. **Never commit secrets** to git
4. **Use different credentials** for development and production
5. **Rotate secrets periodically** in production

## Getting Your Values

### Supabase Credentials
- Go to: https://supabase.com/dashboard → Your Project
- **Settings** → **API**
- Copy:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Google OAuth (Optional)
- Go to: Google Cloud Console → APIs & Services → Credentials
- Copy Client ID and Secret

### Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Quick Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` added to Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added to Vercel
- [ ] Variables enabled for Production, Preview, Development
- [ ] Deployment redeployed after adding variables
- [ ] `.env` and `.env.local` are in `.gitignore` (never committed)
