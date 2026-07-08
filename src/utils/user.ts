import type { UserProfile } from '@/types'

function nameFromEmail(email?: string): string {
  if (!email) return ''
  const local = email.split('@')[0] || ''
  if (!local) return ''
  // Convert "akbar.khan" or "akbar_khan" or "akbar-khan" -> "Akbar Khan"
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length < 2) return ''
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')
}

export function displayName(profile?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'> | null): string {
  if (!profile) return ''
  const first = profile.first_name?.trim() ?? ''
  const last = profile.last_name?.trim() ?? ''
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return nameFromEmail(profile.email) || profile.email || ''
}

export function firstName(profile?: Pick<UserProfile, 'first_name' | 'email'> | null): string {
  if (!profile) return ''
  if (profile.first_name?.trim()) return profile.first_name.trim()
  const derived = nameFromEmail(profile.email)
  return derived.split(' ')[0] || profile.email?.split('@')[0] || ''
}
