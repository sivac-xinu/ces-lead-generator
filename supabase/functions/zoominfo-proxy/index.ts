import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'

interface ZoomInfoAuth {
  jwt: string
  expiresAt: number
}

let cachedAuth: ZoomInfoAuth | null = null

async function authenticate(): Promise<string> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedAuth.jwt
  }

  const username = Deno.env.get('ZOOMINFO_USERNAME')
  const password = Deno.env.get('ZOOMINFO_PASSWORD')

  if (!username || !password) {
    throw new Error('ZoomInfo credentials not configured')
  }

  const res = await fetch('https://api.zoominfo.com/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    throw new Error(`ZoomInfo auth failed: ${res.status}`)
  }

  const data = await res.json()
  const jwt = data.jwt
  if (!jwt) throw new Error('ZoomInfo auth response missing jwt')

  cachedAuth = {
    jwt,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }
  return jwt
}

async function zoominfoFetch(path: string, body: unknown) {
  const token = await authenticate()
  const res = await fetch(`https://api.zoominfo.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`ZoomInfo ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

interface ZoomInfoCompany {
  companyId?: number
  companyName?: string
  website?: string
  primaryIndustry?: string
  employeeCount?: number
  revenue?: string
  technologies?: string[]
  state?: string
  country?: string
  city?: string
  phone?: string
}

function normalizeCompany(c: ZoomInfoCompany) {
  return {
    company: c.companyName || '',
    website: c.website || '',
    industry: c.primaryIndustry || 'Other',
    employees: c.employeeCount,
    annual_it_budget: c.revenue ? `Revenue: ${c.revenue}` : undefined,
    current_infra: (c.technologies || []).join(', ') || undefined,
    location: [c.city, c.state, c.country].filter(Boolean).join(', ') || undefined,
    contact_phone: c.phone,
  }
}

function normalizeContact(c: { firstName?: string; lastName?: string; jobTitle?: string; email?: string; phone?: string }) {
  return {
    contact_name: [c.firstName, c.lastName].filter(Boolean).join(' ') || '',
    contact_title: c.jobTitle || '',
    contact_email: c.email || '',
    contact_phone: c.phone,
  }
}

function mockSearch(body: unknown) {
  const data = body as Record<string, unknown>
  const industry = ((data.companyDescriptionKeywords || data.industryCodes || []) as string[])[0] || 'Technology'
  return {
    data: [
      {
        companyId: 1,
        companyName: 'Mock ZoomInfo Company',
        website: 'mockcompany.com',
        primaryIndustry: industry,
        employeeCount: 250,
        revenue: '$50M',
        technologies: ['AWS', 'Salesforce'],
        state: 'CA',
        country: 'USA',
        city: 'San Francisco',
        phone: '+1 555-0100',
      },
    ],
  }
}

function mockEnrich() {
  return {
    data: {
      companyName: 'Mock ZoomInfo Company',
      website: 'mockcompany.com',
      primaryIndustry: 'Technology',
      employeeCount: 250,
      revenue: '$50M',
      technologies: ['AWS', 'Salesforce'],
      state: 'CA',
      country: 'USA',
      city: 'San Francisco',
      phone: '+1 555-0100',
    },
  }
}

function mockEnrichContact() {
  return {
    data: {
      firstName: 'Jane',
      lastName: 'Doe',
      jobTitle: 'VP Technology',
      email: 'jane.doe@mockcompany.com',
      phone: '+1 555-0101',
    },
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const useMock = Deno.env.get('ZOOMINFO_MOCK_MODE') === 'true'
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (!action || !['search/company', 'enrich/company', 'enrich/contact'].includes(action)) {
    return errorResponse('Invalid or missing action')
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body')
  }

  try {
    let result: { data: unknown }

    if (useMock) {
      if (action === 'search/company') result = mockSearch(body) as { data: unknown }
      else if (action === 'enrich/company') result = mockEnrich() as { data: unknown }
      else result = mockEnrichContact() as { data: unknown }
    } else {
      result = await zoominfoFetch(`/${action}`, body)
    }

    let normalized
    if (action === 'search/company') {
      const list = ((result.data || []) as ZoomInfoCompany[]).slice(0, 10)
      normalized = list.map(normalizeCompany)
    } else if (action === 'enrich/company') {
      normalized = normalizeCompany((result.data || {}) as ZoomInfoCompany)
    } else {
      normalized = normalizeContact((result.data || {}) as Record<string, string>)
    }

    return jsonResponse({ data: normalized })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ZoomInfo request failed'
    return errorResponse(message, 502)
  }
})
