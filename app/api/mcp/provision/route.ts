import { createClient } from "@/lib/supabase/server"
import { mcpRuntime } from "@/lib/mcp/runtime"
import { decryptTokens } from "@/lib/oauth/google"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { server_id, account_id } = await request.json()

    if (!server_id) {
      return NextResponse.json({ error: "server_id is required" }, { status: 400 })
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

    // Check if server requires OAuth (only google-workspace-mcp currently)
    const serverName = server.name?.toLowerCase() || ""
    const requiresOAuth = serverName === "google-workspace-mcp"

    if (requiresOAuth && !account_id) {
      return NextResponse.json({ error: "account_id is required for this server" }, { status: 400 })
    }

    // Get account info only if OAuth is required
    let account = null
    let tokens = { access_token: null, refresh_token: null }
    if (requiresOAuth && account_id) {
      const { data: accountData, error: accountError } = await supabase
        .from("oauth_accounts")
        .select("id, encrypted_access_token, encrypted_refresh_token, user_id")
        .eq("id", account_id)
        .eq("user_id", user.id)
        .single()

      if (accountError || !accountData) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
      account = accountData
      tokens = decryptTokens(account.encrypted_access_token, account.encrypted_refresh_token)
    }

    // Check if instance already exists
    let existingInstanceQuery = supabase
      .from("mcp_server_instances")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("server_id", server_id)
    
    if (account_id) {
      existingInstanceQuery = existingInstanceQuery.eq("account_id", account_id)
    } else {
      existingInstanceQuery = existingInstanceQuery.is("account_id", null)
    }
    
    const { data: existingInstance } = await existingInstanceQuery.single()

    // Create token directory and file only if OAuth is required
    let tokenFile: string | null = null
    if (requiresOAuth && account && account_id) {
      const tokenDir = join(process.cwd(), ".mcp-tokens", user.id, account_id)
      await mkdir(tokenDir, { recursive: true })

      // Create token file (google-workspace-mcp expects token.json)
      tokenFile = join(tokenDir, "token.json")
      await writeFile(
        tokenFile,
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        }),
        "utf8"
      )
    }

    // Determine command based on server
    let command: string
    let args: string[] = []

    if (server.name === "google-workspace-mcp" || server.install_command?.includes("google-workspace")) {
      command = mcpRuntime.findNpxCommand()
      args = ["-y", "@taylorwilsdon/google-workspace-mcp"]
    } else if (server.install_command) {
      const parts = server.install_command.split(" ")
      const firstPart = parts[0]
      // If command is npx, use our finder function
      if (firstPart === "npx") {
        command = mcpRuntime.findNpxCommand()
        args = parts.slice(1)
      } else {
        command = firstPart
        args = parts.slice(1)
      }
    } else {
      return NextResponse.json({ error: "Server install command not found" }, { status: 400 })
    }

    // Prepare environment for the process
    const env: Record<string, string> = {}
    if (requiresOAuth && tokenFile) {
      env.GOOGLE_TOKEN_FILE = tokenFile
      if (tokens.refresh_token) {
        env.GOOGLE_OAUTH_TOKEN = tokens.refresh_token
      }
      if (tokens.access_token) {
        env.NEXUS_AUTH_TOKEN = tokens.access_token
      }
    }

    // Create or update instance record
    const instanceData: any = {
      user_id: user.id,
      server_id: server_id,
      account_id: account_id || null,
      transport_type: "stdio" as const,
      status: "starting" as const,
      config: requiresOAuth && tokenFile ? {
        token_file: tokenFile,
        refresh_token_available: Boolean(tokens.refresh_token),
      } : {},
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
      account_id: account_id || null,
      transport_type: "stdio",
      command,
      args,
      env,
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
