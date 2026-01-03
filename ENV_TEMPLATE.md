# Environment Variables Template

Copy this template to `.env.local` and replace the placeholder values with your actual credentials.

## Quick Copy-Paste Template:

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

## Formatting Rules:

✅ **CORRECT:**
- No quotes around values
- No spaces before or after `=`
- One variable per line
- Values start immediately after `=`

❌ **WRONG:**
- `KEY = VALUE` (spaces around =)
- `KEY="VALUE"` (quotes around value)
- `KEY = "VALUE"` (both mistakes)

## Where to Get Values:

1. **Supabase Keys:**
   - Go to: https://supabase.com/dashboard
   - Select your project → Settings → API
   - Copy the values (URL, anon key, service_role key)

2. **Google OAuth:**
   - Go to: https://console.cloud.google.com
   - APIs & Services → Credentials
   - Copy Client ID and Client Secret

3. **Encryption Key:**
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## After Creating .env.local:

1. **Save the file** in your project root (same folder as `package.json`)
2. **Restart your Next.js dev server** (stop with Ctrl+C, then `npm run dev`)
3. Verify it's working by checking server logs
