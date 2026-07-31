import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _admin: SupabaseClient | null = null

/**
 * Service-role Supabase client — bypasses RLS.
 * Used for: schema migrations, server-side background work, unlock-attempt tracking.
 *
 * Never expose this to the client. Bind env vars carefully:
 *   NEXT_PUBLIC_SUPABASE_URL  — public URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (server-only)
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("[supabase-admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return _admin
}
