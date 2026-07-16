/**
 * Supabase implementation of the APIAdapter.
 *
 * Uses supabase.functions.invoke() to call Edge Functions.
 */

import { supabase } from './supabase'
import type { APIAdapter } from './api'

export const supabaseAPI: APIAdapter = {
  async callAI(request) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', { body: request })
    if (error) {
      // Extract rich error context from Supabase Edge Function response
      let msg = error.message
      if (error.context instanceof Response) {
        try {
          const body = await error.context.json()
          msg = body.error || msg
        } catch { /* ignore */ }
      }
      return { data: null, error: msg }
    }
    return { data, error: null }
  },

  async searchZoomInfoCompanies(body) {
    const { data, error } = await supabase.functions.invoke('zoominfo-proxy?action=search/company', { body })
    if (error) return { data: null, error: error.message }
    return { data: data?.data ?? [], error: null }
  },

  async enrichZoomInfoCompany(body) {
    const { data, error } = await supabase.functions.invoke('zoominfo-proxy?action=enrich/company', { body })
    if (error) return { data: null, error: error.message }
    return { data: data?.data ?? null, error: null }
  },

  async enrichZoomInfoContact(body) {
    const { data, error } = await supabase.functions.invoke('zoominfo-proxy?action=enrich/contact', { body })
    if (error) return { data: null, error: error.message }
    return { data: data?.data ?? null, error: null }
  },
}
