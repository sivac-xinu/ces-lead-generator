import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import { SEED_SOLUTIONS } from '@/data/solutions'
import type { Solution } from '@/types'

const SOLUTIONS_QUERY_KEY = 'solutions'

export function useSolutions() {
  return useQuery({
    queryKey: [SOLUTIONS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await getDB().solutions.findAll()
      if (error) {
        console.warn('Solutions DB fetch failed, using seed data:', error)
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
      const { data, error } = await getDB().solutions.create(solution)
      if (error) throw new Error(error)
      return data as Solution
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLUTIONS_QUERY_KEY] }),
  })
}

export function useUpdateSolution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...solution }: Partial<Solution> & { id: string }) => {
      const { data, error } = await getDB().solutions.update(id, solution)
      if (error) throw new Error(error)
      return data as Solution
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLUTIONS_QUERY_KEY] }),
  })
}

export function useDeleteSolution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getDB().solutions.delete(id)
      if (error) throw new Error(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [SOLUTIONS_QUERY_KEY] }),
  })
}
