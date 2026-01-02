import { createClient } from "@/lib/supabase/server"
import { executePythonCode } from "@/lib/sandbox"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { code, tool_id, account_id, server_id } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    // Get server instance ID if account_id and server_id are provided
    let server_instance_id: string | undefined
    if (user && account_id && server_id) {
      const { data: instance } = await supabase
        .from("mcp_server_instances")
        .select("id")
        .eq("user_id", user.id)
        .eq("server_id", server_id)
        .eq("account_id", account_id)
        .eq("status", "running")
        .single()

      if (instance) {
        server_instance_id = instance.id
      }
    }

    const { data: execution, error: insertError } = await supabase
      .from("sandbox_executions")
      .insert({
        tool_id: tool_id || null,
        code,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabase.from("sandbox_executions").update({ status: "running" }).eq("id", execution.id)

    const startTime = Date.now()
    let status: "completed" | "failed" = "completed"
    let error: string | null = null

    // Prepare sandbox options
    const nexus_api_url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const sandboxOptions = {
      nexus_api_url,
      server_instance_id,
    }

    const sandboxResult = await executePythonCode(code, sandboxOptions)

    if (sandboxResult.error) {
      status = "failed"
      error = sandboxResult.error
    }

    const executionTime = Date.now() - startTime

    const { data: finalExecution, error: updateError } = await supabase
      .from("sandbox_executions")
      .update({
        status,
        output: sandboxResult,
        error,
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString(),
      })
      .eq("id", execution.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(finalExecution)
  } catch (error) {
    console.error("[v0] Execution error:", error)
    return NextResponse.json({ error: "Execution failed" }, { status: 500 })
  }
}
