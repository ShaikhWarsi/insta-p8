import { getSupabaseAdmin } from "./supabase-admin"

/**
 * Persistent unlock-attempt counter, shared across serverless instances.
 *
 * Why this exists: the webhook handler runs in Vercel serverless functions,
 * each invocation having its own memory. A JS `Map` would reset between
 * requests, so the 3-attempt gate cap was ineffective — users could spam
 * the gate card indefinitely. This writes count to the `unlock_attempts`
 * table so the cap works no matter which Vercel instance handles the
 * next webhook.
 *
 * Stale entries are auto-expired by a scheduled pg_cron job (hourly DELETE
 * WHERE updated_at < NOW() - INTERVAL '24 hours'). See schema.sql.
 *
 * The increment is done via the `bump_unlock_attempt(p_key)` RPC defined
 * in schema.sql. Atomic INSERT ... ON CONFLICT DO UPDATE guarantees no
 * concurrent invocations can lose a count.
 */

const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000
const supabaseLazy = () => getSupabaseAdmin()

export function unlockKey(senderId: string, ruleId: string): string {
  return `${senderId}::${ruleId}`
}

async function deleteAttempt(key: string): Promise<void> {
  try {
    await supabaseLazy().from("unlock_attempts").delete().eq("key", key)
  } catch {
    // Swallow
  }
}

/**
 * Increment the attempt counter for a (sender, rule) pair via the
 * `bump_unlock_attempt` Postgres RPC. Atomic and race-free.
 *
 * Returns the new count. If the RPC fails for any reason (table missing,
 * network error, etc.), falls back to 1 so the user still gets their
 * first gate card rather than being silently blocked.
 */
export async function bumpUnlockAttempt(key: string): Promise<number> {
  try {
    const { data, error } = await supabaseLazy().rpc("bump_unlock_attempt", {
      p_key: key,
    } as any)
    if (error) {
      console.warn(`[unlock-tracking] bump_unlock_attempt RPC failed for key=${key}: ${error.message}`)
      return 1
    }
    if (typeof data !== "number") {
      console.warn(`[unlock-tracking] bump_unlock_attempt returned non-number for key=${key}: ${JSON.stringify(data)}`)
      return 1
    }
    return data
  } catch (e) {
    console.warn(`[unlock-tracking] bump_unlock_attempt threw for key=${key}:`, e instanceof Error ? e.message : e)
    return 1
  }
}

/**
 * Remove the counter for a (sender, rule) pair — call after verification
 * succeeds or fails outright so retries start fresh.
 */
export async function clearUnlockAttempts(key: string): Promise<void> {
  await deleteAttempt(key)
}
