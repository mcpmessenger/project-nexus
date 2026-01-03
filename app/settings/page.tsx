"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import type { UserSecret } from "@/lib/types"

const API_KEY_DEFINITIONS = [
  {
    key: "BRAVE_API_KEY",
    label: "Brave Search API Key",
    helper: "Required to call Brave Search MCP tools.",
  },
  {
    key: "MAPS_API_KEY",
    label: "Maps API Key",
    helper: "Required for Google Maps Grounding tools.",
  },
] as const

const INITIAL_KEY_VALUES = API_KEY_DEFINITIONS.reduce<Record<string, string>>((acc, entry) => {
  acc[entry.key] = ""
  return acc
}, {})

export default function SettingsPage() {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...INITIAL_KEY_VALUES }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadSecrets() {
      try {
        const res = await fetch("/api/settings/secrets")
        if (!res.ok) {
          throw new Error("Failed to load secrets")
        }

        const data: UserSecret[] = await res.json()
        if (!isMounted) return

        const updatedValues = API_KEY_DEFINITIONS.reduce<Record<string, string>>((acc, entry) => {
          acc[entry.key] = ""
          return acc
        }, {})

        data.forEach((secret) => {
          if (secret.key in updatedValues) {
            updatedValues[secret.key] = secret.value
          }
        })

        setValues(updatedValues)
      } catch (err) {
        console.error("[Settings] Failed to load secrets:", err)
        if (isMounted) {
          setError("Unable to load API keys.")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadSecrets()
    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setStatusMessage(null)
    setError(null)

    try {
      await Promise.all(
        API_KEY_DEFINITIONS.map(({ key }) =>
          fetch("/api/settings/secrets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key,
              value: values[key] ?? "",
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const errorText = await res.text()
              throw new Error(`${key}: ${errorText || res.statusText}`)
            }
          })
        )
      )

      setStatusMessage("API keys saved.")
    } catch (err: any) {
      console.error("[Settings] Failed to save keys:", err)
      setError(err.message || "Failed to save API keys.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-full justify-center px-4 py-10">
      <Card className="w-full max-w-3xl space-y-6">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="h-8 w-8 p-0"
              title="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Nexus Settings</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Store sensitive keys securely so the Nexus control plane can provision MCP servers.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                These keys are encrypted in Supabase and scoped to your user account. Updating them
                here pushes the values to the infrastructure that needs them.
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {API_KEY_DEFINITIONS.map((entry) => (
                  <div key={entry.key} className="space-y-1">
                    <Label htmlFor={entry.key} className="text-sm font-medium">
                      {entry.label}
                    </Label>
                    <Input
                      id={entry.key}
                      value={values[entry.key]}
                      placeholder={`Enter ${entry.label}`}
                      onChange={(event) => handleChange(entry.key, event.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">{entry.helper}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={loading || saving} className="w-fit">
                {saving ? "Saving..." : "Save API Keys"}
              </Button>
              {statusMessage && <p className="text-xs text-foreground/80">{statusMessage}</p>}
              {error && (
                <p className="text-xs text-destructive">
                  {error} <Link href="/settings">Retry</Link>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
