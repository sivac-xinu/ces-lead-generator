import { useState, useCallback } from 'react';
import { runAIIntelligence } from '@/lib/ai';
import type { AIProvider, IntelligenceResult, Lead } from '@/types';

export type IntelSource = 'cloud' | 'local';

export interface IntelState {
  status: 'idle' | 'loading' | 'done' | 'error';
  result: IntelligenceResult | null;
  source: IntelSource | null;
  reason: string | null;
}

const IDLE: IntelState = { status: 'idle', result: null, source: null, reason: null };

export function useIntelligence() {
  const [state, setState] = useState<IntelState>(IDLE);

  const run = useCallback(
    async (args: { provider: AIProvider; model: string; depth: 'quick' | 'deep'; lead: Lead }) => {
      setState((s) => ({ ...s, status: 'loading', source: null, reason: null }));
      try {
        const res = await runAIIntelligence(args.provider, args.model, args.depth, args.lead);
        const reason = res.notDeployed ? 'not-deployed' : (res.errorMessage ?? null);
        setState({
          status: 'done',
          result: res.result,
          source: res.fallback ? 'local' : 'cloud',
          reason,
        });
      } catch (err) {
        setState({ status: 'error', result: null, source: null, reason: err instanceof Error ? err.message : 'AI analysis failed' });
      }
    },
    []
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { state, run, reset };
}
