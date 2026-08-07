const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const OPENAI_URL = "https://api.openai.com/v1/chat/completions"

export async function generateAIReply(userMessage: string, aiContext: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn("[ai-reply] No API key configured (GROQ_API_KEY or OPENAI_API_KEY)")
    return null
  }

  const baseUrl = process.env.AI_BASE_URL || (process.env.GROQ_API_KEY ? GROQ_URL : OPENAI_URL)
  const model = process.env.AI_MODEL || (process.env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "gpt-4o-mini")

  const systemPrompt = aiContext?.trim()
    ? `You are an Instagram DM assistant. ${aiContext.trim()}\n\nReply naturally in 1-2 sentences. Be conversational, warm, and on-brand. Do not use hashtags. Never reveal you are an AI.`
    : "You are an Instagram DM assistant. Reply naturally and helpfully in 1-2 sentences. Be conversational. Do not use hashtags. Never reveal you are an AI."

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error("[ai-reply] API error", res.status, errText.slice(0, 200))
      return null
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (e) {
    console.error("[ai-reply] fetch error", e)
    return null
  }
}
