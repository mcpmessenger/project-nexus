import { createClient } from "@/lib/supabase/server"
import { mcpRuntime } from "@/lib/mcp/runtime"
import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get instance to verify ownership and get server details
    const { data: instance, error: instanceError } = await supabase
      .from("mcp_server_instances")
      .select("id, user_id, server_id, account_id, status, process_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (instanceError) {
      console.error("[MCP Instances] Stop error - instance lookup failed:", instanceError)
      return NextResponse.json({ error: "Instance lookup failed" }, { status: 500 })
    }

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    console.log(`[MCP Instances] Stopping instance ${id} (userId=${instance.user_id}, serverId=${instance.server_id}, accountId=${instance.account_id}, processId=${instance.process_id})`)

    // First, try to kill the process directly by PID (this works even if transport isn't in memory)
    if (instance.process_id) {
      try {
        const platform = process.platform
        if (platform === "win32") {
          // Windows: use taskkill /F to force kill
          console.log(`[MCP Instances] Attempting to kill process ${instance.process_id} on Windows using taskkill`)
          await execAsync(`taskkill /F /PID ${instance.process_id} /T`)
          console.log(`[MCP Instances] Successfully killed process ${instance.process_id} and its children on Windows`)
        } else {
          // Unix/Linux/Mac: use kill -9
          console.log(`[MCP Instances] Attempting to kill process ${instance.process_id} on Unix using kill -9`)
          await execAsync(`kill -9 ${instance.process_id}`)
          console.log(`[MCP Instances] Successfully killed process ${instance.process_id} on Unix`)
        }
      } catch (killError: any) {
        // Check if error is because process doesn't exist (that's okay)
        const errorMsg = killError.message || killError.stderr || ''
        if (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('No such process')) {
          console.log(`[MCP Instances] Process ${instance.process_id} already dead (not an error)`)
        } else {
          console.error(`[MCP Instances] Failed to kill process ${instance.process_id}:`, errorMsg)
          // Continue anyway - we'll still update the database status
        }
      }
    }

    // Stop the instance (this will close transport if in memory and update database status)
    await mcpRuntime.stopInstance(instance.user_id, instance.server_id, instance.account_id)

    // Double-check: Ensure database status is updated (in case runtime update failed)
    const { error: updateError } = await supabase
      .from("mcp_server_instances")
      .update({
        status: "stopped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error(`[MCP Instances] Failed to update status in database:`, updateError)
    } else {
      console.log(`[MCP Instances] Confirmed database status updated to stopped for instance ${id}`)
    }

    console.log(`[MCP Instances] Instance ${id} stopped successfully`)

    return NextResponse.json({ success: true, message: "Instance stopped" })
  } catch (error: any) {
    console.error("[MCP Instances] Stop error:", error)
    return NextResponse.json({ error: error.message || "Failed to stop instance" }, { status: 500 })
  }
}
