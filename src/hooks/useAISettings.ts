import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AIProviderKeys {
  openrouter_key?: string
  openai_key?: string
  anthropic_key?: string
  gemini_key?: string
}

const SETTINGS_ID = 'global'
const QUERY_KEY = 'ces-settings'

export function useAISettings() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ces_settings')
        .select('ai_keys')
        .eq('id', SETTINGS_ID)
        .single()
      if (error) {
        if (error.message?.includes('does not exist')) return null
        // Row not found is OK — settings haven't been created yet.
        if (error.code === 'PGRST116') return null
        throw error
      }
      return (data?.ai_keys || null) as AIProviderKeys | null
    },
  })
}

export function useUpdateAISettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keys: AIProviderKeys) => {
      const payload = {
        openrouter_key: keys.openrouter_key?.trim() || undefined,
        openai_key: keys.openai_key?.trim() || undefined,
        anthropic_key: keys.anthropic_key?.trim() || undefined,
        gemini_key: keys.gemini_key?.trim() || undefined,
      }
      const { error } = await supabase.from('ces_settings').upsert(
        {
          id: SETTINGS_ID,
          ai_keys: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
