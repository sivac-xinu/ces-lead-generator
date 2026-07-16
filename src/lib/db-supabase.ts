/**
 * Supabase implementation of the DBAdapter.
 *
 * Wraps the existing `supabase.from()` calls behind the generic interface
 * defined in `./db.ts`.
 */

import { supabase } from './supabase'
import type {
  DBAdapter,
  LeadsRepo,
  ContactsRepo,
  CallLogsRepo,
  SolutionsRepo,
  ProfilesRepo,
  PainPointCatalogRepo,
  AISettingsRepo,
  FindManyOptions,
} from './db'
import type { Lead, Contact, CallLog, Solution, UserProfile } from '@/types'
import { dbRowToLead, leadToDbRow } from '@/utils/lead'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyQuery(table: string, opts?: FindManyOptions) {
  let q = supabase.from(table).select('*')
  if (opts?.filters) {
    for (const [col, val] of Object.entries(opts.filters)) {
      q = q.eq(col, val)
    }
  }
  if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending ?? false })
  if (opts?.limit) q = q.limit(opts.limit)
  return q
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const leads: LeadsRepo = {
  async findAll(opts) {
    const q = applyQuery('leads', { orderBy: 'created_at', ascending: false, ...opts })
    const { data, error } = await q
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []).map(dbRowToLead), error: null }
  },

  async findById(id) {
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
    if (error) return { data: null, error: error.message }
    return { data: dbRowToLead(data), error: null }
  },

  async create(lead) {
    const row = leadToDbRow(lead as Lead)
    const { data, error } = await supabase.from('leads').insert(row).select().single()
    if (error) return { data: null, error: error.message }
    return { data: dbRowToLead(data), error: null }
  },

  async update(id, patch) {
    const row = leadToDbRow({ ...patch, id } as Lead)
    const { data, error } = await supabase.from('leads').update(row).eq('id', id).select().single()
    if (error) return { data: null, error: error.message }
    return { data: dbRowToLead(data), error: null }
  },

  async delete(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const contacts: ContactsRepo = {
  async findByLeadId(leadId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('lead_id', leadId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as Contact[], error: null }
  },

  async create(contact) {
    const { data, error } = await supabase.from('contacts').insert(contact).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as Contact, error: null }
  },

  async update(id, patch) {
    const { data, error } = await supabase.from('contacts').update(patch).eq('id', id).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as Contact, error: null }
  },

  async delete(id) {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },

  async setPrimary(leadId, contactId) {
    await supabase.from('contacts').update({ is_primary: false }).eq('lead_id', leadId)
    const { error } = await supabase.from('contacts').update({ is_primary: true }).eq('id', contactId)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------------------
// Call Logs
// ---------------------------------------------------------------------------

const callLogs: CallLogsRepo = {
  async findAll(opts) {
    const q = applyQuery('call_logs', { orderBy: 'date', ascending: false, ...opts })
    const { data, error } = await q
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as CallLog[], error: null }
  },

  async create(log) {
    const { data, error } = await supabase.from('call_logs').insert(log).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as CallLog, error: null }
  },

  async delete(id) {
    const { error } = await supabase.from('call_logs').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------------------
// Solutions
// ---------------------------------------------------------------------------

const solutions: SolutionsRepo = {
  async findAll(opts) {
    const q = applyQuery('solutions', { orderBy: 'service', ascending: true, ...opts })
    const { data, error } = await q
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as Solution[], error: null }
  },

  async create(solution) {
    const { data, error } = await supabase.from('solutions').insert(solution).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as Solution, error: null }
  },

  async update(id, patch) {
    const { data, error } = await supabase.from('solutions').update(patch).eq('id', id).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as Solution, error: null }
  },

  async delete(id) {
    const { error } = await supabase.from('solutions').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

const profiles: ProfilesRepo = {
  async findAll(opts) {
    const q = applyQuery('profiles', { orderBy: 'email', ascending: true, ...opts })
    const { data, error } = await q
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as UserProfile[], error: null }
  },

  async findById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) return { data: null, error: error.message }
    return { data: data as UserProfile, error: null }
  },

  async update(id, patch) {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as UserProfile, error: null }
  },
}

// ---------------------------------------------------------------------------
// Pain Point Catalog
// ---------------------------------------------------------------------------

type PainPointRow = { id: number; text: string; theme: string; tags: string[]; active: boolean; created_at?: string }

const painPointCatalog: PainPointCatalogRepo = {
  async findAll(opts) {
    const q = applyQuery('pain_point_catalog', { orderBy: 'created_at', ascending: false, ...opts })
    const { data, error } = await q
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []) as PainPointRow[], error: null }
  },

  async create(item) {
    const { data, error } = await supabase.from('pain_point_catalog').insert(item).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as PainPointRow, error: null }
  },

  async update(id, patch) {
    const { data, error } = await supabase.from('pain_point_catalog').update(patch).eq('id', id).select().single()
    if (error) return { data: null, error: error.message }
    return { data: data as PainPointRow, error: null }
  },
}

// ---------------------------------------------------------------------------
// AI Settings
// ---------------------------------------------------------------------------

const aiSettings: AISettingsRepo = {
  async getKeys() {
    const { data, error } = await supabase.from('ces_settings').select('ai_keys').eq('id', 'global').single()
    if (error) return { data: null, error: error.message }
    return { data: (data?.ai_keys as Record<string, string>) ?? null, error: null }
  },

  async upsertKeys(keys) {
    const { error } = await supabase.from('ces_settings').upsert(
      { id: 'global', ai_keys: keys, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------------------
// Export the Supabase adapter
// ---------------------------------------------------------------------------

export const supabaseDB: DBAdapter = {
  leads,
  contacts,
  callLogs,
  solutions,
  profiles,
  painPointCatalog,
  aiSettings,
}
