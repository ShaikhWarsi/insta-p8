import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from("users")
    .select("groq_auto_reply_enabled, ai_context, groq_api_key")
    .eq("id", userId)
    .single()

  if (error || !data) return NextResponse.json({ enabled: false, ai_context: "", has_api_key: false })
  return NextResponse.json({
    enabled: data.groq_auto_reply_enabled ?? false,
    ai_context: data.ai_context ?? "",
    // never send the raw key to the client — just signal whether one is saved
    has_api_key: Boolean(data.groq_api_key),
  })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { userId, enabled, ai_context, groq_api_key } = body
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const supabase = await getSupabaseServerClient()
  const update: Record<string, unknown> = {}
  if (typeof enabled === "boolean") update.groq_auto_reply_enabled = enabled
  if (typeof ai_context === "string") update.ai_context = ai_context
  // empty string = clear the key; truthy string = save it
  if (typeof groq_api_key === "string") update.groq_api_key = groq_api_key || null

  const { error } = await supabase.from("users").update(update).eq("id", userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
