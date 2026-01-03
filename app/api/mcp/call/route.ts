import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { mcpRuntime } from "@/lib/mcp/runtime"
import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const { server_instance_id, method, params } = await request.json()
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call/route.ts:8',message:'MCP call request received',data:{serverInstanceId:server_instance_id,method,hasParams:!!params},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!server_instance_id || !method) {
      return NextResponse.json({ error: "server_instance_id and method are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user from bearer token or session
    const authHeader = request.headers.get("authorization")
    let user = null
    let userError = null
    let useServiceRole = false

    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim()
      if (token) {
        // Verify the token and get user
        const result = await supabase.auth.getUser(token)
        user = result.data.user
        userError = result.error
        useServiceRole = true // Use service role for bearer token auth (RLS doesn't work with bearer tokens)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call/route.ts:26',message:'Bearer token auth result',data:{userId:user?.id,hasError:!!userError,error:userError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    } else {
      // Fall back to session-based auth
      const result = await supabase.auth.getUser()
      user = result.data.user
      userError = result.error
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call/route.ts:34',message:'Session auth result',data:{userId:user?.id,hasError:!!userError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client for bearer token auth (bypasses RLS, but we still verify user_id manually)
    let queryClient
    try {
      queryClient = useServiceRole ? createServiceRoleClient() : supabase
    } catch (error: any) {
      if (error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.error("[MCP Call] Service role key not set. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.")
        return NextResponse.json({ 
          error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your .env.local file. Get it from Supabase Dashboard → Settings → API → service_role key" 
        }, { status: 500 })
      }
      throw error
    }

    // Get server instance
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call/route.ts:42',message:'Looking up instance in DB',data:{serverInstanceId:server_instance_id,userId:user.id,useServiceRole},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const { data: instance, error: instanceError } = await queryClient
      .from("mcp_server_instances")
      .select("id, user_id, server_id, account_id, transport_type, status, process_id")
      .eq("id", server_instance_id)
      .eq("user_id", user.id)
      .maybeSingle()
      
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f66928-ac43-4802-8101-eb785b4ee966',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'call/route.ts:49',message:'Instance lookup result',data:{found:!!instance,instanceId:instance?.id,instanceUserId:instance?.user_id,instanceStatus:instance?.status,hasError:!!instanceError,error:instanceError?.message,errorCode:instanceError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (instanceError) {
      console.error("[MCP Call] Instance lookup error:", instanceError)
      console.error("[MCP Call] Looking for instance_id:", server_instance_id)
      console.error("[MCP Call] User ID:", user.id)
      return NextResponse.json({ error: `Instance lookup failed: ${instanceError.message}` }, { status: 500 })
    }

    if (!instance) {
      console.error("[MCP Call] Instance not found - no matching record")
      console.error("[MCP Call] Looking for instance_id:", server_instance_id)
      console.error("[MCP Call] User ID:", user.id)
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    if (instance.status !== "running") {
      return NextResponse.json({ error: "Instance is not running" }, { status: 400 })
    }

    // Verify process is actually running (if process_id exists and transport_type is stdio)
    if (instance.process_id && instance.transport_type === "stdio") {
      try {
        const platform = process.platform
        if (platform === "win32") {
          // Windows: use tasklist to check if process exists
          await execAsync(`tasklist /FI "PID eq ${instance.process_id}"`)
        } else {
          // Unix/Linux/Mac: use kill -0 to check if process exists (doesn't kill, just checks)
          await execAsync(`kill -0 ${instance.process_id}`)
        }
        // Process exists - continue
      } catch (processCheckError: any) {
        // Process doesn't exist - update database status and return error
        console.log(`[MCP Call] Process ${instance.process_id} not found - updating database status to stopped`)
        try {
          const serviceRoleClient = createServiceRoleClient()
          await serviceRoleClient
            .from("mcp_server_instances")
            .update({
              status: "stopped",
              updated_at: new Date().toISOString(),
            })
            .eq("id", instance.id)
          console.log(`[MCP Call] Database status updated to stopped for instance ${instance.id}`)
        } catch (updateError) {
          console.error(`[MCP Call] Failed to update instance status:`, updateError)
        }
        return NextResponse.json({ 
          error: "Server instance process is not running. Please re-provision the server." 
        }, { status: 503 })
      }
    }

    // Get transport with automatic recovery
    const transport = await mcpRuntime.getTransportWithRecovery(
      instance.id,
      instance.user_id,
      instance.server_id,
      instance.account_id
    )

    if (!transport || !transport.isConnected()) {
      // Transport not available and recovery failed
      return NextResponse.json({ 
        error: "Transport not available. The server instance may have stopped. Please re-provision the server." 
      }, { status: 503 })
    }

    // Make MCP call
    try {
      const result = await transport.send(method, params)
      return NextResponse.json({ result })
    } catch (error: any) {
      console.error("[MCP Call] Transport error:", error)
      console.error("[MCP Call] Method:", method)
      console.error("[MCP Call] Params:", JSON.stringify(params, null, 2))
      const errorMessage = error?.message || error?.toString() || "MCP call failed"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[MCP Call] Error:", error)
    console.error("[MCP Call] Error stack:", error?.stack)
    const errorMessage = error?.message || error?.toString() || "Failed to execute MCP call"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
