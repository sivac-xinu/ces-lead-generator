import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dbRowToLead, leadToDbRow } from '@/utils/lead'
import type { DbLead, Lead } from '@/types'

const LEADS_QUERY_KEY = 'leads'

export function useLeads() {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((row: DbLead) => dbRowToLead(row))
    },
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data, error } = await supabase.from('leads').insert(leadToDbRow(lead)).select().single()
      if (error) throw error
      return dbRowToLead(data as DbLead)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: number }) => {
      const { data, error } = await supabase.from('leads').update(leadToDbRow(lead)).eq('id', id).select().single()
      if (error) throw error
      return dbRowToLead(data as DbLead)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }),
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }),
  })
}
