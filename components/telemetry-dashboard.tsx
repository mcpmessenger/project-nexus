"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Activity, Zap, CheckCircle2, XCircle } from "lucide-react"

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
    </div>
  )
}
