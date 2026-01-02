import { createClient } from "@/lib/supabase/server"
import { mcpRuntime } from "@/lib/mcp/runtime"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { server_instance_id, method, params } = await request.json()

    if (!server_instance_id || !method) {
      return NextResponse.json({ error: "server_instance_id and method are required" }, { status: 400 })
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

    // Get server instance
    const { data: instance, error: instanceError } = await supabase
      .from("mcp_server_instances")
      .select("id, user_id, server_id, account_id, transport_type, status")
      .eq("id", server_instance_id)
      .eq("user_id", user.id)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    if (instance.status !== "running") {
      return NextResponse.json({ error: "Instance is not running" }, { status: 400 })
    }

    // Get transport
    const transport = mcpRuntime.getTransport(instance.user_id, instance.server_id, instance.account_id)

    if (!transport || !transport.isConnected()) {
      return NextResponse.json({ error: "Transport not available" }, { status: 503 })
    }

    // Make MCP call
    try {
      const result = await transport.send(method, params)
      return NextResponse.json({ result })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "MCP call failed" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[MCP Call] Error:", error)
    return NextResponse.json({ error: "Failed to execute MCP call" }, { status: 500 })
  }
}
