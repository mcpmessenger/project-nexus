import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all accounts for user
    const { data: accounts, error } = await supabase
      .from("oauth_accounts")
      .select("id, provider, email, account_label, scopes, is_default, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(accounts || [])
  } catch (error: any) {
    console.error("[OAuth Accounts] Error:", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("account_id")

    if (!accountId) {
      return NextResponse.json({ error: "account_id is required" }, { status: 400 })
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

    // Delete account (cascade will handle related records)
    const { error } = await supabase
      .from("oauth_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[OAuth Accounts Delete] Error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { account_id, account_label, is_default } = await request.json()

    if (!account_id) {
      return NextResponse.json({ error: "account_id is required" }, { status: 400 })
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

    const updates: any = {}
    if (account_label !== undefined) updates.account_label = account_label
    if (is_default !== undefined) {
      updates.is_default = is_default
      // If setting as default, unset other defaults
      if (is_default) {
        await supabase
          .from("oauth_accounts")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("provider", "google")
          .neq("id", account_id)
      }
    }

    const { data, error } = await supabase
      .from("oauth_accounts")
      .update(updates)
      .eq("id", account_id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[OAuth Accounts Update] Error:", error)
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
  }
}
