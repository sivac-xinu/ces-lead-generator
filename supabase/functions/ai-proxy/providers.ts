export class ProviderError extends Error {
  status: number
  providerBody?: string
  constructor(status: number, message: string, providerBody?: string) {
    super(message)
    this.status = status
    this.providerBody = providerBody
  }
}

export function stripJson(text: string): string {
  return text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
}

export function parseProviderError(body: string, provider: string): { message: string; retryAfter?: number } {
  try {
    const parsed = JSON.parse(body)
    const msg = parsed?.error?.message || parsed?.error?.code || body
    const retryAfter = Number(parsed?.error?.metadata?.retry_after_seconds)
    return { message: `${provider}: ${msg}`, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined }
  } catch {
    return { message: `${provider}: ${body}` }
  }
}

async function callOpenRouter(apiKey: string, model: string, messages: unknown[]) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://sivac-xinu.github.io/ces-lead-generator',
      'X-Title': 'CES Lead Generator',
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  })
  if (!res.ok) {
    const body = await res.text()
    const { message, retryAfter } = parseProviderError(body, 'OpenRouter')
    if (res.status === 429) {
      throw new ProviderError(
        429,
        retryAfter
          ? `OpenRouter rate limit hit. Retry in ${retryAfter} seconds, switch to a non-free model, or add a small credit balance at openrouter.ai/settings.`
          : `OpenRouter rate limit hit. Switch to a non-free model or add a small credit balance at openrouter.ai/settings.`,
        body
      )
    }
    if (res.status === 404 && body.includes('No endpoints found')) {
      throw new ProviderError(
        404,
        `OpenRouter model "${model}" is not available. Choose a different model in the Intelligence modal.`,
        body
      )
    }
    if (res.status === 401) {
      throw new ProviderError(401, 'OpenRouter API key is invalid or missing.', body)
    }
    throw new ProviderError(res.status, message, body)
  }
  const data = await res.json()
  return stripJson(data.choices?.[0]?.message?.content || '')
}

async function callOpenAI(apiKey: string, model: string, messages: unknown[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  })
  if (!res.ok) {
    const body = await res.text()
    const { message } = parseProviderError(body, 'OpenAI')
    if (res.status === 401) throw new ProviderError(401, 'OpenAI API key is invalid or missing.', body)
    throw new ProviderError(res.status, message, body)
  }
  const data = await res.json()
  return stripJson(data.choices?.[0]?.message?.content || '')
}

async function callAnthropic(apiKey: string, model: string, messages: unknown[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.4 }),
  })
  if (!res.ok) {
    const body = await res.text()
    const { message } = parseProviderError(body, 'Anthropic')
    if (res.status === 401) throw new ProviderError(401, 'Anthropic API key is invalid or missing.', body)
    throw new ProviderError(res.status, message, body)
  }
  const data = await res.json()
  return stripJson(data.content?.[0]?.text || '')
}

function toGeminiContents(messages: unknown[]) {
  return messages.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

async function callGemini(apiKey: string, model: string, messages: unknown[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: toGeminiContents(messages),
      generationConfig: { temperature: 0.4, maxOutputTokens: 8000, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const { message } = parseProviderError(body, 'Gemini')
    if (res.status === 400 && body.toLowerCase().includes('api key')) {
      throw new ProviderError(401, 'Gemini API key is invalid or missing.', body)
    }
    throw new ProviderError(res.status, message, body)
  }
  const data = await res.json()
  return stripJson(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
}

export interface ProviderAdapter {
  call(apiKey: string, model: string, messages: unknown[]): Promise<string>
}

export const PROVIDERS: Record<string, ProviderAdapter> = {
  openrouter: { call: callOpenRouter },
  openai: { call: callOpenAI },
  anthropic: { call: callAnthropic },
  gemini: { call: callGemini },
}
