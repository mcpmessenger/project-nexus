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
    <div className="flex h-full flex-col gap-4 border-l p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              <CardTitle>Python Sandbox</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "wizard" | "code")} className="w-auto">
                <TabsList>
                  <TabsTrigger value="wizard" disabled={!selectedTool}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Wizard
                  </TabsTrigger>
                  <TabsTrigger value="code">
                    <Terminal className="h-4 w-4 mr-2" />
                    Code
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === "code" && (
                <Button onClick={handleExecute} disabled={isExecuting || !code.trim()} size="sm">
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
          {mode === "wizard" ? (
            <div className="flex-1 overflow-auto">
              <CodeWizard tool={selectedTool} onCodeGenerated={handleCodeGenerated} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
              <Textarea
                placeholder="# Write Python code here...
import json

# Example: Call an MCP tool
tool_input = {'path': '/example/file.txt'}
print(json.dumps(tool_input, indent=2))"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {execution && mode === "code" && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge
                  variant={
                    execution.status === "completed"
                      ? "default"
                      : execution.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {execution.status}
                </Badge>
                {execution.execution_time_ms && (
                  <span className="text-xs text-muted-foreground">{execution.execution_time_ms}ms</span>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">Output:</p>
                <ScrollArea className="h-[200px] rounded-lg border bg-muted/50">
                  <pre className="p-4 text-xs">
                    <code>
                      {execution.output ? JSON.stringify(execution.output, null, 2) : execution.error || "No output"}
                    </code>
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <CardTitle className="text-sm">Recent Executions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {executionHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No executions yet</p>
              ) : (
                executionHistory.map((exec) => (
                  <div
                    key={exec.id}
                    className="cursor-pointer rounded-lg border p-2 hover:bg-accent"
                    onClick={() => {
                      setCode(exec.code)
                      setExecution(exec)
                      setMode("code")
                    }}
                  >
                    <div className="flex items-center justify-between">
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
                    <p className="mt-1 truncate text-xs text-muted-foreground">{exec.code.split("\n")[0]}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
