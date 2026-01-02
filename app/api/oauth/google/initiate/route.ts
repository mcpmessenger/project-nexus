import { createClient } from "@/lib/supabase/server"
import { getAuthorizationUrl } from "@/lib/oauth/google"
import { MINIMAL_SCOPES } from "@/lib/oauth/scopes"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { scopes, account_label } = await request.json()
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use provided scopes or default to minimal
    const requestedScopes = scopes && Array.isArray(scopes) ? scopes : MINIMAL_SCOPES

    // Generate authorization URL
    const { url, state } = getAuthorizationUrl(requestedScopes)

    // Store state in database or session for verification (simplified - in production use secure session storage)
    // For now, we'll include account_label in state token
    const stateData = {
      state,
      user_id: user.id,
      scopes: requestedScopes,
      account_label: account_label || null,
    }

    // In production, store this in a secure session store or database
    // For now, we'll encode it in the state (not ideal for production)
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString("base64url")

    return NextResponse.json({
      authorization_url: url.replace(state, encodedState), // Replace state with encoded version
      state: encodedState,
    })
  } catch (error: any) {
    console.error("[OAuth Initiate] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to initiate OAuth" }, { status: 500 })
  }
}
