/**
 * Generic REST implementation of the APIAdapter.
 *
 * Proxies AI and ZoomInfo calls through your own backend server instead of
 * Supabase Edge Functions.
 *
 * Expected endpoints:
 *
 *   POST /api/ai/proxy           → AI result JSON
 *   POST /api/zoominfo/search    → company search results
 *   POST /api/zoominfo/enrich    → company enrichment
 *   POST /api/zoominfo/contact   → contact enrichment
 */

import type { APIAdapter } from './api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API ${res.status}`)
  }
  return res.json()
}

export const restAPI: APIAdapter = {
  async callAI(request) {
    try {
      const data = await api<Record<string, unknown>>('/api/ai/proxy', request)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },

  async searchZoomInfoCompanies(body) {
    try {
      const data = await api<{ data: unknown[] }>('/api/zoominfo/search', body)
      return { data: (data?.data ?? []) as import('./api').ZoomInfoSearchResult[], error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },

  async enrichZoomInfoCompany(body) {
    try {
      const data = await api<{ data: unknown }>('/api/zoominfo/enrich', body)
      return { data: (data?.data ?? null) as import('./api').ZoomInfoEnrichResult | null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },

  async enrichZoomInfoContact(body) {
    try {
      const data = await api<{ data: unknown }>('/api/zoominfo/contact', body)
      return { data: (data?.data ?? null) as import('./api').ZoomInfoContactResult | null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}
