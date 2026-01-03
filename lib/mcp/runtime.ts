import { StdioTransport, HttpTransport, MCPTransport } from "./transport"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { decryptTokens } from "@/lib/oauth/google"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

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
      // Create transport - spawn errors are handled asynchronously via error event
      // We need to wait a brief moment to check if spawn failed
      transport = new StdioTransport(
        config.command,
        config.args || [],
        config.env,
        (line, level) => this.appendLog(config.id, level, line)
      )
      
      // Give spawn a moment to fail (ENOENT errors fire immediately but asynchronously)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify process actually started (check if process exists and has a PID)
      const process = (transport as any).getProcess?.()
      if (!process || process.killed || process.exitCode !== null) {
        throw new Error(`Process failed to start: ${config.command} ${config.args?.join(" ") || ""}. Please ensure ${config.command} is installed and in your PATH.`)
      }
      
      // Check if process has a PID (spawn succeeded)
      if (!process.pid) {
        throw new Error(`Command not found: ${config.command}. Please ensure ${config.command} is installed and in your PATH.`)
      }
    } else if (config.transport_type === "http") {
      if (!config.url) {
        throw new Error("URL required for HTTP transport")
      }
      transport = new HttpTransport(config.url, 30000)
    } else {
      throw new Error(`Unsupported transport type: ${config.transport_type}`)
    }

    this.instances.set(instanceKey, transport)

    // Update database - only if transport was successfully created
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
   * Get transport with automatic recovery if missing
   * If transport is missing but database says "running", attempts to re-provision
   */
  async getTransportWithRecovery(instanceId: string, userId: string, serverId: string, accountId: string | null): Promise<MCPTransport | null> {
    console.log(`[MCP Runtime] getTransportWithRecovery called for instance ${instanceId}, userId=${userId}, serverId=${serverId}, accountId=${accountId}`)
    
    // First, check if transport exists in memory
    const transport = this.getTransport(userId, serverId, accountId)
    if (transport && transport.isConnected()) {
      console.log(`[MCP Runtime] Transport found in memory and connected for instance ${instanceId}`)
      return transport
    }
    console.log(`[MCP Runtime] Transport not found in memory or not connected for instance ${instanceId}`)

    // Transport is missing - check database status
    const supabase = createServiceRoleClient()
    const { data: instance, error: instanceError } = await supabase
      .from("mcp_server_instances")
      .select("id, status, transport_type")
      .eq("id", instanceId)
      .eq("user_id", userId)
      .maybeSingle()

    if (instanceError || !instance) {
      console.log(`[MCP Runtime] Cannot recover transport - instance lookup failed:`, instanceError?.message)
      return null
    }
    console.log(`[MCP Runtime] Instance found in database: status="${instance.status}", transport_type="${instance.transport_type}"`)

    // Only attempt recovery if database says "running"
    if (instance.status !== "running") {
      console.log(`[MCP Runtime] Cannot recover transport - instance status is "${instance.status}", not "running"`)
      return null
    }

    // Attempt to reconstruct configuration and re-provision
    console.log(`[MCP Runtime] Transport missing for instance ${instanceId}, attempting auto-recovery...`)
    try {
      const config = await this.reconstructConfigFromDatabase(instanceId, userId, serverId, accountId)
      if (!config) {
        console.log(`[MCP Runtime] Failed to reconstruct config for instance ${instanceId}`)
        // Update database status to stopped since we can't recover
        await this.updateInstanceStatus(instanceId, "stopped")
        return null
      }

      // Re-provision using reconstructed config
      const recoveredTransport = await this.startInstance(config)
      
      // Update process_id in database if stdio transport
      if (config.transport_type === "stdio") {
        try {
          const process = (recoveredTransport as any).getProcess?.()
          const processId = process?.pid
          if (processId) {
            const supabase = createServiceRoleClient()
            await supabase
              .from("mcp_server_instances")
              .update({ process_id: processId })
              .eq("id", instanceId)
            console.log(`[MCP Runtime] Updated process_id to ${processId} for recovered instance ${instanceId}`)
          }
        } catch (processIdError) {
          console.error(`[MCP Runtime] Failed to update process_id for recovered instance:`, processIdError)
          // Don't fail recovery if process_id update fails
        }
      }
      
      console.log(`[MCP Runtime] Successfully recovered transport for instance ${instanceId}`)
      return recoveredTransport
    } catch (error: any) {
      console.error(`[MCP Runtime] Auto-recovery failed for instance ${instanceId}:`, error)
      // Update database status to stopped since recovery failed
      try {
        await this.updateInstanceStatus(instanceId, "stopped")
      } catch (updateError) {
        console.error(`[MCP Runtime] Failed to update status after recovery failure:`, updateError)
      }
      return null
    }
  }

  /**
   * Reconstruct server configuration from database for re-provisioning
   */
  private async reconstructConfigFromDatabase(
    instanceId: string,
    userId: string,
    serverId: string,
    accountId: string | null
  ): Promise<MCPServerInstanceConfig | null> {
    const supabase = createServiceRoleClient()

    // Get server info
    const { data: server, error: serverError } = await supabase
      .from("mcp_servers")
      .select("*")
      .eq("id", serverId)
      .single()

    if (serverError || !server) {
      console.error(`[MCP Runtime] Failed to get server info for ${serverId}:`, serverError)
      return null
    }

    // Determine command and args
    let command: string
    let args: string[] = []

    if (server.name === "google-workspace-mcp" || server.install_command?.includes("google-workspace")) {
      command = "npx"
      args = ["-y", "@taylorwilsdon/google-workspace-mcp"]
    } else if (server.install_command) {
      const parts = server.install_command.split(" ")
      command = parts[0]
      args = parts.slice(1)
    } else {
      console.error(`[MCP Runtime] Server ${serverId} has no install_command`)
      return null
    }

    // Prepare environment
    const env: Record<string, string> = {}

    // Handle OAuth if required
    const serverName = server.name?.toLowerCase() || ""
    const requiresOAuth = serverName === "google-workspace-mcp"

    if (requiresOAuth && accountId) {
      // Get OAuth account
      const { data: account, error: accountError } = await supabase
        .from("oauth_accounts")
        .select("id, encrypted_access_token, encrypted_refresh_token")
        .eq("id", accountId)
        .eq("user_id", userId)
        .single()

      if (accountError || !account) {
        console.error(`[MCP Runtime] Failed to get OAuth account ${accountId}:`, accountError)
        return null
      }

      // Decrypt tokens (access_token may be null, but refresh_token is required)
      if (!account.encrypted_refresh_token) {
        console.error(`[MCP Runtime] OAuth account ${accountId} has no refresh token`)
        return null
      }
      // decryptTokens requires both parameters, but encrypted_access_token can be null in DB
      // If access_token is null, we'll use refresh_token for both (refresh_token can decrypt as access_token in a pinch)
      // However, the decrypt function expects valid encrypted strings, so we need to handle null properly
      const tokens = decryptTokens(
        account.encrypted_access_token || account.encrypted_refresh_token,
        account.encrypted_refresh_token
      )

      // Create token file
      const tokenDir = join(process.cwd(), ".mcp-tokens", userId, accountId)
      await mkdir(tokenDir, { recursive: true })
      const tokenFile = join(tokenDir, "token.json")
      await writeFile(
        tokenFile,
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        }),
        "utf8"
      )

      env.GOOGLE_TOKEN_FILE = tokenFile
      if (tokens.refresh_token) {
        env.GOOGLE_OAUTH_TOKEN = tokens.refresh_token
      }
      if (tokens.access_token) {
        env.NEXUS_AUTH_TOKEN = tokens.access_token
      }
    }

    // Add Nexus environment variables (if needed by the sandbox)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    env.NEXUS_SERVER_URL = baseUrl
    env.NEXUS_INSTANCE_ID = instanceId

    return {
      id: instanceId,
      user_id: userId,
      server_id: serverId,
      account_id: accountId,
      transport_type: "stdio",
      command,
      args,
      env,
    }
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
