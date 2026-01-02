"use client"

import { useState } from "react"
import { ToolBrowser } from "@/components/tool-browser"
import { ToolDetails } from "@/components/tool-details"
import { TerminalView } from "@/components/terminal-view"
import { TelemetryDashboard } from "@/components/telemetry-dashboard"
import { ThemeToggle } from "@/components/theme-toggle"
import type { MCPServer, MCPTool } from "@/lib/types"

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<(MCPTool & { server: MCPServer }) | null>(null)
  const [codeToExecute, setCodeToExecute] = useState("")

  function handleSelectTool(tool: MCPTool & { server: MCPServer }) {
    setSelectedTool(tool)
  }

  function handleExecute(code: string) {
    setCodeToExecute(code)
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-accent/5">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                Project Nexus
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">MCP Registry & Execution Engine</p>
            </div>
            <ThemeToggle />
          </div>
          <TelemetryDashboard />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[300px_1fr_400px] overflow-hidden">
        <ToolBrowser onSelectTool={handleSelectTool} selectedToolId={selectedTool?.id} />

        {selectedTool ? (
          <ToolDetails tool={selectedTool} onExecute={handleExecute} />
        ) : (
          <div className="flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Select a tool to view details</p>
              <p className="text-sm text-muted-foreground">Browse tools in the left panel</p>
            </div>
          </div>
        )}

        <TerminalView initialCode={codeToExecute} />
      </div>
    </div>
  )
}
