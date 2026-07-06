import { create } from 'zustand'
import type { Lead } from '@/types'

interface UIState {
  selectedLeadId: number | null
  setSelectedLeadId: (id: number | null) => void
  intelligenceLead: Lead | null
  setIntelligenceLead: (lead: Lead | null) => void
  scriptLeadId: number | null
  setScriptLeadId: (id: number | null) => void
  trackerLeadId: number | null
  setTrackerLeadId: (id: number | null) => void
  toast: { message: string; type: 'success' | 'error' } | null
  showToast: (message: string, type?: 'success' | 'error') => void
  clearToast: () => void
}

export const useUIStore = create<UIState>(set => ({
  selectedLeadId: null,
  setSelectedLeadId: id => set({ selectedLeadId: id }),
  intelligenceLead: null,
  setIntelligenceLead: lead => set({ intelligenceLead: lead }),
  scriptLeadId: null,
  setScriptLeadId: id => set({ scriptLeadId: id }),
  trackerLeadId: null,
  setTrackerLeadId: id => set({ trackerLeadId: id }),
  toast: null,
  showToast: (message, type = 'success') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}))
