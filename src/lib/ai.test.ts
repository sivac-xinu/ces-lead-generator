import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAIIntelligence } from './ai'
import { LEADS } from '@/data/leads'
import * as supabaseModule from '@/lib/supabase'

describe('runAIIntelligence local provider', () => {
  it('returns local rules without calling the edge function', async () => {
    const res = await runAIIntelligence('local', 'rules', 'deep', LEADS[0])
    expect(res.fallback).toBe(false)
    expect(res.result.icp_options.length).toBeGreaterThan(0)
  })
})

describe('runAIIntelligence cloud fallback', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('falls back to the local classifier on a generic (non-not-deployed) provider error', async () => {
    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: new Error('Provider rate limit exceeded') }),
      },
    } as unknown as typeof supabaseModule.supabase)

    const res = await runAIIntelligence('openai', 'gpt-4o', 'deep', LEADS[0])

    expect(res.fallback).toBe(true)
    expect(res.notDeployed).toBeUndefined()
    expect(res.errorMessage).toBe('Provider rate limit exceeded')
    expect(res.result.icp_options.length).toBeGreaterThan(0)
  })
})
