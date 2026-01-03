-- Add server_instance_id to sandbox_executions so we can correlate executions with MCP instances
-- NOTE: This migration requires mcp_server_instances table to exist (created in 006_google_workspace_schema.sql)

-- First, ensure mcp_server_instances table exists (if not, this will fail - run 006_google_workspace_schema.sql first)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mcp_server_instances') THEN
    RAISE EXCEPTION 'Table mcp_server_instances does not exist. Please run scripts/006_google_workspace_schema.sql first.';
  END IF;
END $$;

-- Add the column with foreign key reference
ALTER TABLE sandbox_executions
  ADD COLUMN IF NOT EXISTS server_instance_id UUID REFERENCES mcp_server_instances(id);

CREATE INDEX IF NOT EXISTS idx_sandbox_executions_instance_id ON sandbox_executions(server_instance_id);
