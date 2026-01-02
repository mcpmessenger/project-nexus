"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_executions}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completed}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Failed</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.failed}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avg_execution_time}ms</div>
        </CardContent>
      </Card>
    </div>
  )
}
