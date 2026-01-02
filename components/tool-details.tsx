"use client"

import { useState } from "react"
import type { MCPServer, MCPTool } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, ExternalLink, Play } from "lucide-react"
import { ServerLogo } from "@/components/server-logo"

interface ToolDetailsProps {
  tool: MCPTool & { server: MCPServer }
  onExecute: (code: string) => void
}

export function ToolDetails({ tool, onExecute }: ToolDetailsProps) {
  const [copied, setCopied] = useState(false)

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRunExample() {
    if (tool.example_usage) {
      const code = `# Example: ${tool.name}
import json

# Tool input
input_data = ${tool.example_usage}

# Simulated tool execution
print(f"Executing {tool.name} with input:")
print(json.dumps(input_data, indent=2))
`
      onExecute(code)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header outside of tabs - like file browser */}
      <div className="flex-shrink-0 border-b bg-muted/30 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold break-words">{tool.name}</h2>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(tool.name)} className="flex-shrink-0 h-6 w-6 sm:h-7 sm:w-7">
                <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{tool.description || "No description available"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge className="flex items-center gap-1.5 text-xs">
            <ServerLogo server={tool.server} size={12} />
            <span className="truncate max-w-[100px] sm:max-w-none">{tool.server.name}</span>
          </Badge>
          {tool.server.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tabs styled like file/folder tabs */}
      <Tabs defaultValue="schema" className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 border-b bg-background px-2 sm:px-3">
          <TabsList className="grid w-full grid-cols-3 h-8 sm:h-9 bg-transparent p-0 gap-0">
            <TabsTrigger 
              value="schema" 
              className="text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Schema
            </TabsTrigger>
            <TabsTrigger 
              value="example" 
              className="text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Example
            </TabsTrigger>
            <TabsTrigger 
              value="server" 
              className="text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Server Info
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content - no internal headers */}
        {/* Full-page content - fills entire space like file browser */}
        <TabsContent value="schema" className="flex-1 min-h-0 m-0 overflow-hidden bg-background">
          <div className="h-full overflow-auto p-4">
            <pre className="rounded-lg bg-muted p-4 text-xs sm:text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere font-mono">
              <code>{JSON.stringify(tool.input_schema, null, 2)}</code>
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="example" className="flex-1 min-h-0 m-0 overflow-hidden bg-background">
          <div className="h-full flex flex-col">
            <div className="flex justify-end p-4 pb-2 flex-shrink-0">
              <Button size="sm" onClick={handleRunExample} disabled={!tool.example_usage} className="text-xs sm:text-sm h-7 sm:h-8">
                <Play className="mr-1 sm:mr-2 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Run Example</span>
                <span className="sm:hidden">Run</span>
              </Button>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4">
              {tool.example_usage ? (
                <pre className="rounded-lg bg-muted p-4 text-xs sm:text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere font-mono">
                  <code>{tool.example_usage}</code>
                </pre>
              ) : (
                <p className="text-xs sm:text-sm text-muted-foreground">No example available</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="server" className="flex-1 min-h-0 m-0 overflow-hidden bg-background">
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4 sm:space-y-5">
              <div>
                <p className="text-xs sm:text-sm font-medium mb-1.5">Version</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{tool.server.version || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium mb-1.5">Author</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{tool.server.author || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium mb-1.5">Install Command</p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-3 py-2 text-xs sm:text-sm break-all flex-1 font-mono">{tool.server.install_command || "N/A"}</code>
                  {tool.server.install_command && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => copyToClipboard(tool.server.install_command!)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {tool.server.repository_url && (
                <div>
                  <p className="text-xs sm:text-sm font-medium mb-1.5">Repository</p>
                  <a
                    href={tool.server.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs sm:text-sm text-primary hover:underline"
                  >
                    View on GitHub
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
