import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vdptdfliacwgyidfeqlm.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcHRkZmxpYWN3Z3lpZGZlcWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDQ3MTIsImV4cCI6MjA5Nzk4MDcxMn0.30f9jP83-oMtH9pV68ELVmTNrj_MtuP--evNAhfGKbA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type SupabaseClient = typeof supabase
