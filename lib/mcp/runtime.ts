import { StdioTransport, HttpTransport, MCPTransport } from "./transport"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

export interface MCPServerInstanceConfig {
  id: string
  user_id: string
  server_id: string
  account_id: string | null
  transport_type: "stdio" | "http"
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  port?: number
}

export interface MCPLogEntry {
  timestamp: string
  level: "stdout" | "stderr"
  message: string
}

/**
 * MCP Server Runtime Manager
 * Handles lifecycle of MCP server instances
 */
export class MCPServerRuntime {
  private instances = new Map<string, MCPTransport>()
  private logs = new Map<string, MCPLogEntry[]>()

  /**
   * Start an MCP server instance
   */
  async startInstance(config: MCPServerInstanceConfig): Promise<MCPTransport> {
    const instanceKey = `${config.user_id}:${config.server_id}:${config.account_id ?? 'null'}`
    this.logs.set(config.id, [])

    // Check if instance already exists
    if (this.instances.has(instanceKey)) {
      const existing = this.instances.get(instanceKey)!
      if (existing.isConnected()) {
        return existing
      }
      // Remove disconnected instance
      this.instances.delete(instanceKey)
    }

    let transport: MCPTransport

    if (config.transport_type === "stdio") {
      if (!config.command) {
        throw new Error("Command required for stdio transport")
      }
      transport = new StdioTransport(
        config.command,
        config.args || [],
        config.env,
        (line, level) => this.appendLog(config.id, level, line)
      )
    } else if (config.transport_type === "http") {
      if (!config.url) {
        throw new Error("URL required for HTTP transport")
      }
      transport = new HttpTransport(config.url, 30000)
    } else {
      throw new Error(`Unsupported transport type: ${config.transport_type}`)
    }

    this.instances.set(instanceKey, transport)

    // Update database
    await this.updateInstanceStatus(config.id, "running")

    return transport
  }

  /**
   * Stop an MCP server instance
   */
  async stopInstance(userId: string, serverId: string, accountId: string | null): Promise<void> {
    const instanceKey = `${userId}:${serverId}:${accountId ?? 'null'}`
    const transport = this.instances.get(instanceKey)

    if (transport) {
      console.log(`[MCP Runtime] Stopping transport for key: ${instanceKey}`)
      await transport.close()
      this.instances.delete(instanceKey)
      console.log(`[MCP Runtime] Transport stopped and removed from map`)
    } else {
      console.log(`[MCP Runtime] No transport found in memory for key: ${instanceKey}`)
    }

    // Find instance ID from database and update status
    const supabase = await createClient()
    const { data: instance, error: instanceError } = await supabase
      .from("mcp_server_instances")
      .select("id")
      .eq("user_id", userId)
      .eq("server_id", serverId)
      .eq("account_id", accountId)
      .maybeSingle()

    if (instanceError) {
      console.error("[MCP Runtime] Error looking up instance for stop:", instanceError)
    }

    if (instance) {
      console.log(`[MCP Runtime] Updating instance ${instance.id} status to stopped`)
      await this.updateInstanceStatus(instance.id, "stopped")
      this.logs.delete(instance.id)
      console.log(`[MCP Runtime] Instance ${instance.id} marked as stopped`)
    } else {
      console.log(`[MCP Runtime] No database instance found for userId=${userId}, serverId=${serverId}, accountId=${accountId}`)
    }
  }

  /**
   * Get transport for an instance
   */
  getTransport(userId: string, serverId: string, accountId: string | null): MCPTransport | null {
    const instanceKey = `${userId}:${serverId}:${accountId ?? 'null'}`
    return this.instances.get(instanceKey) || null
  }

  /**
   * Check if instance is running
   */
  isInstanceRunning(userId: string, serverId: string, accountId: string | null): boolean {
    const transport = this.getTransport(userId, serverId, accountId)
    return transport !== null && transport.isConnected()
  }

  /**
   * Update instance status in database
   * Uses service role client to bypass RLS (server-side operation)
   */
  private async updateInstanceStatus(instanceId: string, status: string): Promise<void> {
    // Use service role client to bypass RLS for server-side status updates
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("mcp_server_instances")
      .update({
        status,
        updated_at: new Date().toISOString(),
        last_health_check: new Date().toISOString(),
      })
      .eq("id", instanceId)
      .select()
    
    if (error) {
      console.error(`[MCP Runtime] Failed to update instance ${instanceId} status to ${status}:`, error)
      throw error
    } else {
      console.log(`[MCP Runtime] Successfully updated instance ${instanceId} status to ${status}`, data?.[0])
    }
  }

  /**
   * Health check for all instances
   */
  async healthCheck(): Promise<void> {
    const supabase = await createClient()
    const { data: instances } = await supabase
      .from("mcp_server_instances")
      .select("id, user_id, server_id, account_id, status")
      .eq("status", "running")

    if (!instances) return

    for (const instance of instances) {
      const isRunning = this.isInstanceRunning(
        instance.user_id,
        instance.server_id,
        instance.account_id
      )

      if (!isRunning && instance.status === "running") {
        await this.updateInstanceStatus(instance.id, "stopped")
      }
    }
  }

  /**
   * Cleanup all instances (for shutdown)
   */
  async cleanup(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const transport of this.instances.values()) {
      promises.push(transport.close())
    }
    await Promise.all(promises)
    this.instances.clear()
    this.logs.clear()
  }

  getLogs(instanceId: string): MCPLogEntry[] {
    return this.logs.get(instanceId) || []
  }

  private appendLog(instanceId: string, level: "stdout" | "stderr", message: string) {
    const trimmed = message.trim()
    if (!trimmed) return
    const entries = this.logs.get(instanceId) || []
    entries.push({
      timestamp: new Date().toISOString(),
      level,
      message: trimmed,
    })
    if (entries.length > 200) {
      entries.shift()
    }
    this.logs.set(instanceId, entries)
  }
}

// Singleton instance
export const mcpRuntime = new MCPServerRuntime()

// Periodic health check (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    mcpRuntime.healthCheck().catch(console.error)
  }, 5 * 60 * 1000)
}
