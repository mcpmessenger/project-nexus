-- Insert sample MCP servers from the ecosystem
INSERT INTO mcp_servers (name, description, repository_url, author, version, install_command, tags) VALUES
  ('filesystem', 'Secure file operations with configurable access controls', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-filesystem', ARRAY['filesystem', 'official']),
  ('postgres', 'Read-only Postgres database access', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-postgres', ARRAY['database', 'official']),
  ('brave-search', 'Web and local search using Brave Search API', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-brave-search', ARRAY['search', 'official']),
  ('puppeteer', 'Browser automation and web scraping', 'https://github.com/modelcontextprotocol/servers', 'Anthropic', '0.6.2', 'npx -y @modelcontextprotocol/server-puppeteer', ARRAY['automation', 'official']);

-- Insert sample tools for filesystem server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'read_file',
  'Read the complete contents of a file from the file system',
  '{"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}'::jsonb,
  'Read package.json: {"path": "./package.json"}'
FROM mcp_servers WHERE name = 'filesystem';

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'write_file',
  'Create a new file or overwrite an existing file',
  '{"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"]}'::jsonb,
  'Write to file: {"path": "./output.txt", "content": "Hello World"}'
FROM mcp_servers WHERE name = 'filesystem';

-- Insert sample tools for postgres server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'query',
  'Execute a SELECT query on the connected database',
  '{"type": "object", "properties": {"sql": {"type": "string"}}, "required": ["sql"]}'::jsonb,
  'Query users: {"sql": "SELECT * FROM users LIMIT 10"}'
FROM mcp_servers WHERE name = 'postgres';

-- Insert sample tools for brave-search server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'brave_web_search',
  'Perform a web search using Brave Search API',
  '{"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}'::jsonb,
  'Search the web: {"query": "latest AI developments 2024"}'
FROM mcp_servers WHERE name = 'brave-search';

-- Insert sample tools for puppeteer server
INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'puppeteer_navigate',
  'Navigate to a URL in the browser',
  '{"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}'::jsonb,
  'Navigate to site: {"url": "https://example.com"}'
FROM mcp_servers WHERE name = 'puppeteer';

INSERT INTO mcp_tools (server_id, name, description, input_schema, example_usage) 
SELECT 
  id,
  'puppeteer_screenshot',
  'Take a screenshot of the current page',
  '{"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}'::jsonb,
  'Capture screenshot: {"name": "homepage"}'
FROM mcp_servers WHERE name = 'puppeteer';
