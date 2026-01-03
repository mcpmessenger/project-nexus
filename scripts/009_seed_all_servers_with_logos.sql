-- Comprehensive seeding script for all MCP servers with available logos
-- This ensures all servers from local development are seeded to production

-- ============================================
-- Step 1: Ensure logo_url column exists
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mcp_servers' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE mcp_servers ADD COLUMN logo_url TEXT;
        CREATE INDEX IF NOT EXISTS idx_mcp_servers_logo_url ON mcp_servers(logo_url) WHERE logo_url IS NOT NULL;
    END IF;
END $$;

-- ============================================
-- Step 2: Insert/Update Official MCP Servers
-- ============================================

-- Filesystem Server
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'filesystem', 'Secure file operations with configurable access controls', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-filesystem', ARRAY['filesystem', 'official'], NULL
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'filesystem')
ON CONFLICT DO NOTHING;

-- Postgres Server
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'postgres', 'Read-only Postgres database access', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-postgres', ARRAY['database', 'official'], NULL
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'postgres')
ON CONFLICT DO NOTHING;

-- Brave Search Server (with logo)
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'brave-search', 'Web and local search using Brave Search API', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-brave-search', ARRAY['search', 'official'], '/server-logos/brave-search.webp'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'brave-search')
ON CONFLICT DO NOTHING;

-- Puppeteer Server (with logo)
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'puppeteer', 'Browser automation and web scraping', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-puppeteer', ARRAY['automation', 'official'], '/server-logos/puppeteer.png'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'puppeteer')
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 3: Insert Additional Servers with Logos
-- ============================================

-- LangChain MCP Server (with logo)
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'langchain-mcp', 'LangChain Agent MCP Server - Multi-step reasoning with ReAct pattern', 'https://github.com/mcpmessenger/langchain-mcp', 'mcpmessenger', '1.0.0', NULL, ARRAY['langchain', 'agent', 'ai', 'reasoning'], '/server-logos/langchain-mcp.png'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'langchain-mcp')
ON CONFLICT DO NOTHING;

-- Google Maps Grounding Lite (with logo)
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'maps-grounding-lite', 'Google Maps Grounding Lite - Search places, lookup weather, compute routes with geospatial data', 'https://developers.google.com/maps/ai/grounding-lite', 'Google', '1.0.0', NULL, ARRAY['maps', 'geospatial', 'weather', 'places', 'routes', 'google'], '/server-logos/google-maps.png'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'maps-grounding-lite')
ON CONFLICT DO NOTHING;

-- Google Workspace MCP Server (with logo)
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags, logo_url) 
SELECT 'google-workspace-mcp', 'Google Workspace MCP Server - Gmail, Calendar, Drive, and other Google Workspace services', 'https://github.com/taylorwilsdon/google-workspace-mcp', 'taylorwilsdon', '1.0.0', 'npx -y @taylorwilsdon/google-workspace-mcp', ARRAY['google', 'gmail', 'calendar', 'drive', 'workspace'], '/server-logos/google-workspace.webp'
WHERE NOT EXISTS (SELECT 1 FROM mcp_servers WHERE name = 'google-workspace-mcp')
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 4: Update logo URLs for existing servers
-- ============================================
UPDATE mcp_servers SET logo_url = '/server-logos/brave-search.webp' WHERE name = 'brave-search' AND (logo_url IS NULL OR logo_url != '/server-logos/brave-search.webp');
UPDATE mcp_servers SET logo_url = '/server-logos/puppeteer.png' WHERE name = 'puppeteer' AND (logo_url IS NULL OR logo_url != '/server-logos/puppeteer.png');
UPDATE mcp_servers SET logo_url = '/server-logos/langchain-mcp.png' WHERE name = 'langchain-mcp' AND (logo_url IS NULL OR logo_url != '/server-logos/langchain-mcp.png');
UPDATE mcp_servers SET logo_url = '/server-logos/google-maps.png' WHERE name = 'maps-grounding-lite' AND (logo_url IS NULL OR logo_url != '/server-logos/google-maps.png');
UPDATE mcp_servers SET logo_url = '/server-logos/google-workspace.webp' WHERE name = 'google-workspace-mcp' AND (logo_url IS NULL OR logo_url != '/server-logos/google-workspace.webp');

-- ============================================
-- Step 5: Insert Tools for Filesystem Server
-- ============================================
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

-- ============================================
-- Step 6: Insert Tools for Postgres Server
-- ============================================
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'query',
  'Execute a SELECT query on the connected database',
  '{"type": "object", "properties": {"sql": {"type": "string"}}, "required": ["sql"]}'::jsonb,
  'Query users: {"sql": "SELECT * FROM users LIMIT 10"}'
FROM mcp_servers WHERE name = 'postgres'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'query');

-- ============================================
-- Step 7: Insert Tools for Brave Search Server
-- ============================================
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'brave_web_search',
  'Perform a web search using Brave Search API',
  '{"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}'::jsonb,
  'Search the web: {"query": "latest AI developments 2024"}'
FROM mcp_servers WHERE name = 'brave-search'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'brave_web_search');

-- ============================================
-- Step 8: Insert Tools for Puppeteer Server
-- ============================================
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'puppeteer_navigate',
  'Navigate to a URL in the browser',
  '{"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}'::jsonb,
  'Navigate to site: {"url": "https://example.com"}'
FROM mcp_servers WHERE name = 'puppeteer'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'puppeteer_navigate');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'puppeteer_screenshot',
  'Take a screenshot of the current page',
  '{"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}'::jsonb,
  'Capture screenshot: {"name": "homepage"}'
FROM mcp_servers WHERE name = 'puppeteer'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'puppeteer_screenshot');

-- ============================================
-- Step 9: Insert Tools for LangChain MCP Server
-- ============================================
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'agent_executor',
  'Execute a complex, multi-step reasoning task using LangChain agent with ReAct pattern',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "The user query or task"}, "system_instruction": {"type": "string", "description": "Optional system-level instructions to customize agent behavior"}}, "required": ["query"]}'::jsonb,
  'Execute agent: {"query": "What is the capital of France?", "system_instruction": "You are a helpful assistant."}'
FROM mcp_servers WHERE name = 'langchain-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'agent_executor');

-- ============================================
-- Step 10: Insert Tools for Google Maps Grounding Lite
-- ============================================
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'lookup_weather',
  'Get current weather conditions, hourly forecasts, or daily forecasts for a location',
  '{"type": "object", "properties": {"location": {"type": "string", "description": "Location name or address"}, "year": {"type": "integer", "description": "Year for forecast (optional)"}, "month": {"type": "integer", "description": "Month for forecast (1-12, optional)"}, "day": {"type": "integer", "description": "Day for forecast (optional)"}, "hour": {"type": "integer", "description": "Hour for hourly forecast (0-23, optional)"}}, "required": ["location"]}'::jsonb,
  'Get weather: {"location": "San Francisco, CA"}'
FROM mcp_servers WHERE name = 'maps-grounding-lite'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'lookup_weather');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'search_places',
  'Search for places using Google Maps data',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "Search query for places"}}, "required": ["query"]}'::jsonb,
  'Search places: {"query": "restaurants near Times Square"}'
FROM mcp_servers WHERE name = 'maps-grounding-lite'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'search_places');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'compute_routes',
  'Compute routes between locations using Google Maps',
  '{"type": "object", "properties": {"origin": {"type": "string", "description": "Starting location"}, "destination": {"type": "string", "description": "Destination location"}}, "required": ["origin", "destination"]}'::jsonb,
  'Compute route: {"origin": "San Francisco, CA", "destination": "Los Angeles, CA"}'
FROM mcp_servers WHERE name = 'maps-grounding-lite'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'compute_routes');

-- ============================================
-- Step 11: Insert Tools for Google Workspace MCP Server
-- ============================================
-- Gmail tools
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'gmail_search',
  'Search Gmail messages using Gmail search syntax',
  '{"type": "object", "properties": {"query": {"type": "string", "description": "Gmail search query"}}, "required": ["query"]}'::jsonb,
  'Search Gmail: {"query": "from:example@gmail.com"}'
FROM mcp_servers WHERE name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'gmail_search');

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'gmail_send',
  'Send an email through Gmail',
  '{"type": "object", "properties": {"to": {"type": "string", "description": "Recipient email address"}, "subject": {"type": "string", "description": "Email subject"}, "body": {"type": "string", "description": "Email body"}}, "required": ["to", "subject", "body"]}'::jsonb,
  'Send email: {"to": "recipient@example.com", "subject": "Hello", "body": "This is a test email"}'
FROM mcp_servers WHERE name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'gmail_send');

-- Calendar tools
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'calendar_list_events',
  'List calendar events for a given time range',
  '{"type": "object", "properties": {"calendar_id": {"type": "string", "description": "Calendar ID (use primary for default)"}, "time_min": {"type": "string", "description": "Start time (ISO 8601)"}, "time_max": {"type": "string", "description": "End time (ISO 8601)"}}, "required": ["calendar_id"]}'::jsonb,
  'List events: {"calendar_id": "primary", "time_min": "2024-01-01T00:00:00Z"}'
FROM mcp_servers WHERE name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'calendar_list_events');

-- Drive tools
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage)
SELECT 
  id,
  'drive_list_files',
  'List files in Google Drive',
  '{"type": "object", "properties": {"max_results": {"type": "integer", "description": "Maximum number of results"}, "query": {"type": "string", "description": "Search query"}}, "required": []}'::jsonb,
  'List files: {"max_results": 10}'
FROM mcp_servers WHERE name = 'google-workspace-mcp'
AND NOT EXISTS (SELECT 1 FROM mcp_tools WHERE server_id = mcp_servers.id AND name = 'drive_list_files');

-- ============================================
-- Verification Query (optional - run separately)
-- ============================================
-- SELECT 
--   s.name,
--   s.logo_url,
--   COUNT(t.id) as tool_count
-- FROM mcp_servers s
-- LEFT JOIN mcp_tools t ON t.server_id = s.id
-- GROUP BY s.id, s.name, s.logo_url
-- ORDER BY s.name;
