# Seeding MCP Servers to Production

This guide helps you sync all your local MCP servers (with logos) to your production/deployed database.

## Quick Start

If you have logos locally and want to seed all servers to production:

### Option 1: Use the Comprehensive Script (Recommended)

Run the all-in-one seeding script that includes all servers with available logos:

```sql
-- Run this in Supabase SQL Editor or via psql
\i scripts/009_seed_all_servers_with_logos.sql
```

This script will:
- ✅ Ensure the `logo_url` column exists
- ✅ Insert all servers (filesystem, postgres, brave-search, puppeteer, langchain-mcp, maps-grounding-lite, google-workspace-mcp)
- ✅ Update logo URLs for servers that have logos available
- ✅ Insert all tools for each server
- ✅ Use `ON CONFLICT DO NOTHING` to avoid duplicates

### Option 2: Run Individual Scripts

If you prefer to run scripts individually:

1. **007_add_mcp_server_logos.sql** - Adds logo_url column
2. **008_add_new_mcp_servers.sql** - Adds LangChain, Google Maps, Google Workspace servers
3. **003_seed_sample_data.sql** - Adds filesystem, postgres, brave-search, puppeteer

## Servers with Available Logos

The following servers have logos in `public/server-logos/`:

- ✅ **brave-search** → `/server-logos/brave-search.webp`
- ✅ **puppeteer** → `/server-logos/puppeteer.png`
- ✅ **langchain-mcp** → `/server-logos/langchain-mcp.png`
- ✅ **maps-grounding-lite** → `/server-logos/google-maps.png`
- ✅ **google-workspace-mcp** → `/server-logos/google-workspace.webp`

## Servers Without Logos (will be NULL)

- ⚠️ **filesystem** - No logo file available
- ⚠️ **postgres** - No logo file available

## Verification

After running the seeding script, verify the servers were added:

```sql
SELECT 
  name,
  logo_url,
  (SELECT COUNT(*) FROM mcp_tools WHERE server_id = mcp_servers.id) as tool_count
FROM mcp_servers
ORDER BY name;
```

You should see:
- All 7 servers listed
- Logo URLs set for servers with available logos
- Tool counts > 0 for each server

## Troubleshooting

### "Column logo_url does not exist"
Run `007_add_mcp_server_logos.sql` first to add the column.

### "Duplicate key value violates unique constraint"
The script uses `ON CONFLICT DO NOTHING`, so this shouldn't happen. If it does, the server already exists - the script will just update the logo_url.

### Logos not showing in UI
1. Verify logo files exist in `public/server-logos/`
2. Check that `logo_url` values in database match the file paths
3. Ensure logo files are deployed to your hosting (Vercel, etc.)
4. Hard refresh your browser (Ctrl+Shift+R)

## Next Steps

After seeding:
1. Deploy logo files to your hosting platform (if not already done)
2. Verify servers appear in the UI
3. Test tool execution for each server
