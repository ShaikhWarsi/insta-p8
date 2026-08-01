import * as fs from "fs"
import * as path from "path"
import { getSupabaseAdmin } from "./supabase-admin"

let _migrated = false
let _running: Promise<void> | null = null

/**
 * Run schema.sql's safe DDL against the live database. Idempotent.
 *
 * Auto-migration scope (per project decision):
 *   - CREATE TABLE IF NOT EXISTS
 *   - CREATE INDEX IF NOT EXISTS
 *   - CREATE EXTENSION IF NOT EXISTS
 *
 * NOT auto-migrated (apply once via the SQL editor or pgcron):
 *   - CREATE POLICY          (storage RLS)
 *   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 *
 * Reason: the Supabase JS client exposes no raw SQL endpoint. We rely on
 * schema.sql itself being idempotent (`IF NOT EXISTS`) so re-running safe
 * DDL on every cold start is harmless. Policies and RLS need to be applied
 * once in the Supabase SQL editor -- they reference the anon role, which
 * the migration runner doesn't switch into.
 *
 * Atomic RPC alternative: pages could opt into a `public.missing_tables()`
 * RPC. Out of scope here; the existing pattern is good enough.
 */
const EXPECTED_TABLES = [
  "users",
  "conversations",
  "messages",
  "webhook_events",
  "automations",
  "media_cache",
  "ice_breakers",
  "content_pool",
  "scheduler_config",
  "reels_posts",
  "dm_queue",
  "unlock_attempts",
]

/**
 * Apply schema.sql. Safe to call multiple times.
 *
 * Runs only once per cold start per Vercel instance.
 *
 * The information_schema precheck was removed: PostgREST does not expose
 * information_schema tables by default, so the previous implementation
 * always assumed all tables were missing and ran the entire DDL set. The
 * `IF NOT EXISTS` guards in schema.sql make that safe, so we skip the
 * precheck entirely and rely on idempotent DDL.
 */
export async function ensureSchema(): Promise<void> {
  if (_migrated) return
  if (_running) return _running

  _running = (async () => {
    // Resolve schema.sql relative to project root. next.config.js lists it
    // in `outputFileTracingIncludes` so that the Vercel serverless bundle
    // includes the file at runtime.
    const schemaPath = path.join(process.cwd(), "schema.sql")
    if (!fs.existsSync(schemaPath)) {
      console.warn(`[migrate] schema.sql not found at ${schemaPath}, skipping auto-migration`)
      return
    }

    console.log(`[migrate] Applying schema.sql (idempotent CREATE TABLE / INDEX / EXTENSION)...`)

    const sql = fs.readFileSync(schemaPath, "utf8")
    const supabase = getSupabaseAdmin()
    const statements = parseSafeStatements(sql)
    console.log(`[migrate] Extracted ${statements.length} safe statements...`)

    // Try `exec_sql` RPC first -- the most reliable path when the
    // project has set up the helper. If it doesn't exist, log and stop.
    // The other option is to construct one API call per statement, which
    // is what we'd do if exec_sql exists. If it doesn't, we degrade
    // gracefully: the user gets a clear log message and a one-time SQL
    // editor run is documented.
    for (const stmt of statements) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: stmt })
        if (error) {
          console.warn(`[migrate] exec_sql RPC skipped (${error.message})`)
          console.warn(`[migrate] Run schema.sql in the Supabase SQL editor if tables are missing.`)
          break
        }
      } catch (e) {
        console.warn(`[migrate] exec_sql RPC unavailable:`, e instanceof Error ? e.message : e)
        console.warn(`[migrate] Run schema.sql in the Supabase SQL editor if tables are missing.`)
        break
      }
    }

    _migrated = true
  })()

  return _running
}

/**
 * Extract CREATE TABLE / CREATE INDEX / CREATE EXTENSION statements from
 * schema.sql. We deliberately EXCLUDE CREATE POLICY -- policies require
 * one-time application in the SQL editor because they reference the `anon`
 * role and the table-level ALTER TABLE ... ENABLE ROW LEVEL SECURITY.
 *
 * Each statement is fetched in declaration order. The IF NOT EXISTS
 * guards make every statement safe to re-run.
 */
function parseSafeStatements(sql: string): string[] {
  const out: string[] = []
  const lines = sql.split("\n")
  let buf: string[] = []
  let inStatement = false

  for (const line of lines) {
    const trimmed = line.trim()
    // Only CREATE TABLE / INDEX / EXTENSION -- NOT CREATE POLICY.
    const starts = /^(CREATE\s+(TABLE|INDEX|EXTENSION)\s+IF\s+NOT\s+EXISTS)/i.test(trimmed)
    if (starts) {
      inStatement = true
      buf = [line]
      if (trimmed.endsWith(";")) {
        out.push(buf.join("\n"))
        buf = []
        inStatement = false
      }
    } else if (inStatement) {
      buf.push(line)
      if (trimmed.endsWith(";")) {
        out.push(buf.join("\n"))
        buf = []
        inStatement = false
      }
    }
  }
  return out
}
