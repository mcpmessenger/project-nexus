import { createClient } from "@/lib/supabase/server"
import { getAuthorizationUrl } from "@/lib/oauth/google"
import { getRequiredScopeUpgrade } from "@/lib/oauth/scopes"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { account_id, operation } = await request.json()

    if (!account_id || !operation) {
      return NextResponse.json({ error: "account_id and operation are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get account and current scopes
    const { data: account, error: accountError } = await supabase
      .from("oauth_accounts")
      .select("id, scopes, user_id")
      .eq("id", account_id)
      .eq("user_id", user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Get required scopes for operation
    const missingScopes = getRequiredScopeUpgrade(account.scopes || [], operation as any)

    if (missingScopes.length === 0) {
      return NextResponse.json({ message: "Account already has required scopes" })
    }

    // Merge with existing scopes
    const allScopes = [...(account.scopes || []), ...missingScopes]

    // Generate authorization URL with new scopes
    const { url, state } = getAuthorizationUrl(allScopes)

    // Store state with account_id
    const stateData = {
      state,
      user_id: user.id,
      account_id: account.id,
      scopes: allScopes,
      operation,
    }

    const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64url")

    return NextResponse.json({
      authorization_url: url.replace(state, encodedState),
      state: encodedState,
      required_scopes: missingScopes,
    })
  } catch (error: any) {
    console.error("[OAuth Upgrade Scope] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to upgrade scope" }, { status: 500 })
  }
}
