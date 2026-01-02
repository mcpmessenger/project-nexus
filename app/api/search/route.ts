import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { query, embedding } = await request.json()

    if (!query && !embedding) {
      return NextResponse.json({ error: "Query or embedding required" }, { status: 400 })
    }

    const supabase = await createClient()

    // If embedding is provided, use vector search
    if (embedding && Array.isArray(embedding)) {
      const { data, error } = await supabase.rpc("search_tools_by_embedding", {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 20,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Fallback to text search if no embedding
    const { data: tools, error } = await supabase
      .from("mcp_tools")
      .select(`
        id,
        name,
        description,
        server_id,
        mcp_servers!inner (
          id,
          name,
          logo_url
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to match vector search response format
    const results = tools.map((tool: any) => ({
      tool_id: tool.id,
      tool_name: tool.name,
      tool_description: tool.description,
      server_name: tool.mcp_servers.name,
      server_id: tool.mcp_servers.id,
      similarity: 0.8, // Default similarity for text search
    }))

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
