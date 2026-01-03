# Clear Next.js Cache and Restart

The server is loading `.env.local` but `SUPABASE_SERVICE_ROLE_KEY` still isn't being found. Let's clear the Next.js cache and do a fresh restart.

## Steps:

1. **Stop the server** (press `Ctrl+C` in the terminal)

2. **Delete the `.next` cache folder:**
   ```bash
   # Windows PowerShell:
   Remove-Item -Recurse -Force .next
   
   # Or manually delete the .next folder in your file explorer
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Check the server terminal** when you make an MCP call - look for:
   ```
   [createServiceRoleClient] Available SUPABASE env vars: ...
   ```
   
   This will show which environment variables are actually loaded.

## Alternative: Verify the Variable is Actually in the File

1. Open `.env.local` in your editor
2. Search for `SUPABASE_SERVICE_ROLE_KEY`
3. Make sure:
   - The line exists
   - No leading/trailing spaces
   - No quotes around the value
   - The value starts immediately after `=`
   - The entire key value is on one line (not split across multiple lines)

## Still Not Working?

If it still doesn't work after clearing cache, check the server terminal logs when the error occurs. The debug output will show exactly which environment variables Next.js is loading.
