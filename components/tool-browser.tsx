"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Loader2 } from "lucide-react"
import type { MCPServer, MCPTool } from "@/lib/types"
import { ServerLogo } from "@/components/server-logo"

interface ToolBrowserProps {
  onSelectTool: (tool: MCPTool & { server: MCPServer }) => void
  selectedToolId?: string
}

export function ToolBrowser({ onSelectTool, selectedToolId }: ToolBrowserProps) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [tools, setTools] = useState<(MCPTool & { mcp_servers: MCPServer | { name: string; id: string; logo_url?: string | null } })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [selectedTag])

  async function fetchData() {
    setLoading(true)
    try {
      const serverUrl = selectedTag ? `/api/servers?tag=${selectedTag}` : "/api/servers"
      const [serversRes, toolsRes] = await Promise.all([fetch(serverUrl), fetch("/api/tools")])

      const serversData = await serversRes.json()
      const toolsData = await toolsRes.json()

      setServers(Array.isArray(serversData) ? serversData : [])
      setTools(Array.isArray(toolsData) ? toolsData : [])
    } catch (error) {
      console.error("[v0] Failed to fetch data:", error)
      setServers([])
      setTools([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim()) {
      fetchData()
      return
    }

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const results = await res.json()

      const transformedTools = Array.isArray(results)
        ? results.map((result: any) => ({
            id: result.tool_id,
            name: result.tool_name,
            description: result.tool_description,
            server_id: result.server_id,
            mcp_servers: {
              name: result.server_name,
              id: result.server_id,
              logo_url: result.server_logo_url || null,
            },
          }))
        : []

      setTools(transformedTools)
    } catch (error) {
      console.error("[v0] Search failed:", error)
      setTools([])
    }
  }

  const allTags = Array.from(new Set(Array.isArray(servers) ? servers.flatMap((s) => s.tags || []) : []))

  const filteredTools = searchQuery
    ? tools
    : tools.filter((tool) => !selectedTag || servers.find((s) => s.id === tool.server_id)?.tags?.includes(selectedTag))

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Search and filters at top */}
      <div className="flex-shrink-0 border-b bg-muted/30 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === null ? "default" : "outline"}
              className="cursor-pointer text-xs whitespace-nowrap"
              onClick={() => {
                setSelectedTag(null)
                setSearchQuery("")
              }}
            >
              All
            </Badge>
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "outline"}
                className="cursor-pointer text-xs whitespace-nowrap"
                onClick={() => {
                  setSelectedTag(tag)
                  setSearchQuery("")
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Tools list - full page scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {loading ? (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            filteredTools.map((tool) => (
              <Card
                key={tool.id}
                className={`cursor-pointer p-4 transition-colors hover:bg-accent ${selectedToolId === tool.id ? "border-primary bg-accent" : ""}`}
                onClick={() =>
                  onSelectTool({
                    ...tool,
                    server: servers.find((s) => s.id === tool.server_id) || ({} as MCPServer),
                  })
                }
              >
                <div className="flex items-start gap-3">
                  <ServerLogo 
                    server={servers.find((s) => s.id === tool.server_id) || tool.mcp_servers || null} 
                    size={20}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-medium">{tool.name}</p>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {tool.mcp_servers.name}
                      </Badge>
                    </div>
                    {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
