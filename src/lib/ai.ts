import { getAPI } from './api'
import { classifyDeep } from '@/lib/classify'
import type { AIProvider, IntelligenceResult, Lead } from '@/types'

export class AIFunctionNotDeployedError extends Error {
  constructor() {
    super(
      'The AI proxy is not deployed. Switch to Local Rules or deploy it.'
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

function isNotDeployedError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('not found') ||
    lower.includes('404') ||
    lower.includes('preflight') ||
    lower.includes('cannot load') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
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
    const { data, error } = await getAPI().callAI({
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
    })

    if (error) {
      if (isNotDeployedError(error)) {
        throw new AIFunctionNotDeployedError()
      }
      throw new Error(error)
    }

    return { result: data as unknown as IntelligenceResult, fallback: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'

    if (err instanceof AIFunctionNotDeployedError) {
      if (fallbackToLocal) {
        return { result: classifyDeep(lead), fallback: true, notDeployed: true }
      }
      throw err
    }

    if (isNotDeployedError(message)) {
      if (fallbackToLocal) {
        return { result: classifyDeep(lead), fallback: true, notDeployed: true }
      }
      throw new AIFunctionNotDeployedError()
    }

    if (isMissingKeyError(message.toLowerCase())) {
      throw new Error(
        `API key not configured for ${provider}. Ask an admin to add it in Settings → AI Engine.`
      )
    }

    if (fallbackToLocal) {
      return { result: classifyDeep(lead), fallback: true, errorMessage: message }
    }
    throw err
  }
}
