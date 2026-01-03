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

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get server instance ID if server_id is provided
    let server_instance_id: string | undefined
    if (user && server_id) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'execute/route.ts:27',message:'Looking up server instance',data:{userId:user.id,serverId:server_id,accountId:account_id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
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
      
      const { data: instance, error: queryError } = await query.limit(1).maybeSingle()
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'execute/route.ts:44',message:'Instance lookup result',data:{found:!!instance,instanceId:instance?.id,queryError:queryError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (instance) {
        server_instance_id = instance.id
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'execute/route.ts:48',message:'Setting server_instance_id',data:{serverInstanceId:server_instance_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }
    }

    const { data: execution, error: insertError } = await supabase
      .from("sandbox_executions")
      .insert({
        tool_id: tool_id || null,
        code,
        status: "pending",
        server_instance_id: server_instance_id || null,
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
    const authToken = session?.access_token ?? null
    const env: Record<string, string> = {}
    if (nexus_api_url) {
      env.NEXUS_SERVER_URL = nexus_api_url
    }
    if (server_instance_id) {
      env.NEXUS_INSTANCE_ID = server_instance_id
    }
    if (authToken) {
      env.NEXUS_AUTH_TOKEN = authToken
    }

    const sandboxOptions = {
      nexus_api_url,
      server_instance_id,
      nexus_auth_token: authToken,
      env,
    }

    let sandboxResult
    try {
      sandboxResult = await executePythonCode(code, sandboxOptions)
    } catch (sandboxError: any) {
      console.error("[Sandbox] Execution threw error:", sandboxError)
      sandboxResult = {
        stdout: "",
        stderr: sandboxError.message || String(sandboxError),
        return_value: null,
        error: sandboxError.message || "Python execution failed",
      }
    }

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

    try {
      console.log("[Sandbox] Updating execution:", execution.id, { status, executionTime, error })
      
      // First, try the update without SELECT to avoid RLS issues
      const { error: updateError } = await supabase
        .from("sandbox_executions")
        .update({
          status,
          output: outputToStore,
          error,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)

      if (updateError) {
        console.error("[Sandbox] Update error:", updateError)
        console.error("[Sandbox] Update error details:", JSON.stringify(updateError, null, 2))
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Now fetch the updated execution separately
      const { data: finalExecution, error: fetchError } = await supabase
        .from("sandbox_executions")
        .select("*")
        .eq("id", execution.id)
        .maybeSingle()

      if (fetchError) {
        console.error("[Sandbox] Fetch error after update:", fetchError)
        // Even if fetch fails, the update likely succeeded, so return the execution we have
        return NextResponse.json({
          ...execution,
          status,
          output: outputToStore,
          error,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString(),
        })
      }

      if (!finalExecution) {
        console.error("[Sandbox] No execution returned from fetch - update may have succeeded but RLS blocked SELECT")
        // Return the execution with updated fields even if we can't fetch it
        return NextResponse.json({
          ...execution,
          status,
          output: outputToStore,
          error,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString(),
        })
      }

      console.log("[Sandbox] Successfully updated execution:", finalExecution.id)
      return NextResponse.json(finalExecution)
    } catch (updateException: any) {
      console.error("[Sandbox] Update exception:", updateException)
      console.error("[Sandbox] Update exception stack:", updateException.stack)
      return NextResponse.json({ error: updateException.message || "Failed to update execution" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Execution error:", error)
    return NextResponse.json({ error: "Execution failed" }, { status: 500 })
  }
}
