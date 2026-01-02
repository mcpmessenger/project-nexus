-- Debug: Check if data exists
SELECT 'Servers:' as check_type, COUNT(*)::text as count FROM mcp_servers
UNION ALL
SELECT 'Tools:', COUNT(*)::text FROM mcp_tools
UNION ALL
SELECT 'Sample server name:', name FROM mcp_servers LIMIT 1;

-- Check RLS policies (should show public read access)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('mcp_servers', 'mcp_tools')
ORDER BY tablename, policyname;
