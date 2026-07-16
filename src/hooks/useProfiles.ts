import { useQuery } from '@tanstack/react-query'
import { getDB } from '@/lib/db'

const PROFILES_QUERY_KEY = 'profiles'

export function useProfiles() {
  return useQuery({
    queryKey: [PROFILES_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await getDB().profiles.findAll({ orderBy: 'email', ascending: true })
      if (error) throw new Error(error)
      return data ?? []
    },
  })
}
