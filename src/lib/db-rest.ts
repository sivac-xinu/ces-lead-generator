/**
 * Generic REST API implementation of the DBAdapter.
 *
 * Works with any backend that exposes a standard REST API. Configure the
 * backend URL via the `VITE_API_URL` environment variable.
 *
 * Expected API endpoints (all accept/return JSON):
 *
 *   GET    /api/leads              → Lead[]
 *   GET    /api/leads/:id          → Lead
 *   POST   /api/leads              → Lead
 *   PATCH  /api/leads/:id          → Lead
 *   DELETE /api/leads/:id          → void
 *
 *   GET    /api/contacts?leadId=N  → Contact[]
 *   POST   /api/contacts           → Contact
 *   PATCH  /api/contacts/:id       → Contact
 *   DELETE /api/contacts/:id       → void
 *   PATCH  /api/contacts/primary   → void  { leadId, contactId }
 *
 *   GET    /api/call-logs          → CallLog[]
 *   POST   /api/call-logs          → CallLog
 *   DELETE /api/call-logs/:id      → void
 *
 *   GET    /api/solutions          → Solution[]
 *   POST   /api/solutions          → Solution
 *   PATCH  /api/solutions/:id      → Solution
 *   DELETE /api/solutions/:id      → void
 *
 *   GET    /api/profiles           → UserProfile[]
 *   GET    /api/profiles/:id       → UserProfile
 *   PATCH  /api/profiles/:id       → UserProfile
 *
 *   GET    /api/pain-points        → PainPoint[]
 *   POST   /api/pain-points        → PainPoint
 *   PATCH  /api/pain-points/:id    → PainPoint
 *
 *   GET    /api/ai-settings        → { ai_keys: Record<string,string> }
 *   PUT    /api/ai-settings        → void
 */

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

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API ${res.status}`)
  }
  return res.json()
}

function qs(opts?: FindManyOptions): string {
  const p = new URLSearchParams()
  if (opts?.orderBy) p.set('orderBy', opts.orderBy)
  if (opts?.ascending !== undefined) p.set('ascending', String(opts.ascending))
  if (opts?.limit) p.set('limit', String(opts.limit))
  if (opts?.filters) {
    for (const [k, v] of Object.entries(opts.filters)) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const leads: LeadsRepo = {
  async findAll(opts) {
    try {
      const data = await api<Lead[]>(`/api/leads${qs(opts)}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async findById(id) {
    try {
      const data = await api<Lead>(`/api/leads/${id}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async create(lead) {
    try {
      const data = await api<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(lead) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async update(id, patch) {
    try {
      const data = await api<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async delete(id) {
    try {
      await api(`/api/leads/${id}`, { method: 'DELETE' })
      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const contacts: ContactsRepo = {
  async findByLeadId(leadId) {
    try {
      const data = await api<Contact[]>(`/api/contacts?leadId=${leadId}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async create(contact) {
    try {
      const data = await api<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(contact) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async update(id, patch) {
    try {
      const data = await api<Contact>(`/api/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async delete(id) {
    try {
      await api(`/api/contacts/${id}`, { method: 'DELETE' })
      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async setPrimary(leadId, contactId) {
    try {
      await api('/api/contacts/primary', { method: 'PATCH', body: JSON.stringify({ leadId, contactId }) })
      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// Call Logs
// ---------------------------------------------------------------------------

const callLogs: CallLogsRepo = {
  async findAll(opts) {
    try {
      const data = await api<CallLog[]>(`/api/call-logs${qs(opts)}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async create(log) {
    try {
      const data = await api<CallLog>('/api/call-logs', { method: 'POST', body: JSON.stringify(log) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async delete(id) {
    try {
      await api(`/api/call-logs/${id}`, { method: 'DELETE' })
      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// Solutions
// ---------------------------------------------------------------------------

const solutions: SolutionsRepo = {
  async findAll(opts) {
    try {
      const data = await api<Solution[]>(`/api/solutions${qs(opts)}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async create(solution) {
    try {
      const data = await api<Solution>('/api/solutions', { method: 'POST', body: JSON.stringify(solution) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async update(id, patch) {
    try {
      const data = await api<Solution>(`/api/solutions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async delete(id) {
    try {
      await api(`/api/solutions/${id}`, { method: 'DELETE' })
      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

const profiles: ProfilesRepo = {
  async findAll(opts) {
    try {
      const data = await api<UserProfile[]>(`/api/profiles${qs(opts)}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async findById(id) {
    try {
      const data = await api<UserProfile>(`/api/profiles/${id}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async update(id, patch) {
    try {
      const data = await api<UserProfile>(`/api/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// Pain Point Catalog
// ---------------------------------------------------------------------------

type PainPointRow = { id: number; text: string; theme: string; tags: string[]; active: boolean; created_at?: string }

const painPointCatalog: PainPointCatalogRepo = {
  async findAll(opts) {
    try {
      const data = await api<PainPointRow[]>(`/api/pain-points${qs(opts)}`)
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async create(item) {
    try {
      const data = await api<PainPointRow>('/api/pain-points', { method: 'POST', body: JSON.stringify(item) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async update(id, patch) {
    try {
      const data = await api<PainPointRow>(`/api/pain-points/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return { data, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// AI Settings
// ---------------------------------------------------------------------------

const aiSettings: AISettingsRepo = {
  async getKeys() {
    try {
      const data = await api<{ ai_keys: Record<string, string> }>('/api/ai-settings')
      return { data: data?.ai_keys ?? null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
  async upsertKeys(keys) {
    try {
      await api('/api/ai-settings', { method: 'PUT', body: JSON.stringify({ ai_keys: keys }) })
      return { data: null, error: null }
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }
  },
}

// ---------------------------------------------------------------------------
// Export the generic REST adapter
// ---------------------------------------------------------------------------

export const restDB: DBAdapter = {
  leads,
  contacts,
  callLogs,
  solutions,
  profiles,
  painPointCatalog,
  aiSettings,
}
