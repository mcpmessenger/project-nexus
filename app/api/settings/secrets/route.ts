import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_secrets")
      .select("id, key, value")
      .eq("user_id", user.id)

    if (error) {
      console.error("[User Secrets] Database error:", error)
      // If table doesn't exist, return empty array instead of error
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[User Secrets] user_secrets table does not exist - returning empty array")
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("[User Secrets] GET error:", error)
    return NextResponse.json({ error: "Failed to load secrets" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json()

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 })
    }

    if (typeof value !== "string") {
      return NextResponse.json({ error: "value must be a string" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_secrets")
      .upsert(
        {
          user_id: user.id,
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: ["user_id", "key"] }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[User Secrets] POST error:", error)
    return NextResponse.json({ error: "Failed to save secret" }, { status: 500 })
  }
}
