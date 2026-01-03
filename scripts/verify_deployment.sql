-- Verification queries to check if servers and logos are properly seeded
-- Run this in Supabase SQL Editor to verify your deployment

-- 1. Check all servers and their logo URLs
SELECT 
  name,
  logo_url,
  (SELECT COUNT(*) FROM mcp_tools WHERE server_id = mcp_servers.id) as tool_count,
  created_at
FROM mcp_servers
ORDER BY name;

-- 2. Count servers with logos vs without
SELECT 
  COUNT(*) FILTER (WHERE logo_url IS NOT NULL) as servers_with_logos,
  COUNT(*) FILTER (WHERE logo_url IS NULL) as servers_without_logos,
  COUNT(*) as total_servers
FROM mcp_servers;

-- 3. List all tools per server
SELECT 
  s.name as server_name,
  s.logo_url,
  t.name as tool_name,
  t.description as tool_description
FROM mcp_servers s
LEFT JOIN mcp_tools t ON t.server_id = s.id
ORDER BY s.name, t.name;

-- 4. Check for expected servers
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'brave-search') THEN '✅'
    ELSE '❌'
  END as brave_search,
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'puppeteer') THEN '✅'
    ELSE '❌'
  END as puppeteer,
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'langchain-mcp') THEN '✅'
    ELSE '❌'
  END as langchain_mcp,
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'maps-grounding-lite') THEN '✅'
    ELSE '❌'
  END as maps_grounding_lite,
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'google-workspace-mcp') THEN '✅'
    ELSE '❌'
  END as google_workspace_mcp,
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'filesystem') THEN '✅'
    ELSE '❌'
  END as filesystem,
  CASE 
    WHEN EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'postgres') THEN '✅'
    ELSE '❌'
  END as postgres;
