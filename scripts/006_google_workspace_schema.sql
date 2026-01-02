-- OAuth Accounts table - Store Google account links with encrypted tokens
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users when Supabase Auth is enabled
  provider TEXT NOT NULL DEFAULT 'google',
  email TEXT NOT NULL,
  account_label TEXT, -- User-friendly label (e.g., "Work", "Personal")
  encrypted_refresh_token TEXT NOT NULL,
  encrypted_access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, email)
);

-- OAuth Scopes table - Track granted scopes per account (for incremental scope upgrades)
CREATE TABLE IF NOT EXISTS oauth_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES oauth_accounts(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, scope)
);

-- MCP Server Instances table - Track active MCP server processes per user
CREATE TABLE IF NOT EXISTS mcp_server_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES oauth_accounts(id) ON DELETE CASCADE,
  process_id INTEGER, -- OS process ID for stdio servers
  transport_type TEXT NOT NULL CHECK (transport_type IN ('stdio', 'http')),
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('starting', 'running', 'stopped', 'error')),
  port INTEGER, -- For HTTP transport
  config JSONB, -- Server-specific configuration
  last_health_check TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, server_id, account_id)
);

-- MCP Server Configs table - Store server-specific configuration
CREATE TABLE IF NOT EXISTS mcp_server_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES mcp_server_instances(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, config_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_scopes_account_id ON oauth_scopes(account_id);
CREATE INDEX IF NOT EXISTS idx_mcp_instances_user_id ON mcp_server_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_instances_server_id ON mcp_server_instances(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_instances_account_id ON mcp_server_instances(account_id);
CREATE INDEX IF NOT EXISTS idx_mcp_instances_status ON mcp_server_instances(status);
CREATE INDEX IF NOT EXISTS idx_mcp_configs_instance_id ON mcp_server_configs(instance_id);

-- Enable RLS on all new tables
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_accounts
-- Users can only see their own accounts
CREATE POLICY "Users can view their own oauth accounts"
  ON oauth_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own accounts
CREATE POLICY "Users can insert their own oauth accounts"
  ON oauth_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own accounts
CREATE POLICY "Users can update their own oauth accounts"
  ON oauth_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own accounts
CREATE POLICY "Users can delete their own oauth accounts"
  ON oauth_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for oauth_scopes
CREATE POLICY "Users can view scopes for their accounts"
  ON oauth_scopes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM oauth_accounts
      WHERE oauth_accounts.id = oauth_scopes.account_id
      AND oauth_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scopes for their accounts"
  ON oauth_scopes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM oauth_accounts
      WHERE oauth_accounts.id = oauth_scopes.account_id
      AND oauth_accounts.user_id = auth.uid()
    )
  );

-- RLS Policies for mcp_server_instances
CREATE POLICY "Users can view their own server instances"
  ON mcp_server_instances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own server instances"
  ON mcp_server_instances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own server instances"
  ON mcp_server_instances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own server instances"
  ON mcp_server_instances FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for mcp_server_configs
CREATE POLICY "Users can view configs for their instances"
  ON mcp_server_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mcp_server_instances
      WHERE mcp_server_instances.id = mcp_server_configs.instance_id
      AND mcp_server_instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage configs for their instances"
  ON mcp_server_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mcp_server_instances
      WHERE mcp_server_instances.id = mcp_server_configs.instance_id
      AND mcp_server_instances.user_id = auth.uid()
    )
  );
