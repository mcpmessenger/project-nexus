-- Enable Realtime replication for mcp_server_instances table
-- This allows Supabase Realtime subscriptions to receive UPDATE events

-- Enable replication for the table
ALTER PUBLICATION supabase_realtime ADD TABLE mcp_server_instances;

-- Verify replication is enabled
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'mcp_server_instances';

-- If the above query returns a row, replication is enabled
-- If it returns no rows, replication is not enabled (or you need to run the ALTER PUBLICATION command)
