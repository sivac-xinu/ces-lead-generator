/**
 * Generic REST implementation of the AuthAdapter.
 *
 * Works with any backend that exposes standard auth endpoints. Configure via
 * `VITE_API_URL`.
 *
 * Expected endpoints:
 *
 *   POST   /api/auth/sign-in      → { token, user: AuthUser, profile: AuthProfile }
 *   POST   /api/auth/sign-up      → { token, user: AuthUser, profile: AuthProfile }
 *   POST   /api/auth/sign-out     → void
 *   POST   /api/auth/reset        → void
 *   GET    /api/auth/me           → { user: AuthUser, profile: AuthProfile }
 *   DELETE /api/auth/users/:id    → void  (admin)
 *   PATCH  /api/auth/users/:id    → void  (admin)
 *   GET    /api/auth/users        → AuthProfile[]  (admin)
 */

import type { AuthAdapter, AuthUser, AuthProfile, AuthError } from './auth'

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

function setToken(token: string | null) {
  if (token) localStorage.setItem('auth_token', token)
  else localStorage.removeItem('auth_token')
}

// Listeners for auth state changes
type Listener = (user: AuthUser | null) => void
const listeners: Set<Listener> = new Set()

export const restAuth: AuthAdapter = {
  async getCurrentUser() {
    try {
      const data = await api<{ user: AuthUser }>('/api/auth/me')
      return data.user ?? null
    } catch {
      return null
    }
  },

  async getProfile(userId) {
    try {
      return await api<AuthProfile>(`/api/auth/users/${userId}`)
    } catch {
      return null
    }
  },

  async signIn(email, password) {
    try {
      const data = await api<{ token: string; user: AuthUser }>('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(data.token)
      listeners.forEach((cb) => cb(data.user))
      return {}
    } catch (e) {
      return { error: { message: (e as Error).message } as AuthError }
    }
  },

  async signUp(email, password, firstName, lastName) {
    try {
      const data = await api<{ token: string; user: AuthUser }>('/api/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      setToken(data.token)
      listeners.forEach((cb) => cb(data.user))
      return {}
    } catch (e) {
      return { error: { message: (e as Error).message } as AuthError }
    }
  },

  async signOut() {
    try { await api('/api/auth/sign-out', { method: 'POST' }) } catch { /* ignore */ }
    setToken(null)
    listeners.forEach((cb) => cb(null))
  },

  async resetPassword(email) {
    try {
      await api('/api/auth/reset', { method: 'POST', body: JSON.stringify({ email }) })
      return {}
    } catch (e) {
      return { error: { message: (e as Error).message } as AuthError }
    }
  },

  onAuthStateChange(callback) {
    listeners.add(callback)
    // Trigger initial check
    this.getCurrentUser().then(callback)
    return () => { listeners.delete(callback) }
  },

  async deleteUser(userId) {
    try {
      await api(`/api/auth/users/${userId}`, { method: 'DELETE' })
      return {}
    } catch (e) {
      return { error: { message: (e as Error).message } as AuthError }
    }
  },

  async updateProfile(userId, patch) {
    try {
      await api(`/api/auth/users/${userId}`, { method: 'PATCH', body: JSON.stringify(patch) })
      return {}
    } catch (e) {
      return { error: { message: (e as Error).message } as AuthError }
    }
  },

  async listProfiles() {
    try {
      return await api<AuthProfile[]>('/api/auth/users')
    } catch {
      return []
    }
  },
}
