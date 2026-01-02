-- Quick verification script to check if tools are in the database
-- Run this in Supabase SQL Editor to see what's currently in your database

-- Check servers
SELECT 
  name, 
  logo_url,
  (SELECT COUNT(*) FROM mcp_tools WHERE server_id = mcp_servers.id) as tool_count
FROM mcp_servers 
ORDER BY name;

-- Check total tools
SELECT COUNT(*) as total_tools FROM mcp_tools;

-- Check tools by server
SELECT 
  s.name as server_name,
  t.name as tool_name,
  t.description
FROM mcp_servers s
LEFT JOIN mcp_tools t ON s.id = t.server_id
ORDER BY s.name, t.name;
