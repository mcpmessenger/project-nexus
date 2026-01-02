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

    // Get server instance ID if server_id is provided
    let server_instance_id: string | undefined
    if (user && server_id) {
      let query = supabase
        .from("mcp_server_instances")
        .select("id")
        .eq("user_id", user.id)
        .eq("server_id", server_id)
        .eq("status", "running")
      
      // If account_id is provided, use it; otherwise find any running instance
      if (account_id) {
        query = query.eq("account_id", account_id)
      }
      
      const { data: instance } = await query.limit(1).maybeSingle()

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

    // Ensure output is JSON-serializable and safe for JSONB storage
    // Always use an object (never null) for JSONB compatibility
    let outputToStore: any = {
      stdout: "",
      stderr: "",
      return_value: null,
      error: null,
    }
    try {
      // Create a sanitized version of the result
      const sanitizedResult: any = {
        stdout: String(sandboxResult.stdout || ""),
        stderr: String(sandboxResult.stderr || ""),
        return_value: null,
        error: sandboxResult.error || null,
      }

      // Try to serialize return_value if it exists
      if (sandboxResult.return_value !== null && sandboxResult.return_value !== undefined) {
        try {
          // First, try to stringify to check if it's valid JSON
          const serialized = JSON.stringify(sandboxResult.return_value)
          // Then parse it back to ensure it's a clean, serializable object
          sanitizedResult.return_value = JSON.parse(serialized)
        } catch {
          // If it can't be serialized, convert to string
          sanitizedResult.return_value = String(sandboxResult.return_value)
        }
      }

      // Final check: ensure the entire object is JSON-serializable
      JSON.stringify(sanitizedResult)
      outputToStore = sanitizedResult
    } catch (serializeError) {
      // If serialization fails completely, store a minimal safe version
      console.error("[Sandbox] Failed to serialize result:", serializeError)
      outputToStore = {
        stdout: String(sandboxResult.stdout || ""),
        stderr: String(sandboxResult.stderr || ""),
        return_value: null,
        error: sandboxResult.error || "Output could not be serialized to JSON",
      }
    }
    
    // Final safety check: ensure outputToStore is always a valid object
    if (!outputToStore || typeof outputToStore !== 'object' || Array.isArray(outputToStore)) {
      outputToStore = {
        stdout: String(sandboxResult.stdout || ""),
        stderr: String(sandboxResult.stderr || ""),
        return_value: null,
        error: sandboxResult.error || "Invalid output format",
      }
    }

    const { data: finalExecution, error: updateError } = await supabase
      .from("sandbox_executions")
      .update({
        status,
        output: outputToStore,
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
