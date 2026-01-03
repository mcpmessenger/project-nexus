export interface MCPServer {
  id: string
  name: string
  description: string | null
  repository_url: string | null
  author: string | null
  version: string | null
  install_command: string | null
  created_at: string
  updated_at: string
  last_synced_at: string | null
  tags: string[] | null
  downloads: number
  rating: number
  logo_url: string | null
}

export interface MCPTool {
  id: string
  server_id: string
  name: string
  description: string | null
  input_schema: Record<string, any> | null
  example_usage: string | null
  created_at: string
}

export interface SandboxExecution {
  id: string
  tool_id: string | null
  code: string
  output: Record<string, any> | null
  status: "pending" | "running" | "completed" | "failed"
  started_at: string
  completed_at: string | null
  execution_time_ms: number | null
  error: string | null
  server_instance_id: string | null
}

export interface SearchResult {
  tool_id: string
  tool_name: string
  tool_description: string | null
  server_name: string
  server_id: string
  similarity: number
}

export interface OAuthAccount {
  id: string
  user_id: string
  provider: string
  email: string
  account_label: string | null
  encrypted_refresh_token: string
  encrypted_access_token: string | null
  token_expires_at: string | null
  scopes: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface MCPServerInstance {
  id: string
  user_id: string
  server_id: string
  account_id: string
  process_id: number | null
  transport_type: "stdio" | "http"
  status: "starting" | "running" | "stopped" | "error"
  port: number | null
  config: Record<string, any> | null
  last_health_check: string | null
  created_at: string
  updated_at: string
}

export interface UserSecret {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface MCPServerLogEntry {
  timestamp: string
  level: "stdout" | "stderr"
  message: string
}
