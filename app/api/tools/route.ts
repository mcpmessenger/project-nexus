import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get("server_id")

    const supabase = await createClient()
    
    // Query tools first
    let toolsQuery = supabase.from("mcp_tools").select("*").order("name")

    if (serverId) {
      toolsQuery = toolsQuery.eq("server_id", serverId)
    }

    const { data: tools, error: toolsError } = await toolsQuery

    if (toolsError) {
      return NextResponse.json({ error: toolsError.message }, { status: 500 })
    }

    if (!tools || tools.length === 0) {
      return NextResponse.json([])
    }

    // Get unique server IDs
    const serverIds = [...new Set(tools.map((tool: any) => tool.server_id))]

    // Query servers separately to avoid nested select schema cache issue
    // Temporarily exclude logo_url until PostgREST schema cache refreshes
    const { data: servers, error: serversError } = await supabase
      .from("mcp_servers")
      .select("id, name, author, tags")
      .in("id", serverIds)

    if (serversError) {
      return NextResponse.json({ error: serversError.message }, { status: 500 })
    }

    // Create a map of servers by ID
    const serversMap = new Map(servers?.map((s: any) => [s.id, s]) || [])

    // Combine tools with server data
    // Add logo_url as null for now until PostgREST schema cache refreshes
    const toolsWithServers = tools.map((tool: any) => {
      const server = serversMap.get(tool.server_id)
      return {
        ...tool,
        mcp_servers: server ? { ...server, logo_url: null } : null,
      }
    })

    return NextResponse.json(toolsWithServers)
  } catch (error: any) {
    console.error("[API Tools] Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch tools" }, { status: 500 })
  }
}
