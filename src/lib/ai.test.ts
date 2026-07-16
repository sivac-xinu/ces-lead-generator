import { describe, it, expect } from 'vitest'
import { runAIIntelligence } from './ai'
import { LEADS } from '@/data/leads'

describe('runAIIntelligence local provider', () => {
  it('returns local rules without calling the edge function', async () => {
    const res = await runAIIntelligence('local', 'rules', 'deep', LEADS[0])
    expect(res.fallback).toBe(false)
    expect(res.result.icp_options.length).toBeGreaterThan(0)
  })
})
