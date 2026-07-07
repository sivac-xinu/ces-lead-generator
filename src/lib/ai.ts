import { supabase } from './supabase'
import { useAIConfigStore } from '@/store/aiConfigStore'
import { deepInferAll } from '@/data/inference'
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

function isMissingKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message?.toLowerCase() ?? ''
  return message.includes('api key not configured') || message.includes('missing authentication')
}

export async function runAIIntelligence(
  provider: AIProvider,
  model: string,
  depth: 'quick' | 'deep',
  lead: Lead,
  { fallbackToLocal = true }: { fallbackToLocal?: boolean } = {}
): Promise<AIIntelligenceResponse> {
  const apiKey = provider === 'local' ? '' : useAIConfigStore.getState().getKey(provider)

  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        provider,
        model,
        depth,
        apiKey,
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
      throw error
    }

    return { result: data as IntelligenceResult, fallback: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'

    if (err instanceof AIFunctionNotDeployedError) {
      if (fallbackToLocal) {
        return { result: deepInferAll(lead), fallback: true, notDeployed: true }
      }
      throw err
    }

    if (isMissingKeyError(err)) {
      // Surface the missing-key error so the user knows to add/save a key.
      throw new Error(
        `API key not configured for ${provider}. Add it in Settings → AI Engine and click Save, or set the ${provider.toUpperCase()}_API_KEY Supabase secret.`
      )
    }

    if (fallbackToLocal) {
      return { result: deepInferAll(lead), fallback: true, errorMessage: message }
    }
    throw err
  }
}
