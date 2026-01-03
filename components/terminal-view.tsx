"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Loader2, Terminal, Clock, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { SandboxExecution, MCPTool, MCPServer, MCPServerLogEntry } from "@/lib/types"
import { CodeWizard } from "@/components/code-wizard"

interface TerminalViewProps {
  initialCode?: string
  selectedTool?: (MCPTool & { server: MCPServer }) | null
}

export function TerminalView({ initialCode = "", selectedTool = null }: TerminalViewProps) {
  const [code, setCode] = useState(initialCode)
  const [mode, setMode] = useState<"wizard" | "code">("wizard")
  const [execution, setExecution] = useState<SandboxExecution | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<SandboxExecution[]>([])
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false)
  const [logTab, setLogTab] = useState<"output" | "logs">("output")
  const [infrastructureLogs, setInfrastructureLogs] = useState<MCPServerLogEntry[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Fetch recent executions
    supabase
      .from("sandbox_executions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setExecutionHistory(data)
      })

    // Subscribe to new executions
    const channel = supabase
      .channel("sandbox_executions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sandbox_executions" }, (payload) => {
        setExecutionHistory((prev) => [payload.new as SandboxExecution, ...prev.slice(0, 9)])
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sandbox_executions" }, (payload) => {
        const updated = payload.new as SandboxExecution
        setExecutionHistory((prev) => prev.map((exec) => (exec.id === updated.id ? updated : exec)))

        // Update current execution if it matches
        if (execution?.id === updated.id) {
          setExecution(updated)
          if (updated.status === "completed" || updated.status === "failed") {
            setIsExecuting(false)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [execution?.id])

  const fetchInfrastructureLogs = async (instanceId: string) => {
    setLogLoading(true)
    setLogError(null)
    try {
      const res = await fetch(`/api/mcp/instances/logs?instance_id=${encodeURIComponent(instanceId)}`)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Failed to load logs")
      }
      const data: MCPServerLogEntry[] = await res.json()
      setInfrastructureLogs(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("[TerminalView] Failed to fetch logs:", error)
      setLogError(error.message || "Unable to load logs")
    } finally {
      setLogLoading(false)
    }
  }

  useEffect(() => {
    setLogTab("output")
  }, [execution?.id])

  useEffect(() => {
    if (!execution?.server_instance_id) {
      setInfrastructureLogs([])
      setLogError(null)
    }
  }, [execution?.server_instance_id])

  useEffect(() => {
    if (logTab === "logs" && execution?.server_instance_id) {
      fetchInfrastructureLogs(execution.server_instance_id)
    }
  }, [logTab, execution?.server_instance_id])

  async function handleExecute() {
    if (!code.trim()) return

    setIsExecuting(true)
    setExecution(null)
    setIsOutputCollapsed(false) // Reset collapse state on new execution

    try {
      const payload: any = { code }
      
      // Include tool and server information if available
      if (selectedTool) {
        payload.tool_id = selectedTool.id
        payload.server_id = selectedTool.server_id
        // account_id will be determined server-side from the user's active account
      }

      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Execution failed" }))
        const errorMessage = errorData.error || "Execution failed"
        
        // Provide helpful error messages
        if (errorMessage.includes("Instance not found") || errorMessage.includes("not running")) {
          throw new Error("Server instance is not running. Please provision the server first in the Tools tab.")
        }
        if (errorMessage.includes("server_instance_id")) {
          throw new Error("No server instance available. Please provision the server first.")
        }
        
        throw new Error(errorMessage)
      }

      const result = await res.json()
      setExecution(result)

      // Real-time subscription will handle status updates
      if (result.status === "completed" || result.status === "failed") {
        setIsExecuting(false)
      }
    } catch (error: any) {
      console.error("[TerminalView] Execution failed:", error)
      // Store error in execution state for display
      setExecution({
        id: "",
        code,
        status: "failed",
        error: error.message || "Execution failed",
        output: null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        execution_time_ms: 0,
        server_instance_id: null,
      })
      setIsExecuting(false)
    }
  }

  // Update code when initialCode prop changes
  useEffect(() => {
    if (initialCode && initialCode !== code && !isExecuting) {
      setCode(initialCode)
      // Switch to code mode when code is provided externally
      if (initialCode.trim()) {
        setMode("code")
      }
    }
  }, [initialCode, code, isExecuting])

  // Auto-switch to wizard mode if a tool is selected and no code yet
  useEffect(() => {
    if (selectedTool && !code.trim() && mode === "code") {
      setMode("wizard")
    }
  }, [selectedTool, code, mode])

  async function handleCodeGenerated(generatedCode: string) {
    setCode(generatedCode)
    setMode("code")
    // Auto-execute the generated code
    if (generatedCode.trim()) {
      await handleExecuteWithCode(generatedCode)
    }
  }

  async function handleExecuteWithCode(codeToExecute: string) {
    if (!codeToExecute.trim()) return

    setIsExecuting(true)
    setExecution(null)
    setIsOutputCollapsed(false)

    try {
      const payload: any = { code: codeToExecute }
      if (selectedTool) {
        payload.tool_id = selectedTool.id
        payload.server_id = selectedTool.server_id
      }

      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Execution failed" }))
        const errorMessage = errorData.error || "Execution failed"
        
        // Provide helpful error messages
        if (errorMessage.includes("Instance not found") || errorMessage.includes("not running")) {
          throw new Error("Server instance is not running. Please provision the server first in the Tools tab.")
        }
        if (errorMessage.includes("server_instance_id")) {
          throw new Error("No server instance available. Please provision the server first.")
        }
        
        throw new Error(errorMessage)
      }

      const result: SandboxExecution = await res.json()
      setExecution(result)

      if (result.status === "completed" || result.status === "failed") {
        setIsExecuting(false)
      }
    } catch (error: any) {
      console.error("[TerminalView] Execution failed:", error)
      // Store error in execution state for display
      setExecution({
        id: "",
        code: codeToExecute,
        status: "failed",
        error: error.message || "Execution failed",
        output: null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        execution_time_ms: 0,
        server_instance_id: null,
      })
      setIsExecuting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden border-l border-t lg:border-t-0">
      {/* File/folder style tabs at the top */}
      <div className="flex-shrink-0 border-b bg-background">
        <div className="flex items-center justify-between px-2 sm:px-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "wizard" | "code")} className="flex-1">
            <TabsList className="bg-transparent p-0 h-8 sm:h-9 gap-0">
              <TabsTrigger 
                value="wizard" 
                disabled={!selectedTool}
                className="text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4"
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Wizard</span>
              </TabsTrigger>
              <TabsTrigger 
                value="code"
                className="text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4"
              >
                <Terminal className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Code</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === "code" && (
            <Button onClick={handleExecute} disabled={isExecuting || !code.trim()} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm ml-2">
              {isExecuting ? (
                <>
                  <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Running...</span>
                  <span className="sm:hidden">Run</span>
                </>
              ) : (
                <>
                  <Play className="mr-1 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Execute</span>
                  <span className="sm:hidden">Run</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Full-page content area - fills entire space like file browser */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
        {mode === "wizard" ? (
          <div className="flex-1 overflow-auto p-4">
            <CodeWizard tool={selectedTool} onCodeGenerated={handleCodeGenerated} />
          </div>
        ) : (
          /* Split layout: Code editor on left, Results/History on right */
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left side: Code editor */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r">
              <div className="flex-1 min-h-0 p-4">
                <Textarea
                  placeholder="# Write Python code here...
# json is already available in the sandbox

# Example: Call an MCP tool
tool_input = {'path': '/example/file.txt'}
print(json.dumps(tool_input, indent=2))"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-full w-full font-mono text-xs sm:text-sm resize-none break-words whitespace-pre-wrap overflow-wrap-anywhere"
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere", minHeight: "100%" }}
                />
              </div>
            </div>

            {/* Right side: Execution results and history */}
            <div className="w-96 flex-shrink-0 flex flex-col min-h-0 overflow-hidden bg-muted/20">
              {/* Current execution output - compact and collapsible */}
              {execution && (
                <div className="flex-shrink-0 border-b bg-background">
                  <Tabs value={logTab} onValueChange={(value) => setLogTab(value as "output" | "logs")}>
                    <TabsList className="border-b bg-transparent px-3">
                      <TabsTrigger
                        value="output"
                        className="rounded-none border-b-2 border-transparent px-3 text-xs sm:text-sm data-[state=active]:border-primary data-[state=active]:font-semibold"
                      >
                        Output
                      </TabsTrigger>
                      <TabsTrigger
                        value="logs"
                        className="rounded-none border-b-2 border-transparent px-3 text-xs sm:text-sm data-[state=active]:border-primary data-[state=active]:font-semibold"
                      >
                        Infrastructure Log
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="output">
                      <div
                        className={`flex-shrink-0 border-b bg-background ${isOutputCollapsed ? "" : "max-h-[180px]"} flex flex-col min-h-0 overflow-hidden`}
                      >
                        <div className="p-3 sm:p-4 space-y-2 flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-medium">Status:</span>
                              <Badge
                                variant={
                                  execution.status === "completed"
                                    ? "default"
                                    : execution.status === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                                className="text-xs"
                              >
                                {execution.status}
                              </Badge>
                              {execution.execution_time_ms && (
                                <span className="text-xs text-muted-foreground">{execution.execution_time_ms}ms</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setIsOutputCollapsed(!isOutputCollapsed)}
                                title={isOutputCollapsed ? "Expand output" : "Collapse output"}
                              >
                                {isOutputCollapsed ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setExecution(null)}
                                title="Close output"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {isOutputCollapsed ? (
                            <div className="text-xs text-muted-foreground py-1">
                              {execution.output ? "Output available (click to expand)" : execution.error ? "Error occurred (click to expand)" : "No output"}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                              <p className="mb-2 text-xs sm:text-sm font-medium">Output:</p>
                              <div className="flex-1 min-h-0 rounded-lg border bg-background overflow-auto" style={{ maxHeight: '400px' }}>
                                <pre className="p-3 sm:p-4 text-xs sm:text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere font-mono min-w-full">
                                  <code className="block">
                                    {execution.output ? JSON.stringify(execution.output, null, 2) : execution.error || "No output"}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="logs">
                      <div className="space-y-3 border-b px-3 pb-3 pt-4 sm:px-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Infrastructure Log
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => execution?.server_instance_id && fetchInfrastructureLogs(execution.server_instance_id)}
                            disabled={!execution?.server_instance_id || logLoading}
                          >
                            {logLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Refresh"
                            )}
                          </Button>
                        </div>
                        {logError && <p className="text-xs text-destructive">{logError}</p>}
                        {logLoading ? (
                          <div className="flex h-28 items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : infrastructureLogs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No logs available yet.</p>
                        ) : (
                          <ScrollArea className="h-48 overflow-hidden rounded-lg border bg-background">
                            <div className="space-y-3 p-3 text-xs font-mono">
                              {infrastructureLogs.map((entry) => (
                                <div key={`${entry.timestamp}-${entry.message.slice(0, 20)}`} className="space-y-1">
                                  <p
                                    className={`text-[11px] ${entry.level === "stderr" ? "text-destructive" : "text-muted-foreground"}`}
                                  >
                                    {new Date(entry.timestamp).toLocaleTimeString()} · {entry.level.toUpperCase()}
                                  </p>
                                  <p className="text-xs text-foreground/90 break-words">{entry.message}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Recent executions - always visible, takes remaining space */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-shrink-0 border-b px-4 py-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <CardTitle className="text-sm font-semibold">Recent Executions</CardTitle>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {executionHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No executions yet</p>
                    ) : (
                      executionHistory.map((exec) => (
                        <div
                          key={exec.id}
                          className="cursor-pointer rounded-lg border p-3 hover:bg-accent bg-background"
                          onClick={() => {
                            setCode(exec.code)
                            setExecution(exec)
                            setMode("code")
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={
                                exec.status === "completed"
                                  ? "default"
                                  : exec.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {exec.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(exec.started_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 font-mono">{exec.code.split("\n")[0]}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
