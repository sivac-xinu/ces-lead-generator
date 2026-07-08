import type { UserProfile } from '@/types'

export function displayName(profile?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'> | null): string {
  if (!profile) return ''
  const first = profile.first_name?.trim() ?? ''
  const last = profile.last_name?.trim() ?? ''
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  return profile.email ?? ''
}

export function firstName(profile?: Pick<UserProfile, 'first_name' | 'email'> | null): string {
  if (!profile) return ''
  return profile.first_name?.trim() || profile.email?.split('@')[0] || ''
}
