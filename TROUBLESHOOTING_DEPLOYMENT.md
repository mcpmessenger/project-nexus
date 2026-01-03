# Troubleshooting: Missing Servers and Logos on Deployed Site

If you've run the seeding script but servers/logos aren't showing on your deployed site, follow these steps:

## Step 1: Verify Database (Supabase SQL Editor)

Run this query in Supabase SQL Editor to check if servers exist:

```sql
SELECT 
  name,
  logo_url,
  (SELECT COUNT(*) FROM mcp_tools WHERE server_id = mcp_servers.id) as tool_count
FROM mcp_servers
ORDER BY name;
```

**Expected Result:** You should see 7 servers:
- brave-search (with logo_url: `/server-logos/brave-search.webp`)
- puppeteer (with logo_url: `/server-logos/puppeteer.png`)
- langchain-mcp (with logo_url: `/server-logos/langchain-mcp.png`)
- maps-grounding-lite (with logo_url: `/server-logos/google-maps.png`)
- google-workspace-mcp (with logo_url: `/server-logos/google-workspace.webp`)
- filesystem (logo_url: NULL)
- postgres (logo_url: NULL)

**If servers are missing:** Re-run `scripts/009_seed_all_servers_with_logos.sql`

## Step 2: Verify Logo Files Are Deployed

### Check Git Status
```bash
git ls-files public/server-logos/
```

You should see:
- `public/server-logos/brave-search.webp`
- `public/server-logos/puppeteer.png`
- `public/server-logos/langchain-mcp.png`
- `public/server-logos/google-maps.png`
- `public/server-logos/google-workspace.webp`

### If Files Are Missing from Git
```bash
git add public/server-logos/*.webp public/server-logos/*.png
git commit -m "Add server logo files"
git push
```

## Step 3: Check Vercel Deployment

1. Go to your Vercel dashboard
2. Check the latest deployment
3. Verify logo files are in the build:
   - Go to **Deployments** → Latest deployment → **Files**
   - Look for `public/server-logos/` folder
   - Verify logo files are present

### If Files Are Missing
- **Redeploy:** Go to Vercel → Deployments → Click **⋯** → **Redeploy**
- Or push a new commit to trigger deployment

## Step 4: Test API Endpoint

Test if the API is returning servers with logos:

1. Open your deployed site
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Refresh the page
5. Look for request to `/api/servers`
6. Click on it and check the **Response** tab

**Expected Response:**
```json
[
  {
    "id": "...",
    "name": "brave-search",
    "logo_url": "/server-logos/brave-search.webp",
    ...
  },
  ...
]
```

**If logo_url is null or missing:** The database update didn't work - re-run the seeding script.

## Step 5: Test Logo URLs Directly

In your browser, try accessing logo URLs directly:

- `https://your-site.vercel.app/server-logos/brave-search.webp`
- `https://your-site.vercel.app/server-logos/puppeteer.png`
- `https://your-site.vercel.app/server-logos/langchain-mcp.png`
- `https://your-site.vercel.app/server-logos/google-maps.png`
- `https://your-site.vercel.app/server-logos/google-workspace.webp`

**If you get 404:** Logo files aren't deployed - see Step 2 & 3

**If you get 200:** Logo files are deployed, issue might be:
- Browser cache (try hard refresh: Ctrl+Shift+R)
- Database not returning logo_url (see Step 1)

## Step 6: Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for errors like:
   - `Failed to load image`
   - `404 Not Found` for logo URLs
   - API errors

## Step 7: Verify Environment Variables

Make sure your deployed site has the correct Supabase credentials:

1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Verify these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**If missing or wrong:** Update them and redeploy

## Quick Fix Checklist

- [ ] Database has 7 servers (run verification query)
- [ ] Logo URLs are set in database (not NULL for 5 servers)
- [ ] Logo files are committed to git
- [ ] Logo files are in Vercel deployment
- [ ] Logo URLs are accessible (test direct URLs)
- [ ] API returns servers with logo_url
- [ ] Browser cache cleared (hard refresh)
- [ ] Environment variables are set correctly

## Common Issues

### Issue: Servers show but no logos
**Solution:** 
1. Check database - logo_url should be set
2. Verify logo files are deployed
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Some servers missing
**Solution:**
1. Re-run `scripts/009_seed_all_servers_with_logos.sql`
2. Verify with verification query

### Issue: Logos show locally but not deployed
**Solution:**
1. Ensure logo files are committed: `git add public/server-logos/`
2. Push to git: `git push`
3. Wait for Vercel to redeploy
4. Or manually redeploy in Vercel dashboard

### Issue: 404 errors for logo URLs
**Solution:**
1. Check if files exist in `public/server-logos/`
2. Verify files are committed to git
3. Check Vercel deployment includes the files
4. Redeploy if needed

## Still Not Working?

1. Check Vercel build logs for errors
2. Verify Supabase RLS policies allow reading servers
3. Test API endpoint directly: `https://your-site.vercel.app/api/servers`
4. Check browser console for specific errors
