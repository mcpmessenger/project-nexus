import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get("server_id")
    const accountId = searchParams.get("account_id")

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let query = supabase
      .from("mcp_server_instances")
      .select(`
        *,
        mcp_servers (
          id,
          name,
          description
        ),
        oauth_accounts (
          id,
          email,
          account_label
        )
      `)
      .eq("user_id", user.id)

    if (serverId) {
      query = query.eq("server_id", serverId)
    }

    if (accountId) {
      query = query.eq("account_id", accountId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("[MCP Instances] Error:", error)
    return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 })
  }
}
