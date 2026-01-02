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
}

export interface SearchResult {
  tool_id: string
  tool_name: string
  tool_description: string | null
  server_name: string
  server_id: string
  similarity: number
}
