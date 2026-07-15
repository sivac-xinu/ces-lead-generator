# Intelligence & Classifier Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the five churn-prone areas of the v2 AI-intelligence flow and classifier into modules with small interfaces, testable past those interfaces, with no user-visible behaviour change.

**Architecture:** React 19 + TypeScript + Vite, feature-foldered, TanStack Query for data, Zustand for UI, Vitest + Testing Library for unit tests, Playwright for e2e. We introduce a `useIntelligence` hook that owns the local-vs-cloud decision and fallback (Candidate 1), unify the two classifiers behind one `classify` interface (Candidate 2), split the modal's result view into a pure component (Candidate 4), replace the edge function's provider if/else with an adapter registry (Candidate 3), and separate rules-data from classify-logic (Candidate 5).

**Tech Stack:** React 19, TypeScript, Vite, `@tanstack/react-query`, Zustand, Vitest, `@testing-library/react`, Supabase Edge Functions (Deno).

## Global Constraints

- No user-visible behaviour change. The Intelligence modal, imports, and classification badges behave exactly as before after every task.
- Every task ends green on all four gates: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. A task is not done until all four pass.
- Follow existing test patterns: `renderWithProviders` from `@/test/test-utils`, `vi.spyOn` on `@/hooks/*` and `@/store/uiStore`, data from `@/data/leads` (`LEADS`).
- Keep the public `IntelligenceResult`, `IcpOption`, `Lead`, `Contact` types in `src/types/index.ts` unchanged unless a task explicitly edits them.
- Preserve the existing `deepInferAll` behaviour byte-for-byte when it is renamed/moved — this is a re-shaping of interfaces, not a rules change.
- Commit after every task. Never batch two tasks into one commit.
- Build order deviates slightly from the report's payoff order: the report ranks Candidate 1 first (highest churn), and this plan keeps it first, but note Candidate 2 tightens the fallback Candidate 1 introduces — do them in the order below.

---

## File Structure

- `src/features/intelligence/useIntelligence.ts` — **create.** Hook owning `run(provider, model, depth, lead)` → normalized `{ result, source, reason, status }`. Candidate 1.
- `src/features/intelligence/useIntelligence.test.ts` — **create.** Tests the hook past its interface with a stubbed `runAIIntelligence`.
- `src/features/intelligence/IntelligenceModal.tsx` — **modify.** Consumes the hook (C1), then loses the result view (C4).
- `src/features/intelligence/IntelligenceResultView.tsx` — **create.** Pure render of one `IntelligenceResult`. Candidate 4.
- `src/features/intelligence/IntelligenceResultView.test.tsx` — **create.**
- `src/lib/ai.ts` — **modify.** `runAIIntelligence` becomes total over `AIProvider` (accepts `local`). Candidate 1.
- `src/lib/classify.ts` — **create.** The single classify interface. Candidate 2 + 5.
- `src/lib/classify.test.ts` — **create.**
- `src/utils/lead.ts` — **modify.** `inferICP/inferTier/inferITType` re-exported from `classify` (or delegated). Candidate 2.
- `src/data/inference.ts` — **modify.** `deepInferAll` logic moves into `classify.ts`; this file keeps rule-data + re-exports for back-compat. Candidate 5.
- `supabase/functions/ai-proxy/providers.ts` — **create.** Provider adapter registry. Candidate 3.
- `supabase/functions/ai-proxy/index.ts` — **modify.** Dispatch becomes a registry lookup. Candidate 3.

---

## Phase 1 — `useIntelligence` hook (Candidate 1)

Today `IntelligenceModal.run()` (line 56) branches `provider==='local'` → `deepInferAll` else `runAIIntelligence`, then maps `notDeployed`/`errorMessage` → `reason`, and sets 5 pieces of state. `deepInferAll` is imported in the modal AND `lib/ai.ts`. Move the decision behind one hook.

### Task 1.1: Make `runAIIntelligence` total over `AIProvider`

**Files:**
- Modify: `src/lib/ai.ts`
- Modify: `src/lib/ai.test.ts` (create if absent)

**Interfaces:**
- Consumes: `deepInferAll` from `@/data/inference`, `AIProvider`, `IntelligenceResult`, `Lead` from `@/types`.
- Produces: `runAIIntelligence(provider, model, depth, lead, opts?)` now accepts `provider === 'local'` and returns `{ result: deepInferAll(lead), fallback: false }` for it (no invoke, no error). Existing return shape `{ result, fallback, errorMessage?, notDeployed? }` unchanged.

- [ ] **Step 1: Write the failing test**

Create/append `src/lib/ai.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runAIIntelligence } from './ai';
import { LEADS } from '@/data/leads';

describe('runAIIntelligence local provider', () => {
  it('returns local rules without calling the edge function', async () => {
    const res = await runAIIntelligence('local', 'rules', 'deep', LEADS[0]);
    expect(res.fallback).toBe(false);
    expect(res.result.icp_options.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/ai.test.ts`
Expected: FAIL — local currently falls through to `supabase.functions.invoke`.

- [ ] **Step 3: Add the local short-circuit at the top of `runAIIntelligence`**

In `src/lib/ai.ts`, as the first lines inside `runAIIntelligence`:

```ts
  if (provider === 'local') {
    return { result: deepInferAll(lead), fallback: false };
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/lib/ai.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates + commit**

Run: `npm run typecheck && npm run lint`
```bash
git add src/lib/ai.ts src/lib/ai.test.ts
git commit -m "feat(ai): runAIIntelligence handles local provider directly"
```

### Task 1.2: Create the `useIntelligence` hook

**Files:**
- Create: `src/features/intelligence/useIntelligence.ts`
- Create: `src/features/intelligence/useIntelligence.test.ts`

**Interfaces:**
- Consumes: `runAIIntelligence` (Task 1.1), `AIProvider`, `IntelligenceResult`, `Lead`.
- Produces:
  - `type IntelSource = 'cloud' | 'local'`
  - `interface IntelState { status: 'idle' | 'loading' | 'done' | 'error'; result: IntelligenceResult | null; source: IntelSource | null; reason: string | null }`
  - `useIntelligence() → { state: IntelState; run(args: { provider: AIProvider; model: string; depth: 'quick'|'deep'; lead: Lead }): Promise<void>; reset(): void }`
  - `reason` is `'not-deployed'` when the proxy is undeployed, the raw error message on a provider error, else `null`.

- [ ] **Step 1: Write the failing test**

Create `src/features/intelligence/useIntelligence.test.ts`:

```ts
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
      result: { ...({} as never), icp_options: [{ value: 'X', confidence: 'high', reasoning: 'r' }], tier: 'Tier 1', it_type: 'Cloud', pain_points: [] },
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/features/intelligence/useIntelligence.test.ts`
Expected: FAIL — `Cannot find module './useIntelligence'`.

- [ ] **Step 3: Implement the hook**

Create `src/features/intelligence/useIntelligence.ts`:

```ts
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
      setState((s) => ({ ...s, status: 'loading' }));
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/features/intelligence/useIntelligence.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates + commit**

Run: `npm run typecheck && npm run lint`
```bash
git add src/features/intelligence/useIntelligence.ts src/features/intelligence/useIntelligence.test.ts
git commit -m "feat(intelligence): add useIntelligence hook owning run + fallback"
```

### Task 1.3: Wire the modal to the hook

**Files:**
- Modify: `src/features/intelligence/IntelligenceModal.tsx`

**Interfaces:**
- Consumes: `useIntelligence` (Task 1.2).
- Produces: the modal reads `state.result / state.source / state.reason / state.status` instead of the local `result/usedFallback/fallbackReason/loading/deepInferAll` state; the `provider/model/depth/selectedIcp/settingsOpen` state stays local.

- [ ] **Step 1: Replace five useState + the run body.** Remove `result`, `loading`, `usedFallback`, `fallbackReason` state (lines ~34, 36, 37, 38) and the `deepInferAll` import (line 7). Add:

```tsx
  const { state, run: runIntel } = useIntelligence();
```

- [ ] **Step 2: Replace the `run` function body (line 56)** with:

```tsx
  const run = async () => {
    await runIntel({ provider, model, depth, lead });
  };
```

Then in the JSX, replace references: `result` → `state.result`, `loading` → `state.status === 'loading'`, `usedFallback` → `state.source === 'local'`, `fallbackReason` → `state.reason`. After a run completes, set `selectedIcp` from `state.result` and surface the fallback toast via an effect keyed on the run's terminal state:

```tsx
  useEffect(() => {
    if (state.status !== 'done') return;
    if (state.result) setSelectedIcp(state.result.icp || state.result.icp_options[0]?.value || null);
    if (state.source === 'local') {
      showToast(
        state.reason === 'not-deployed'
          ? 'AI proxy is not deployed — returned local-rule results instead.'
          : `AI provider error — returned local-rule results instead: ${state.reason}`,
        'error'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.source, state.reason, state.result]);
```

(Add `useEffect` to the `react` import.)

- [ ] **Step 3: Run the existing modal tests**

Run: `npm test -- src/features/intelligence/IntelligenceModal.test.tsx`
Expected: PASS (behaviour preserved: renders, local run fills result, apply-all mutates).

- [ ] **Step 4: Gates + commit**

Run: `npm run typecheck && npm run lint && npm run build`
```bash
git add src/features/intelligence/IntelligenceModal.tsx
git commit -m "refactor(intelligence): modal consumes useIntelligence, renders its state"
```

**Phase 1 checkpoint:** `npm run dev` → open Intelligence on a lead; run Local Rules (result fills), run a cloud provider with no key (fallback toast + local result). Both behave as before.

---

## Phase 2 — One classifier (Candidate 2)

`utils/lead.ts` exports `inferICP(emp)` / `inferTier(emp,budget)` / `inferITType(ind)` used by AddLeadModal, ApiSourcesPage, CsvImportModal. `data/inference.ts:deepInferAll` reuses two of them but computes ICP its own way. Unify behind one `classify`.

### Task 2.1: Create `classify` with the shared interface

**Files:**
- Create: `src/lib/classify.ts`
- Create: `src/lib/classify.test.ts`

**Interfaces:**
- Consumes: `inferITType`, `inferTier`, `inferICP` (current `utils/lead` logic), `deepInferAll` (current `data/inference` logic).
- Produces:
  - `classifyBasic(lead: Partial<Lead>) → { it_type: ITType; tier: Tier; icp: ICP }` — the fast path used by imports.
  - `classifyDeep(lead: Lead) → IntelligenceResult` — the enriched path (delegates to today's `deepInferAll`).
  - Both share the same `it_type`/`tier` rules.

- [ ] **Step 1: Write the failing test**

Create `src/lib/classify.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyBasic, classifyDeep } from './classify';
import { LEADS } from '@/data/leads';

describe('classify', () => {
  it('classifyBasic returns it_type, tier, icp', () => {
    const c = classifyBasic({ industry: 'Finance', employees: 720, annual_it_budget: '$4.2M' });
    expect(c).toHaveProperty('it_type');
    expect(c).toHaveProperty('tier');
    expect(c).toHaveProperty('icp');
  });

  it('classifyDeep tier matches classifyBasic tier for the same lead', () => {
    const lead = LEADS[0];
    expect(classifyDeep(lead).tier).toBe(classifyBasic(lead).tier);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/lib/classify.test.ts`
Expected: FAIL — `Cannot find module './classify'`.

- [ ] **Step 3: Implement `classify.ts`**

```ts
import type { ICP, ITType, Lead, Tier, IntelligenceResult } from '@/types';
import { inferICP, inferITType, inferTier } from '@/utils/lead';
import { deepInferAll } from '@/data/inference';

export function classifyBasic(lead: Partial<Lead>): { it_type: ITType; tier: Tier; icp: ICP } {
  return {
    it_type: inferITType(lead.industry),
    tier: inferTier(lead.employees, lead.annual_it_budget),
    icp: inferICP(lead.employees),
  };
}

export function classifyDeep(lead: Lead): IntelligenceResult {
  return deepInferAll(lead);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/lib/classify.test.ts`
Expected: PASS.

- [ ] **Step 5: Gates + commit**

Run: `npm run typecheck && npm run lint`
```bash
git add src/lib/classify.ts src/lib/classify.test.ts
git commit -m "feat: add classify module unifying basic + deep inference"
```

### Task 2.2: Route the three import paths through `classifyBasic`

**Files:**
- Modify: `src/features/leads/AddLeadModal.tsx` (lines ~10, 118-120)
- Modify: `src/features/apiSources/ApiSourcesPage.tsx` (lines ~8, 35-37)
- Modify: `src/features/csv/CsvImportModal.tsx` (lines ~12, 142-144)

**Interfaces:**
- Consumes: `classifyBasic` (Task 2.1).
- Produces: each import path calls `classifyBasic(lead)` once instead of three separate `inferX` calls.

- [ ] **Step 1: In each file, replace the three-call block.** Example for `AddLeadModal.tsx`:

Replace the import `import { inferICP, inferITType, inferTier } from '@/utils/lead'` with `import { classifyBasic } from '@/lib/classify'`, and replace:

```tsx
        it_type: inferITType(industry),
        tier: inferTier(employees),
        icp: inferICP(employees),
```

with:

```tsx
        ...classifyBasic({ industry, employees }),
```

Apply the equivalent change in `ApiSourcesPage.tsx` (uses `result.employees`) and `CsvImportModal.tsx` (assigns to `it_type`/`tier`/`icp` locals — set `const { it_type, tier, icp } = classifyBasic({ industry, employees })`).

- [ ] **Step 2: Run the affected feature tests**

Run: `npm test -- src/features/leads src/features/apiSources src/features/csv`
Expected: PASS.

- [ ] **Step 3: Gates + commit**

Run: `npm run typecheck && npm run lint && npm run build`
```bash
git add src/features/leads/AddLeadModal.tsx src/features/apiSources/ApiSourcesPage.tsx src/features/csv/CsvImportModal.tsx
git commit -m "refactor: import paths classify leads through one interface"
```

### Task 2.3: Route the intelligence fallback through `classifyDeep`

**Files:**
- Modify: `src/lib/ai.ts` (replace `deepInferAll(lead)` calls with `classifyDeep(lead)`)

**Interfaces:**
- Consumes: `classifyDeep` (Task 2.1).
- Produces: `lib/ai.ts` references the classify interface, not `deepInferAll` directly. One classify surface for the whole app.

- [ ] **Step 1: Swap the import and the two call sites** in `src/lib/ai.ts`: replace `import { deepInferAll } from '@/data/inference'` with `import { classifyDeep } from '@/lib/classify'`, and both `deepInferAll(lead)` → `classifyDeep(lead)`.

- [ ] **Step 2: Run**

Run: `npm test -- src/lib/ai.test.ts src/features/intelligence`
Expected: PASS.

- [ ] **Step 3: Gates + commit**

Run: `npm run typecheck && npm run lint && npm run build`
```bash
git add src/lib/ai.ts
git commit -m "refactor(ai): fallback goes through classifyDeep"
```

**Phase 2 checkpoint:** `npm run dev` → add a lead manually, import via API sources, import a CSV; confirm ICP/Tier/IT-type badges match prior behaviour. Run Intelligence local rules; confirm the same result shape.

---

## Phase 3 — Split the result view (Candidate 4)

`IntelligenceModal.tsx` is 421 lines with `InfoCard`/`InfoBlock` helpers (lines 404, 413) and a large result render. Extract a pure `IntelligenceResultView`.

### Task 3.1: Extract `IntelligenceResultView`

**Files:**
- Create: `src/features/intelligence/IntelligenceResultView.tsx`
- Create: `src/features/intelligence/IntelligenceResultView.test.tsx`
- Modify: `src/features/intelligence/IntelligenceModal.tsx`

**Interfaces:**
- Consumes: `IntelligenceResult`, `IcpOption`.
- Produces:
  - `IntelligenceResultView({ result, lead, selectedIcp, onSelectIcp }: { result: IntelligenceResult; lead: Lead; selectedIcp: string | null; onSelectIcp: (v: string) => void })` — a pure component rendering ICP options, InfoCards, enrichment, and research. No hooks except none; renders from props only.
  - `InfoCard` and `InfoBlock` move into this file (unexported).

- [ ] **Step 1: Write the failing test**

Create `src/features/intelligence/IntelligenceResultView.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntelligenceResultView } from './IntelligenceResultView';
import { LEADS } from '@/data/leads';
import type { IntelligenceResult } from '@/types';

const result: IntelligenceResult = {
  icp_options: [{ value: 'Enterprise Finance', confidence: 'high', reasoning: 'r' }],
  tier: 'Tier 1',
  it_type: 'Cloud',
  pain_points: ['legacy hardware'],
};

describe('IntelligenceResultView', () => {
  it('renders ICP options and fires onSelectIcp', () => {
    const onSelect = vi.fn();
    render(<IntelligenceResultView result={result} lead={LEADS[0]} selectedIcp={null} onSelectIcp={onSelect} />);
    fireEvent.click(screen.getByText('Enterprise Finance'));
    expect(onSelect).toHaveBeenCalledWith('Enterprise Finance');
  });

  it('renders the inferred tier', () => {
    render(<IntelligenceResultView result={result} lead={LEADS[0]} selectedIcp="Enterprise Finance" onSelectIcp={() => {}} />);
    expect(screen.getByText('Tier 1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/features/intelligence/IntelligenceResultView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component by lifting the result JSX.** Move the `{result && ( … )}` render block (ICP suggestions through research) plus `InfoCard`/`InfoBlock` (lines 404-420) out of `IntelligenceModal.tsx` into `IntelligenceResultView.tsx`. Its props are exactly `{ result, lead, selectedIcp, onSelectIcp }`. Replace internal `setSelectedIcp(opt.value)` with `onSelectIcp(opt.value)`.

- [ ] **Step 4: Use it in the modal.** In `IntelligenceModal.tsx`, replace the extracted block with:

```tsx
        {state.result && (
          <IntelligenceResultView
            result={state.result}
            lead={lead}
            selectedIcp={selectedIcp}
            onSelectIcp={setSelectedIcp}
          />
        )}
```

- [ ] **Step 5: Run both test files**

Run: `npm test -- src/features/intelligence`
Expected: PASS (new view tests + existing modal tests).

- [ ] **Step 6: Gates + commit**

Run: `npm run typecheck && npm run lint && npm run build`
```bash
git add src/features/intelligence/IntelligenceResultView.tsx src/features/intelligence/IntelligenceResultView.test.tsx src/features/intelligence/IntelligenceModal.tsx
git commit -m "refactor(intelligence): extract pure IntelligenceResultView"
```

**Phase 3 checkpoint:** `npm run dev` → run Intelligence; confirm ICP chips, InfoCards, enrichment, and research all render and ICP selection still works.

---

## Phase 4 — Provider adapter registry (Candidate 3)

`ai-proxy/index.ts` dispatches with a 4-way `provider ===` chain to `callOpenRouter/callOpenAI/callAnthropic/callGemini`. Replace with a registry. (Deno edge function — no Vitest; verify via `deno check` and the existing e2e/mock path.)

### Task 4.1: Extract the provider adapters into a registry

**Files:**
- Create: `supabase/functions/ai-proxy/providers.ts`
- Modify: `supabase/functions/ai-proxy/index.ts`

**Interfaces:**
- Consumes: the existing `ProviderError`, `parseProviderError`, `stripJson` helpers (move them into `providers.ts` or import from a shared spot).
- Produces:
  - `interface ProviderAdapter { call(apiKey: string, model: string, messages: unknown[]): Promise<string> }`
  - `const PROVIDERS: Record<'openrouter'|'openai'|'anthropic'|'gemini', ProviderAdapter>`
  - `index.ts` dispatch becomes `const adapter = PROVIDERS[body.provider]; if (!adapter) return errorResponse('Unknown provider'); raw = await adapter.call(apiKey, body.model, messages)`.

- [ ] **Step 1: Move the four `callX` functions + `ProviderError`/`parseProviderError`/`stripJson` into `providers.ts`** verbatim, and wrap them:

```ts
export interface ProviderAdapter {
  call(apiKey: string, model: string, messages: unknown[]): Promise<string>;
}

export const PROVIDERS: Record<string, ProviderAdapter> = {
  openrouter: { call: callOpenRouter },
  openai: { call: callOpenAI },
  anthropic: { call: callAnthropic },
  gemini: { call: callGemini },
};
```

- [ ] **Step 2: Replace the if/else in `index.ts`** (the `if (body.provider === 'openrouter') …` chain) with:

```ts
    const adapter = PROVIDERS[body.provider];
    if (!adapter) return errorResponse('Unknown provider');
    const raw = await adapter.call(apiKey, body.model, messages);
```

Import `PROVIDERS` and `ProviderError` from `./providers.ts`.

- [ ] **Step 3: Type-check the Deno function**

Run: `cd supabase/functions/ai-proxy && deno check index.ts providers.ts` (or `npx supabase functions serve ai-proxy --no-verify-jwt` and confirm it boots; if Deno is unavailable, run `npm run build` at repo root to confirm the client is unaffected).
Expected: no type errors.

- [ ] **Step 4: Verify the mock path still works.** With `AI_MOCK_MODE=true`, the `useMock` branch in `serve()` is untouched — confirm it still returns `mockResponse(body)`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ai-proxy/providers.ts supabase/functions/ai-proxy/index.ts
git commit -m "refactor(ai-proxy): dispatch providers via adapter registry"
```

**Phase 4 checkpoint:** deploy `npx supabase functions deploy ai-proxy` to a test project (or run the e2e AI mock path); run one real provider from the modal; confirm the same result and error messages as before.

---

## Phase 5 — Separate rules-data from classify-logic (Candidate 5)

`data/inference.ts` (762 lines) mixes rule arrays with `deepInferAll` logic (note: it even has a mid-file `import` at line 591). Move the logic into `classify.ts`; keep the data as data. Speculative — only if Phase 2 landed cleanly.

### Task 5.1: Move `deepInferAll` logic into `classify.ts`

**Files:**
- Modify: `src/data/inference.ts` (keep rule arrays + `PP_THEMES`; move `deepInferAll` body out)
- Modify: `src/lib/classify.ts` (host the moved logic)
- Modify: `src/data/inference.test.ts` if it imports `deepInferAll` directly

**Interfaces:**
- Consumes: the rule arrays exported from `data/inference.ts` (`INFER_RULES`, `INFER_INDUSTRY`, `PP_THEMES`, etc.).
- Produces: `classifyDeep` in `classify.ts` contains the former `deepInferAll` body; `data/inference.ts` re-exports `export { classifyDeep as deepInferAll } from '@/lib/classify'` for back-compat so no other import breaks. Move the stray mid-file `import` (line 591) to the top of whichever file the code lands in.

- [ ] **Step 1: Move the `deepInferAll` function body** from `data/inference.ts` into `classify.ts`, importing the rule arrays it uses from `@/data/inference`. Replace `classifyDeep`'s current one-line delegation with the moved body.

- [ ] **Step 2: Add the back-compat re-export** at the bottom of `data/inference.ts`:

```ts
export { classifyDeep as deepInferAll } from '@/lib/classify';
```

Watch for a circular import (`classify` imports rules from `inference`; `inference` re-exports from `classify`). If the cycle bites, drop the re-export and update the remaining `deepInferAll` importers (`data/inference.test.ts`) to import `classifyDeep` from `@/lib/classify` directly instead.

- [ ] **Step 3: Run the inference + classify tests**

Run: `npm test -- src/data/inference.test.ts src/lib/classify.test.ts`
Expected: PASS (same behaviour, new home).

- [ ] **Step 4: Gates + commit**

Run: `npm run typecheck && npm run lint && npm run build`
```bash
git add src/data/inference.ts src/lib/classify.ts src/data/inference.test.ts
git commit -m "refactor: classify-logic lives in classify.ts, inference.ts is rules-data"
```

**Phase 5 checkpoint:** `npm test` (full suite) green; `npm run dev` → Intelligence local rules + a lead import both produce prior results.

---

## Self-Review

**Spec coverage** — Phase 1 = Candidate 1 (intelligence flow), Phase 2 = Candidate 2 (one classifier), Phase 3 = Candidate 4 (split result view), Phase 4 = Candidate 3 (provider registry), Phase 5 = Candidate 5 (rules vs logic). All five covered; order follows the report's top-rec (1 first) with 2 before its dependents.

**Type consistency** — `IntelState`/`IntelSource` (Phase 1) are consumed only inside the hook + modal. `classifyBasic`/`classifyDeep` (Phase 2) names are reused verbatim in Phases 2, 3, 5. `IntelligenceResultView`'s prop names (`result`, `lead`, `selectedIcp`, `onSelectIcp`) are fixed in Task 3.1 and used unchanged in the modal. `ProviderAdapter.call(apiKey, model, messages)` (Phase 4) matches the existing `callX` signatures.

**No behaviour change** — every phase preserves output: the local short-circuit (1.1) returns the same `deepInferAll` result the modal produced before; `classifyBasic` composes the same three `utils/lead` functions imports used; `classifyDeep`/`deepInferAll` is moved, not rewritten; the provider registry calls the same `callX` bodies.

**Execution-time reads** — Phase 4 assumes Deno tooling for `deno check`; if unavailable, fall back to the client `npm run build` gate + the e2e AI-mock path noted in Task 4.1. Line numbers captured 2026-07-15 — re-grep the symbol if the file has shifted.
