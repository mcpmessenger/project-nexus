import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get("server_id")

    const supabase = await createClient()
    let query = supabase
      .from("mcp_tools")
      .select(`
        *,
        mcp_servers (
          name,
          author,
          tags
        )
      `)
      .order("name")

    if (serverId) {
      query = query.eq("server_id", serverId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tools" }, { status: 500 })
  }
}
