"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface GoogleOAuthButtonProps {
  accountLabel?: string
  onSuccess?: (accountId: string) => void
  onError?: (error: string) => void
}

export function GoogleOAuthButton({ accountLabel, onSuccess, onError }: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch("/api/oauth/google/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_label: accountLabel }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate OAuth")
      }

      // Open authorization URL in new window
      const authWindow = window.open(data.authorization_url, "Google OAuth", "width=600,height=700")

      // Poll for window close or success
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer)
          setLoading(false)
          // Check for success by fetching accounts
          checkAccountStatus()
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
      onError?.(error.message || "Failed to connect Google account")
    }
  }

  async function checkAccountStatus() {
    try {
      const res = await fetch("/api/oauth/accounts")
      const accounts = await res.json()
      if (Array.isArray(accounts) && accounts.length > 0) {
        const latestAccount = accounts[0]
        onSuccess?.(latestAccount.id)
      }
    } catch (error) {
      console.error("Failed to check account status:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Google Account</CardTitle>
        <CardDescription>Link your Google account to access Gmail, Calendar, and Drive</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleConnect} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect with Google
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
