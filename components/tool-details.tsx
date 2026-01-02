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
    <div className="flex h-full flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{tool.name}</CardTitle>
              <CardDescription>{tool.description || "No description available"}</CardDescription>
            </div>
            <Button size="icon" variant="ghost" onClick={() => copyToClipboard(tool.name)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="flex items-center gap-1.5">
              <ServerLogo server={tool.server} size={14} />
              {tool.server.name}
            </Badge>
            {tool.server.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="schema" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="example">Example</TabsTrigger>
          <TabsTrigger value="server">Server Info</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="h-[calc(100%-3rem)]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Input Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <pre className="rounded-lg bg-muted p-4 text-xs">
                  <code>{JSON.stringify(tool.input_schema, null, 2)}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="example" className="h-[calc(100%-3rem)]">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Example Usage</CardTitle>
              <Button size="sm" onClick={handleRunExample} disabled={!tool.example_usage}>
                <Play className="mr-2 h-4 w-4" />
                Run Example
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {tool.example_usage ? (
                  <pre className="rounded-lg bg-muted p-4 text-xs">
                    <code>{tool.example_usage}</code>
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No example available</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="h-[calc(100%-3rem)]">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Server Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-sm text-muted-foreground">{tool.server.version || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Author</p>
                <p className="text-sm text-muted-foreground">{tool.server.author || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Install Command</p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-xs">{tool.server.install_command || "N/A"}</code>
                  {tool.server.install_command && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(tool.server.install_command!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              {tool.server.repository_url && (
                <div>
                  <p className="text-sm font-medium">Repository</p>
                  <a
                    href={tool.server.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
