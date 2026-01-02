"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Check } from "lucide-react"

interface OAuthAccount {
  id: string
  provider: string
  email: string
  account_label: string | null
  scopes: string[]
  is_default: boolean
  created_at: string
}

interface AccountSwitcherProps {
  onSelectAccount?: (accountId: string) => void
  selectedAccountId?: string
}

export function AccountSwitcher({ onSelectAccount, selectedAccountId }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<OAuthAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    setLoading(true)
    try {
      const res = await fetch("/api/oauth/accounts")
      if (res.ok) {
        const data = await res.json()
        setAccounts(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetDefault(accountId: string) {
    try {
      const res = await fetch("/api/oauth/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, is_default: true }),
      })

      if (res.ok) {
        await fetchAccounts()
      }
    } catch (error) {
      console.error("Failed to set default account:", error)
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm("Are you sure you want to disconnect this account?")) {
      return
    }

    try {
      const res = await fetch(`/api/oauth/accounts?account_id=${accountId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchAccounts()
        if (selectedAccountId === accountId) {
          onSelectAccount?.(accounts.find((a) => a.id !== accountId)?.id || "")
        }
      }
    } catch (error) {
      console.error("Failed to delete account:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Connected Accounts</CardTitle>
          <CardDescription>Connect a Google account to get started</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>Manage your Google Workspace accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
              selectedAccountId === account.id ? "border-primary bg-accent" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{account.email}</span>
                  {account.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {account.account_label && (
                    <Badge variant="outline" className="text-xs">
                      {account.account_label}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {account.scopes?.length || 0} scopes granted
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedAccountId === account.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
              {!account.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetDefault(account.id)}
                  className="text-xs"
                >
                  Set Default
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectAccount?.(account.id)}
                className="text-xs"
              >
                Select
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(account.id)}
                className="text-xs text-destructive"
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
