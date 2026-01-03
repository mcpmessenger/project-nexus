# Quick Fix: Verify SUPABASE_SERVICE_ROLE_KEY in .env.local

## Check Your .env.local File

Open `.env.local` and verify the `SUPABASE_SERVICE_ROLE_KEY` line looks EXACTLY like this:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Common Mistakes to Avoid:

❌ **WRONG** - No quotes around the value:
```env
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

❌ **WRONG** - No spaces around the equals sign:
```env
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **WRONG** - Commented out:
```env
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **CORRECT** - Exact format:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Steps to Fix:

1. Open `.env.local` in your editor
2. Find the line with `SUPABASE_SERVICE_ROLE_KEY`
3. Ensure it matches the ✅ CORRECT format above (no quotes, no spaces around =)
4. Save the file
5. **RESTART your Next.js dev server** (stop with Ctrl+C, then `npm run dev` again)
6. Try the MCP call again

## Quick Test:

After restarting, the server logs should show:
```
[createServiceRoleClient] Available SUPABASE env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

If `SUPABASE_SERVICE_ROLE_KEY` appears in that list, it's working!
