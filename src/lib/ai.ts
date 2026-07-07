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
      const message = error.message?.toLowerCase() ?? ''
      const isNotFound =
        message.includes('not found') ||
        message.includes('404') ||
        message.includes('preflight') ||
        message.includes('cannot load')
      if (isNotFound) {
        throw new AIFunctionNotDeployedError()
      }
      throw error
    }

    return { result: data as IntelligenceResult, fallback: false }
  } catch (err) {
    if (err instanceof AIFunctionNotDeployedError) {
      if (fallbackToLocal) {
        return { result: deepInferAll(lead), fallback: true }
      }
      throw err
    }

    if (fallbackToLocal) {
      return { result: deepInferAll(lead), fallback: true }
    }
    throw err
  }
}
