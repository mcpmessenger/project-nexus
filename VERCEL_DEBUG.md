# Debugging "No Tools Showing" on Vercel

If you have 14 tools in Supabase but nothing shows on the deployed site, follow these steps:

## Step 1: Check Browser Console

1. Open your deployed site: `https://your-project.vercel.app`
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for red error messages
5. Check for messages like:
   - `[ToolBrowser] Servers API error:`
   - `[ToolBrowser] Tools API error:`
   - `Failed to fetch`
   - `Internal Server Error`

## Step 2: Test API Endpoints Directly

Open these URLs in your browser (replace with your Vercel URL):

1. **Servers API**: `https://your-project.vercel.app/api/servers`
   - Should return: JSON array of servers (or error JSON)
   
2. **Tools API**: `https://your-project.vercel.app/api/tools`
   - Should return: JSON array of tools (or error JSON)

**What to look for:**
- ✅ **200 status + JSON array** = API working, check frontend
- ❌ **500 Internal Server Error** = Environment variables missing
- ❌ **{"error": "Invalid API key"}** = Wrong Supabase credentials
- ❌ **{"error": "..."}** = Check the error message

## Step 3: Verify Environment Variables in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your **Project Nexus** project
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Check that they're enabled for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

## Step 4: Check Vercel Function Logs

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Deployments** tab
4. Click on the latest deployment
5. Click **Functions** tab (or **View Function Logs**)
6. Look for error messages related to:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Supabase connection errors

## Step 5: Redeploy After Setting Variables

**Important**: After adding/updating environment variables:

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete
5. Test the API endpoints again

## Common Issues

### Issue: API returns `{"error": "Invalid API key"}`

**Solution:**
- Double-check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- Make sure you copied the full key (they're very long)
- Get the key from: Supabase Dashboard → Settings → API → anon/public key
- Redeploy after updating

### Issue: API returns `500 Internal Server Error`

**Solution:**
- Check that both environment variables are set
- Verify no extra spaces before/after the values
- Check Vercel function logs for specific error
- Redeploy after fixing

### Issue: API returns `200` but empty array `[]`

**Solution:**
- Check your Supabase database has data
- Run this in Supabase SQL Editor:
  ```sql
  SELECT COUNT(*) FROM mcp_tools;
  SELECT COUNT(*) FROM mcp_servers;
  ```
- If counts are 0, run `COMPLETE_SETUP.sql` to seed data

## Quick Test Script

Run this in browser console on your deployed site:

```javascript
// Test API endpoints
async function testAPIs() {
  console.log('Testing Servers API...')
  const serversRes = await fetch('/api/servers')
  const serversData = await serversRes.json()
  console.log('Servers:', serversRes.status, serversData)
  
  console.log('Testing Tools API...')
  const toolsRes = await fetch('/api/tools')
  const toolsData = await toolsRes.json()
  console.log('Tools:', toolsRes.status, toolsData)
}

testAPIs()
```

This will show you exactly what the APIs are returning.
