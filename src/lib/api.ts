/**
 * API adapter interface.
 *
 * Abstracts calls to backend services (AI proxy, ZoomInfo proxy, admin
 * functions). Ships with a Supabase Edge Functions implementation; swap in
 * your own by implementing `APIAdapter` and calling `initAPI()`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface APIResult<T = unknown> {
  data: T | null
  error: string | null
}

// ---------------------------------------------------------------------------
// AI Intelligence types
// ---------------------------------------------------------------------------

export interface AIRequest {
  provider: string
  model: string
  depth: 'quick' | 'deep'
  lead: {
    company: string
    industry: string
    employees?: number
    contact_name: string
    contact_title?: string
    annual_it_budget?: string
    current_infra?: string
    pain_points?: string[]
  }
  apiKey?: string
}

// ---------------------------------------------------------------------------
// ZoomInfo types
// ---------------------------------------------------------------------------

export interface ZoomInfoSearchResult {
  company: string
  website: string
  industry: string
  employees?: number
  annual_it_budget?: string
  current_infra?: string
  location?: string
  contact_phone?: string
}

export interface ZoomInfoEnrichResult {
  company: string
  website: string
  industry: string
  employees?: number
  annual_it_budget?: string
  current_infra?: string
  location?: string
  contact_phone?: string
}

export interface ZoomInfoContactResult {
  contact_name: string
  contact_title: string
  contact_email: string
  contact_phone?: string
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface APIAdapter {
  /** Call the AI intelligence proxy. Returns parsed JSON from the AI provider. */
  callAI(request: AIRequest): Promise<APIResult<Record<string, unknown>>>

  /** Search ZoomInfo for companies. */
  searchZoomInfoCompanies(body: Record<string, unknown>): Promise<APIResult<ZoomInfoSearchResult[]>>

  /** Enrich a company from ZoomInfo. */
  enrichZoomInfoCompany(body: Record<string, unknown>): Promise<APIResult<ZoomInfoEnrichResult>>

  /** Enrich a contact from ZoomInfo. */
  enrichZoomInfoContact(body: { email: string }): Promise<APIResult<ZoomInfoContactResult>>
}

// ---------------------------------------------------------------------------
// Global adapter singleton
// ---------------------------------------------------------------------------

let _adapter: APIAdapter | null = null

export function initAPI(adapter: APIAdapter): void {
  _adapter = adapter
}

export function getAPI(): APIAdapter {
  if (!_adapter) throw new Error('API adapter not initialised. Call initAPI() first.')
  return _adapter
}
