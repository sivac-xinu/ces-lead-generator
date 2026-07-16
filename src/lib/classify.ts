import type { ICP, ITType, Lead, Tier, IntelligenceResult } from '@/types'
import { inferICP, inferITType, inferTier } from '@/utils/lead'
import { deepInferAll } from '@/data/inference'

export function classifyBasic(lead: Partial<Lead>): { it_type: ITType; tier: Tier; icp: ICP } {
  return {
    it_type: inferITType(lead.industry),
    tier: inferTier(lead.employees, lead.annual_it_budget),
    icp: inferICP(lead.employees),
  }
}

export function classifyDeep(lead: Lead): IntelligenceResult {
  return deepInferAll(lead)
}
