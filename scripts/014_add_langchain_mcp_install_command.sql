-- Add install_command for langchain-mcp server
-- Note: If this command doesn't work, check the GitHub repository for the correct package name:
-- https://github.com/mcpmessenger/langchain-mcp

-- Update langchain-mcp to have an install command
-- Common patterns for MCP servers: npx -y @author/package-name or npx -y package-name
-- You may need to adjust this based on the actual npm package name
UPDATE mcp_servers
SET install_command = 'npx -y @mcpmessenger/langchain-mcp'
WHERE name = 'langchain-mcp'
  AND (install_command IS NULL OR install_command = '');

-- If the above package name doesn't exist, try these alternatives by running separate UPDATE statements:
-- UPDATE mcp_servers SET install_command = 'npx -y langchain-mcp' WHERE name = 'langchain-mcp';
-- UPDATE mcp_servers SET install_command = 'npx -y mcpmessenger-langchain-mcp' WHERE name = 'langchain-mcp';
