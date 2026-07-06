import type { Page, Route } from '@playwright/test'
import { LEADS } from '../src/data/leads'
import { SEED_SOLUTIONS } from '../src/data/solutions'

const SUPABASE_HOST = 'vdptdfliacwgyidfeqlm.supabase.co'

export type DbLead = {
  id: number
  company: string
  contact_name: string
  contact_title: string
  contact_email?: string
  contact_phone?: string
  industry: string
  employees?: number
  company_size?: string
  location?: string
  website?: string
  linkedin_url?: string
  it_type: string
  current_infra?: string
  pain_points?: string[]
  annual_it_budget?: string
  icp?: string
  tier?: string
  imported?: boolean
  imported_by?: string
  company_source?: string
  status?: string
  created_at?: string
  updated_at?: string
  user_id?: string
}

export const MOCK_LEADS: DbLead[] = LEADS.map(lead => ({
  ...lead,
  company_size: lead.size,
  // Remove the UI-only `size` field so dbRowToLead maps company_size back to size.
  size: undefined,
}))

export const MOCK_CALL_LOGS = [
  {
    id: 1,
    lead_id: 1,
    rep: 'CES',
    date: '2026-07-01',
    outcome: 'Contacted',
    notes: 'Left voicemail, follow-up next week.',
    follow_up: '2026-07-08',
    company: 'Meridian Financial Group',
    contact_name: 'James Thornton',
    contact_title: 'CTO',
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 2,
    lead_id: 2,
    rep: 'CES',
    date: '2026-07-02',
    outcome: 'Qualified',
    notes: 'Discussed HIPAA compliance needs.',
    follow_up: '2026-07-09',
    company: 'Crestview Healthcare Systems',
    contact_name: 'Dr. Sandra Koh',
    contact_title: 'VP of IT',
    created_at: '2026-07-02T11:00:00Z',
  },
]

function isSupabaseApi(url: URL): boolean {
  return url.hostname === SUPABASE_HOST || url.pathname.includes('/rest/v1/')
}

function routeMatches(url: URL, table: string): boolean {
  return url.pathname.includes(`/rest/v1/${table}`)
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'content-range': '0-9/*',
      'x-total-count': String(Array.isArray(body) ? body.length : 0),
    },
    body: JSON.stringify(body),
  })
}

/**
 * Intercept Supabase REST calls and serve deterministic mock data so E2E tests
 * run without network dependencies or real database mutations.
 */
export async function mockSupabaseApi(page: Page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())

    if (!isSupabaseApi(url)) {
      await route.continue()
      return
    }

    if (routeMatches(url, 'leads')) {
      await fulfillJson(route, MOCK_LEADS)
      return
    }

    if (routeMatches(url, 'call_logs')) {
      await fulfillJson(route, MOCK_CALL_LOGS)
      return
    }

    if (routeMatches(url, 'solutions')) {
      await fulfillJson(route, SEED_SOLUTIONS)
      return
    }

    if (routeMatches(url, 'profiles')) {
      await fulfillJson(route, [
        {
          id: 'e2e-user',
          email: 'e2e@example.com',
          role: 'admin',
          approved: true,
          created_at: '2026-07-01T00:00:00Z',
        },
      ])
      return
    }

    // Accept any other Supabase mutation (insert/delete/update) without touching
    // the real backend; invalidate in the UI is handled by react-query optimistic
    // updates in the real hooks.
    await fulfillJson(route, [])
  })
}
