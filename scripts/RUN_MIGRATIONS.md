# Database Migration Guide

To get all the tools showing up in your local Project Nexus instance, you need to run the SQL migration scripts on your Supabase database.

## Migration Scripts (Run in Order)

1. **001_enable_pgvector.sql** - Enable pgvector extension (if not already done)
2. **002_create_mcp_tables.sql** - Create MCP tables structure
3. **003_seed_sample_data.sql** - Add initial servers (filesystem, postgres, brave-search, puppeteer)
4. **004_create_rls_policies.sql** - Set up Row Level Security policies
5. **005_create_search_function.sql** - Create vector search function
6. **006_google_workspace_schema.sql** - Set up OAuth and Google Workspace tables
7. **007_add_mcp_server_logos.sql** - Add logo_url column to mcp_servers table
8. **008_add_new_mcp_servers.sql** - Add new servers (LangChain, Google Maps, Google Workspace) with tools

## How to Run Migrations

### Option 1: Using Supabase SQL Editor (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. For each script in order:
   - Click **New Query**
   - Copy the contents of the SQL file
   - Paste into the editor
   - Click **Run** (or press Ctrl+Enter)

### Option 2: Using psql Command Line

```bash
# Get your Supabase connection string from:
# Supabase Dashboard > Project Settings > Database > Connection string (URI)

# Run each migration script:
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres" -f scripts/001_enable_pgvector.sql
psql "postgresql://..." -f scripts/002_create_mcp_tables.sql
psql "postgresql://..." -f scripts/003_seed_sample_data.sql
psql "postgresql://..." -f scripts/004_create_rls_policies.sql
psql "postgresql://..." -f scripts/005_create_search_function.sql
psql "postgresql://..." -f scripts/006_google_workspace_schema.sql
psql "postgresql://..." -f scripts/007_add_mcp_server_logos.sql
psql "postgresql://..." -f scripts/008_add_new_mcp_servers.sql
```

### Option 3: Using PowerShell Script (Windows)

Create a script to run all migrations:

```powershell
$connectionString = "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"

$scripts = @(
    "001_enable_pgvector.sql",
    "002_create_mcp_tables.sql",
    "003_seed_sample_data.sql",
    "004_create_rls_policies.sql",
    "005_create_search_function.sql",
    "006_google_workspace_schema.sql",
    "007_add_mcp_server_logos.sql",
    "008_add_new_mcp_servers.sql"
)

foreach ($script in $scripts) {
    Write-Host "Running $script..."
    psql $connectionString -f "scripts\$script"
}
```

## Verify Migrations

After running the migrations, verify that tools are loaded:

1. Check your Supabase dashboard:
   - Go to **Table Editor**
   - Check `mcp_servers` table - should have entries for langchain-mcp, maps-grounding-lite, google-workspace-mcp, etc.
   - Check `mcp_tools` table - should have multiple tools

2. Check your local app:
   - Restart your Next.js dev server: `npm run dev`
   - Refresh the browser
   - Tools should now appear in the left sidebar

## Troubleshooting

**Problem**: "relation already exists" errors
- **Solution**: Skip scripts that create tables if you've already run them. Focus on scripts 007 and 008 if tables already exist.

**Problem**: Tools still not showing
- **Solution**: 
  1. Check browser console for errors
  2. Verify API calls: Open DevTools > Network > Check `/api/tools` response
  3. Ensure Supabase connection is working
  4. Check that RLS policies allow reads

**Problem**: Logo images not loading
- **Solution**: 
  1. Verify logo files exist in `public/server-logos/`
  2. Check that `logo_url` values in database match actual file paths
  3. Ensure Next.js is serving static files correctly

## Quick Check SQL

Run this in Supabase SQL Editor to verify everything is set up:

```sql
-- Check servers
SELECT name, logo_url FROM mcp_servers ORDER BY name;

-- Check tools count per server
SELECT 
  s.name as server_name,
  COUNT(t.id) as tool_count
FROM mcp_servers s
LEFT JOIN mcp_tools t ON s.id = t.server_id
GROUP BY s.name
ORDER BY s.name;
```

You should see:
- langchain-mcp (1 tool)
- maps-grounding-lite (3 tools)
- google-workspace-mcp (4 tools)
- brave-search (1 tool)
- puppeteer (2 tools)
- filesystem (2 tools)
- postgres (1 tool)
