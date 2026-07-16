# Session Summary

## Goal
Transform the legacy CES Lead Generator into a production-ready React + TypeScript v2, preserving the Supabase DB and all functionality, with QA tests at every level.

## Completed (This Session)

### v2 Project Structure
- New project created at `/Users/staray/Documents/Projects/CES_Internal_Projects/Infra_Lead_Generator_v2/`
- Stack: Vite + React 19 + TypeScript + Tailwind CSS + React Query + Zustand
- Deployed to GitHub Pages from `v2` branch at `https://sivac-xinu.github.io/ces-lead-generator/`
- Original project in `/Users/staray/Documents/Projects/CES_Internal_Projects/Infra_Lead_Geenerator/` remains untouched
- Removed conflicting deploy workflow from `main` so only `v2` controls the GitHub Pages site

### Bug Fixes
- **PP_THEMES undefined** in `src/main.js` — was `PP_THEMES` instead of `INFER_RULES.PP_THEMES`
- **Missing window.* assignments** for `PP_THEMES`, `TONES`, `OBJECTIONS`
- **`dispatchAction` is not defined** — added `window.dispatchAction` shim in `src/main.js`
- **Industry filter broke** — `loadLeads()` was calling `window.dispatchAction` inside `renderFilter` before it was assigned
- **Deep mode company uniqueness** — all companies were being skipped due to empty-industry guard that excluded all candidates
- **Intel modal backdrop close** in v2 — fixed `dispatchAction` to use `event.target` instead of `e.target`
- **ai-proxy 502 errors** — Edge Function now returns real provider status codes and messages (429 rate limit, 401 invalid key, etc.)
- **Leads table schema mismatch** — documented and typed missing columns (`employees`, `sales_rep`, `imported_by`, `company_source`, `icp`, `tier`, `notes`)
- **Import source label bug** — LeadCard was hardcoded to "LinkedIn Import"; now derives the correct label (Clearbit, ZoomInfo, CSV, Manual) from `company_source` / `imported_by`
- **Lead Discovery filters** — Sales Rep filter now matches display names and emails, includes every rep value found in leads, and falls back to computed size bucket; "All Industrys" spelling corrected to "All Industries"
- **Contact creation errors blocking lead save** — removed `if (contactError) throw` in `useCreateLead` so lead is saved even if contacts insert fails
- **E2E tests failing due to missing VITE_BASE_PATH** — React Router basename defaulted to `/` while Vite served at `/ces-lead-generator/`, causing all non-lead routes to redirect to `/leads`

### Auth & Admin
- Branded auth page with CES logo
- Signup confirmation callback handling + success message
- Admin-only shared AI keys via `ces_settings` table
- `admin-delete-user` Edge Function purges Supabase Auth user when admin deletes a user
- Added `first_name` and `last_name` to `profiles`; sign-up form collects names and stores them in auth metadata
- `sales_rep` now defaults to the user's display name instead of raw email
- Admin page shows display names and allows inline editing of first/last names

### AI Intelligence
- Unified `ai-proxy` Edge Function for OpenRouter, OpenAI, Claude, and Google Gemini
- Reads shared admin keys from `ces_settings`, falls back to Supabase secrets
- Local rule fallback via `deepInferAll` when cloud AI fails
- Free-model rate-limit warning in Intelligence modal
- **Expanded sales research snippet** with summary, recent activities, upcoming activities/events, key drivers, industry trends, likely next portfolio, competitors, tech stack, decision makers, buying triggers, talking points, CES entry angle, and CES support
- **Intelligence-driven ICP suggestions** — AI prompt now asks for company-specific ideal-customer-profile labels instead of generic size+industry placeholders; local fallback also uses contact-title and industry signals
- **Apply All from Intelligence** now persists the full research/enrichment summary into the lead `notes` field, and `notes` is surfaced on the lead card
- **Intelligence now infers industry and employee count** so imported leads get proper classification for Lead Discovery filters

### Data Import & Attribution
- **Manual lead add** — records `imported_by` as `'Manual'`
- **CSV import** — records `imported_by` as importer email, `company_source` as filename, groups rows by company
- **ZoomInfo import** — creates lead + primary contact, tags `imported_by` as `'ZoomInfo'`
- **Clearbit import** — creates company-only lead, contacts added later via UI
- Sales rep assignment on all import paths uses the user's display name

### Security Hardening
- Added Row Level Security (RLS) migration for all public tables (`leads`, `contacts`, `call_logs`, `solutions`, `profiles`, `audit_log`, `pain_point_catalog`, `ces_settings`)
- Replaced overly permissive `Allow all` policies with authenticated-only / admin-only policies
- Added `public.is_admin()` helper and signup trigger to create `profiles` rows securely
- Edge Functions continue to use service role key for admin operations

### Multi-Contact Support (New)
- New `contacts` table with `lead_id`, `name`, `title`, `email`, `phone`, `is_primary`, `source`
- `useCreateLead` automatically creates primary contact record from lead contact fields
- `AddLeadModal` supports adding multiple contacts with primary selection
- CSV import groups rows by company → one lead with multiple contacts
- `ContactsModal` on Lead Discovery page for viewing/adding/deleting contacts per lead
- Contacts modal supports manual multi-entry and CSV import
- `LeadCard` shows "No contacts" prompt for company-only leads

### DB-Agnostic Adapter Layer (New)
- Created adapter interfaces: `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/api.ts`
- Supabase implementations: `src/lib/db-supabase.ts`, `src/lib/auth-supabase.ts`, `src/lib/api-supabase.ts`
- Generic REST implementations: `src/lib/db-rest.ts`, `src/lib/auth-rest.ts`, `src/lib/api-rest.ts`
- `src/lib/bootstrap.ts` — reads `VITE_DB_BACKEND` env var (`"supabase"` default or `"rest"`) to select adapters
- `src/main.tsx` — calls `await bootstrap()` before React render; uses `VITE_BASE_PATH` for `BrowserRouter basename`
- All 7 hooks updated to use `getDB()` singleton instead of direct `supabase.from()`
- `AuthProvider.tsx`, `AdminPage.tsx`, `ai.ts`, `zoominfo.ts` all migrated to adapters

### Local Backend (Node.js + SQLite)
- `server/server.js` — Express REST API implementing the full REST contract from DEPLOY.md
- JWT auth with bcrypt password hashing, UUID IDs
- SQLite via `better-sqlite3` — zero config, auto-creates DB file
- Single-port server serves both API and static frontend
- `server/make-admin.js` — CLI script to promote users to admin
- `server/package.json` + `server/package-lock.json`

### Deployment
- `DEPLOY.md` — DB-agnostic deployment doc with full REST API contract (Section 5a)
- `DEPLOYMENT_GUIDE.md` — comprehensive guide for both Supabase and local deployment
- `scripts/create-package.sh` — builds deployable tar.gz packages
- `scripts/build-local.sh` — builds local deployment package
- `scripts/serve-local.sh` — quick start script for local deployment
- Pre-built packages in `deploy-packages/` (gitignored)

### UI/UX
- Exact CES logo PNG on auth page and as browser favicon
- Pain Points Glance page with manual CRUD + inline edit
- Solutions Catalog preserved
- Call Tracker with pipeline
- Script Generator with tone selection
- CSV import column guide + sample CSV download
- 404.html for SPA routing on GitHub Pages
- Renamed "API Sources" navigation/page to **Lead External Sources**

### Tests & Build
- 151 unit/component tests passing
- 17 E2E tests passing (all 17 green)
- `lint`, `typecheck`, `build` all green
- CI/CD via GitHub Actions on `v2` branch

## Decisions
- v2 uses `sales_rep` column; existing `assigned_rep` data is mapped as fallback in `dbRowToLead`
- `contacts` table is the source of truth for multiple contacts; `leads.contact_*` remains the primary contact mirror
- Cloud AI errors return real provider messages instead of generic 502
- Free OpenRouter models are rate-limited; paid key/credits recommended for reliable AI
- GitHub Pages deploys only from the `v2` branch; `main` branch no longer has a Pages deploy workflow
- Intelligence results now include richer sales research fields to support outreach prep
- Adapter pattern (thin wrappers over Supabase/REST) chosen over full data-layer rewrite
- Dynamic `import()` in `bootstrap.ts` so Supabase JS bundle only loads when `VITE_DB_BACKEND=supabase`
- SQLite for local package — zero-config, auto-creates on first run, no PostgreSQL dependency
- Single-port Express server serves both API and static frontend (no CORS issues)
- `VITE_BASE_PATH` env var for router basename — supports both GitHub Pages (`/ces-lead-generator/`) and local (`/`)
- Contact creation errors are silently logged, not thrown — lead is already committed to DB

## Next Steps
1. Verify the deploy pipeline passes on GitHub Actions (pushed commit `8c5e99b`)
2. Smoke test the live GitHub Pages site after deploy
3. Test local deployment: `cd server && npm install && npm start`
4. Test DB-agnostic switching: set `VITE_DB_BACKEND=rest` + `VITE_API_URL=http://localhost:3001`
5. Backfill primary contacts from existing leads (Supabase migration)

## Key Constraints
- Supabase Auth site URL must be `https://sivac-xinu.github.io/ces-lead-generator/`
- AI keys stored in `public.ces_settings` (admin write / authenticated read)
- `contacts` table required for multi-contact feature
- Missing `leads` columns must be added via migration before v2 imports work
- SSH key auth to GitHub fails — must use HTTPS with PAT for pushes, then restore SSH remote URL
- `deploy-packages/` directory is gitignored (build artifacts)

## Relevant Files
### Adapter Layer
- `src/lib/db.ts` — DB adapter interface + `getDB()` singleton
- `src/lib/auth.ts` — Auth adapter interface + `getAuth()` singleton + `AuthError` class
- `src/lib/api.ts` — API adapter interface + `getAPI()` singleton
- `src/lib/db-supabase.ts` — Supabase DB implementation
- `src/lib/auth-supabase.ts` — Supabase Auth implementation
- `src/lib/api-supabase.ts` — Supabase Edge Functions implementation
- `src/lib/db-rest.ts` — Generic REST DB implementation
- `src/lib/auth-rest.ts` — Generic REST Auth implementation
- `src/lib/api-rest.ts` — Generic REST API implementation
- `src/lib/bootstrap.ts` — Adapter initialization based on `VITE_DB_BACKEND`
- `src/main.tsx` — Calls `bootstrap()`, uses `VITE_BASE_PATH` for router basename

### Server / Local Backend
- `server/server.js` — Express REST backend (all API endpoints, JWT auth, SQLite)
- `server/package.json` — Server dependencies
- `server/make-admin.js` — Admin promotion script

### Key App Files
- `src/hooks/useLeads.ts` — Lead CRUD + contact creation (contact errors now non-fatal)
- `src/hooks/useCallLogs.ts` — Call log CRUD
- `src/hooks/useContacts.ts` — Contact CRUD
- `src/hooks/useSolutions.ts` — Solution CRUD
- `src/hooks/usePainPointCatalog.ts` — Pain point catalog
- `src/hooks/useProfiles.ts` — User profiles
- `src/hooks/useAISettings.ts` — AI settings
- `src/features/auth/AuthProvider.tsx` — Auth state management
- `src/features/admin/AdminPage.tsx` — Admin panel
- `src/lib/ai.ts` — AI integration
- `src/lib/zoominfo.ts` — ZoomInfo API

### Testing
- `playwright.config.ts` — E2E config (passes `VITE_BASE_PATH=/ces-lead-generator/` to dev server)
- `e2e/fixtures.ts` — Playwright test fixtures
- `e2e/mock-api.ts` — Mock Supabase API intercepts
- `e2e/navigation.spec.ts` — 2/2 passing
- `e2e/script.spec.ts` — 3/3 passing
- `e2e/tracker.spec.ts` — 4/4 passing
- `e2e/leads.spec.ts` — 5/5 passing
- `e2e/auth.spec.ts` — 3/3 passing

### Deployment
- `.github/workflows/deploy.yml` — Deploy pipeline (E2E → build → deploy to GitHub Pages)
- `.github/workflows/ci.yml` — CI pipeline (lint, typecheck, tests, build)
- `DEPLOY.md` — DB-agnostic deployment doc with REST API contract
- `DEPLOYMENT_GUIDE.md` — Comprehensive deployment guide
- `scripts/create-package.sh` — Package builder
- `scripts/build-local.sh` — Local package builder
- `scripts/serve-local.sh` — Local quick start

### Other
- `MIGRATIONS.md` — SQL migration scripts for contacts table + leads columns
- `src/types/index.ts` — TypeScript types
