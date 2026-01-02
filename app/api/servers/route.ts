import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get("tag")
    const search = searchParams.get("search")

    const supabase = await createClient()
    let query = supabase.from("mcp_servers").select("*").order("downloads", { ascending: false })

    if (tag) {
      query = query.contains("tags", [tag])
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch servers" }, { status: 500 })
  }
}
