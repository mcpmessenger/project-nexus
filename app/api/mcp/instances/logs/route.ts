import { createClient } from "@/lib/supabase/server"
import { mcpRuntime } from "@/lib/mcp/runtime"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const instanceId = searchParams.get("instance_id")

    if (!instanceId) {
      return NextResponse.json({ error: "instance_id is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: instance, error: instanceError } = await supabase
      .from("mcp_server_instances")
      .select("id, user_id")
      .eq("id", instanceId)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    if (instance.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const logs = mcpRuntime.getLogs(instanceId)
    return NextResponse.json(logs)
  } catch (error: any) {
    console.error("[MCP Instance Logs] Error:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
