# Fixing "column logo_url does not exist" Error

## The Issue

After adding the `logo_url` column to `mcp_servers` table, you might still see the error:
```
column mcp_servers_1.logo_url does not exist
```

## Why This Happens

**PostgREST Schema Caching**: Supabase uses PostgREST which caches the database schema. After adding a new column, it can take **1-2 minutes** for the schema cache to automatically refresh.

## Solution

### Step 1: Verify Column Exists

Run this in Supabase SQL Editor to confirm the column was added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mcp_servers' 
AND column_name = 'logo_url';
```

**Expected Result**: Should return one row showing `logo_url | text`

### Step 2: Wait for Cache Refresh

1. **Wait 1-2 minutes** after running the ALTER TABLE command
2. PostgREST will automatically refresh its schema cache
3. **Refresh your Vercel site** and try again

### Step 3: If Still Not Working (Rare)

If the error persists after 2-3 minutes:

1. **Check you're on the right database**: Make sure you ran the ALTER TABLE on the same Supabase project that Vercel is connected to

2. **Verify connection pooling**: If you're using connection pooling, try running:
   ```sql
   -- This forces a schema refresh
   NOTIFY pgrst, 'reload schema';
   ```
   (Note: This requires superuser privileges and may not work on managed Supabase)

3. **Restart PostgREST** (if you have access): Only possible on self-hosted Supabase

4. **Check RLS policies**: Make sure Row Level Security policies allow reading the column

## Quick Test

After waiting 1-2 minutes, test the API directly:
- Visit: `https://your-project.vercel.app/api/tools`
- Should return JSON with tools (not an error)

## Most Likely Cause

**Schema cache refresh delay** - Just wait 1-2 minutes and refresh. This is the most common cause and will resolve automatically.
