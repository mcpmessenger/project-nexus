-- Add logo_url column to mcp_servers table for server logos
ALTER TABLE mcp_servers 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for logo_url if needed (optional)
CREATE INDEX IF NOT EXISTS idx_mcp_servers_logo_url ON mcp_servers(logo_url) WHERE logo_url IS NOT NULL;
