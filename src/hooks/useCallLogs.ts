import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CallLog } from '@/types'

const CALL_LOGS_QUERY_KEY = 'call_logs'

export function useCallLogs() {
  return useQuery({
    queryKey: [CALL_LOGS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('call_logs').select('*').order('date', { ascending: false })
      if (error) throw error
      return (data || []) as CallLog[]
    },
  })
}

export function useCreateCallLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: Omit<CallLog, 'id'>) => {
      const { data, error } = await supabase.from('call_logs').insert(log).select().single()
      if (error) throw error
      return data as CallLog
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CALL_LOGS_QUERY_KEY] }),
  })
}

export function useDeleteCallLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('call_logs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CALL_LOGS_QUERY_KEY] }),
  })
}
