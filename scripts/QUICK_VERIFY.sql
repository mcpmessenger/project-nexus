-- Quick verification: Check if data exists in your database
-- Run this in Supabase SQL Editor

-- 1. Check servers count
SELECT COUNT(*) as server_count FROM mcp_servers;

-- 2. Check tools count
SELECT COUNT(*) as tool_count FROM mcp_tools;

-- 3. List all servers with their tool counts
SELECT 
  s.name,
  s.logo_url,
  COUNT(t.id) as tool_count
FROM mcp_servers s
LEFT JOIN mcp_tools t ON s.id = t.server_id
GROUP BY s.id, s.name, s.logo_url
ORDER BY s.name;

-- 4. List first 5 tools
SELECT 
  t.name as tool_name,
  s.name as server_name
FROM mcp_tools t
JOIN mcp_servers s ON t.server_id = s.id
ORDER BY s.name, t.name
LIMIT 5;
