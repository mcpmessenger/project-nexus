import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const next = requestUrl.searchParams.get("next") || "/"

  if (error) {
    // Redirect to home with error
    const redirectUrl = new URL(next, request.url)
    redirectUrl.searchParams.set("auth_error", errorDescription || error)
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error("[Auth Callback] Code exchange error:", exchangeError)
      const redirectUrl = new URL(next, request.url)
      redirectUrl.searchParams.set("auth_error", exchangeError.message)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect to home page or next URL
  return NextResponse.redirect(new URL(next, request.url))
}
