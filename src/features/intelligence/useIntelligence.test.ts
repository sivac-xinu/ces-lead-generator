import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as ai from '@/lib/ai';
import { useIntelligence } from './useIntelligence';
import { LEADS } from '@/data/leads';

const lead = LEADS[0];

describe('useIntelligence', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('marks source=cloud on a successful cloud run', async () => {
    vi.spyOn(ai, 'runAIIntelligence').mockResolvedValue({
      result: { icp_options: [{ value: 'X', confidence: 'high', reasoning: 'r' }], tier: 'Tier 1', it_type: 'Cloud', pain_points: [] },
      fallback: false,
    });
    const { result } = renderHook(() => useIntelligence());
    await act(async () => { await result.current.run({ provider: 'openai', model: 'gpt-4o', depth: 'deep', lead }); });
    expect(result.current.state.status).toBe('done');
    expect(result.current.state.source).toBe('cloud');
    expect(result.current.state.reason).toBeNull();
  });

  it('marks source=local and reason=not-deployed on fallback', async () => {
    vi.spyOn(ai, 'runAIIntelligence').mockResolvedValue({
      result: { icp_options: [], tier: 'Tier 3', it_type: 'Unknown', pain_points: [] } as never,
      fallback: true,
      notDeployed: true,
    });
    const { result } = renderHook(() => useIntelligence());
    await act(async () => { await result.current.run({ provider: 'openai', model: 'gpt-4o', depth: 'deep', lead }); });
    expect(result.current.state.source).toBe('local');
    expect(result.current.state.reason).toBe('not-deployed');
  });
});
