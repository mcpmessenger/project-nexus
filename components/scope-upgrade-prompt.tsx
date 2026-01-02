"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"

interface ScopeUpgradePromptProps {
  accountId: string
  operation: string
  requiredScopes: string[]
  onUpgrade?: () => void
  onCancel?: () => void
}

export function ScopeUpgradePrompt({
  accountId,
  operation,
  requiredScopes,
  onUpgrade,
  onCancel,
}: ScopeUpgradePromptProps) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/oauth/google/upgrade-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          operation,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to upgrade scope")
      }

      // Open authorization URL
      const authWindow = window.open(data.authorization_url, "Google OAuth", "width=600,height=700")

      // Poll for window close
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer)
          setLoading(false)
          onUpgrade?.()
        }
      }, 1000)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer)
        if (authWindow && !authWindow.closed) {
          authWindow.close()
        }
        setLoading(false)
      }, 5 * 60 * 1000)
    } catch (error: any) {
      setLoading(false)
      alert(error.message || "Failed to upgrade scope")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Additional Permissions Required
        </CardTitle>
        <CardDescription>
          This operation requires additional permissions from your Google account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Operation: {operation}</p>
          <p className="text-sm text-muted-foreground mb-2">Required scopes:</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {requiredScopes.map((scope) => (
              <li key={scope} className="truncate">
                {scope}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleUpgrade} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Upgrading...
              </>
            ) : (
              "Grant Permissions"
            )}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
