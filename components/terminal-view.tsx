"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Loader2, Terminal, Clock, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { SandboxExecution, MCPTool, MCPServer } from "@/lib/types"
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

  async function handleExecute() {
    if (!code.trim()) return

    setIsExecuting(true)
    setExecution(null)

    try {
      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const result = await res.json()
      setExecution(result)

      // Real-time subscription will handle status updates
      if (result.status === "completed" || result.status === "failed") {
        setIsExecuting(false)
      }
    } catch (error) {
      console.error("[v0] Execution failed:", error)
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

  function handleCodeGenerated(generatedCode: string) {
    setCode(generatedCode)
    setMode("code")
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
import json

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
              {/* Current execution output */}
              {execution && (
                <div className="flex-shrink-0 border-b bg-background p-4 space-y-3">
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

                  <div>
                    <p className="mb-2 text-xs sm:text-sm font-medium">Output:</p>
                    <ScrollArea className="h-[200px] rounded-lg border bg-background">
                      <pre className="p-3 sm:p-4 text-xs sm:text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere font-mono">
                        <code>
                          {execution.output ? JSON.stringify(execution.output, null, 2) : execution.error || "No output"}
                        </code>
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Recent executions - takes remaining space */}
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
