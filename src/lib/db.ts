/**
 * Database adapter interface.
 *
 * The app programs against these interfaces; the concrete implementation is
 * injected at startup via `initDB()`. Ships with two adapters:
 *
 *   - `supabase` — uses the Supabase JS client (PostgREST + Auth)
 *   - `rest`     — calls any standards-compliant REST API (Express, Fastify, etc.)
 *
 * To support a new backend, implement the `DBAdapter` interface and register it
 * in `initDB()`.
 */

import type { Lead, Contact, CallLog, Solution, UserProfile } from '@/types'

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export interface QueryOptions {
  /** Column to order by */
  orderBy?: string
  ascending?: boolean
  /** Limit the result set */
  limit?: number
}

export interface FindManyOptions extends QueryOptions {
  /** Simple equality filters: `{ column: value }` */
  filters?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Generic result wrapper
// ---------------------------------------------------------------------------

export interface DBResult<T> {
  data: T | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Per-table repository interfaces
// ---------------------------------------------------------------------------

export interface LeadsRepo {
  findAll(opts?: FindManyOptions): Promise<DBResult<Lead[]>>
  findById(id: number): Promise<DBResult<Lead>>
  create(lead: Partial<Lead>): Promise<DBResult<Lead>>
  update(id: number, patch: Partial<Lead>): Promise<DBResult<Lead>>
  delete(id: number): Promise<DBResult<void>>
}

export interface ContactsRepo {
  findByLeadId(leadId: number): Promise<DBResult<Contact[]>>
  create(contact: Partial<Contact>): Promise<DBResult<Contact>>
  update(id: number, patch: Partial<Contact>): Promise<DBResult<Contact>>
  delete(id: number): Promise<DBResult<void>>
  /** Reset primary flag for all contacts of a lead, then set one as primary */
  setPrimary(leadId: number, contactId: number): Promise<DBResult<void>>
}

export interface CallLogsRepo {
  findAll(opts?: FindManyOptions): Promise<DBResult<CallLog[]>>
  create(log: Partial<CallLog>): Promise<DBResult<CallLog>>
  delete(id: number): Promise<DBResult<void>>
}

export interface SolutionsRepo {
  findAll(opts?: FindManyOptions): Promise<DBResult<Solution[]>>
  create(solution: Partial<Solution>): Promise<DBResult<Solution>>
  update(id: string, patch: Partial<Solution>): Promise<DBResult<Solution>>
  delete(id: string): Promise<DBResult<void>>
}

export interface ProfilesRepo {
  findAll(opts?: FindManyOptions): Promise<DBResult<UserProfile[]>>
  findById(id: string): Promise<DBResult<UserProfile>>
  update(id: string, patch: Partial<UserProfile>): Promise<DBResult<UserProfile>>
}

export interface PainPointCatalogRepo {
  findAll(opts?: FindManyOptions): Promise<DBResult<{ id: number; text: string; theme: string; tags: string[]; active: boolean; created_at?: string }[]>>
  create(item: { text: string; theme?: string; tags?: string[] }): Promise<DBResult<{ id: number; text: string; theme: string; tags: string[]; active: boolean; created_at?: string }>>
  update(id: number, patch: Record<string, unknown>): Promise<DBResult<{ id: number; text: string; theme: string; tags: string[]; active: boolean; created_at?: string }>>
}

export interface AISettingsRepo {
  getKeys(): Promise<DBResult<Record<string, string> | null>>
  upsertKeys(keys: Record<string, string>): Promise<DBResult<void>>
}

// ---------------------------------------------------------------------------
// Main DB adapter interface
// ---------------------------------------------------------------------------

export interface DBAdapter {
  leads: LeadsRepo
  contacts: ContactsRepo
  callLogs: CallLogsRepo
  solutions: SolutionsRepo
  profiles: ProfilesRepo
  painPointCatalog: PainPointCatalogRepo
  aiSettings: AISettingsRepo
}

// ---------------------------------------------------------------------------
// Global adapter singleton
// ---------------------------------------------------------------------------

let _adapter: DBAdapter | null = null

export function initDB(adapter: DBAdapter): void {
  _adapter = adapter
}

export function getDB(): DBAdapter {
  if (!_adapter) throw new Error('DB adapter not initialised. Call initDB() first.')
  return _adapter
}
