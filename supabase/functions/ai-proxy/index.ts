import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

interface LeadContext {
  company: string
  industry: string
  employees?: number
  contact_name: string
  contact_title?: string
  annual_it_budget?: string
  current_infra?: string
  pain_points?: string[]
}

interface AIRequest {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'gemini'
  model: string
  depth: 'quick' | 'deep'
  lead: LeadContext
  apiKey?: string
}

class ProviderError extends Error {
  status: number
  providerBody?: string
  constructor(status: number, message: string, providerBody?: string) {
    super(message)
    this.status = status
    this.providerBody = providerBody
  }
}

const SYSTEM_PROMPT = `You are a senior B2B sales intelligence assistant for CES, an IT infrastructure consultancy.
Analyze the provided lead and return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "industry": "Best-fit industry label (e.g. Technology, Healthcare, Finance, Manufacturing)",
  "employees": 123,
  "icp_options": [
    { "value": "Specific ICP label", "confidence": "high|medium|low", "reasoning": "..." }
  ],
  "tier": "Tier 1|Tier 2|Tier 3",
  "it_type": "Cloud|On-Premise|Hybrid|Unknown",
  "pain_points": ["point 1", "point 2", ...],
  "enrichment": {
    "company_context": "...",
    "key_challenges": "...",
    "recommended_approach": "..."
  },
  "research": {
    "summary": "2-3 sentence executive summary the rep can read before a call",
    "recent_activities": "Recent company news, funding, M&A, expansions, earnings highlights or strategic initiatives (past 6-12 months)",
    "upcoming_activities": "Known or likely upcoming programs, events, product launches, webinars, conferences, roadshows, hiring pushes, expansions or go-to-market initiatives",
    "key_drivers": "Business and technology drivers likely to create IT infrastructure spend",
    "industry_trends": "Relevant 2025-2026 trends for this industry",
    "next_portfolio": "Likely upcoming infrastructure/cyber/cloud projects",
    "ces_support": "Specific CES services that map to the lead's likely needs",
    "competitors": "3-5 key competitors or peers",
    "tech_stack": "Inferred current technology stack, cloud platforms, legacy systems",
    "decision_makers": "Typical buying committee roles and titles to target",
    "buying_triggers": "Signals or events that indicate an active buying window",
    "talking_points": "3-5 conversation openers tailored to this company/contact",
    "ces_entry_angle": "The single best way for CES to start a conversation"
  }
}

Infer industry and employees from the company context if they are missing or ambiguous in the provided lead. Use public knowledge of the company when needed. The icp_options field should be 2-4 specific, company-relevant ideal-customer-profile labels (e.g. "Enterprise Aerospace & Defense", "Satellite Communications", "Advanced Manufacturing", "Mid-Market Healthcare", "Cloud-Native SaaS") — not generic size+industry placeholders. Each option must combine the likely segment (Enterprise/Mid-Market/SMB) with a meaningful vertical or business unit relevant to the company. Use the research depth provided: "quick" returns 4-5 pain points and concise enrichment/research (1-2 sentences per field); "deep" returns 7-8 pain points with detailed enrichment and comprehensive research sections (3-5 sentences per field). Be specific, actionable, and sales-relevant.`

function buildUserMessage(req: AIRequest): string {
  const { lead, depth } = req
  return `Research depth: ${depth}
Company: ${lead.company}
Industry: ${lead.industry}
Employees: ${lead.employees ?? 'unknown'}
Contact: ${lead.contact_name} (${lead.contact_title ?? 'unknown'})
IT Budget: ${lead.annual_it_budget ?? 'unknown'}
Current Infrastructure: ${lead.current_infra ?? 'unknown'}
Existing Pain Points: ${(lead.pain_points || []).join('; ') || 'none provided'}`
}

function stripJson(text: string): string {
  return text.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
}

function parseProviderError(body: string, provider: string): { message: string; retryAfter?: number } {
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

function mockResponse(req: AIRequest): object {
  const { lead, depth } = req
  const emp = lead.employees ?? 0
  const segment = emp > 2000 ? 'Enterprise' : emp >= 200 ? 'Mid-Market' : 'SMB'
  const icp = `${segment} ${lead.industry || 'Other'}`
  return {
    industry: lead.industry || 'Technology',
    employees: lead.employees || 150,
    icp_options: [
      { value: icp, confidence: 'high', reasoning: `${segment} segment based on available data` },
      { value: `Mid-Market ${lead.industry || 'Other'}`, confidence: 'medium', reasoning: 'Boundary case' },
    ],
    tier: emp > 2000 ? 'Tier 1' : emp >= 200 ? 'Tier 2' : 'Tier 3',
    it_type: 'Hybrid',
    pain_points:
      depth === 'deep'
        ? [
            'AI infrastructure costs are rising faster than budgets can absorb',
            'Legacy systems block modern API-first integrations',
            'Data silos prevent a single source of truth for AI initiatives',
            'Security and compliance requirements outpace current tooling',
            'Talent gaps make SRE and platform engineering hard to scale',
            'Cloud spend lacks FinOps governance and attribution',
            'Incident response remains reactive due to observability gaps',
            'End-of-life hardware creates urgent modernisation risk',
          ]
        : [
            'Legacy systems block modern API-first integrations',
            'Data silos prevent a single source of truth',
            'Security and compliance requirements outpace tooling',
            'Cloud spend lacks FinOps governance',
          ],
    enrichment: {
      company_context: `${lead.company} operates in the ${lead.industry} sector with ${emp || 'unknown'} employees.`,
      key_challenges: 'Cost control, legacy modernisation, and security compliance.',
      recommended_approach: 'Start with a no-obligation infrastructure assessment.',
    },
    research: {
      summary: `${lead.company} is a ${icp} organisation evaluating IT modernisation and AI readiness.`,
      recent_activities: 'Evaluating IT modernisation and AI readiness initiatives.',
      upcoming_activities: 'Likely planning cloud roadshows, security awareness programs, and AI pilot launches in the next quarter.',
      key_drivers: 'Cost optimisation, compliance, and competitive pressure.',
      industry_trends: 'AI adoption accelerating; infrastructure modernisation critical.',
      next_portfolio: 'Cloud migration, FinOps, and security posture improvement.',
      ces_support: 'Managed services, cloud migration, and AI-ready infrastructure.',
      competitors: 'Peers in the same segment are investing in cloud migration and cybersecurity.',
      tech_stack: 'Likely mix of on-premise legacy systems and early cloud adoption.',
      decision_makers: 'CIO, CTO, VP of Infrastructure, Head of Security.',
      buying_triggers: 'End-of-life hardware, compliance audits, cloud cost overruns.',
      talking_points: '1) AI readiness assessment 2) Cloud cost optimisation 3) Security posture review 4) Legacy modernisation roadmap 5) Managed services overview.',
      ces_entry_angle: 'Offer a no-obligation infrastructure assessment focused on AI readiness and cost optimisation.',
    },
  }
}

async function resolveApiKey(
  req: AIRequest,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<string | undefined> {
  // 1. Explicit per-request override (legacy / power-user).
  if (req.apiKey) return req.apiKey

  // 2. Admin-configured keys in ces_settings.
  try {
    const { data, error } = await supabaseAdmin
      .from('ces_settings')
      .select('ai_keys')
      .eq('id', 'global')
      .single()
    if (error) {
      console.error('ces_settings read error:', error.message)
    } else if (data?.ai_keys) {
      const keys = data.ai_keys as Record<string, string>
      const key = keys[`${req.provider}_key`]
      if (key) return key
    }
  } catch (err) {
    console.error('ces_settings exception:', err)
  }

  // 3. Server-side secrets.
  return Deno.env.get(`${req.provider.toUpperCase()}_API_KEY`)
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

    let body: AIRequest
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body')
    }

    if (!body.provider || !body.model || !body.lead) {
      return errorResponse('Missing provider, model, or lead')
    }

    const useMock = Deno.env.get('AI_MOCK_MODE') === 'true'
    if (useMock) {
      return jsonResponse(mockResponse(body))
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const apiKey = await resolveApiKey(body, supabaseAdmin)
    if (!apiKey) {
      return errorResponse(
        `API key not configured for ${body.provider}. Ask an admin to add it in Settings → AI Engine or set the ${body.provider.toUpperCase()}_API_KEY Supabase secret.`,
        500
      )
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(body) },
    ]

    let raw = ''
    if (body.provider === 'openrouter') raw = await callOpenRouter(apiKey, body.model, messages)
    else if (body.provider === 'openai') raw = await callOpenAI(apiKey, body.model, messages)
    else if (body.provider === 'anthropic') raw = await callAnthropic(apiKey, body.model, messages)
    else if (body.provider === 'gemini') raw = await callGemini(apiKey, body.model, messages)
    else return errorResponse('Unknown provider')

    try {
      const parsed = JSON.parse(raw)
      return jsonResponse(parsed)
    } catch {
      return errorResponse(`Provider returned invalid JSON: ${raw.slice(0, 500)}`, 502)
    }
  } catch (err) {
    const status = err instanceof ProviderError ? err.status : 500
    const message = err instanceof Error ? err.message : 'AI request failed'
    console.error('ai-proxy unhandled error:', err)
    return errorResponse(message, status)
  }
})
