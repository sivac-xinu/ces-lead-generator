# CES Lead Generator v2 — Complete Deployment Guide

---

## Table of Contents

1. [Overview](#1-overview)
2. [Package Options](#2-package-options)
3. [Option A: Supabase Deployment](#3-option-a-supabase-deployment)
4. [Option B: Local / Self-Hosted Deployment](#4-option-b-local--self-hosted-deployment)
5. [Architecture](#5-architecture)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Environment Variables](#8-environment-variables)
9. [Admin Setup](#9-admin-setup)
10. [AI Intelligence Configuration](#10-ai-intelligence-configuration)
11. [Customization](#11-customization)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

CES Lead Generator v2 is a React-based sales lead management tool for CES Limited's infrastructure sales team. It provides:

- **Lead Discovery** — filterable lead database with search, industry/ICP/tier/size filters
- **Multi-Contact** — multiple contacts per lead with primary selection
- **AI Intelligence** — AI-powered company research, ICP suggestions, pain point analysis
- **Script Generator** — tailored cold call scripts in 5 tones
- **Call Tracker** — call log pipeline with outcomes and follow-ups
- **Solutions Catalog** — CES service solutions matched to pain points
- **CSV Import** — bulk import leads from LinkedIn/CSV exports
- **Lead External Sources** — ZoomInfo, Clearbit, Apollo.io, Hunter.io, Snov.io integration
- **Admin Panel** — user management, approval, role assignment

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| State | React Query (server), Zustand (UI) |
| Routing | React Router v7 |
| Backend (local) | Node.js, Express, SQLite |
| Backend (cloud) | Supabase (PostgreSQL + Auth + Edge Functions) |

---

## 2. Package Options

Two deployable packages are provided:

| | Supabase Package | Local Package |
|---|---|---|
| **File** | `ces-lead-generator-supabase.tar.gz` | `ces-lead-generator-local.tar.gz` |
| **Size** | 225 KB | 179 KB |
| **Backend** | Supabase cloud (PostgreSQL + Auth) | Node.js + SQLite |
| **Database** | Supabase-hosted PostgreSQL | Local SQLite file |
| **Auth** | Supabase Auth (email/password) | JWT-based (built-in) |
| **Internet** | Required | Not required |
| **Best for** | Teams with Supabase account | Offline / air-gapped / quick setup |

---

## 3. Option A: Supabase Deployment

### 3.1 Prerequisites

- Node.js 18+ (for `npx serve`)
- Supabase account (free tier works)

### 3.2 Setup

```bash
# Extract
tar -xzf ces-lead-generator-supabase.tar.gz
cd ces-supabase

# Configure
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EOF

# Serve
./start.sh
# → http://localhost:3000
```

### 3.3 Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **Anon Key** (Settings → API)
3. Open **SQL Editor** and run the schema from [Section 6](#6-database-schema)
4. In **Authentication → Settings**:
   - Set **Site URL** to your deployed frontend URL
   - Enable **Email Sign-up**
5. Deploy Edge Functions (for AI Intelligence):
   ```bash
   npm install -g supabase
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy ai-proxy
   supabase functions deploy zoominfo-proxy
   supabase functions deploy admin-delete-user
   ```

### 3.4 Edge Function Secrets

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-...
# Optional
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GEMINI_API_KEY=AI...
```

### 3.5 Static Hosting

The `dist/` folder is a standard static SPA. Deploy to:
- **Netlify**: Drag-and-drop or connect git
- **Vercel**: `vercel --prod`
- **Nginx/Apache**: Copy contents to web root
- **AWS S3 + CloudFront**: Upload to S3 bucket

> Update Supabase Auth **Site URL** to match your deployed URL.

---

## 4. Option B: Local / Self-Hosted Deployment

### 4.1 Prerequisites

- Node.js 18+
- npm

No PostgreSQL, no cloud services, no API keys required for basic usage.

### 4.2 Quick Start

```bash
# Extract
tar -xzf ces-lead-generator-local.tar.gz
cd ces-local

# Install & run
npm install
npm start
```

Opens at **http://localhost:3001**

### 4.3 What Happens on First Run

1. Server creates `server/ces-lead-generator.db` (SQLite)
2. All tables are auto-created
3. Frontend is served from the same port
4. Sign up with any email/password
5. Make yourself admin (see below)

### 4.4 Make Yourself Admin

```bash
node server/make-admin.js your@email.com
```

Or manually edit the SQLite database:
```sql
-- Using any SQLite browser or CLI
sqlite3 server/ces-lead-generator.db
UPDATE profiles SET role = 'admin', approved = 1 WHERE email = 'your@email.com';
```

### 4.5 Production Deployment

```bash
# On the server
cp ces-local.tar.gz /opt/ces/
cd /opt/ces
tar -xzf ces-local.tar.gz
cd ces-local
npm install --production
PORT=8080 npm start
```

Use nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name leads.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4.6 Data Backup

```bash
# Backup
cp server/ces-lead-generator.db backup/ces-lead-generator-$(date +%Y%m%d).db

# Restore
cp backup/ces-lead-generator-20260716.db server/ces-lead-generator.db
```

---

## 5. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Frontend (React SPA)                        │
│   Vite + React 19 + TypeScript + Tailwind CSS                   │
│   React Query (server state) + Zustand (UI state)               │
└──────────────────────────┬───────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Adapter Layer          │
              │   (DB + Auth + API)      │
              └──┬──────────────────┬───┘
                 │                  │
    ┌────────────▼────┐   ┌───────▼────────────┐
    │  Supabase       │   │  Express Server     │
    │  (cloud)        │   │  (local/any DB)     │
    │                 │   │                     │
    │  PostgreSQL     │   │  SQLite / PostgreSQL │
    │  + RLS          │   │  + JWT Auth          │
    │  + Edge Fns     │   │  + REST API          │
    └─────────────────┘   └─────────────────────┘
```

### Adapter Pattern

The frontend uses a pluggable adapter pattern. Three interfaces define the contract:

| Interface | Purpose | Supabase Impl | REST Impl |
|-----------|---------|---------------|-----------|
| `DBAdapter` | CRUD for all tables | `db-supabase.ts` | `db-rest.ts` |
| `AuthAdapter` | Authentication | `auth-supabase.ts` | `auth-rest.ts` |
| `APIAdapter` | AI/External APIs | `api-supabase.ts` | `api-rest.ts` |

The active adapter is selected at build time via `VITE_DB_BACKEND`:

- `supabase` → uses Supabase JS client
- `rest` → uses fetch() against your REST API

---

## 6. Database Schema

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `leads` | Lead records | company, contact_*, industry, employees, it_type, icp, tier, notes |
| `contacts` | Multiple contacts per lead | lead_id, name, title, email, phone, is_primary |
| `call_logs` | Call tracking | lead_id, rep, date, outcome, notes, follow_up |
| `solutions` | CES service catalog | id, service, urgency, keywords, pitch, stat |
| `profiles` | User accounts | id, email, first_name, last_name, role, approved |
| `pain_point_catalog` | Curated pain points | text, theme, tags, active |
| `ces_settings` | Global settings (AI keys) | id, ai_keys |
| `audit_log` | Audit trail | user_id, action, detail |

### Full Schema SQL

```sql
-- Leads
CREATE TABLE leads (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  company           TEXT NOT NULL,
  contact_name      TEXT,
  contact_title     TEXT,
  contact_email     TEXT,
  contact_phone     TEXT,
  industry          TEXT,
  employees         INTEGER,
  company_size      TEXT,
  location          TEXT,
  website           TEXT,
  linkedin_url      TEXT,
  it_type           TEXT DEFAULT 'Unknown',
  current_infra     TEXT,
  pain_points       TEXT DEFAULT '[]',
  annual_it_budget  TEXT,
  status            TEXT DEFAULT 'New',
  user_id           TEXT,
  imported          INTEGER DEFAULT 0,
  imported_by       TEXT,
  company_source    TEXT,
  sales_rep         TEXT,
  assigned_rep      TEXT,
  icp               TEXT,
  tier              TEXT,
  notes             TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- Contacts
CREATE TABLE contacts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  title      TEXT,
  email      TEXT,
  phone      TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  source     TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_contacts_lead_id ON contacts(lead_id);

-- Call Logs
CREATE TABLE call_logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id          INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  rep              TEXT,
  date             TEXT,
  outcome          TEXT,
  notes            TEXT,
  next_action_date TEXT,
  follow_up        TEXT,
  company          TEXT,
  contact_name     TEXT,
  contact_title    TEXT,
  user_id          TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

-- Solutions
CREATE TABLE solutions (
  id         TEXT PRIMARY KEY,
  service    TEXT NOT NULL,
  urgency    TEXT,
  icon       TEXT,
  keywords   TEXT DEFAULT '[]',
  trend      TEXT,
  buy_signal TEXT,
  pitch      TEXT,
  stat       TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Profiles
CREATE TABLE profiles (
  id         TEXT PRIMARY KEY,
  email      TEXT,
  first_name TEXT,
  last_name  TEXT,
  role       TEXT DEFAULT 'user',
  approved   INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Pain Point Catalog
CREATE TABLE pain_point_catalog (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  theme      TEXT NOT NULL DEFAULT 'General',
  tags       TEXT DEFAULT '[]',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- CES Settings
CREATE TABLE ces_settings (
  id         TEXT PRIMARY KEY DEFAULT 'global',
  ai_keys    TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  action     TEXT,
  detail     TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed default settings
INSERT OR IGNORE INTO ces_settings (id, ai_keys) VALUES ('global', '{}');
```

---

## 7. API Reference

All endpoints accept/return JSON. Authenticated endpoints require `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/sign-up` | `{email, password, firstName?, lastName?}` | `{token, user}` |
| POST | `/api/auth/sign-in` | `{email, password}` | `{token, user}` |
| POST | `/api/auth/sign-out` | — | `{ok: true}` |
| GET | `/api/auth/me` | — | `{user, profile}` |
| GET | `/api/auth/users` | — | `AuthProfile[]` |
| GET | `/api/auth/users/:id` | — | `AuthProfile` |
| PATCH | `/api/auth/users/:id` | `{first_name?, last_name?, role?, approved?}` | `AuthProfile` |
| DELETE | `/api/auth/users/:id` | — | `{ok: true}` |

### Leads

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/leads` | — | `Lead[]` |
| GET | `/api/leads/:id` | — | `Lead` |
| POST | `/api/leads` | `Lead fields` | `Lead` |
| PATCH | `/api/leads/:id` | `Partial<Lead>` | `Lead` |
| DELETE | `/api/leads/:id` | — | `{ok: true}` |

### Contacts

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/contacts?leadId=N` | — | `Contact[]` |
| POST | `/api/contacts` | `{lead_id, name, title?, email?, phone?, is_primary?, source?}` | `Contact` |
| PATCH | `/api/contacts/:id` | `Partial<Contact>` | `Contact` |
| DELETE | `/api/contacts/:id` | — | `{ok: true}` |
| PATCH | `/api/contacts/primary` | `{leadId, contactId}` | `{ok: true}` |

### Call Logs

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/call-logs` | — | `CallLog[]` |
| POST | `/api/call-logs` | `CallLog fields` | `CallLog` |
| DELETE | `/api/call-logs/:id` | — | `{ok: true}` |

### Solutions

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/solutions` | — | `Solution[]` |
| POST | `/api/solutions` | `Solution fields` | `Solution` |
| PATCH | `/api/solutions/:id` | `Partial<Solution>` | `Solution` |
| DELETE | `/api/solutions/:id` | — | `{ok: true}` |

### Profiles

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/profiles` | — | `UserProfile[]` |
| GET | `/api/profiles/:id` | — | `UserProfile` |
| PATCH | `/api/profiles/:id` | `Partial<UserProfile>` | `UserProfile` |

### Pain Points

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/pain-points` | — | `PainPoint[]` |
| POST | `/api/pain-points` | `{text, theme?, tags?}` | `PainPoint` |
| PATCH | `/api/pain-points/:id` | `{text?, theme?, tags?, active?}` | `PainPoint` |

### AI Settings

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/ai-settings` | — | `{ai_keys: {...}}` |
| PUT | `/api/ai-settings` | `{ai_keys: {...}}` | `{ok: true}` |

### Error Response

All endpoints return errors as:
```json
{"error": "Description of the error"}
```

---

## 8. Environment Variables

### Frontend (Vite — set at build time)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DB_BACKEND` | `supabase` | `supabase` or `rest` |
| `VITE_API_URL` | `http://localhost:3001` | REST API base URL |
| `VITE_SUPABASE_URL` | hardcoded fallback | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | hardcoded fallback | Supabase anon key |
| `VITE_BASE_PATH` | `/ces-lead-generator/` | React Router base path |
| `VITE_E2E_AUTH_BYPASS` | — | Set `true` for E2E testing |

### Server (Local package — set at runtime)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `ces-dev-secret...` | JWT signing secret (change in production!) |

### Supabase Edge Functions (set via `supabase secrets set`)

| Secret | Required | Description |
|--------|----------|-------------|
| `OPENROUTER_API_KEY` | Recommended | OpenRouter API key |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key |
| `GEMINI_API_KEY` | Optional | Google Gemini API key |
| `ZOOMINFO_USERNAME` | Optional | ZoomInfo username |
| `ZOOMINFO_PASSWORD` | Optional | ZoomInfo password |
| `AI_MOCK_MODE` | Optional | Set `true` for testing |

---

## 9. Admin Setup

### First Admin User

**Local package:**
```bash
node server/make-admin.js your@email.com
```

**Supabase:**
```sql
UPDATE profiles SET role = 'admin', approved = true WHERE email = 'your@email.com';
```

### Admin Features

- User management (approve, promote, delete)
- Shared AI API keys (Settings → AI Engine)
- Solutions catalog management
- Pain point catalog management

---

## 10. AI Intelligence Configuration

AI Intelligence powers the Lead Intelligence modal (ICP suggestions, pain point analysis, company research).

### Option A: Via App UI (Recommended)

1. Log in as admin
2. Go to **Settings → AI Engine** (sidebar)
3. Select provider and enter API key
4. Save

### Option B: Via Server Secrets (Supabase only)

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-...
```

### Option C: Local Rules (No API Key)

The app includes built-in local inference rules. Works without any API key but produces less detailed results.

### Recommended Provider

**OpenRouter** — supports multiple models, free tier available:
1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Get API key at [openrouter.ai/keys](https://openrouter.ai/keys)
3. Free models: `google/gemma-2-9b-it:free`, `meta-llama/llama-3.2-3b-instruct:free`
4. Paid models recommended for production (better quality, no rate limits)

---

## 11. Customization

### Changing the Database

The REST adapter (`src/lib/db-rest.ts`) defines the API contract. To use a different database:

1. Implement a backend server (Express, Fastify, Hono, etc.) that matches the API endpoints in [Section 7](#7-api-reference)
2. Build the frontend with `VITE_DB_BACKEND=rest VITE_API_URL=http://your-server:port`
3. Deploy both frontend and backend

### Adding New Fields

1. Add column to the database table
2. Update the TypeScript type in `src/types/index.ts`
3. Update the REST adapter in `src/lib/db-rest.ts`
4. Update the backend server route
5. Rebuild frontend

### Branding

- Logo: Replace `public/ces-logo.png` and `public/favicon.svg`
- Colors: Edit `tailwind.config.js` theme colors
- Title: Edit `index.html` and `src/features/auth/AuthPage.tsx`

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page on load | Check browser console for JS errors. Ensure `VITE_BASE_PATH` matches your hosting path |
| "Not authenticated" loop | Ensure the server is running and `VITE_API_URL` points to it |
| Sign-up creates no profile | Check server logs for errors. Verify the profiles table exists |
| 404 on page refresh (static hosting) | Ensure `404.html` exists in the served directory |
| AI Intelligence not working | Configure an API key via Settings → AI Engine, or check Edge Function deployment |
| "CORS" errors | The Express server includes CORS middleware. If using a custom proxy, ensure CORS headers are set |
| Port already in use | Change port: `PORT=3002 npm start` |
| SQLite locked error | Only one server process should access the DB file. Kill duplicate processes |
| Empty lead list after import | Check that `pain_points` column stores JSON arrays, not plain text |

---

## File Structure

```
ces-lead-generator-v2/
├── src/
│   ├── main.tsx                    # Entry point (calls bootstrap())
│   ├── App.tsx                     # Router + auth gate
│   ├── lib/
│   │   ├── bootstrap.ts            # Adapter initialization
│   │   ├── db.ts                   # DB adapter interface
│   │   ├── db-supabase.ts          # Supabase implementation
│   │   ├── db-rest.ts              # REST implementation
│   │   ├── auth.ts                 # Auth adapter interface
│   │   ├── auth-supabase.ts        # Supabase implementation
│   │   ├── auth-rest.ts            # REST implementation
│   │   ├── api.ts                  # API adapter interface
│   │   ├── api-supabase.ts         # Supabase implementation
│   │   ├── api-rest.ts             # REST implementation
│   │   ├── supabase.ts             # Supabase client init
│   │   ├── ai.ts                   # AI proxy + local fallback
│   │   ├── classify.ts             # Local rule-based classification
│   │   └── zoominfo.ts             # ZoomInfo wrapper
│   ├── types/index.ts              # TypeScript types
│   ├── hooks/                      # React Query hooks
│   ├── features/                   # Feature modules
│   ├── components/                 # Shared UI components
│   ├── data/                       # Seed data, rules, tones
│   └── utils/                      # Helpers
├── server/
│   ├── server.js                   # Express API server
│   ├── package.json                # Server dependencies
│   └── make-admin.js               # Admin setup script
├── supabase/
│   └── functions/                  # Supabase Edge Functions
├── dist/                           # Built frontend
├── deploy-packages/                # Deployable tarballs
│   ├── ces-lead-generator-supabase.tar.gz
│   └── ces-lead-generator-local.tar.gz
├── DEPLOY.md                       # Technical deployment doc
├── MIGRATIONS.md                   # DB migration history
├── start.sh                        # Quick start script
└── package.json                    # Frontend dependencies
```
