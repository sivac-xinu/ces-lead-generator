import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'ces-dev-secret-change-in-production'
const FRONTEND_DIR = join(__dirname, '..', 'dist')

// ---------------------------------------------------------------------------
// Database setup (SQLite — zero config)
// ---------------------------------------------------------------------------

const db = new Database(join(__dirname, 'ces-lead-generator.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    contact_name TEXT,
    contact_title TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    industry TEXT,
    employees INTEGER,
    company_size TEXT,
    location TEXT,
    website TEXT,
    linkedin_url TEXT,
    it_type TEXT DEFAULT 'Unknown',
    current_infra TEXT,
    pain_points TEXT DEFAULT '[]',
    annual_it_budget TEXT,
    status TEXT DEFAULT 'New',
    user_id TEXT,
    imported INTEGER DEFAULT 0,
    imported_by TEXT,
    company_source TEXT,
    sales_rep TEXT,
    assigned_rep TEXT,
    icp TEXT,
    tier TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    source TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);

  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    rep TEXT,
    date TEXT,
    outcome TEXT,
    notes TEXT,
    next_action_date TEXT,
    follow_up TEXT,
    company TEXT,
    contact_name TEXT,
    contact_title TEXT,
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS solutions (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    urgency TEXT,
    icon TEXT,
    keywords TEXT DEFAULT '[]',
    trend TEXT,
    buy_signal TEXT,
    pitch TEXT,
    stat TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'user',
    approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pain_point_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'General',
    tags TEXT DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ces_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    ai_keys TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// Seed default settings
db.prepare(`INSERT OR IGNORE INTO ces_settings (id, ai_keys) VALUES ('global', '{}')`).run()

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// Serve static frontend
app.use(express.static(FRONTEND_DIR))

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.sub
    req.userEmail = decoded.email
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ---------------------------------------------------------------------------
// Helper: generate JWT
// ---------------------------------------------------------------------------

function signToken(userId, email) {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: '7d' })
}

// ---------------------------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------------------------

app.post('/api/auth/sign-up', (req, res) => {
  const { email, password, firstName, lastName } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'User already exists' })

  const id = uuid()
  db.prepare(`INSERT INTO profiles (id, email, first_name, last_name, role, approved) VALUES (?, ?, ?, ?, 'user', 0)`).run(id, email, firstName || null, lastName || null)

  const token = signToken(id, email)
  res.json({ token, user: { id, email, firstName, lastName } })
})

app.post('/api/auth/sign-in', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

  const profile = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email)
  if (!profile) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken(profile.id, email)
  res.json({ token, user: { id: profile.id, email, firstName: profile.first_name, lastName: profile.last_name } })
})

app.post('/api/auth/sign-out', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/reset', (req, res) => {
  // Password reset — stub for local dev
  res.json({ ok: true })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.userId)
  if (!profile) return res.status(404).json({ error: 'Profile not found' })
  res.json({
    user: { id: profile.id, email: profile.email, firstName: profile.first_name, lastName: profile.last_name },
    profile,
  })
})

app.get('/api/auth/users', authMiddleware, (req, res) => {
  const profiles = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all()
  res.json(profiles)
})

app.get('/api/auth/users/:id', authMiddleware, (req, res) => {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id)
  if (!profile) return res.status(404).json({ error: 'Not found' })
  res.json(profile)
})

app.patch('/api/auth/users/:id', authMiddleware, (req, res) => {
  const { first_name, last_name, role, approved } = req.body
  const sets = []
  const vals = []
  if (first_name !== undefined) { sets.push('first_name = ?'); vals.push(first_name) }
  if (last_name !== undefined) { sets.push('last_name = ?'); vals.push(last_name) }
  if (role !== undefined) { sets.push('role = ?'); vals.push(role) }
  if (approved !== undefined) { sets.push('approved = ?'); vals.push(approved ? 1 : 0) }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' })
  vals.push(req.params.id)
  db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  res.json(db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id))
})

app.delete('/api/auth/users/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// LEADS ROUTES
// ---------------------------------------------------------------------------

app.get('/api/leads', authMiddleware, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all()
  res.json(leads.map(parseLead))
})

app.get('/api/leads/:id', authMiddleware, (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)
  if (!lead) return res.status(404).json({ error: 'Not found' })
  res.json(parseLead(lead))
})

app.post('/api/leads', authMiddleware, (req, res) => {
  const body = req.body
  const stmt = db.prepare(`
    INSERT INTO leads (company, contact_name, contact_title, contact_email, contact_phone,
      industry, employees, company_size, location, website, linkedin_url,
      it_type, current_infra, pain_points, annual_it_budget, status, user_id,
      imported, imported_by, company_source, sales_rep, assigned_rep, icp, tier, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    body.company, body.contact_name, body.contact_title, body.contact_email, body.contact_phone,
    body.industry, body.employees, body.company_size, body.location, body.website, body.linkedin_url,
    body.it_type || 'Unknown', body.current_infra, JSON.stringify(body.pain_points || []),
    body.annual_it_budget, body.status || 'New', body.user_id,
    body.imported ? 1 : 0, body.imported_by, body.company_source, body.sales_rep, body.assigned_rep,
    body.icp, body.tier, body.notes
  )
  res.json(parseLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid)))
})

app.patch('/api/leads/:id', authMiddleware, (req, res) => {
  const body = req.body
  const fields = []
  const vals = []
  const allowed = ['company', 'contact_name', 'contact_title', 'contact_email', 'contact_phone',
    'industry', 'employees', 'company_size', 'location', 'website', 'linkedin_url',
    'it_type', 'current_infra', 'pain_points', 'annual_it_budget', 'status',
    'imported', 'imported_by', 'company_source', 'sales_rep', 'assigned_rep', 'icp', 'tier', 'notes']

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`)
      vals.push(key === 'pain_points' ? JSON.stringify(body[key]) : body[key])
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' })
  fields.push("updated_at = datetime('now')")
  vals.push(req.params.id)
  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  res.json(parseLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id)))
})

app.delete('/api/leads/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

function parseLead(row) {
  if (!row) return row
  return { ...row, pain_points: typeof row.pain_points === 'string' ? JSON.parse(row.pain_points || '[]') : row.pain_points }
}

// ---------------------------------------------------------------------------
// CONTACTS ROUTES
// ---------------------------------------------------------------------------

app.get('/api/contacts', authMiddleware, (req, res) => {
  const leadId = req.query.leadId
  if (!leadId) return res.json(db.prepare('SELECT * FROM contacts ORDER BY is_primary DESC, created_at ASC').all())
  res.json(db.prepare('SELECT * FROM contacts WHERE lead_id = ? ORDER BY is_primary DESC, created_at ASC').all(leadId))
})

app.post('/api/contacts', authMiddleware, (req, res) => {
  const b = req.body
  const r = db.prepare(`INSERT INTO contacts (lead_id, name, title, email, phone, is_primary, source) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    b.lead_id, b.name, b.title, b.email, b.phone, b.is_primary ? 1 : 0, b.source
  )
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(r.lastInsertRowid))
})

app.patch('/api/contacts/:id', authMiddleware, (req, res) => {
  const b = req.body
  const sets = [], vals = []
  for (const k of ['name', 'title', 'email', 'phone', 'is_primary', 'source']) {
    if (b[k] !== undefined) { sets.push(`${k} = ?`); vals.push(k === 'is_primary' ? (b[k] ? 1 : 0) : b[k]) }
  }
  if (sets.length) { sets.push("updated_at = datetime('now')"); vals.push(req.params.id); db.prepare(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?`).run(...vals) }
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id))
})

app.delete('/api/contacts/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.patch('/api/contacts/primary', authMiddleware, (req, res) => {
  const { leadId, contactId } = req.body
  db.prepare('UPDATE contacts SET is_primary = 0 WHERE lead_id = ?').run(leadId)
  db.prepare('UPDATE contacts SET is_primary = 1 WHERE id = ?').run(contactId)
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// CALL LOGS ROUTES
// ---------------------------------------------------------------------------

app.get('/api/call-logs', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM call_logs ORDER BY created_at DESC').all())
})

app.post('/api/call-logs', authMiddleware, (req, res) => {
  const b = req.body
  const r = db.prepare(`INSERT INTO call_logs (lead_id, rep, date, outcome, notes, next_action_date, follow_up, company, contact_name, contact_title, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    b.lead_id, b.rep, b.date, b.outcome, b.notes, b.next_action_date, b.follow_up, b.company, b.contact_name, b.contact_title, b.user_id
  )
  res.json(db.prepare('SELECT * FROM call_logs WHERE id = ?').get(r.lastInsertRowid))
})

app.delete('/api/call-logs/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM call_logs WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// SOLUTIONS ROUTES
// ---------------------------------------------------------------------------

app.get('/api/solutions', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM solutions ORDER BY created_at DESC').all()
  res.json(rows.map(r => ({ ...r, keywords: JSON.parse(r.keywords || '[]') })))
})

app.post('/api/solutions', authMiddleware, (req, res) => {
  const b = req.body
  const id = b.id || `sol-${uuid().slice(0, 8)}`
  db.prepare(`INSERT OR REPLACE INTO solutions (id, service, urgency, icon, keywords, trend, buy_signal, pitch, stat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, b.service, b.urgency, b.icon, JSON.stringify(b.keywords || []), b.trend, b.buy_signal, b.pitch, b.stat
  )
  res.json(db.prepare('SELECT * FROM solutions WHERE id = ?').get(id))
})

app.patch('/api/solutions/:id', authMiddleware, (req, res) => {
  const b = req.body; const sets = [], vals = []
  for (const k of ['service', 'urgency', 'icon', 'trend', 'buy_signal', 'pitch', 'stat']) {
    if (b[k] !== undefined) { sets.push(`${k} = ?`); vals.push(b[k]) }
  }
  if (b.keywords) { sets.push('keywords = ?'); vals.push(JSON.stringify(b.keywords)) }
  if (sets.length) { vals.push(req.params.id); db.prepare(`UPDATE solutions SET ${sets.join(', ')} WHERE id = ?`).run(...vals) }
  res.json(db.prepare('SELECT * FROM solutions WHERE id = ?').get(req.params.id))
})

app.delete('/api/solutions/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM solutions WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// PROFILES ROUTES
// ---------------------------------------------------------------------------

app.get('/api/profiles', authMiddleware, (req, res) => {
  const profiles = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all()
  res.json(profiles)
})

app.get('/api/profiles/:id', authMiddleware, (req, res) => {
  const p = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

app.patch('/api/profiles/:id', authMiddleware, (req, res) => {
  const b = req.body; const sets = [], vals = []
  for (const k of ['first_name', 'last_name', 'role', 'approved']) {
    if (b[k] !== undefined) { sets.push(`${k} = ?`); vals.push(b[k]) }
  }
  if (sets.length) { vals.push(req.params.id); db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...vals) }
  res.json(db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id))
})

// ---------------------------------------------------------------------------
// PAIN POINT CATALOG ROUTES
// ---------------------------------------------------------------------------

app.get('/api/pain-points', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM pain_point_catalog ORDER BY created_at DESC').all()
  res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })))
})

app.post('/api/pain-points', authMiddleware, (req, res) => {
  const b = req.body
  const r = db.prepare(`INSERT INTO pain_point_catalog (text, theme, tags) VALUES (?, ?, ?)`).run(
    b.text, b.theme || 'General', JSON.stringify(b.tags || [])
  )
  res.json(db.prepare('SELECT * FROM pain_point_catalog WHERE id = ?').get(r.lastInsertRowid))
})

app.patch('/api/pain-points/:id', authMiddleware, (req, res) => {
  const b = req.body; const sets = [], vals = []
  if (b.text !== undefined) { sets.push('text = ?'); vals.push(b.text) }
  if (b.theme !== undefined) { sets.push('theme = ?'); vals.push(b.theme) }
  if (b.tags !== undefined) { sets.push('tags = ?'); vals.push(JSON.stringify(b.tags)) }
  if (b.active !== undefined) { sets.push('active = ?'); vals.push(b.active ? 1 : 0) }
  if (sets.length) { vals.push(req.params.id); db.prepare(`UPDATE pain_point_catalog SET ${sets.join(', ')} WHERE id = ?`).run(...vals) }
  res.json(db.prepare('SELECT * FROM pain_point_catalog WHERE id = ?').get(req.params.id))
})

// ---------------------------------------------------------------------------
// AI SETTINGS ROUTES
// ---------------------------------------------------------------------------

app.get('/api/ai-settings', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT ai_keys FROM ces_settings WHERE id = ?').get('global')
  res.json({ ai_keys: row ? JSON.parse(row.ai_keys || '{}') : {} })
})

app.put('/api/ai-settings', authMiddleware, (req, res) => {
  db.prepare(`UPDATE ces_settings SET ai_keys = ?, updated_at = datetime('now') WHERE id = ?`).run(
    JSON.stringify(req.body.ai_keys || {}), 'global'
  )
  res.json({ ok: true })
})

// ---------------------------------------------------------------------------
// AI PROXY (stub — can be extended with real provider calls)
// ---------------------------------------------------------------------------

app.post('/api/ai/proxy', authMiddleware, (req, res) => {
  res.status(501).json({ error: 'AI proxy not configured. Set up a real AI provider or use the frontend local rules.' })
})

// ---------------------------------------------------------------------------
// ZOOMINFO PROXY (stub)
// ---------------------------------------------------------------------------

app.post('/api/zoominfo/search', authMiddleware, (req, res) => {
  res.status(501).json({ error: 'ZoomInfo not configured for REST backend.' })
})

app.post('/api/zoominfo/enrich', authMiddleware, (req, res) => {
  res.status(501).json({ error: 'ZoomInfo not configured for REST backend.' })
})

app.post('/api/zoominfo/contact', authMiddleware, (req, res) => {
  res.status(501).json({ error: 'ZoomInfo not configured for REST backend.' })
})

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for all non-API routes
// ---------------------------------------------------------------------------

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(join(FRONTEND_DIR, 'index.html'))
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`\n  CES Lead Generator API running on http://localhost:${PORT}\n`)
  console.log(`  Database: SQLite (${join(__dirname, 'ces-lead-generator.db')})`)
  console.log(`  Frontend: ${FRONTEND_DIR}\n`)
  console.log(`  Open in browser: http://localhost:${PORT}\n`)
})
