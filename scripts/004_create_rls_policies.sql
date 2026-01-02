-- Enable RLS on all tables (for future auth integration)
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_executions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to servers and tools
CREATE POLICY "Allow public read access to mcp_servers"
  ON mcp_servers FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to mcp_tools"
  ON mcp_tools FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to tool_embeddings"
  ON tool_embeddings FOR SELECT
  USING (true);

-- Allow public insert for sandbox executions (for testing)
CREATE POLICY "Allow public insert to sandbox_executions"
  ON sandbox_executions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public read access to sandbox_executions"
  ON sandbox_executions FOR SELECT
  USING (true);
