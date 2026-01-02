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
