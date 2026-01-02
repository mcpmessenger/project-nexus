import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: server, error: serverError } = await supabase.from("mcp_servers").select("*").eq("id", id).single()

    if (serverError) {
      return NextResponse.json({ error: serverError.message }, { status: 500 })
    }

    const { data: tools, error: toolsError } = await supabase.from("mcp_tools").select("*").eq("server_id", id)

    if (toolsError) {
      return NextResponse.json({ error: toolsError.message }, { status: 500 })
    }

    return NextResponse.json({ server, tools })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch server details" }, { status: 500 })
  }
}
