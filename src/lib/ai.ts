import { supabase } from './supabase'
import { classifyDeep } from '@/lib/classify'
import type { AIProvider, IntelligenceResult, Lead } from '@/types'

export class AIFunctionNotDeployedError extends Error {
  constructor() {
    super(
      'The ai-proxy Edge Function is not deployed. Switch to Local Rules or deploy it with: npx supabase functions deploy ai-proxy'
    )
    this.name = 'AIFunctionNotDeployedError'
  }
}

export interface AIIntelligenceResponse {
  result: IntelligenceResult
  fallback: boolean
  errorMessage?: string
  notDeployed?: boolean
}

async function extractFunctionError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) return 'AI request failed'

  // Supabase functions.invoke returns the response in `error.context`.
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: string; message?: string }
      if (body?.error) return body.error
      if (body?.message) return body.message
    } catch {
      try {
        const text = await ctx.text()
        if (text) return text
      } catch {
        // ignore
      }
    }
  }

  return error.message || 'AI request failed'
}

function isNotDeployedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message?.toLowerCase() ?? ''
  return (
    message.includes('not found') ||
    message.includes('404') ||
    message.includes('preflight') ||
    message.includes('cannot load')
  )
}

function isMissingKeyError(message: string): boolean {
  return message.includes('api key not configured') || message.includes('missing authentication')
}

export async function runAIIntelligence(
  provider: AIProvider,
  model: string,
  depth: 'quick' | 'deep',
  lead: Lead,
  { fallbackToLocal = true }: { fallbackToLocal?: boolean } = {}
): Promise<AIIntelligenceResponse> {
  if (provider === 'local') {
    return { result: classifyDeep(lead), fallback: false }
  }

  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider,
        model,
        depth,
        lead: {
          company: lead.company,
          industry: lead.industry,
          employees: lead.employees,
          contact_name: lead.contact_name,
          contact_title: lead.contact_title,
          annual_it_budget: lead.annual_it_budget,
          current_infra: lead.current_infra,
          pain_points: lead.pain_points,
        },
      },
    })

    if (error) {
      if (isNotDeployedError(error)) {
        throw new AIFunctionNotDeployedError()
      }
      const msg = await extractFunctionError(error)
      throw new Error(msg)
    }

    return { result: data as IntelligenceResult, fallback: false }
  } catch (err) {
    const message = await extractFunctionError(err)

    if (err instanceof AIFunctionNotDeployedError) {
      if (fallbackToLocal) {
        return { result: classifyDeep(lead), fallback: true, notDeployed: true }
      }
      throw err
    }

    if (isMissingKeyError(message.toLowerCase())) {
      throw new Error(
        `API key not configured for ${provider}. Ask an admin to add it in Settings → AI Engine or set the ${provider.toUpperCase()}_API_KEY Supabase secret.`
      )
    }

    if (fallbackToLocal) {
      return { result: classifyDeep(lead), fallback: true, errorMessage: message }
    }
    throw err
  }
}
