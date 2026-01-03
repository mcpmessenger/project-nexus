import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Ignored for Server Components
        }
      },
    },
  })
}

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use this when you need to query data but are already verifying the user identity separately
 * (e.g., with bearer token authentication)
 */
export function createServiceRoleClient() {
  // Try multiple environment variable names (for compatibility)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  
  if (!serviceRoleKey) {
    const supabaseVars = Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
    console.error("[createServiceRoleClient] SUPABASE_SERVICE_ROLE_KEY is not set in process.env")
    console.error("[createServiceRoleClient] Available SUPABASE env vars:", supabaseVars || 'NONE')
    console.error("[createServiceRoleClient] NODE_ENV:", process.env.NODE_ENV)
    console.error("[createServiceRoleClient] Next.js env vars are only loaded at server start - ensure you've restarted the dev server after adding the key to .env.local")
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
