import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'
import type { CallLog } from '@/types'

const CALL_LOGS_QUERY_KEY = 'call_logs'

export function useCallLogs() {
  return useQuery({
    queryKey: [CALL_LOGS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await getDB().callLogs.findAll()
      if (error) throw new Error(error)
      return data ?? []
    },
  })
}

export function useCreateCallLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (log: Omit<CallLog, 'id'>) => {
      const { data, error } = await getDB().callLogs.create(log)
      if (error) throw new Error(error)
      return data!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CALL_LOGS_QUERY_KEY] }),
  })
}

export function useDeleteCallLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await getDB().callLogs.delete(id)
      if (error) throw new Error(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CALL_LOGS_QUERY_KEY] }),
  })
}
