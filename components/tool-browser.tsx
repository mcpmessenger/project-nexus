"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"
import type { MCPServer, MCPTool, OAuthAccount, MCPServerInstance } from "@/lib/types"
import { ServerLogo } from "@/components/server-logo"

interface ToolBrowserProps {
  onSelectTool: (tool: MCPTool & { server: MCPServer }) => void
  selectedToolId?: string
}

export function ToolBrowser({ onSelectTool, selectedToolId }: ToolBrowserProps) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [tools, setTools] = useState<(MCPTool & { mcp_servers: MCPServer | { name: string; id: string; logo_url?: string | null } })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [instanceMap, setInstanceMap] = useState<Record<string, MCPServerInstance>>({})
  const [accounts, setAccounts] = useState<OAuthAccount[]>([])
  const [provisioningServers, setProvisioningServers] = useState<string[]>([])
  const [stoppingServers, setStoppingServers] = useState<string[]>([])
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    fetchData()
  }, [selectedTag])

  useEffect(() => {
    fetchAccounts()
    checkSignedIn()
  }, [])

  // Subscribe to instance status changes via Supabase Realtime
  useEffect(() => {
    if (!isSignedIn) return

    const channel = supabase
      .channel('instance-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mcp_server_instances',
        },
        (payload) => {
          const updatedInstance = payload.new as MCPServerInstance
          console.log('[ToolBrowser] Realtime update received:', updatedInstance)
          setInstanceMap((prev) => {
            const current = prev[updatedInstance.server_id]
            // Update if this is a status change or if it's more recent
            if (!current || 
                updatedInstance.status === 'running' || 
                (current.status === 'running' && updatedInstance.status !== 'running') ||
                (updatedInstance.updated_at && current.updated_at && 
                 new Date(updatedInstance.updated_at) > new Date(current.updated_at))) {
              return {
                ...prev,
                [updatedInstance.server_id]: updatedInstance,
              }
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isSignedIn, supabase])

  async function checkSignedIn() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsSignedIn(!!session)
    } catch (err) {
      console.error("[ToolBrowser] Failed to check sign-in status:", err)
    }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/oauth/accounts")
      if (!res.ok) {
        throw new Error("Failed to fetch OAuth accounts")
      }
      const data = await res.json()
      setAccounts(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("[ToolBrowser] Failed to load accounts:", err)
    }
  }

  async function fetchInstances() {
    try {
      const res = await fetch("/api/mcp/instances")
      if (!res.ok) {
        throw new Error("Failed to fetch instances")
      }
      const data = await res.json()
      console.log("[ToolBrowser] Raw instances data from API:", data)
      const map: Record<string, MCPServerInstance> = {}
      if (Array.isArray(data)) {
        data.forEach((instance) => {
          const current = map[instance.server_id]
          // Always update if no current entry
          if (!current) {
            map[instance.server_id] = instance
          } else {
            // If we have a current entry, update based on status priority:
            // 1. If new instance is "running", always use it (running takes priority)
            // 2. If current is "running" and new is not, update (status changed from running to stopped)
            // 3. Otherwise, use the most recent one (by updated_at or created_at)
            if (instance.status === "running") {
              map[instance.server_id] = instance
            } else if (current.status === "running" && instance.status !== "running") {
              map[instance.server_id] = instance
            } else {
              // Use the most recent instance (prefer newer updated_at)
              const currentTime = new Date(current.updated_at || current.created_at || 0).getTime()
              const newTime = new Date(instance.updated_at || instance.created_at || 0).getTime()
              if (newTime > currentTime) {
                map[instance.server_id] = instance
              }
            }
          }
        })
      }
      console.log("[ToolBrowser] Processed instances map:", map)
      setInstanceMap(map)
    } catch (err) {
      console.error("[ToolBrowser] Failed to fetch instances:", err)
    }
  }

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const serverUrl = selectedTag ? `/api/servers?tag=${selectedTag}` : "/api/servers"
      const [serversRes, toolsRes] = await Promise.all([fetch(serverUrl), fetch("/api/tools")])

      if (!serversRes.ok) {
        const errorText = await serversRes.text()
        const errorMsg = `Servers API failed: ${serversRes.status} ${errorText}`
        console.error("[ToolBrowser] Servers API error:", serversRes.status, errorText)
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      if (!toolsRes.ok) {
        const errorText = await toolsRes.text()
        const errorMsg = `Tools API failed: ${toolsRes.status} ${errorText}`
        console.error("[ToolBrowser] Tools API error:", toolsRes.status, errorText)
        setError(errorMsg)
        throw new Error(errorMsg)
      }

      const serversData = await serversRes.json()
      const toolsData = await toolsRes.json()

      setServers(Array.isArray(serversData) ? serversData : [])
      setTools(Array.isArray(toolsData) ? toolsData : [])
      await fetchInstances()
    } catch (error: any) {
      console.error("[ToolBrowser] Failed to fetch data:", error)
      setServers([])
      setTools([])
      if (!error) {
        setError("Failed to fetch data. Check browser console for details.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleProvision(serverId: string) {
    if (!isSignedIn) {
      setProvisionError("Please sign in to provision servers.")
      return
    }

    // Find the server to check if it requires OAuth
    const server = servers.find((s) => s.id === serverId)
    const serverName = server?.name?.toLowerCase() || ""
    const requiresOAuth = serverName === "google-workspace-mcp"

    if (requiresOAuth && !accounts.length) {
      setProvisionError("Connect a Google Workspace account before provisioning this server.")
      return
    }

    setProvisionError(null)
    setProvisioningServers((prev) => [...prev, serverId])
    try {
      // For servers that require OAuth, we need an account
      let accountId: string | null = null
      if (requiresOAuth) {
        const account = accounts.find((account) => account.is_default) || accounts[0]
        if (!account) {
          throw new Error("No OAuth account available")
        }
        accountId = account.id
      }

      const res = await fetch("/api/mcp/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server_id: serverId,
          account_id: accountId, // Can be null for servers that don't need OAuth
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || "Provisioning failed")
      }

      await fetchInstances()
    } catch (err: any) {
      console.error("[ToolBrowser] Provision failed:", err)
      setProvisionError(err.message || "Provisioning failed")
    } finally {
      setProvisioningServers((prev) => prev.filter((id) => id !== serverId))
    }
  }

  async function handleStop(instanceId: string) {
    console.log("[ToolBrowser] handleStop called with instanceId:", instanceId)
    setProvisionError(null)
    
    // Find the instance and server_id for optimistic update
    const instance = Object.values(instanceMap).find(inst => inst.id === instanceId)
    const serverId = instance?.server_id
    
    // Optimistic UI Update: Update local state immediately
    if (instance && serverId) {
      setInstanceMap(prev => ({
        ...prev,
        [serverId]: { ...instance, status: 'stopped' as const }
      }))
    }
    
    setStoppingServers((prev) => [...prev, instanceId])
    
    try {
      console.log(`[ToolBrowser] Calling DELETE /api/mcp/instances/${instanceId}`)
      const res = await fetch(`/api/mcp/instances/${instanceId}`, {
        method: "DELETE",
      })

      console.log(`[ToolBrowser] Stop response status: ${res.status}`)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error("[ToolBrowser] Stop request failed:", res.status, errorText)
        throw new Error(errorText || "Failed to stop server")
      }

      const result = await res.json()
      console.log("[ToolBrowser] Stop request succeeded:", result)

      // Background sync - Realtime subscription will handle the update, but refresh as backup
      await fetchInstances()
    } catch (err: any) {
      console.error("[ToolBrowser] Stop failed:", err)
      
      // Rollback optimistic update on failure
      if (instance && serverId) {
        setInstanceMap(prev => ({
          ...prev,
          [serverId]: instance // Revert to original state
        }))
      }
      
      setProvisionError(err.message || "Failed to stop server")
    } finally {
      setStoppingServers((prev) => prev.filter((id) => id !== instanceId))
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
          {provisionError && (
            <div className="rounded-md border border-destructive/60 bg-destructive/10 p-3 text-xs text-destructive">
              {provisionError}
            </div>
          )}
          {loading ? (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md p-6 border border-destructive/50 rounded-lg bg-destructive/10">
                <p className="text-sm font-semibold text-destructive mb-2">Error Loading Tools</p>
                <p className="text-xs text-muted-foreground mb-4">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Check browser console (F12) and verify environment variables are set in Vercel.
                </p>
              </div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="flex h-full items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">No tools found</p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "No tools available"}
                </p>
              </div>
            </div>
          ) : (
            filteredTools.map((tool) => {
              const serverFromList = servers.find((s) => s.id === tool.server_id)
              const displayServer = serverFromList || (tool.mcp_servers as MCPServer | { name: string; id: string; logo_url?: string | null })
              const serverId = serverFromList?.id || tool.server_id || displayServer?.id
              const serverName = displayServer?.name?.toLowerCase() || ""
              // Only google-workspace-mcp requires OAuth accounts
              const requiresOAuth = serverName === "google-workspace-mcp"
              const instance = serverId ? instanceMap[serverId] : undefined
              const status = instance?.status || "offline"
              const statusColor =
                status === "running"
                  ? "bg-emerald-400"
                  : status === "starting"
                    ? "bg-amber-400"
                    : status === "error"
                      ? "bg-destructive"
                      : "bg-slate-400"
              const statusLabel = status === "running" ? "Running" : status === "starting" ? "Starting" : status === "error" ? "Error" : "Offline"
              const isProvisioning = serverId ? provisioningServers.includes(serverId) : false
              const isStopping = instance?.id ? stoppingServers.includes(instance.id) : false
              const buttonLabel = status === "running" ? (isStopping ? "Stopping…" : "Stop") : isProvisioning ? "Starting…" : "Provision server"
              const buttonDisabled = (status === "running" && isStopping) || (status !== "running" && (isProvisioning || !serverId || !isSignedIn || (requiresOAuth && !accounts.length)))

              return (
                <Card
                  key={tool.id}
                  className={`cursor-pointer p-4 transition-colors hover:bg-accent ${selectedToolId === tool.id ? "border-primary bg-accent" : ""}`}
                  onClick={() =>
                    onSelectTool({
                      ...tool,
                      server: serverFromList || ({} as MCPServer),
                    })
                  }
                >
                  <div className="flex items-start gap-3">
                    <ServerLogo 
                      server={displayServer || null} 
                      size={20}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm sm:text-base font-medium">{tool.name}</p>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {displayServer?.name || tool.mcp_servers.name}
                        </Badge>
                      </div>
                      {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                          <span className="tracking-wider uppercase">{statusLabel}</span>
                        </div>
                        <Button
                          size="sm"
                          variant={status === "running" ? "destructive" : "outline"}
                          disabled={buttonDisabled}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (status === "running" && instance?.id) {
                              handleStop(instance.id)
                            } else if (serverId) {
                              handleProvision(serverId)
                            }
                          }}
                        >
                          {isProvisioning ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Starting…
                            </span>
                          ) : isStopping ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Stopping…
                            </span>
                          ) : (
                            buttonLabel
                          )}
                        </Button>
                      </div>
                      {isSignedIn && requiresOAuth && !accounts.length && (
                        <p className="text-[11px] text-muted-foreground mt-1">Connect a Google Workspace account to provision this server.</p>
                      )}
                      {!isSignedIn && (
                        <p className="text-[11px] text-muted-foreground mt-1">Sign in to provision servers.</p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
