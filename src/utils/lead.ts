import type { DbLead, ICP, ITType, Lead, Tier } from '@/types'

export function sizeBucket(employees: number | undefined | null): string {
  if (!employees) return '—'
  if (employees <= 50) return '1-50'
  if (employees <= 200) return '50-200'
  if (employees <= 500) return '200-500'
  if (employees <= 1000) return '500-1000'
  if (employees <= 5000) return '1000-5000'
  return '5000+'
}

export function inferITType(industry?: string): ITType {
  const ind = (industry || '').toLowerCase()
  const cloudHeavy = ['technology', 'software', 'saas', 'fintech']
  const onPremHeavy = ['manufacturing', 'healthcare', 'government', 'legal', 'finance', 'banking']
  if (cloudHeavy.some((k) => ind.includes(k))) return 'Cloud'
  if (onPremHeavy.some((k) => ind.includes(k))) return 'On-Premise'
  return 'Hybrid'
}

export function inferTier(employees?: number, budget?: string): Tier {
  const budgetNum = parseFloat((budget || '').replace(/[^0-9.]/g, '')) || 0
  if (employees && employees > 2000) return 'Tier 1'
  if (budgetNum > 10) return 'Tier 1'
  if ((employees && employees >= 200) || budgetNum > 3) return 'Tier 2'
  return 'Tier 3'
}

export function inferICP(employees?: number | null): ICP {
  if (!employees) return 'SMB'
  if (employees > 2000) return 'Enterprise'
  if (employees >= 200) return 'Mid-Market'
  return 'SMB'
}

export function dbRowToLead(row: DbLead): Lead {
  return {
    ...row,
    size: row.company_size || sizeBucket(row.employees),
    website: row.website || row.linkedin_url,
    linkedin_url: row.linkedin_url || row.website,
    pain_points: row.pain_points || [],
    it_type: (row.it_type as ITType) || 'Unknown',
    tier: row.tier as Tier | undefined,
    sales_rep: row.sales_rep,
  }
}

export function leadToDbRow(lead: Partial<Lead>): Partial<DbLead> {
  const { size, ...dbLead } = lead as Lead & { size?: string }
  return {
    ...dbLead,
    company_size: size,
  }
}
