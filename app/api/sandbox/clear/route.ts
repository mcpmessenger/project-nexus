import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all executions
    // Note: This requires a DELETE policy on sandbox_executions table
    // The RLS policy should allow DELETE operations (check scripts/004_create_rls_policies.sql)
    const { error: deleteError } = await supabase
      .from("sandbox_executions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all (this condition matches all rows)

    if (deleteError) {
      console.error("[Clear Executions] Delete error:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Executions cleared" })
  } catch (error: any) {
    console.error("[Clear Executions] Error:", error)
    return NextResponse.json({ error: "Failed to clear executions" }, { status: 500 })
  }
}
