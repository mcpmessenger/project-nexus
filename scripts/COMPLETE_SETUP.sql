-- COMPLETE SETUP: Run this if you're starting from scratch
-- This includes all necessary migrations in the correct order
-- Copy and paste everything below into Supabase SQL Editor

-- ============================================
-- Script 001: Enable pgvector extension
-- ============================================

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Script 002: Create MCP tables structure
-- ============================================

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

-- ============================================
-- Script 003: Seed initial sample data
-- ============================================

-- Insert sample MCP servers from the ecosystem
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags) 
SELECT 'filesystem', 'Secure file operations with configurable access controls', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-filesystem', ARRAY['filesystem', 'official']
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'filesystem');

INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags) 
SELECT 'postgres', 'Read-only Postgres database access', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-postgres', ARRAY['database', 'official']
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'postgres');

INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags) 
SELECT 'brave-search', 'Web and local search using Brave Search API', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-brave-search', ARRAY['search', 'official']
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'brave-search');

INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags) 
SELECT 'puppeteer', 'Browser automation and web scraping', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-puppeteer', ARRAY['automation', 'official']
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'puppeteer');

-- Insert sample tools for filesystem server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'read_file',
  'Read the complete contents of a file from the file system',
  '{"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}'::jsonb,
  'Read package.json: {"path": "./package.json"}'
FROM mcp_servers WHERE name = 'filesystem'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'read_file');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'write_file',
  'Create a new file or overwrite an existing file',
  '{"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}'::jsonb,
  'Write to file: {"path": "./output.txt", "content": "Hello World"}'
FROM mcp_servers WHERE name = 'filesystem'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'write_file');

-- Insert sample tools for postgres server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'query',
  'Execute a SELECT query on the connected database',
  '{"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}'::jsonb,
  'Query database: {"query": "SELECT * FROM users LIMIT 10"}'
FROM mcp_servers WHERE name = 'postgres'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'query');

-- Insert sample tools for brave-search server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'search',
  'Search the web using Brave Search API',
  '{"type": "object", "properties": {"query": {"type": "string"}, "count": {"type": "integer"}}, "required": ["query"]}'::jsonb,
  'Search web: {"query": "latest AI news", "count": 5}'
FROM mcp_servers WHERE name = 'brave-search'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'search');

-- Insert sample tools for puppeteer server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'navigate',
  'Navigate to a URL in a browser',
  '{"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}'::jsonb,
  'Navigate: {"url": "https://example.com"}'
FROM mcp_servers WHERE name = 'puppeteer'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'navigate');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'screenshot',
  'Take a screenshot of the current page',
  '{"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}'::jsonb,
  'Screenshot: {"path": "./screenshot.png"}'
FROM mcp_servers WHERE name = 'puppeteer'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'screenshot');

-- ============================================
-- Script 004: Create RLS policies
-- ============================================

-- Enable Row Level Security
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_executions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to servers and tools
CREATE POLICY "Allow public read access to mcp_servers" ON mcp_servers
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to mcp_tools" ON mcp_tools
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to tool_embeddings" ON tool_embeddings
  FOR SELECT USING (true);

-- Allow authenticated users to insert executions
CREATE POLICY "Allow authenticated users to insert executions" ON sandbox_executions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read own executions" ON sandbox_executions
  FOR SELECT USING (true);

-- ============================================
-- Script 005: Create search function
-- ============================================

-- Function for semantic search using vector embeddings
CREATE OR REPLACE FUNCTION search_tools(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  tool_id uuid,
  tool_name text,
  tool_description text,
  server_name text,
  server_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as tool_id,
    t.name as tool_name,
    t.description as tool_description,
    s.name as server_name,
    s.id as server_id,
    1 - (te.embedding <=> query_embedding) as similarity
  FROM tool_embeddings te
  JOIN mcp_tools t ON te.tool_id = t.id
  JOIN mcp_servers s ON t.server_id = s.id
  WHERE 1 - (te.embedding <=> query_embedding) > match_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Script 007: Add logo_url column
-- ============================================

-- Add logo_url column to mcp_servers table for server logos
ALTER TABLE mcp_servers 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for logo_url if needed (optional)
CREATE INDEX IF NOT EXISTS idx_mcp_servers_logo_url ON mcp_servers(logo_url) WHERE logo_url IS NOT NULL;

-- ============================================
-- Script 008: Add new MCP servers and tools
-- ============================================

-- Insert LangChain MCP Server
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'langchain-mcp', 'LangChain Agent MCP Server - Multi-step reasoning with ReAct pattern', 'https://github.com/mcpmessenger/langchain-mcp', 'mcpmessenger', '1.0.0', NULL, ARRAY['langchain', 'agent', 'ai', 'reasoning'], '/server-logos/langchain-mcp.png'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'langchain-mcp');

-- Insert Google Maps Grounding Lite MCP Server
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'maps-grounding-lite', 'Google Maps Grounding Lite - Search places, lookup weather, compute routes with geospatial data', 'https://developers.google.com/maps/ai/grounding-lite', 'Google', '1.0.0', NULL, ARRAY['maps', 'geospatial', 'weather', 'places', 'routes', 'google'], '/server-logos/google-maps.png'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'maps-grounding-lite');

-- Insert Google Workspace MCP Server (explicitly)
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'google-workspace-mcp', 'Google Workspace MCP Server - Gmail, Calendar, Drive, and other Google Workspace services', 'https://github.com/taylorwilsdon/google-workspace-mcp', 'taylorwilsdon', '1.0.0', 'npx -y @taylorwilsdon/google-workspace-mcp', ARRAY['google', 'gmail', 'calendar', 'drive', 'workspace'], '/server-logos/google-workspace.webp'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'google-workspace-mcp');

-- Insert tools for LangChain MCP Server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'agent_executor',
  'Execute a complex, multi-step reasoning task using LangChain agent with ReAct pattern',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "The user query or task"}, "system_instruction": {"type": "string", "description": "Optional system-level instructions to customize agent behavior"}}, "required": ["query"]}'::jsonb,
  'Execute agent: {"query": "What is the capital of France?", "system_instruction": "You are a helpful assistant."}'
FROM mcp_servers s
WHERE s.name = 'langchain-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'agent_executor');

-- Insert tools for Google Maps Grounding Lite
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'lookup_weather',
  'Get current weather conditions, hourly forecasts, or daily forecasts for a location',
  '{"type": "object", "properties": {"location": {"type": "string", "description": "Location name or address"}, "year": {"type": "integer", "description": "Year for forecast (optional)"}, "month": {"type": "integer", "description": "Month for forecast (1-12, optional)"}, "day": {"type": "integer", "description": "Day for forecast (optional)"}, "hour": {"type": "integer", "description": "Hour for hourly forecast (0-23, optional)"}}, "required": ["location"]}'::jsonb,
  'Get weather: {"location": "San Francisco, CA"}'
FROM mcp_servers s
WHERE s.name = 'maps-grounding-lite'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'lookup_weather');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'search_places',
  'Search for places using Google Maps data',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query for places"}}, "required": ["query"]}'::jsonb,
  'Search places: {"query": "restaurants near Times Square"}'
FROM mcp_servers s
WHERE s.name = 'maps-grounding-lite'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'search_places');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'compute_routes',
  'Compute routes between locations using Google Maps',
  '{"type": "object", "properties": {"origin": {"type": "string", "description": "Starting location"}, "destination": {"type": "string", "description": "Destination location"}}, "required": ["origin", "destination"]}'::jsonb,
  'Compute route: {"origin": "San Francisco, CA", "destination": "Los Angeles, CA"}'
FROM mcp_servers s
WHERE s.name = 'maps-grounding-lite'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'compute_routes');

-- Insert tools for Google Workspace MCP Server
-- Gmail tools
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'gmail_search',
  'Search Gmail messages using Gmail search syntax',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "Gmail search query"}}, "required": ["query"]}'::jsonb,
  'Search Gmail: {"query": "from:example@gmail.com"}'
FROM mcp_servers s
WHERE s.name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'gmail_search');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'gmail_send',
  'Send an email through Gmail',
  '{"type": "object", "properties": {"to": {"type": "string", "description": "Recipient email address"}, "subject": {"type": "string", "description": "Email subject"}, "body": {"type": "string", "description": "Email body"}}, "required": ["to", "subject", "body"]}'::jsonb,
  'Send email: {"to": "recipient@example.com", "subject": "Hello", "body": "This is a test email"}'
FROM mcp_servers s
WHERE s.name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'gmail_send');

-- Calendar tools
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'calendar_list_events',
  'List calendar events for a given time range',
  '{"type": "object", "properties": {"calendar_id": {"type": "string", "description": "Calendar ID (use primary for default)"}, "time_min": {"type": "string", "description": "Start time (ISO 8601)"}, "time_max": {"type": "string", "description": "End time (ISO 8601)"}}, "required": ["calendar_id"]}'::jsonb,
  'List events: {"calendar_id": "primary", "time_min": "2024-01-01T00:00:00Z"}'
FROM mcp_servers s
WHERE s.name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'calendar_list_events');

-- Drive tools
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  s.id,
  'drive_list_files',
  'List files in Google Drive',
  '{"type": "object", "properties": {"max_results": {"type": "integer", "description": "Maximum number of results"}, "query": {"type": "string", "description": "Search query"}}, "required": []}'::jsonb,
  'List files: {"max_results": 10}'
FROM mcp_servers s
WHERE s.name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools t WHERE t.server_id = s.id AND t.name = 'drive_list_files');

-- Update existing servers with logo URLs
UPDATE mcp_servers SET logo_url = '/server-logos/brave-search.webp' WHERE name = 'brave-search' AND logo_url IS NULL;
UPDATE mcp_servers SET logo_url = '/server-logos/puppeteer.png' WHERE name = 'puppeteer' AND logo_url IS NULL;
UPDATE mcp_servers SET logo_url = '/server-logos/filesystem.svg' WHERE name = 'filesystem' AND logo_url IS NULL;
UPDATE mcp_servers SET logo_url = '/server-logos/postgres.svg' WHERE name = 'postgres' AND logo_url IS NULL;
