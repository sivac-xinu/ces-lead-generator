import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AIConfig {
  openrouterKey: string
  openaiKey: string
  anthropicKey: string
}

interface AIConfigState extends AIConfig {
  setKey: (provider: keyof AIConfig, key: string) => void
  getKey: (provider: 'openrouter' | 'openai' | 'anthropic') => string
}

const STORAGE_KEY = 'ces-ai-config-v2'

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      openrouterKey: '',
      openaiKey: '',
      anthropicKey: '',
      setKey: (provider, key) => set({ [provider]: key }),
      getKey: (provider) => {
        const map: Record<string, keyof AIConfig> = {
          openrouter: 'openrouterKey',
          openai: 'openaiKey',
          anthropic: 'anthropicKey',
        }
        return get()[map[provider]] || ''
      },
    }),
    { name: STORAGE_KEY }
  )
)
