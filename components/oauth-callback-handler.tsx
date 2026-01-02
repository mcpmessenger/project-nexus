"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

function OAuthCallbackContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const error = searchParams.get("error")
    const success = searchParams.get("success")
    const accountId = searchParams.get("account_id")

    if (error) {
      setStatus("error")
      setMessage(decodeURIComponent(error))
    } else if (success && accountId) {
      setStatus("success")
      setMessage("Google account connected successfully!")
    } else {
      setStatus("loading")
      setMessage("Processing authorization...")
    }
  }, [searchParams])

  function handleClose() {
    window.close()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
            {status === "loading" && "Connecting..."}
            {status === "success" && "Connected!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function OAuthCallbackHandler() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}
