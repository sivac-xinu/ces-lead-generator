import { supabase } from './supabase'

export interface ZoomInfoSearchFilters {
  companyName?: string
  industry?: string
  employeeCountMin?: number
  employeeCountMax?: number
  state?: string
  country?: string
  technologies?: string[]
}

export interface ZoomInfoLeadPartial {
  company: string
  website?: string
  industry: string
  employees?: number
  annual_it_budget?: string
  current_infra?: string
  location?: string
  contact_name?: string
  contact_title?: string
  contact_email?: string
  contact_phone?: string
}

export async function searchZoomInfoCompanies(filters: ZoomInfoSearchFilters): Promise<ZoomInfoLeadPartial[]> {
  const body: Record<string, unknown> = {
    pageSize: 25,
    pageNumber: 1,
  }
  if (filters.companyName) body.companyName = filters.companyName
  if (filters.industry) body.industry = filters.industry
  if (filters.employeeCountMin || filters.employeeCountMax) {
    body.employeeCount = {
      min: filters.employeeCountMin,
      max: filters.employeeCountMax,
    }
  }
  if (filters.state) body.state = [filters.state]
  if (filters.country) body.country = [filters.country]
  if (filters.technologies?.length) body.technologies = filters.technologies.join(' AND ')

  const { data, error } = await supabase.functions.invoke('zoominfo-proxy?action=search/company', { body })
  if (error) throw error
  return (data?.data || []) as ZoomInfoLeadPartial[]
}

export async function enrichZoomInfoCompany(companyId?: number, website?: string): Promise<ZoomInfoLeadPartial> {
  const body: Record<string, unknown> = {}
  if (companyId) body.companyId = companyId
  if (website) body.website = website

  const { data, error } = await supabase.functions.invoke('zoominfo-proxy?action=enrich/company', { body })
  if (error) throw error
  return data?.data as ZoomInfoLeadPartial
}

export async function enrichZoomInfoContact(email?: string): Promise<Partial<ZoomInfoLeadPartial>> {
  if (!email) return {}
  const { data, error } = await supabase.functions.invoke('zoominfo-proxy?action=enrich/contact', {
    body: { email },
  })
  if (error) throw error
  return (data?.data || {}) as Partial<ZoomInfoLeadPartial>
}
