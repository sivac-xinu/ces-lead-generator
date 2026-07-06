import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

const PROFILES_QUERY_KEY = 'profiles'

export function useProfiles() {
  return useQuery({
    queryKey: [PROFILES_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('email')
      if (error) throw error
      return (data || []) as UserProfile[]
    },
  })
}
