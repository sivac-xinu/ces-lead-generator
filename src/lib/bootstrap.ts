/**
 * Application bootstrap.
 *
 * Reads `VITE_DB_BACKEND` to decide which adapter suite to wire up:
 *
 *   "supabase" (default) — uses Supabase JS client + Edge Functions
 *   "rest"               — uses generic REST API endpoints
 *
 * Import this file once in `main.tsx` before rendering the app.
 */

import { initDB, type DBAdapter } from './db'
import { initAuth, type AuthAdapter } from './auth'
import { initAPI, type APIAdapter } from './api'

const backend = import.meta.env.VITE_DB_BACKEND || 'supabase'

export async function bootstrap(): Promise<void> {
  let db: DBAdapter
  let auth: AuthAdapter
  let api: APIAdapter

  if (backend === 'rest') {
    const [{ restDB }, { restAuth }, { restAPI }] = await Promise.all([
      import('./db-rest'),
      import('./auth-rest'),
      import('./api-rest'),
    ])
    db = restDB
    auth = restAuth
    api = restAPI
  } else {
    // Default: Supabase
    const [{ supabaseDB }, { supabaseAuth }, { supabaseAPI }] = await Promise.all([
      import('./db-supabase'),
      import('./auth-supabase'),
      import('./api-supabase'),
    ])
    db = supabaseDB
    auth = supabaseAuth
    api = supabaseAPI
  }

  initDB(db)
  initAuth(auth)
  initAPI(api)
}

export function getBackendName(): string {
  return backend
}
