import { createClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, encryptTokens } from "@/lib/oauth/google"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL(`/oauth/callback?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/oauth/callback?error=missing_params", request.url))
    }

    const supabase = await createClient()

    // Decode state to get user_id and scopes
    let stateData: any
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString())
    } catch {
      return NextResponse.redirect(new URL("/oauth/callback?error=invalid_state", request.url))
    }

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user || user.id !== stateData.user_id) {
      return NextResponse.redirect(new URL("/oauth/callback?error=unauthorized", request.url))
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    const encrypted = encryptTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    // Get email from token or state
    const email = tokens.email || stateData.email || "unknown@example.com"

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from("oauth_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("email", email)
      .single()

    const accountData = {
      user_id: user.id,
      provider: "google",
      email: email,
      account_label: stateData.account_label || null,
      encrypted_refresh_token: encrypted.encrypted_refresh_token,
      encrypted_access_token: encrypted.encrypted_access_token,
      token_expires_at: tokens.expires_at.toISOString(),
      scopes: tokens.scopes,
      is_default: false, // Set to true if this is the first account
    }

    let accountId: string

    if (existingAccount) {
      // Update existing account
      const { data: updated, error: updateError } = await supabase
        .from("oauth_accounts")
        .update(accountData)
        .eq("id", existingAccount.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      accountId = updated.id
    } else {
      // Check if this is the first account (set as default)
      const { count } = await supabase
        .from("oauth_accounts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("provider", "google")

      if (count === 0) {
        accountData.is_default = true
      }

      // Insert new account
      const { data: inserted, error: insertError } = await supabase
        .from("oauth_accounts")
        .insert(accountData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      accountId = inserted.id
    }

    // Store scopes
    for (const scope of tokens.scopes) {
      await supabase.from("oauth_scopes").upsert({
        account_id: accountId,
        scope,
      })
    }

    return NextResponse.redirect(new URL(`/oauth/callback?success=true&account_id=${accountId}`, request.url))
  } catch (error: any) {
    console.error("[OAuth Callback] Error:", error)
    return NextResponse.redirect(
      new URL(`/oauth/callback?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
