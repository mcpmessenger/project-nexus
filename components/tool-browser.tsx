"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Search, Server, Loader2 } from "lucide-react"
import type { MCPServer, MCPTool } from "@/lib/types"

interface ToolBrowserProps {
  onSelectTool: (tool: MCPTool & { server: MCPServer }) => void
  selectedToolId?: string
}

export function ToolBrowser({ onSelectTool, selectedToolId }: ToolBrowserProps) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [tools, setTools] = useState<(MCPTool & { mcp_servers: MCPServer })[]>([])
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
    <div className="flex h-full flex-col gap-4 border-r bg-muted/20 p-4">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedTag === null ? "default" : "outline"}
            className="cursor-pointer"
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
              className="cursor-pointer"
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

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          filteredTools.map((tool) => (
            <Card
              key={tool.id}
              className={`cursor-pointer p-3 transition-colors hover:bg-accent ${selectedToolId === tool.id ? "border-primary bg-accent" : ""}`}
              onClick={() =>
                onSelectTool({
                  ...tool,
                  server: servers.find((s) => s.id === tool.server_id) || ({} as MCPServer),
                })
              }
            >
              <div className="flex items-start gap-2">
                <Server className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">{tool.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {tool.mcp_servers.name}
                    </Badge>
                  </div>
                  {tool.description && <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
