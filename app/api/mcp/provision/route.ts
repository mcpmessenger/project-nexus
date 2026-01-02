import { createClient } from "@/lib/supabase/server"
import { mcpRuntime } from "@/lib/mcp/runtime"
import { decryptTokens } from "@/lib/oauth/google"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { NextResponse } from "next/server"

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const { server_id, account_id } = await request.json()

    if (!server_id || !account_id) {
      return NextResponse.json({ error: "server_id and account_id are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get server info
    const { data: server, error: serverError } = await supabase
      .from("mcp_servers")
      .select("*")
      .eq("id", server_id)
      .single()

    if (serverError || !server) {
      return NextResponse.json({ error: "Server not found" }, { status: 404 })
    }

    // Get account info
    const { data: account, error: accountError } = await supabase
      .from("oauth_accounts")
      .select("id, encrypted_access_token, encrypted_refresh_token, user_id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Check if instance already exists
    const { data: existingInstance } = await supabase
      .from("mcp_server_instances")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("server_id", server_id)
      .eq("account_id", account_id)
      .single()

    if (existingInstance && existingInstance.status === "running") {
      return NextResponse.json({ instance_id: existingInstance.id, message: "Instance already running" })
    }

    // For google-workspace-mcp, we need to:
    // 1. Install the package if not already installed
    // 2. Create token file from encrypted tokens
    // 3. Spawn the server process

    // Decrypt tokens
    const tokens = decryptTokens(account.encrypted_access_token, account.encrypted_refresh_token)

    // Create token directory
    const tokenDir = join(process.cwd(), ".mcp-tokens", user.id, account_id)
    await mkdir(tokenDir, { recursive: true })

    // Create token file (google-workspace-mcp expects token.json)
    const tokenFile = join(tokenDir, "token.json")
    await writeFile(
      tokenFile,
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }),
      "utf8"
    )

    // Determine command based on server
    let command: string
    let args: string[] = []

    if (server.name === "google-workspace-mcp" || server.install_command?.includes("google-workspace")) {
      // Use npx to run the server
      command = "npx"
      args = ["-y", "@taylorwilsdon/google-workspace-mcp"]
    } else if (server.install_command) {
      // Parse install command (e.g., "npx -y @modelcontextprotocol/server-filesystem")
      const parts = server.install_command.split(" ")
      command = parts[0]
      args = parts.slice(1)
    } else {
      return NextResponse.json({ error: "Server install command not found" }, { status: 400 })
    }

    // Create or update instance record
    const instanceData = {
      user_id: user.id,
      server_id: server_id,
      account_id: account_id,
      transport_type: "stdio" as const,
      status: "starting" as const,
      config: {
        token_file: tokenFile,
      },
    }

    let instanceId: string

    if (existingInstance) {
      const { data: updated, error: updateError } = await supabase
        .from("mcp_server_instances")
        .update(instanceData)
        .eq("id", existingInstance.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      instanceId = updated.id
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("mcp_server_instances")
        .insert(instanceData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      instanceId = inserted.id
    }

    // Start the server
    const transport = await mcpRuntime.startInstance({
      id: instanceId,
      user_id: user.id,
      server_id: server_id,
      account_id: account_id,
      transport_type: "stdio",
      command,
      args,
      env: {
        GOOGLE_TOKEN_FILE: tokenFile,
      },
    })

    // Get process ID from transport
    const process = (transport as any).getProcess?.()
    const processId = process?.pid

    if (processId) {
      await supabase
        .from("mcp_server_instances")
        .update({ process_id: processId })
        .eq("id", instanceId)
    }

    // Discover tools from the server (simplified - in production, call list_tools)
    // For now, we'll return success and tools can be discovered later

    return NextResponse.json({
      instance_id: instanceId,
      status: "running",
      message: "Server provisioned and started",
    })
  } catch (error: any) {
    console.error("[MCP Provision] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to provision server" }, { status: 500 })
  }
}
