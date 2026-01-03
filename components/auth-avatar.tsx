"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { User as UserIcon } from "lucide-react"
import { User } from "@supabase/supabase-js"


export function AuthAvatar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const avatarRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const refreshUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    } catch (error) {
      console.error("[AuthAvatar] Failed to refresh session:", error)
    }
  }

  useEffect(() => {
    refreshUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen &&
        !avatarRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [menuOpen])

  const handleGoogleConnect = async () => {
    setLoadingGoogle(true)
    setErrorMessage(null)

    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        throw error
      }

      if (!data.url) {
        throw new Error("Google OAuth URL not returned")
      }

      // Redirect to OAuth URL
      window.location.href = data.url
    } catch (error: any) {
      console.error("[AuthAvatar] Google connect failed:", error)
      setErrorMessage(error.message || "Google sign-in failed.")
      setLoadingGoogle(false)
    }
  }

  const handleGithubConnect = async () => {
    setLoadingGithub(true)
    setErrorMessage(null)

    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo,
          scopes: ["read:user", "user:email"],
        },
      })

      if (error) {
        throw error
      }

      if (!data.url) {
        throw new Error("GitHub OAuth URL not returned")
      }

      // Redirect to OAuth URL
      window.location.href = data.url
    } catch (error: any) {
      console.error("[AuthAvatar] GitHub connect failed:", error)
      setErrorMessage(error.message || "GitHub sign-in failed.")
      setLoadingGithub(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setStatusMessage("Signed out.")
      setMenuOpen(false)
    } catch (error) {
      console.error("[AuthAvatar] Sign out failed:", error)
      setErrorMessage("Unable to sign out.")
    }
  }

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <div className="relative">
      <button
        ref={avatarRef}
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-muted/50 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Authentication menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={user?.email || "avatar"} className="h-full w-full rounded-full object-cover" />
        ) : (
          <UserIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 z-[9999] mt-2 w-56 rounded-xl border border-border bg-white dark:bg-[#1f1f1f] p-3 shadow-lg"
        >
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {user ? "Signed in" : "Authenticate"}
          </div>
          {user && (
            <p className="text-sm text-foreground/80">
              {user.email}
            </p>
          )}
          <div className="mt-3 space-y-2">
            <Button
              size="sm"
              className="w-full justify-start"
              disabled={loadingGoogle}
              variant="ghost"
              onClick={handleGoogleConnect}
            >
              {loadingGoogle ? "Opening Google…" : "Connect with Google"}
            </Button>
            <Button
              size="sm"
              className="w-full justify-start"
              disabled={loadingGithub}
              variant="ghost"
              onClick={handleGithubConnect}
            >
              {loadingGithub ? "Opening GitHub…" : "Connect with GitHub"}
            </Button>
            {user && (
              <Button size="sm" className="w-full justify-start" variant="ghost" onClick={handleSignOut}>
                Sign out
              </Button>
            )}
          </div>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              Signing in unlocks provisioning MCP servers and persisting tool usage.
            </p>
          )}
          {statusMessage && <p className="mt-3 text-xs text-foreground/80">{statusMessage}</p>}
          {errorMessage && <p className="mt-3 text-xs text-destructive">{errorMessage}</p>}
        </div>
      )}
    </div>
  )
}
