import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDB } from '@/lib/db'

export interface AIProviderKeys {
  openrouter_key?: string
  openai_key?: string
  anthropic_key?: string
  gemini_key?: string
}

const QUERY_KEY = 'ces-settings'

export function useAISettings() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await getDB().aiSettings.getKeys()
      if (error) {
        if (error.includes('does not exist')) return null
        throw new Error(error)
      }
      return (data || null) as AIProviderKeys | null
    },
  })
}

export function useUpdateAISettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keys: AIProviderKeys) => {
      const payload: Record<string, string> = {}
      if (keys.openrouter_key?.trim()) payload.openrouter_key = keys.openrouter_key.trim()
      if (keys.openai_key?.trim()) payload.openai_key = keys.openai_key.trim()
      if (keys.anthropic_key?.trim()) payload.anthropic_key = keys.anthropic_key.trim()
      if (keys.gemini_key?.trim()) payload.gemini_key = keys.gemini_key.trim()

      const { error } = await getDB().aiSettings.upsertKeys(payload)
      if (error) throw new Error(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
