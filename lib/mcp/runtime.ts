import { ChildProcess } from "child_process"
import { StdioTransport, HttpTransport, MCPTransport } from "./transport"
import { createClient } from "@/lib/supabase/server"

export interface MCPServerInstanceConfig {
  id: string
  user_id: string
  server_id: string
  account_id: string
  transport_type: "stdio" | "http"
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  port?: number
}

/**
 * MCP Server Runtime Manager
 * Handles lifecycle of MCP server instances
 */
export class MCPServerRuntime {
  private instances = new Map<string, MCPTransport>()

  /**
   * Start an MCP server instance
   */
  async startInstance(config: MCPServerInstanceConfig): Promise<MCPTransport> {
    const instanceKey = `${config.user_id}:${config.server_id}:${config.account_id}`

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
      transport = new StdioTransport(config.command, config.args || [], config.env)
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
  async stopInstance(userId: string, serverId: string, accountId: string): Promise<void> {
    const instanceKey = `${userId}:${serverId}:${accountId}`
    const transport = this.instances.get(instanceKey)

    if (transport) {
      await transport.close()
      this.instances.delete(instanceKey)
    }

    // Find instance ID from database
    const supabase = await createClient()
    const { data: instance } = await supabase
      .from("mcp_server_instances")
      .select("id")
      .eq("user_id", userId)
      .eq("server_id", serverId)
      .eq("account_id", accountId)
      .single()

    if (instance) {
      await this.updateInstanceStatus(instance.id, "stopped")
    }
  }

  /**
   * Get transport for an instance
   */
  getTransport(userId: string, serverId: string, accountId: string): MCPTransport | null {
    const instanceKey = `${userId}:${serverId}:${accountId}`
    return this.instances.get(instanceKey) || null
  }

  /**
   * Check if instance is running
   */
  isInstanceRunning(userId: string, serverId: string, accountId: string): boolean {
    const transport = this.getTransport(userId, serverId, accountId)
    return transport !== null && transport.isConnected()
  }

  /**
   * Update instance status in database
   */
  private async updateInstanceStatus(instanceId: string, status: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from("mcp_server_instances")
      .update({
        status,
        updated_at: new Date().toISOString(),
        last_health_check: new Date().toISOString(),
      })
      .eq("id", instanceId)
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
