/**
 * Supabase implementation of the AuthAdapter.
 */

import { supabase } from './supabase'
import { AuthError, type AuthAdapter, type AuthProfile } from './auth'

export const supabaseAuth: AuthAdapter = {
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null
    const u = session.user
    return {
      id: u.id,
      email: u.email ?? '',
      firstName: u.user_metadata?.first_name,
      lastName: u.user_metadata?.last_name,
    }
  },

  async getProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !data) return null
    return data as AuthProfile
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new AuthError(error.message) : undefined }
  },

  async signUp(email, password, firstName, lastName) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })
    return { error: error ? new AuthError(error.message) : undefined }
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error: error ? new AuthError(error.message) : undefined }
  },

  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user
        callback({
          id: u.id,
          email: u.email ?? '',
          firstName: u.user_metadata?.first_name,
          lastName: u.user_metadata?.last_name,
        })
      } else {
        callback(null)
      }
    })
    return () => subscription.unsubscribe()
  },

  async deleteUser(userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: new AuthError('Not authenticated') }

    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId },
    })
    return { error: error ? new AuthError(error.message) : undefined }
  },

  async updateProfile(userId, patch) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    return { error: error ? new AuthError(error.message) : undefined }
  },

  async listProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return []
    return (data ?? []) as AuthProfile[]
  },
}
