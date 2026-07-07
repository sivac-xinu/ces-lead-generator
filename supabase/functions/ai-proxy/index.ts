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
  provider: 'openrouter' | 'openai' | 'anthropic'
  model: string
  depth: 'quick' | 'deep'
  lead: LeadContext
  apiKey?: string
}

const SYSTEM_PROMPT = `You are a B2B sales intelligence assistant for CES, an IT infrastructure consultancy.
Analyze the provided lead and return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "icp_options": [
    { "value": "Segment Industry", "confidence": "high|medium|low", "reasoning": "..." }
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
    "recent_activities": "...",
    "key_drivers": "...",
    "industry_trends": "...",
    "next_portfolio": "...",
    "ces_support": "..."
  }
}

Use the research depth provided: "quick" returns 4-5 pain points and concise enrichment; "deep" returns 7-8 pain points with detailed enrichment and research sections.`

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
    if (res.status === 404 && body.includes('No endpoints found')) {
      throw new Error(
        `OpenRouter model "${model}" is not available. Choose a different model in the Intelligence modal.`
      )
    }
    if (res.status === 401) {
      throw new Error('OpenRouter API key is invalid or missing.')
    }
    throw new Error(`OpenRouter ${res.status}: ${body}`)
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
    if (res.status === 401) throw new Error('OpenAI API key is invalid or missing.')
    throw new Error(`OpenAI ${res.status}: ${body}`)
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
    if (res.status === 401) throw new Error('Anthropic API key is invalid or missing.')
    throw new Error(`Anthropic ${res.status}: ${body}`)
  }
  const data = await res.json()
  return stripJson(data.content?.[0]?.text || '')
}

function mockResponse(req: AIRequest): object {
  const { lead, depth } = req
  const emp = lead.employees ?? 0
  const segment = emp > 2000 ? 'Enterprise' : emp >= 200 ? 'Mid-Market' : 'SMB'
  const icp = `${segment} ${lead.industry || 'Other'}`
  return {
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
      recent_activities: 'Evaluating IT modernisation and AI readiness initiatives.',
      key_drivers: 'Cost optimisation, compliance, and competitive pressure.',
      industry_trends: 'AI adoption accelerating; infrastructure modernisation critical.',
      next_portfolio: 'Cloud migration, FinOps, and security posture improvement.',
      ces_support: 'Managed services, cloud migration, and AI-ready infrastructure.',
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
    if (!error && data?.ai_keys) {
      const keys = data.ai_keys as Record<string, string>
      const key = keys[`${req.provider}_key`]
      if (key) return key
    }
  } catch {
    // Ignore and fall through to env secrets.
  }

  // 3. Server-side secrets.
  return Deno.env.get(`${req.provider.toUpperCase()}_API_KEY`)
}

serve(async (req: Request) => {
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

  try {
    let raw = ''
    if (body.provider === 'openrouter') raw = await callOpenRouter(apiKey, body.model, messages)
    else if (body.provider === 'openai') raw = await callOpenAI(apiKey, body.model, messages)
    else if (body.provider === 'anthropic') raw = await callAnthropic(apiKey, body.model, messages)
    else return errorResponse('Unknown provider')

    const parsed = JSON.parse(raw)
    return jsonResponse(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'
    return errorResponse(message, 502)
  }
})
