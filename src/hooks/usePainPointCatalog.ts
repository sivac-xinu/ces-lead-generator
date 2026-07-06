import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
      const { data, error } = await supabase
        .from('pain_point_catalog')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (error) {
        // Graceful fallback if the table does not exist yet.
        if (error.message?.includes('does not exist')) return []
        throw error
      }
      return (data || []) as PainPointCatalogItem[]
    },
  })
}

export function useCreatePainPoint() {
  const qc = useQueryClient()
  const { showToast } = useUIStore()
  return useMutation({
    mutationFn: async (item: Omit<PainPointCatalogItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('pain_point_catalog').insert(item).select().single()
      if (error) throw error
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
      const { data, error } = await supabase
        .from('pain_point_catalog')
        .update(item)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
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
      // Soft delete by marking inactive.
      const { error } = await supabase.from('pain_point_catalog').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      showToast('Pain point removed from catalog')
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to remove pain point', 'error'),
  })
}
