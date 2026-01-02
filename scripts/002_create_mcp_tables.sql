-- MCP Servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  repository_url TEXT,
  author TEXT,
  version TEXT,
  install_command TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  tags TEXT[],
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0
);

-- MCP Tools table
CREATE TABLE IF NOT EXISTS mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB,
  example_usage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, name)
);

-- Vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS tool_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES mcp_tools(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI ada-002 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sandbox executions table
CREATE TABLE IF NOT EXISTS sandbox_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES mcp_tools(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  output JSONB,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  error TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tools_server_id ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_tool_id ON tool_embeddings(tool_id);
CREATE INDEX IF NOT EXISTS idx_executions_tool_id ON sandbox_executions(tool_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON sandbox_executions(status);

-- Create vector similarity search index using HNSW
CREATE INDEX IF NOT EXISTS idx_tool_embeddings_vector ON tool_embeddings 
USING hnsw (embedding vector_cosine_ops);
