import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SEED_SOLUTIONS } from '@/data/solutions'
import type { Solution } from '@/types'

const SOLUTIONS_QUERY_KEY = 'solutions'

export function useSolutions() {
  return useQuery({
    queryKey: [SOLUTIONS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('solutions').select('*').order('service')
      if (error) {
        console.warn('Solutions DB fetch failed, using seed data:', error.message)
        return SEED_SOLUTIONS
      }
      return (data?.length ? data : SEED_SOLUTIONS) as Solution[]
    },
  })
}

export function useCreateSolution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (solution: Omit<Solution, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('solutions').insert(solution).select().single()
      if (error) throw error
      return data as Solution
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLUTIONS_QUERY_KEY] }),
  })
}

export function useUpdateSolution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...solution }: Partial<Solution> & { id: string }) => {
      const { data, error } = await supabase.from('solutions').update(solution).eq('id', id).select().single()
      if (error) throw error
      return data as Solution
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLUTIONS_QUERY_KEY] }),
  })
}

export function useDeleteSolution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('solutions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLUTIONS_QUERY_KEY] }),
  })
}
