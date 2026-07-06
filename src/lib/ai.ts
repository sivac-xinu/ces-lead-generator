import { supabase } from './supabase'
import type { AIProvider, IntelligenceResult, Lead } from '@/types'

export async function runAIIntelligence(
  provider: AIProvider,
  model: string,
  depth: 'quick' | 'deep',
  lead: Lead
): Promise<IntelligenceResult> {
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

  if (error) throw error
  return data as IntelligenceResult
}
