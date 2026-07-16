/**
 * Auth adapter interface.
 *
 * Abstracts authentication so the app can run against any identity provider.
 * Ships with a Supabase implementation; swap in your own by implementing
 * `AuthAdapter` and calling `initAuth()`.
 */

import type { UserRole } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

export interface AuthProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: UserRole
  approved: boolean
  created_at?: string
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface AuthAdapter {
  /** Get the current session user (null if not logged in). */
  getCurrentUser(): Promise<AuthUser | null>

  /** Get the full profile from the profiles table. */
  getProfile(userId: string): Promise<AuthProfile | null>

  /** Sign in with email + password. */
  signIn(email: string, password: string): Promise<{ error?: AuthError }>

  /** Sign up with email + password + optional display name. */
  signUp(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ): Promise<{ error?: AuthError }>

  /** Sign out. */
  signOut(): Promise<void>

  /** Send a password-reset email. */
  resetPassword(email: string): Promise<{ error?: AuthError }>

  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void

  /** Admin: delete a user by ID. */
  deleteUser(userId: string): Promise<{ error?: AuthError }>

  /** Admin: update a profile. */
  updateProfile(
    userId: string,
    patch: Partial<Pick<AuthProfile, 'first_name' | 'last_name' | 'role' | 'approved'>>,
  ): Promise<{ error?: AuthError }>

  /** Admin: list all profiles. */
  listProfiles(): Promise<AuthProfile[]>
}

// ---------------------------------------------------------------------------
// Global adapter singleton
// ---------------------------------------------------------------------------

let _adapter: AuthAdapter | null = null

export function initAuth(adapter: AuthAdapter): void {
  _adapter = adapter
}

export function getAuth(): AuthAdapter {
  if (!_adapter) throw new Error('Auth adapter not initialised. Call initAuth() first.')
  return _adapter
}
