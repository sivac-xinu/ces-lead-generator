import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import { useUIStore } from '@/store/uiStore'

export interface PainPointCatalogItem {
  id: number
  text: string
  theme: string
  tags: string[]
  active: boolean
  created_at?: string
}

const QUERY_KEY = 'pain-point-catalog'

export function usePainPointCatalog() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await getDB().painPointCatalog.findAll({
        filters: { active: true },
        orderBy: 'created_at',
        ascending: false,
      })
      if (error) {
        if (error.includes('does not exist')) return []
        throw new Error(error)
      }
      return (data ?? []) as PainPointCatalogItem[]
    },
  })
}

export function useCreatePainPoint() {
  const qc = useQueryClient()
  const { showToast } = useUIStore()
  return useMutation({
    mutationFn: async (item: Omit<PainPointCatalogItem, 'id' | 'created_at'>) => {
      const { data, error } = await getDB().painPointCatalog.create(item)
      if (error) throw new Error(error)
      return data as PainPointCatalogItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      showToast('Pain point added to catalog')
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to add pain point', 'error'),
  })
}

export function useUpdatePainPoint() {
  const qc = useQueryClient()
  const { showToast } = useUIStore()
  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<PainPointCatalogItem> & { id: number }) => {
      const { data, error } = await getDB().painPointCatalog.update(id, item)
      if (error) throw new Error(error)
      return data as PainPointCatalogItem
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      showToast('Catalog updated')
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update catalog', 'error'),
  })
}

export function useDeletePainPoint() {
  const qc = useQueryClient()
  const { showToast } = useUIStore()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await getDB().painPointCatalog.update(id, { active: false })
      if (error) throw new Error(error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      showToast('Pain point removed from catalog')
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to remove pain point', 'error'),
  })
}
