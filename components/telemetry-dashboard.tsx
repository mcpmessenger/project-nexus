"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Activity, Zap, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TelemetryStats {
  total_executions: number
  completed: number
  failed: number
  avg_execution_time: number
}

export function TelemetryDashboard() {
  const [stats, setStats] = useState<TelemetryStats>({
    total_executions: 0,
    completed: 0,
    failed: 0,
    avg_execution_time: 0,
  })
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function fetchStats() {
      const { data: executions } = await supabase.from("sandbox_executions").select("status, execution_time_ms")

      if (executions) {
        const completed = executions.filter((e) => e.status === "completed").length
        const failed = executions.filter((e) => e.status === "failed").length
        const avgTime = executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / (executions.length || 1)

        setStats({
          total_executions: executions.length,
          completed,
          failed,
          avg_execution_time: Math.round(avgTime),
        })
      }
    }

    fetchStats()

    // Subscribe to updates
    const channel = supabase
      .channel("telemetry")
      .on("postgres_changes", { event: "*", schema: "public", table: "sandbox_executions" }, () => {
        fetchStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all execution history? This cannot be undone.")) {
      return
    }

    setIsClearing(true)
    try {
      const res = await fetch("/api/sandbox/clear", {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to clear executions" }))
        throw new Error(error.error || "Failed to clear executions")
      }

      // Refresh stats after clearing
      const supabase = createClient()
      const { data: executions } = await supabase.from("sandbox_executions").select("status, execution_time_ms")
      if (executions) {
        const completed = executions.filter((e) => e.status === "completed").length
        const failed = executions.filter((e) => e.status === "failed").length
        const avgTime = executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / (executions.length || 1)

        setStats({
          total_executions: executions.length,
          completed,
          failed,
          avg_execution_time: Math.round(avgTime),
        })
      } else {
        setStats({
          total_executions: 0,
          completed: 0,
          failed: 0,
          avg_execution_time: 0,
        })
      }
    } catch (error) {
      console.error("[TelemetryDashboard] Clear error:", error)
      alert("Failed to clear executions. Please try again.")
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <Activity className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground hidden sm:inline">Total:</span>
        <span className="font-semibold">{stats.total_executions}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
        <span className="text-muted-foreground hidden sm:inline">Done:</span>
        <span className="font-semibold">{stats.completed}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
        <span className="text-muted-foreground hidden sm:inline">Failed:</span>
        <span className="font-semibold">{stats.failed}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <Zap className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground hidden sm:inline">Avg:</span>
        <span className="font-semibold">{stats.avg_execution_time}ms</span>
      </div>

      {stats.total_executions > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isClearing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          title="Clear all execution history"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      )}
    </div>
  )
}
