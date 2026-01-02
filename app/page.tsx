"use client"

import { useState } from "react"
import { ToolBrowser } from "@/components/tool-browser"
import { ToolDetails } from "@/components/tool-details"
import { TerminalView } from "@/components/terminal-view"
import { TelemetryDashboard } from "@/components/telemetry-dashboard"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileCode, Terminal } from "lucide-react"
import type { MCPServer, MCPTool } from "@/lib/types"

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<(MCPTool & { server: MCPServer }) | null>(null)
  const [codeToExecute, setCodeToExecute] = useState("")
  const [activeTab, setActiveTab] = useState("tools")

  function handleSelectTool(tool: MCPTool & { server: MCPServer }) {
    setSelectedTool(tool)
    setActiveTab("active") // Switch to Active tab when a tool is selected
  }

  function handleExecute(code: string) {
    setCodeToExecute(code)
    setActiveTab("code") // Switch to Code tab when code is executed
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-background via-background to-accent/5 overflow-hidden">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent truncate">
              Project Nexus
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">MCP Registry & Execution Engine</p>
          </div>
          <div className="flex items-center gap-4">
            <TelemetryDashboard />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Full-page tabs layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Main navigation tabs */}
        <div className="flex-shrink-0 border-b bg-background">
          <div className="px-2 sm:px-3">
            <TabsList className="bg-transparent p-0 h-9 sm:h-10 gap-0">
              <TabsTrigger 
                value="tools"
                className="text-sm sm:text-base rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 sm:px-6"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                Tools
              </TabsTrigger>
              <TabsTrigger 
                value="active"
                disabled={!selectedTool}
                className="text-sm sm:text-base rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 sm:px-6"
              >
                <FileCode className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                Active
              </TabsTrigger>
              <TabsTrigger 
                value="code"
                className="text-sm sm:text-base rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 sm:px-6"
              >
                <Terminal className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                Code
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Full-page content for each tab */}
        <TabsContent value="tools" className="flex-1 min-h-0 m-0 overflow-hidden">
          <ToolBrowser onSelectTool={handleSelectTool} selectedToolId={selectedTool?.id} />
        </TabsContent>

        <TabsContent value="active" className="flex-1 min-h-0 m-0 overflow-hidden">
          {selectedTool ? (
            <ToolDetails tool={selectedTool} onExecute={handleExecute} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No tool selected</p>
                <p className="text-sm text-muted-foreground">Go to the Tools tab to select a tool</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="code" className="flex-1 min-h-0 m-0 overflow-hidden">
          <TerminalView initialCode={codeToExecute} selectedTool={selectedTool} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
