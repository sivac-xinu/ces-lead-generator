# CES Lead Generator v2

A modern React + TypeScript rebuild of the CES Lead Generator. This version lives on the `v2` branch of the existing repository so the original application remains untouched.

## Branch Strategy

- `main` — original vanilla JS application.
- `v2` — this React + TypeScript rebuild.

GitHub Pages is configured to deploy from the `v2` branch using GitHub Actions.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- React Router v7
- TanStack Query
- Zustand
- Tailwind CSS
- Supabase (same project as v1)
- OpenRouter / OpenAI / Claude via Supabase Edge Functions
- ZoomInfo via Supabase Edge Function proxy + Clearbit browser-direct
- Vitest + React Testing Library + Playwright

## Quick Start

```bash
npm install
npm run dev
```

## Available Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run test       # Unit and component tests
npm run test:e2e   # Playwright E2E tests
```

## Deployment

Deployment is handled by `.github/workflows/deploy.yml`:

1. Runs Playwright E2E tests.
2. Builds the application.
3. Deploys the `dist/` folder to GitHub Pages.

To enable Pages, go to **Settings → Pages** in the repository and set the source to **GitHub Actions**.

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required for local development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Production uses the same Supabase project as the original application.

## Edge Functions

Deploy Supabase Edge Functions for live AI and ZoomInfo integrations:

```bash
supabase functions deploy ai-proxy
supabase functions deploy zoominfo-proxy
```

Required secrets for live mode:

- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ZOOMINFO_USERNAME`
- `ZOOMINFO_PASSWORD`

Mock modes work without these secrets.

## Testing

- **133 unit/component tests** in `src/**/*.test.tsx` and `src/**/*.test.ts`.
- **17 Playwright E2E tests** in `e2e/`.

CI runs on every push and pull request to the `v2` branch.
