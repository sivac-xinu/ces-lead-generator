# CES Lead Generator v2 — Agent Notes

## Project Overview
Modern React + TypeScript rebuild of the CES Lead Generator. Lives in a sibling directory locally and is pushed to the `v2` branch of the existing GitHub repository so the original app and Supabase database remain untouched.

## Branch & Deployment
- Local path: `/Users/staray/Documents/Projects/CES_Internal_Projects/Infra_Lead_Generator_v2/`
- Remote branch: `v2` on `https://github.com/sivac-xinu/ces-lead-generator.git`
- GitHub Pages source must be set to **GitHub Actions** (not a branch/folder) for `deploy.yml` to publish.
- Deployment triggers on every push to the `v2` branch.

## Tech Stack
- **Framework:** React 19 + TypeScript
- **Build:** Vite 8
- **Routing:** React Router v7
- **Server State:** TanStack Query (React Query)
- **Client State:** Zustand
- **Styling:** Tailwind CSS 3
- **UI Components:** Custom lightweight components in `src/components/ui/`
- **Auth / DB:** Supabase (same project as v1)
- **AI:** OpenRouter + OpenAI + Claude via Supabase Edge Function `ai-proxy`, with local rule fallback
- **Lead APIs:** ZoomInfo via Supabase Edge Function `zoominfo-proxy` + Clearbit browser-direct
- **Testing:** Vitest + React Testing Library + Playwright
- **CI/CD:** GitHub Actions → GitHub Pages

## Directory Structure
```
src/
  components/ui/       # Button, Input, Select, Modal, Badge, Toast
  components/layout/   # Layout, sidebar, navigation
  features/            # Domain features (auth, leads, script, tracker, solutions, admin, apiSources, csv, intelligence)
  hooks/               # TanStack Query hooks for leads, call logs, solutions
  lib/                 # Supabase client, AI service, ZoomInfo service
  store/               # Zustand UI store
  data/                # Migrated inference rules, tones, objections, solutions, seed leads
  types/               # TypeScript types
  utils/               # cn, escape, lead helpers, script helpers
  test/                # Test setup and utilities
supabase/
  functions/           # Edge Functions: ai-proxy, zoominfo-proxy
  config.toml          # Supabase CLI config
.github/workflows/     # CI, E2E, deploy
```

## Key Environment Variables
Copy `.env.example` to `.env` for local development:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Production values fall back to the existing Supabase project URL/key.

## Edge Functions
### `ai-proxy`
- Routes AI requests to OpenRouter, OpenAI, or Anthropic.
- Stores API keys in Supabase Edge Function secrets.
- Mock mode via `AI_MOCK_MODE=true` secret.

### `zoominfo-proxy`
- Manages ZoomInfo JWT authentication and refresh.
- Supports `search/company`, `enrich/company`, `enrich/contact`.
- Mock mode via `ZOOMINFO_MOCK_MODE=true` secret.

## Commands
```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run test          # Unit + component tests
npm run test:e2e      # Playwright E2E tests
npm run lint          # ESLint
npm run typecheck     # TypeScript
```

## Testing
- 133 unit/component tests pass.
- 17 Playwright E2E tests pass.
- CI runs lint, typecheck, unit tests, build on every push/PR.
- Deploy runs E2E first, then builds and deploys to GitHub Pages.

## Database
- Same Supabase project as v1.
- Tables: `leads`, `call_logs`, `solutions`, `profiles`, `audit_log`.
- RLS policies from v1 still apply.
- New code explicitly sets `user_id` on inserts/updates.

## Migration Status
All v1 features ported:
- Auth (sign in/up/reset, pending approval, roles)
- Lead Discovery (filters, search, actions)
- Lead Intelligence (4 AI providers + local rules)
- Pain Point management / ICP / Tier editor
- Script Generator (5 tones, solution mapping, objections)
- Call Tracker (pipeline, log form, history)
- Solutions Catalog (admin CRUD)
- CSV Import wizard
- API Sources (ZoomInfo + Clearbit)
- Admin page (approve/reject users, roles, delete)

## Known Limitations
- No ZoomInfo API credentials yet → using mock mode.
- No OpenAI/Claude API keys yet → using mock mode via Edge Function.
- Chunk size warning on build (~650KB); acceptable for an internal tool.
