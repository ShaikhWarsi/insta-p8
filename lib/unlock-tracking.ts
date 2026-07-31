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
 * Stale entries are auto-expired after 24h (same window as Instagram's
 * private-reply quota).
 */

const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000
const supabaseLazy = () => getSupabaseAdmin()

export function unlockKey(senderId: string, ruleId: string): string {
  return `${senderId}::${ruleId}`
}

async function loadAttempt(key: string): Promise<number | null> {
  try {
    const { data } = await supabaseLazy()
      .from("unlock_attempts")
      .select("count, updated_at")
      .eq("key", key)
      .single()
    if (!data) return null
    const updated = new Date(data.updated_at).getTime()
    if (Date.now() - updated > UNLOCK_TTL_MS) {
      // Stale — let caller treat as fresh
      await supabaseLazy().from("unlock_attempts").delete().eq("key", key)
      return null
    }
    return data.count as number
  } catch {
    return null
  }
}

async function saveAttempt(key: string, count: number): Promise<void> {
  try {
    await supabaseLazy()
      .from("unlock_attempts")
      .upsert({ key, count, updated_at: new Date().toISOString() })
  } catch {
    // Swallow — DB failures fall through to first-attempt behavior
  }
}

async function deleteAttempt(key: string): Promise<void> {
  try {
    await supabaseLazy().from("unlock_attempts").delete().eq("key", key)
  } catch {
    // Swallow
  }
}

/**
 * Increment the attempt counter for a (sender, rule) pair.
 * Returns the new count after increment. If the DB is unavailable, falls
 * back to 1 (so the caller still sends the first card).
 */
export async function bumpUnlockAttempt(key: string): Promise<number> {
  const current = await loadAttempt(key)
  const next = (current ?? 0) + 1
  await saveAttempt(key, next)
  return next
}

/**
 * Remove the counter for a (sender, rule) pair — call after verification
 * succeeds or fails outright so retries start fresh.
 */
export async function clearUnlockAttempts(key: string): Promise<void> {
  await deleteAttempt(key)
}
