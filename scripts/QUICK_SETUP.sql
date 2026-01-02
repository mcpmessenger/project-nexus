-- QUICK SETUP: Copy and paste everything below into Supabase SQL Editor
-- This combines scripts 007 and 008 for easy setup

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

-- Update existing servers with logo URLs (optional - if they don't have conflicts)
UPDATE mcp_servers SET logo_url = '/server-logos/brave-search.webp' WHERE name = 'brave-search' AND logo_url IS NULL;
UPDATE mcp_servers SET logo_url = '/server-logos/puppeteer.png' WHERE name = 'puppeteer' AND logo_url IS NULL;
UPDATE mcp_servers SET logo_url = '/server-logos/filesystem.svg' WHERE name = 'filesystem' AND logo_url IS NULL;
UPDATE mcp_servers SET logo_url = '/server-logos/postgres.svg' WHERE name = 'postgres' AND logo_url IS NULL;
