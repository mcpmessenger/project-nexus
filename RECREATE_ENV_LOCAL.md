# How to Recreate .env.local File

## Step 1: Delete the old .env.local file
- Delete or rename the existing `.env.local` file

## Step 2: Create a new .env.local file
Copy this template into a new file named `.env.local`:

```env
# Project Nexus - Environment Variables

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption Key (64-character hex string)
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
```

## Step 3: Fill in your actual values
Replace the placeholder values with your actual credentials:

1. **Supabase Keys**: Get from https://supabase.com/dashboard → Your Project → Settings → API
2. **Google OAuth**: Get from https://console.cloud.google.com → APIs & Services → Credentials
3. **Encryption Key**: Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Step 4: Save and Restart
1. Save the file as `.env.local` (make sure it's in the project root, same folder as `package.json`)
2. **Restart your Next.js dev server** (stop with Ctrl+C, then `npm run dev`)

## Important Formatting Rules:
- ✅ No quotes around values
- ✅ No spaces before or after `=`
- ✅ Values start immediately after `=`
- ✅ One variable per line
