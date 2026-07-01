import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
window.__supabaseCreateClient = createClient;

import { LEADS } from "./data/leads.js";
import { SEED_SOLUTIONS } from "./data/solutions.js";
import { TONES } from "./data/tones.js";
import { OBJECTIONS } from "./data/objections.js";
import { INFER_RULES, INFER_INDUSTRY, FIELD_SYNONYMS, CES_FIELDS } from "./data/inference.js";

// Expose as globals for legacy code (inline onclick, etc.)
window.LEADS = LEADS;
window.SEED_SOLUTIONS = SEED_SOLUTIONS;
window.TONES = TONES;
window.OBJECTIONS = OBJECTIONS;
window.INFER_RULES = INFER_RULES;
window.INFER_INDUSTRY = INFER_INDUSTRY;
window.FIELD_SYNONYMS = FIELD_SYNONYMS;
window.CES_FIELDS = CES_FIELDS;

// Supabase initialization
const SUPABASE_URL = 'https://vdptdfliacwgyidfeqlm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkcHRkZmxpYWN3Z3lpZGZlcWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDQ3MTIsImV4cCI6MjA5Nzk4MDcxMn0.30f9jP83-oMtH9pV68ELVmTNrj_MtuP--evNAhfGKbA';
const APP_URL = 'https://sivac-xinu.github.io/ces-lead-generator/';

// Capture hash before createClient() clears it
const __hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const __recoveryHash = __hashParams.get('type') === 'recovery';
const __resetError = __hashParams.get('error_description') || '';
// ─── Security utilities ──────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeJsStr(str) {
  if (str == null) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
let _authCooldown = 0;
function checkAuthCooldown() {
  const now = Date.now();
  if (now < _authCooldown) { showAuthError('Too many attempts. Please wait ' + Math.ceil((_authCooldown - now) / 1000) + 's.'); return false; }
  return true;
}
function setAuthCooldown(ms) { _authCooldown = Date.now() + ms; }
// ─── Auth ────────────────────────────────────────────────────────────────────
let supabase = null;
let currentUser = null;
let currentUserRole = 'user';

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.toggle('active', p.id === 'auth-panel-' + tab));
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-success').style.display = 'none';
}

function showAuthError(msg) { const el = document.getElementById('auth-error'); el.textContent = msg; el.style.display = 'block'; }
function showAuthSuccess(msg) { const el = document.getElementById('auth-success'); el.textContent = msg; el.style.display = 'block'; }

async function doLogin() {
  if (!checkAuthCooldown()) return;
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { showAuthError('Please enter email and password.'); return; }
  setAuthLoading('btn-login', true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading('btn-login', false);
    if (error) { setAuthCooldown(2000); showAuthError(error.message); return; }
    currentUser = data.user;
    onAuthSuccess();
  } catch(e) { setAuthCooldown(2000); setAuthLoading('btn-login', false); showAuthError(e.message); }
}

async function doSignup() {
  if (!checkAuthCooldown()) return;
  const email = document.getElementById('auth-new-email').value.trim();
  const password = document.getElementById('auth-new-password').value;
  if (!email || !password) { showAuthError('Please enter email and password.'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  setAuthLoading('btn-signup', true);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password }, { redirectTo: APP_URL });
    setAuthLoading('btn-signup', false);
    if (error) { setAuthCooldown(2000); showAuthError(error.message); return; }
    if (data.session) {
      currentUser = data.user;
      onAuthSuccess();
    } else {
      switchAuthTab('signin');
      document.getElementById('auth-email').value = email;
      document.getElementById('auth-success').textContent = 'Account created! Check your email to confirm, then sign in.';
      document.getElementById('auth-success').style.display = 'block';
    }
  } catch(e) { setAuthLoading('btn-signup', false); showAuthError(e.message); }
}

async function doSignout() {
  await supabase.auth.signOut();
  currentUser = null;
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('sidebar-user').style.display = 'none';
  document.getElementById('main').style.display = 'none';
  showAuthTabs();
}

async function onAuthSuccess() {
  // Fetch or create profile for role management
  let approved = false;
  try {
    let { data: profile } = await supabase.from('profiles').select('role, approved').eq('id', currentUser.id).single();
    if (!profile) {
      await supabase.from('profiles').insert({ id: currentUser.id, email: currentUser.email, role: 'user', approved: false });
      currentUserRole = 'user';
      approved = false;
    } else {
      currentUserRole = profile.role;
      approved = !!profile.approved;
    }
  } catch(e) {
    currentUserRole = 'user';
    approved = false;
  }
  // Admins bypass approval check
  if (currentUserRole === 'admin') approved = true;
  if (!approved) {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('pending-email').textContent = currentUser.email;
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('auth-panel-pending').classList.add('active');
    hideAuthTabs();
    document.getElementById('sidebar-user').style.display = 'none';
    document.getElementById('main').style.display = 'none';
    return;
  }
  document.getElementById('auth-overlay').classList.add('hidden');
  document.getElementById('sidebar-user').style.display = 'flex';
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('main').style.display = 'flex';
  // Show admin nav button if admin
  if (currentUserRole === 'admin') {
    document.getElementById('nav-admin').style.display = '';
  }
  if (!window._appInited) initApp();
}

function showNewPasswordPanel() {
  hideAuthTabs();
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('auth-panel-newpassword').classList.add('active');
  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('main').style.display = 'none';
}
function setAuthLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) { btn._text = btn.textContent; btn.textContent = 'Please wait...'; btn.disabled = true; }
  else { btn.textContent = btn._text || btn.textContent; btn.disabled = false; }
}

function hideAuthTabs() { document.querySelector('.auth-tabs').style.display = 'none'; }
function showAuthTabs() {
  document.querySelector('.auth-tabs').style.display = '';
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('auth-panel-signin').classList.add('active');
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.auth-tab[data-tab="signin"]').classList.add('active');
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-success').style.display = 'none';
}
function showForgotPassword() {
  hideAuthTabs();
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('auth-panel-reset').classList.add('active');
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-success').style.display = 'none';
}
async function doSendReset() {
  if (!checkAuthCooldown()) return;
  const email = document.getElementById('auth-reset-email').value.trim();
  if (!email) { showAuthError('Please enter your email.'); return; }
  setAuthLoading('btn-send-reset', true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
    setAuthLoading('btn-send-reset', false);
    if (error) { setAuthCooldown(3000); showAuthError(error.message); return; }
    showAuthSuccess('Password reset link sent! Check your email.');
  } catch(e) { setAuthCooldown(3000); setAuthLoading('btn-send-reset', false); showAuthError(e.message); }
}
async function doSetNewPassword() {
  const password = document.getElementById('auth-new-pw').value;
  const confirm = document.getElementById('auth-confirm-pw').value;
  if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (password !== confirm) { showAuthError('Passwords do not match.'); return; }
  setAuthLoading('btn-set-password', true);
  try {
    const { error } = await supabase.auth.updateUser({ password });
    setAuthLoading('btn-set-password', false);
    if (error) { showAuthError(error.message); return; }
    await supabase.auth.signOut();
    showAuthSuccess('Password updated! Please sign in with your new password.');
    setTimeout(() => showAuthTabs(), 2000);
  } catch(e) { setAuthLoading('btn-set-password', false); showAuthError(e.message); }
}

async function initAuth() {
  try {
    for (let wait = 0; wait < 500; wait++) {
      if (typeof window.__supabaseCreateClient === 'function') break;
      await new Promise(r => setTimeout(r, 20));
    }
    if (typeof window.__supabaseCreateClient !== 'function') {
      throw new Error('Supabase module did not load (timeout). Check network connectivity or ad blocker.');
    }
    supabase = window.__supabaseCreateClient(SUPABASE_URL, SUPABASE_KEY);
  } catch(e) {
    console.error('Auth init failed:', e);
    document.getElementById('auth-error').textContent = 'Failed to initialize auth: ' + e.message;
    document.getElementById('auth-error').style.display = 'block';
    return;
  }
  document.getElementById('btn-login').onclick = doLogin;
  document.getElementById('btn-signup').onclick = doSignup;
  document.getElementById('btn-send-reset').onclick = doSendReset;
  document.getElementById('btn-set-password').onclick = doSetNewPassword;
  document.getElementById('forgot-password-link').onclick = e => { e.preventDefault(); showForgotPassword(); };
  document.getElementById('back-to-signin').onclick = e => { e.preventDefault(); showAuthTabs(); };
  document.getElementById('auth-email').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('auth-password').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('auth-new-email').onkeydown = e => { if (e.key === 'Enter') doSignup(); };
  document.getElementById('auth-new-password').onkeydown = e => { if (e.key === 'Enter') doSignup(); };
  document.getElementById('auth-reset-email').onkeydown = e => { if (e.key === 'Enter') doSendReset(); };
  document.getElementById('auth-new-pw').onkeydown = e => { if (e.key === 'Enter') doSetNewPassword(); };
  document.getElementById('auth-confirm-pw').onkeydown = e => { if (e.key === 'Enter') doSetNewPassword(); };
  const { data: { session } } = await supabase.auth.getSession();
  if (__recoveryHash && session && session.user) {
    showNewPasswordPanel();
  } else if (__resetError) {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('main').style.display = 'none';
    showAuthError(decodeURIComponent(__resetError));
  } else if (session && session.user) {
    currentUser = session.user;
    onAuthSuccess();
  } else {
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('main').style.display = 'none';
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────
async function logAudit(action, detail) {
  try {
    await supabase.from('audit_log').insert({
      user_id: currentUser?.id,
      email: currentUser?.email,
      action,
      detail: detail || '',
      created_at: new Date().toISOString()
    });
  } catch(e) { console.error('Audit log failed:', e); }
}
async function approveUser(userId, email) {
  if (currentUserRole !== 'admin') return;
  try {
    const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    logAudit('approve_user', 'Approved ' + email);
    showToast('Approved ' + email);
    renderAdmin();
  } catch(e) { showToast('Error: ' + e.message); }
}
async function rejectUser(userId, email) {
  if (currentUserRole !== 'admin') return;
  if (!confirm('Remove user ' + email + '? This will delete their profile (auth user remains).')) return;
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    logAudit('reject_user', 'Rejected ' + email);
    showToast('Rejected ' + email);
    renderAdmin();
  } catch(e) { showToast('Error: ' + e.message); }
}
async function renderAdmin() {
  await refreshUserRole();
  if (currentUserRole !== 'admin') { document.getElementById('page-admin').innerHTML = '<p style="color:#c62828;">Access denied.</p>'; return; }
  const el = document.getElementById('admin-user-list');
  el.innerHTML = '<p>Loading users...</p>';
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    if (error) { el.innerHTML = '<p style="color:#c62828;">Error: ' + error.message + '</p>'; return; }
    if (!data || !data.length) { el.innerHTML = '<p>No users found.</p>'; return; }
    const pending = data.filter(u => !u.approved);
    const approved = data.filter(u => u.approved);
    let html = '';
    // Pending section
    if (pending.length) {
      html += '<h3 style="font-size:15px;color:#c62828;margin-bottom:12px;">Pending Approval (' + pending.length + ')</h3>';
      html += '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><thead><tr style="background:#fff4f4;"><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Email</th><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Signed Up</th><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Actions</th></tr></thead><tbody>';
      for (const user of pending) {
        const joined = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
        html += '<tr style="border-bottom:1px solid #e0e4f0;"><td style="padding:10px 12px;font-size:13px;">' + escapeHtml(user.email || '—') + '</td><td style="padding:10px 12px;font-size:12px;color:#888;">' + joined + '</td><td style="padding:10px 12px;"><button class="btn btn-primary btn-sm" onclick="approveUser(\'' + user.id + '\',\'' + (user.email || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" style="margin-right:6px;">Approve</button><button class="btn btn-secondary btn-sm" onclick="rejectUser(\'' + user.id + '\',\'' + (user.email || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')">Reject</button></td></tr>';
      }
      html += '</tbody></table>';
    }
    // Approved users section
    html += '<h3 style="font-size:15px;color:#00356C;margin-bottom:12px;">Approved Users (' + approved.length + ')</h3>';
    html += '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f0f4f8;"><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Email</th><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Role</th><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Joined</th><th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;color:#555;">Actions</th></tr></thead><tbody>';
    for (const user of approved) {
      const isSelf = user.id === currentUser.id;
      const joined = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
      html += '<tr style="border-bottom:1px solid #e0e4f0;"><td style="padding:10px 12px;font-size:13px;">' + escapeHtml(user.email || '—') + (isSelf ? ' <span style="font-size:11px;color:#888;">(you)</span>' : '') + '</td><td style="padding:10px 12px;font-size:13px;"><span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;' + (user.role === 'admin' ? 'background:#e3f2fd;color:#00356C;' : 'background:#eee;color:#666;') + '">' + escapeHtml(user.role) + '</span></td><td style="padding:10px 12px;font-size:12px;color:#888;">' + joined + '</td><td style="padding:10px 12px;">' + (isSelf ? '<span style="font-size:11px;color:#aaa;">Cannot change own role</span>' : '<select onchange="changeUserRole(\'' + user.id + '\',this.value)" style="padding:5px 8px;border:1px solid #d0d8ee;border-radius:6px;font-size:12px;"><option value="user"' + (user.role === 'user' ? ' selected' : '') + '>User</option><option value="admin"' + (user.role === 'admin' ? ' selected' : '') + '>Admin</option></select>') + (user.role !== 'admin' ? ' <button class="btn btn-secondary btn-sm" onclick="deleteUser(\'' + user.id + '\',\'' + (user.email || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')" style="margin-left:6px;background:#c62828;color:#fff;">Delete</button>' : '') + '</td></tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = '<p style="color:#c62828;">Error: ' + e.message + '</p>';
  }
}
async function changeUserRole(userId, newRole) {
  if (currentUserRole !== 'admin') return;
  try {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    logAudit('change_role', 'Changed user ' + userId + ' to ' + newRole);
    showToast('Role updated to ' + newRole);
    renderAdmin();
  } catch(e) { showToast('Error: ' + e.message); }
}
async function deleteUser(userId, email) {
  if (currentUserRole !== 'admin') return;
  if (!confirm('Delete user ' + email + '? This will permanently remove their access and profile. The auth account will remain but they won\'t be able to log in.')) return;
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) { showToast('Error: ' + error.message); return; }
    logAudit('delete_user', 'Deleted ' + email);
    showToast('Deleted ' + email);
    renderAdmin();
  } catch(e) { showToast('Error: ' + e.message); }
}
// // DATA — MOCK LEADS (used for seeding on first run)

 // // DATA — SOLUTIONS (loaded from Supabase)
let solutions = [];

 function matchSolutions(painPoint) { const lower = painPoint.toLowerCase(); const matched = solutions.filter(s => s.keywords.some(k => lower.includes(k))); return matched.length ? matched.slice(0, 2) : [{ service: 'Managed IT Services', icon: '', pitch: 'CES provides end-to-end managed IT services tailored to your environment and industry.', stat: 'CES manages infrastructure for 200+ enterprise clients across North America.' }];
} // // DATA — TONES

 // // DATA — OBJECTIONS (tone-aware)

// // STATE
let allLeads = []; // all leads from Supabase
let callLog = []; // call logs from Supabase
let selectedLeadId = null;
let activeTone = 'consultative';
const REP_NAME = 'CES';

// Helper: convert JS lead to DB row
function leadToDbRow(lead) {
  return {
    company: lead.company,
    contact_name: lead.contact_name,
    contact_title: lead.contact_title || '—',
    contact_phone: lead.contact_phone || '—',
    contact_email: lead.contact_email || '—',
    industry: lead.industry || 'Other',
    it_type: lead.it_type || 'Unknown',
    current_infra: lead.current_infra || '—',
    pain_points: lead.pain_points || [],
    annual_it_budget: lead.annual_it_budget || '—',
    company_size: lead.size || lead.company_size || '—',
    location: lead.location || '—',
    website: lead.website || '—',
    linkedin_url: lead.linkedin_url || lead.website || null,
    icp: lead.icp || '',
    tier: lead.tier || '',
    imported: lead.imported || false,
    status: lead.status || 'Prospect',
  };
}

// Helper: normalize DB row to app lead format
function dbRowToLead(row) {
  return {
    ...row,
    size: row.company_size || '—',
    employees: row.employees || 0,
  };
}

function saveLog() { updateSidebarStats(); }
function updateSidebarStats() { document.getElementById('stat-total').textContent = allLeads.length; document.getElementById('stat-calls').textContent = callLog.length; document.getElementById('stat-qualified').textContent = callLog.filter(c => c.outcome === 'Qualified').length;
}
function currentLeadId() { return parseInt(document.getElementById('script-lead-select').value);
} // // NAVIGATION
async function refreshUserRole() {
  if (!currentUser) return;
  try {
    const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (data) {
      currentUserRole = data.role;
      document.getElementById('nav-admin').style.display = data.role === 'admin' ? '' : 'none';
    }
  } catch(e) { /* ignore */ }
}
function showPage(page) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); document.getElementById('page-' + page).classList.add('active'); const idx = { discovery:0, script:1, tracker:2, solutions:3, api:4, admin:6 }[page]; document.querySelectorAll('.nav-btn')[idx].classList.add('active'); if (page === 'script') renderScript(); if (page === 'tracker') renderTracker(); if (page === 'api') initApiPage(); if (page === 'solutions') renderSolutionsPage(); if (page === 'admin') renderAdmin(); refreshUserRole(); }
function goToScript(leadId) { selectedLeadId = leadId; showPage('script'); }
function goToTracker(leadId) { selectedLeadId = leadId; showPage('tracker'); setTimeout(() => { document.getElementById('log-lead').value = leadId; document.querySelector('.log-form').scrollIntoView({ behavior: 'smooth' }); }, 50);
} // // LEAD DISCOVERY
// // // CSV IMPORT
// importedLeads: derived from allLeads.filter(l => l.imported)
let csvRawRows = []; // parsed CSV rows [{col: val, ...}]
let csvHeaders = []; // column names from CSV
let csvMapping = {}; // { cesField: csvColumn }
let importStep = 1;
// CES_FIELDS moved to data/inference.js

// Pain Point Inference Engine // Infers likely pain points for imported leads based on job title + industry.
// Returns an array of 2-3 pain point strings ready for matchSolutions().

// INFER_INDUSTRY moved to data/inference.js
 function inferPainPoints(title, industry) {
  const tl = (title || '').toLowerCase();
  const ind = (industry || '').toLowerCase();
  const points = [];
  // 1. Title-based points (all 6)
  for (const rule of INFER_RULES) {
    if (rule.titleKeys.some(k => tl.includes(k))) {
      points.push(...rule.points);
      break;
    }
  }
  // 2. Industry-based points (all 6, deduplicated)
  const indMatch = Object.entries(INFER_INDUSTRY).find(([k]) => ind.includes(k));
  if (indMatch) {
    for (const p of indMatch[1]) {
      if (!points.includes(p)) points.push(p);
    }
  }
  // 3. Fallback
  if (!points.length) return ['IT cost and operational efficiency gaps','No 24/7 managed support coverage','Security posture and compliance risks','Legacy infrastructure hitting end-of-life','Cloud migration complexity and risk','Cybersecurity gaps and compliance exposure'];
  return points;
} function inferITType(industry) {
  const ind = (industry || '').toLowerCase();
  if (ind.includes('manufacturing') || ind.includes('industrial') || ind.includes('plastic') || ind.includes('packaging') || ind.includes('healthcare') || ind.includes('legal') || ind.includes('insurance')) return 'On-Premise';
  if (ind.includes('food') || ind.includes('beverage') || ind.includes('energy') || ind.includes('retail') || ind.includes('real estate') || ind.includes('finance') || ind.includes('bank')) return 'Hybrid';
  if (ind.includes('technology') || ind.includes('software') || ind.includes('education') || ind.includes('biotech') || ind.includes('logistics')) return 'Cloud';
  return 'Hybrid';
}
function inferICP(industry, employees) {
  const emp = employees || 0;
  const ind = (industry || '').toLowerCase();
  let segment = 'SMB';
  if (emp > 2000) segment = 'Enterprise';
  else if (emp >= 200) segment = 'Mid-Market';
  const capInd = industry || 'Other';
  return `${segment} ${capInd}`;
}
function inferTier(industry, employees, budget) {
  const emp = employees || 0;
  const ind = (industry || '').toLowerCase();
  const budgetNum = parseFloat((budget || '').replace(/[^0-9.]/g, '')) || 0;
  if (emp > 2000 || budgetNum > 10) return 'Tier 1';
  if (emp > 200 || budgetNum > 3) return 'Tier 2';
  return 'Tier 3';
}
// AI Engine
const aiConfig = JSON.parse(localStorage.getItem('ces_ai_config') || '{"provider":"local","apiKey":"","model":"google/gemma-2-9b-it:free","depth":"quick"}');
function saveAiConfig(cfg) { Object.assign(aiConfig, cfg); localStorage.setItem('ces_ai_config', JSON.stringify(aiConfig)); }
async function aiAnalyze(lead) {
  if (aiConfig.provider === 'openrouter' && aiConfig.apiKey) {
    const isDeep = aiConfig.depth === 'deep';
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+aiConfig.apiKey, 'HTTP-Referer':window.location.origin },
        body: JSON.stringify({ model: aiConfig.model, messages: [
          { role:'system', content: isDeep
            ? 'You are a senior B2B IT research analyst. Return JSON only with:\n' +
              '  "icp_options": array of 2-3 objects, each with:\n' +
              '    "value": string (e.g. "Enterprise Healthcare"),\n' +
              '    "confidence": "high"/"medium"/"low",\n' +
              '    "reasoning": "1-sentence why this fits"\n' +
              '  "tier": "Tier 1"/"Tier 2"/"Tier 3",\n' +
              '  "it_type": "Cloud"/"On-Premise"/"Hybrid",\n' +
               '  "pain_points": array of 6-8 specific, processed pain points,\n' +
              '  "enrichment": {\n' +
              '    "company_context": "2-3 sentence summary of their IT profile",\n' +
              '    "key_challenges": "3-4 bullet-style specific challenges",\n' +
              '    "recommended_approach": "2-3 sentence CES outreach angle"\n' +
              '  },\n' +
              '  "research": {\n' +
              '    "recent_activities": "2-3 specific recent business activities or initiatives they are likely pursuing",\n' +
              '    "key_drivers": "who in the organisation is driving key initiatives",\n' +
              '    "industry_trends": "2-3 relevant trends affecting their sector right now",\n' +
              '    "next_portfolio": "what technology or service investments they are likely evaluating next",\n' +
              '    "ces_support": "how CES services specifically align with their needs"\n' +
              '  }\n' +
              'Use industry, company size, job title, budget, location and infrastructure to infer ICP variations.'
            : 'You are a B2B IT lead analyst. Return JSON only with:\n' +
              '  "icp_options": array of 2-3 objects, each with:\n' +
              '    "value": string (e.g. "Enterprise Healthcare"),\n' +
              '    "confidence": "high"/"medium"/"low",\n' +
              '    "reasoning": "1-sentence why this fits"\n' +
              '  "tier": "Tier 1"/"Tier 2"/"Tier 3",\n' +
              '  "it_type": "Cloud"/"On-Premise"/"Hybrid",\n' +
              '  "pain_points": array of 3-5 strings.\n' +
              'Use industry, company size, job title, budget and current infrastructure.' },
          { role:'user', content: JSON.stringify({ company:lead.company, industry:lead.industry, employees:lead.employees, title:lead.contact_title, budget:lead.annual_it_budget, infra:lead.current_infra, location:lead.location }) }
        ], temperature: isDeep ? 0.4 : 0.3, max_tokens: isDeep ? 800 : 500 })
      });
      if (!resp.ok) throw new Error('AI API error');
      const data = await resp.json();
      const parsed = JSON.parse(data.choices[0].message.content.replace(/```json|```/g,'').trim());
      if (isDeep && !parsed.enrichment) parsed.enrichment = null;
      return parsed;
    } catch(e) { showToast('AI engine error — falling back to rules'); }
  }
  return null;
}
let intelResult = null; let intelLeadId = null; let intelSelectedIcp = null;

function closeIntelModal() { document.getElementById('intel-modal').classList.remove('open'); intelResult = null; intelLeadId = null; intelSelectedIcp = null; }

function selectIntelICP(value) {
  intelSelectedIcp = value;
  document.getElementById('intel-icp-selected').textContent = value;
  document.querySelectorAll('.icp-option').forEach(el => {
    el.style.borderColor = el.dataset.value === value ? '#F99D1C' : '#dde3f0';
    el.style.background = el.dataset.value === value ? '#FFF4DC' : '#fafbff';
  });
}

function renderICPOptions(options) {
  const container = document.getElementById('intel-icp-list');
  if (!options || !options.length) {
    container.innerHTML = '<span style="color:#888;font-size:13px;">No ICP options available</span>';
    return;
  }
  container.innerHTML = options.map((o, i) => {
    const val = escapeHtml(o.value);
    const conf = o.confidence || 'medium';
    const reas = escapeHtml(o.reasoning || '');
    return `
    <div class="icp-option" data-value="${val}" onclick="selectIntelICP('${escapeJsStr(o.value)}')"
         style="padding:10px 14px;border:2px solid ${i===0?'#F99D1C':'#dde3f0'};border-radius:10px;cursor:pointer;
                background:${i===0?'#FFF4DC':'#fafbff'};transition:all 0.15s;min-width:160px;flex:1;">
      <div style="font-weight:700;font-size:14px;color:#00356C;">${val}</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">
        <span style="display:inline-block;padding:1px 8px;border-radius:10px;font-weight:600;
                     background:${conf==='high'?'#e8f5e9':conf==='medium'?'#fff8e1':'#f5f5f5'};
                     color:${conf==='high'?'#1b5e20':conf==='medium'?'#e65100':'#616161'};">
          ${conf}
        </span>
      </div>
      <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.4;">${reas}</div>
    </div>`}).join('');
  selectIntelICP(options[0].value);
}

async function runIntelligence(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;
  const isDeep = aiConfig.depth === 'deep';
  intelLeadId = leadId; intelResult = null; intelSelectedIcp = null;
  const modal = document.getElementById('intel-modal');
  document.getElementById('intel-company').textContent = `${lead.company} — ${lead.contact_name}`;
  document.getElementById('intel-engine').textContent = aiConfig.provider === 'openrouter' ? 'OpenRouter AI' : 'Local Rules';
  document.getElementById('intel-engine-msg').textContent = aiConfig.provider === 'openrouter' ? 'OpenRouter AI ('+aiConfig.model+')' : 'local rules';
  document.getElementById('intel-depth').textContent = isDeep ? 'Deep Research' : 'Quick';
  document.getElementById('intel-enrichment').style.display = 'none';
  const btn = document.getElementById('intel-apply-all');
  btn.textContent = 'Analyzing...'; btn.disabled = true;
  let result = await aiAnalyze(lead);
  btn.textContent = 'Apply All to Lead'; btn.disabled = false;
  if (!result) {
    if (isDeep) {
      result = deepInferAll(lead);
    } else {
      const icp = inferICP(lead.industry, lead.employees);
      result = {
        icp_options: [
          { value: icp, confidence: 'high', reasoning: `Based on ${lead.employees||'unknown'} employees in ${lead.industry||'unknown'} industry` },
          { value: icp.startsWith('Enterprise') ? icp.replace('Enterprise','Mid-Market') : icp.startsWith('Mid-Market') ? icp.replace('Mid-Market','Enterprise') : icp.replace('SMB','Mid-Market'), confidence: 'medium', reasoning: 'Alternate segment based on possible different revenue/scope interpretation' },
          { value: icp.startsWith('SMB') ? 'Enterprise '+icp.split(' ').slice(1).join(' ') : 'SMB '+icp.split(' ').slice(1).join(' '), confidence: 'low', reasoning: 'Boundary case — less likely but possible given partial data' }
        ],
        tier: inferTier(lead.industry, lead.employees, lead.annual_it_budget),
        it_type: inferITType(lead.industry),
        pain_points: inferPainPoints(lead.contact_title, lead.industry)
      };
    }
  }
  intelResult = result;
  renderICPOptions(result.icp_options || [{value:result.icp||'—',confidence:'medium',reasoning:'Inferred from available data'}]);
  document.getElementById('intel-tier').textContent = result.tier;
  document.getElementById('intel-it').textContent = result.it_type;
  const pts = result.pain_points || [];
  document.getElementById('intel-pp').textContent = pts.length ? pts.map((p,i)=>`${i+1}. ${p}`).join('\n') : 'No pain points inferred';
  document.getElementById('intel-pp-count').textContent = `· ${pts.length} identified`;
  if (isDeep && result.enrichment && result.enrichment.company_context) {
    document.getElementById('intel-context').textContent = result.enrichment.company_context;
    document.getElementById('intel-challenges').textContent = result.enrichment.key_challenges || '—';
    document.getElementById('intel-approach').textContent = result.enrichment.recommended_approach || '—';
    document.getElementById('intel-enrichment').style.display = 'block';
  }
  if (isDeep && result.research && result.research.recent_activities) {
    document.getElementById('intel-research-activities').textContent = result.research.recent_activities;
    document.getElementById('intel-research-drivers').textContent = result.research.key_drivers || '—';
    document.getElementById('intel-research-trends').textContent = result.research.industry_trends || '—';
    document.getElementById('intel-research-portfolio').textContent = result.research.next_portfolio || '—';
    document.getElementById('intel-research-ces').textContent = result.research.ces_support || '—';
    document.getElementById('intel-research').style.display = 'block';
  }
  modal.classList.add('open');
}

async function applyIntelAll() {
  const lead = allLeads.find(l => l.id === intelLeadId);
  if (!lead || !intelResult) return;
  const icp = intelSelectedIcp || intelResult.icp || (intelResult.icp_options&&intelResult.icp_options[0]&&intelResult.icp_options[0].value) || '';
  lead.icp = icp; lead.tier = intelResult.tier; lead.it_type = intelResult.it_type; lead.pain_points = intelResult.pain_points;
  await supabase.from('leads').update({ icp, tier:intelResult.tier, it_type:intelResult.it_type, pain_points:intelResult.pain_points }).eq('id', intelLeadId);
  closeIntelModal(); renderLeads(); showToast(`Intelligence applied to ${lead.company}`);
}
async function applyIntelPP() {
  const lead = allLeads.find(l => l.id === intelLeadId);
  if (!lead || !intelResult) return;
  lead.pain_points = intelResult.pain_points;
  await supabase.from('leads').update({ pain_points: intelResult.pain_points }).eq('id', intelLeadId);
  closeIntelModal(); renderLeads(); showToast('Pain points updated');
}

function deepInferAll(lead) {
  const emp = lead.employees || 0;
  const ind = (lead.industry || '').toLowerCase();
  const tl = (lead.contact_title || '').toLowerCase();
  const budget = lead.annual_it_budget || '';
  const infra = lead.current_infra || '';
  const budgetNum = parseFloat(budget.replace(/[^0-9.]/g,'')) || 0;
  const isEnterprise = emp > 2000;
  const isMidMarket = emp >= 200;
  const segment = isEnterprise ? 'Enterprise' : isMidMarket ? 'Mid-Market' : 'SMB';
  const icp = `${segment} ${lead.industry || 'Other'}`;
  const icpInd = lead.industry || 'Other';
  const icp_options = [
    { value: `${segment} ${icpInd}`, confidence: 'high', reasoning: `${segment} segment based on ${emp.toLocaleString()} employees in ${lead.industry||'unknown'} industry` },
    { value: isEnterprise ? `Mid-Market ${icpInd}` : `Enterprise ${icpInd}`, confidence: 'medium', reasoning: isEnterprise ? 'Could be Mid-Market if employee count is inflated or includes contractors' : 'Could be Enterprise if revenue or scope is larger than headcount suggests' },
    { value: isEnterprise ? `SMB ${icpInd}` : isMidMarket ? `SMB ${icpInd}` : `Mid-Market ${icpInd}`, confidence: 'low', reasoning: 'Boundary case based on partial data — verify with actual revenue or budget figures' }
  ];
  const tier = emp > 2000 || budgetNum > 10 ? 'Tier 1' : emp > 200 || budgetNum > 3 ? 'Tier 2' : 'Tier 3';
  const itType = inferITType(lead.industry);
  const basePoints = inferPainPoints(lead.contact_title, lead.industry);
  const contextPoints = [];
  if (budgetNum > 5) contextPoints.push('High IT budget indicates significant existing infrastructure investment — cost optimisation and ROI proof points will resonate strongly');
  if (isEnterprise) contextPoints.push('Enterprise scale means change management and migration complexity are key blockers — phased, low-risk approaches preferred');
  if (isMidMarket) contextPoints.push('Mid-market organisations typically run lean IT teams — managed services and automation reduce operational overhead');
  if (infra.toLowerCase().includes('cloud')) contextPoints.push('Already cloud-enabled — focus on FinOps, multi-cloud governance, and AI workload optimisation');
  if (infra.toLowerCase().includes('on-prem') || infra.toLowerCase().includes('legacy')) contextPoints.push('On-premise dependency creates urgency around end-of-life hardware and migration planning');
  if (infra.toLowerCase().includes('hybrid')) contextPoints.push('Hybrid infrastructure complexity creates visibility and orchestration gaps — unified management is critical');
  const allPoints = [...new Set([...contextPoints, ...basePoints])];
  const enriched = {
    company_context: `${lead.company} (${lead.industry}, ~${emp.toLocaleString()} employees, ${budget||'unknown'} IT budget) operates with a ${itType} infrastructure model: current setup is "${infra||'not specified'}". ${lead.contact_name} (${lead.contact_title||'senior IT leader'}) is the primary contact. ${isEnterprise ? 'As a large enterprise with scale and complexity,' : isMidMarket ? 'As a mid-market organisation with growing IT needs,' : 'As a smaller organisation with constrained resources,'} they face pressures around ${ind.includes('healthcare')?'compliance and data sovereignty under NHS/government standards':ind.includes('finance')?'regulatory compliance (FCA/PRA) and legacy modernisation':ind.includes('manufacturing')?'OT/IT convergence, supply chain resilience, and Industry 4.0':ind.includes('retail')?'omnichannel customer experience and e-commerce scalability':ind.includes('logistics')?'supply chain visibility and fleet/warehouse modernisation':ind.includes('legal')?'client data governance and practice management modernisation':'digital transformation, cost efficiency, and cybersecurity'}. The lead's role suggests decision-making authority over ${tl.includes('cfo')||tl.includes('finance')?'technology investment, vendor contracts, and IT budget allocation':tl.includes('security')||tl.includes('ciso')?'security posture, risk management, and compliance frameworks':tl.includes('cio')||tl.includes('cto')?'technology strategy, infrastructure architecture, and digital transformation roadmaps':tl.includes('vp')||tl.includes('head')||tl.includes('director')?'infrastructure operations, team leadership, and vendor management':'IT operations and infrastructure decisions'}.`,
    key_challenges: (ind.includes('healthcare') ? [
      'HIPAA/DPA compliance burden for patient data in cloud/shared environments',
      'Legacy EHR system latency and interoperability with modern APIs',
      'Scaling AI for clinical decision support while maintaining data governance'
    ] : ind.includes('finance')||ind.includes('bank') ? [
      'FCA/PRA regulatory compliance for AI model outputs in financial services',
      'Core banking modernisation complexity — risk of disruption during migration',
      'Legacy system integration with cloud-native fintech platforms'
    ] : ind.includes('manufacturing') ? [
      'OT network segmentation and security in increasingly connected factory environments',
      'Inconsistent sensor data quality blocking predictive maintenance AI',
      'Supply chain visibility gaps exposed by recent global disruptions'
    ] : isEnterprise ? [
      'Scaling AI and automation initiatives from pilot to enterprise-wide production',
      'Managing multi-cloud/hybrid cost and complexity without centralised FinOps governance',
      'Addressing security and compliance across increasingly distributed infrastructure'
    ] : isMidMarket ? [
      'Running lean IT teams while managing growing infrastructure complexity and cloud sprawl',
      'Building business case for technology investment with limited internal benchmarking data',
      'Evaluating managed services vs in-house build for critical infrastructure capabilities'
    ] : [
      'Operating with constrained IT resources while managing basic compliance and security needs',
      'Prioritising limited technology budget across competing operational demands',
      'Finding cost-effective, low-risk entry points for cloud or managed services adoption'
    ]).join('\n'),
    recommended_approach: `Position CES as a ${isEnterprise?'strategic partner who helps enterprises accelerate AI-ready infrastructure modernisation at scale':'trusted advisor who helps mid-market organisations build enterprise-grade IT operations without enterprise overhead'}. Lead with ${lead.contact_name}'s specific pain points around ${allPoints.slice(0,2).map(p=>p.split('—')[0]||p).join(' and ').toLowerCase()}. Reference the current infrastructure state ("${infra||'mixed environment'}") and offer a no-obligation infrastructure assessment tailored to ${lead.company}'s ${lead.industry||'current'} context. Emphasise CES experience with ${ind.includes('healthcare')?'NHS and healthcare providers':ind.includes('finance')||ind.includes('bank')?'financial services and regulated institutions':ind.includes('manufacturing')?'manufacturing and industrial enterprises':ind.includes('retail')?'retail and e-commerce companies':ind.includes('logistics')?'logistics and supply chain organisations':'organisations of similar size and complexity'} to build credibility.`
  };
  const painList = allPoints.slice(0,3).map(p => p.split('—')[0]||p);
  const research = {
    recent_activities: `${lead.company}, a ${segment.toLowerCase()} ${lead.industry||'cross-sector'} company with ~${emp.toLocaleString()} employees and ${budget||'an estimated'} IT budget, is actively ${isEnterprise?'evaluating enterprise-wide AI infrastructure modernisation':'assessing cloud migration and managed services to support its growth trajectory'}. ${lead.contact_name} (${lead.contact_title||'senior IT leader'}) is likely ${tl.includes('cfo')||tl.includes('finance')?'reviewing IT vendor contracts and optimising technology spend against budget targets':tl.includes('security')||tl.includes('ciso')?'evaluating security posture improvements and compliance readiness after recent industry incidents':tl.includes('cio')||tl.includes('cto')?'driving digital transformation and AI readiness initiatives from the technology side':'managing critical infrastructure upgrades and operational efficiency projects'}. Current infrastructure (${infra||'mixed on-prem/cloud'}) ${infra.toLowerCase().includes('age')||infra.toLowerCase().includes('eol')?'is approaching end-of-life, creating urgency for modernisation':infra.toLowerCase().includes('cloud')?'has a cloud foundation but likely needs FinOps governance':'presents both modernisation opportunities and migration complexity'}. Industry trends around ${ind.includes('healthcare')?'AI in clinical workflows and data sovereignty':ind.includes('finance')||ind.includes('bank')?'regulatory tech and core banking modernisation':ind.includes('manufacturing')?'Industry 4.0 and OT/IT convergence':ind.includes('retail')?'omnichannel retail and real-time personalisation':ind.includes('logistics')?'autonomous logistics and supply chain visibility':ind.includes('legal')?'AI in legal workflows and client data governance':'digital resilience and cost optimisation'} are driving urgency at this specific organisation.`,
    key_drivers: `Primary initiative driver: ${lead.contact_name} (${lead.contact_title||'senior IT leader'}) at ${lead.company}. Secondary influence likely from ${isEnterprise?'the CIO/CTO office and line-of-business heads':'the CEO/founder and department heads'}. Key motivators include: ${infra.toLowerCase().includes('eol')||infra.toLowerCase().includes('age')?'end-of-life infrastructure replacement timelines, ':''}${budgetNum > 5?'IT budget (£'+budget+') requiring cost optimisation focus, ':''}${painList.length?'resolving identified pain points around '+painList.join(', ')+', ':''}and competitive pressure to modernise within the ${lead.industry||'current'} sector. ${lead.contact_email?'Reach out via '+lead.contact_email:''}`,
    industry_trends: (ind.includes('healthcare') ? [
      'AI-powered clinical decision support driving data infrastructure investment at NHS trusts and private providers',
      'Data sovereignty and partner sharing compliance creating urgency for governed data platforms',
      'Legacy EHR modernisation timelines accelerating due to NHS interoperability mandates',
      'Cyber resilience requirements intensifying after high-profile healthcare ransomware attacks'
    ] : ind.includes('finance')||ind.includes('bank') ? [
      'Core banking modernisation driven by neobank competition and open banking regulations',
      'Regulatory compliance for AI in financial services requiring explainable, auditable model governance',
      'Quantum-safe cryptography migration planning beginning for financial data protection',
      'Cloud adoption in regulated financial environments growing with new compliance frameworks'
    ] : ind.includes('manufacturing') ? [
      'OT/IT convergence creating new attack surfaces requiring integrated security approaches',
      'Predictive maintenance AI scaling blocked by inconsistent sensor data pipelines across factory floors',
      'Supply chain resilience investment prioritised after recent global disruptions',
      'Digital twin and smart factory initiatives requiring modern, low-latency infrastructure'
    ] : ind.includes('retail') ? [
      'Real-time personalisation driving need for modern data platforms and AI/ML infrastructure',
      'E-commerce growth to 21% of total retail by 2030 requiring elastic, scalable infrastructure',
      'Customer data platform consolidation to enable consistent omnichannel experience',
      'AI-powered demand forecasting and inventory optimisation becoming competitive differentiators'
    ] : ind.includes('logistics') ? [
      'Autonomous route optimisation and last-mile AI requiring modern API-connected infrastructure',
      'IoT fleet telemetry data volumes growing 40% YoY — governance and analytics gaps emerging',
      'Supply chain visibility investment overdue after global disruption exposure',
      'Warehouse automation and robotics driving edge computing requirements'
    ] : ind.includes('legal') ? [
      'AI contract review and document automation adoption accelerating but blocked by unstructured data',
      'Client confidentiality and privilege in the AI era creating need for governed document systems',
      'Practice management modernisation driving cloud migration in traditionally on-premise firms',
      'E-discovery and compliance automation creating new infrastructure requirements'
    ] : [
      'AI adoption scaling from pilot to production across the sector — infrastructure readiness is the bottleneck',
      'Infrastructure modernisation driven by end-of-life hardware and cloud migration imperatives',
      'Cybersecurity investment increasing as threat landscape expands — 70% of organisations plan budget increases',
      'Sustainability and ESG reporting requirements pushing green IT and energy-efficient data centre investments'
    ]).join('; '),
    next_portfolio: `${lead.company}'s likely next portfolio priorities include: ${isEnterprise?'Enterprise-wide AI infrastructure modernisation, multi-cloud FinOps implementation, and AI governance platform deployment':isMidMarket?'Cloud migration roadmap definition, managed IT services adoption to reduce overhead, and cybersecurity upgrade programme':'Cost-effective cloud entry points, managed support services to augment lean IT teams, and compliance basics'}. ${ind.includes('healthcare')?'Specifically driven by: AI-ready data platform for clinical analytics, EHR modernisation roadmap, and compliance automation for NHS/government standards':ind.includes('finance')?'Specifically driven by: Core banking modernisation roadmap, regulatory AI compliance framework, and quantum-safe migration planning':ind.includes('manufacturing')?'Specifically driven by: OT security architecture, predictive maintenance platform for production lines, and IIoT data pipeline':ind.includes('retail')?'Specifically driven by: Real-time personalisation platform, e-commerce infrastructure scaling, and CDP consolidation':ind.includes('logistics')?'Specifically driven by: Fleet IoT data platform, supply chain visibility dashboard, and warehouse edge computing':ind.includes('legal')?'Specifically driven by: Document AI infrastructure, practice management cloud migration, and client data governance platform':''} Given ${lead.contact_name}'s role as ${lead.contact_title||'IT leader'}, they are likely to be the primary decision-maker or key influencer for these initiatives.`,
    ces_support: `CES can support ${lead.company} through a tailored engagement: (1) ${isEnterprise?'Enterprise infrastructure assessment and AI-readiness audit covering '+infra:'Infrastructure assessment and cloud migration roadmap covering current '+infra} — identifying quick wins and strategic priorities for ${lead.contact_name}. (2) ${isEnterprise?'Managed services for multi-cloud FinOps and governance — addressing budget pressure and cost visibility':'Managed IT services to reduce operational overhead — freeing up lean internal teams for strategic projects'}. (3) ${ind.includes('security')||tl.includes('security')?'Security posture review and compliance gap analysis — critical given industry threat landscape':'Cybersecurity assessment and compliance support — tailored to '+lead.industry+' sector requirements'}. (4) Tailored CES solutions mapped to specific pain points: ${painList.join(', ')}. (5) No-obligation proof-of-value engagement to demonstrate ROI before commitment.`
  };
  return { icp_options, tier, it_type: itType, pain_points: allPoints.slice(0,8), enrichment: enriched, research };
}
function openAiSettings() { const m=document.getElementById('ai-settings-modal'); document.getElementById('ai-provider').value=aiConfig.provider; document.getElementById('ai-key').value=aiConfig.apiKey; document.getElementById('ai-model').value=aiConfig.model; document.getElementById('ai-depth').value=aiConfig.depth||'quick'; m.classList.add('open'); }
function closeAiSettings() { document.getElementById('ai-settings-modal').classList.remove('open'); }
function saveAiSettings() { const p=document.getElementById('ai-provider').value; const k=document.getElementById('ai-key').value.trim(); const m=document.getElementById('ai-model').value.trim(); const d=document.getElementById('ai-depth').value; saveAiConfig({provider:p,apiKey:k,model:m||'google/gemma-2-9b-it:free',depth:d}); closeAiSettings(); showToast('AI engine settings saved'); }
// FIELD_SYNONYMS moved to data/inference.js
 function autoDetectMapping(headers) { const mapping = {}; const lowerHeaders = headers.map(h => h.toLowerCase().trim()); Object.entries(FIELD_SYNONYMS).forEach(([field, synonyms]) => { const idx = synonyms.findIndex(s => lowerHeaders.some(h => h.includes(s) || s.includes(h))); if (idx !== -1) { const matchedHeader = headers[lowerHeaders.findIndex(h => h.includes(synonyms[idx]) || synonyms[idx].includes(h))]; if (matchedHeader) mapping[field] = matchedHeader; } }); return mapping;
} function parseCSV(text) { const lines = text.split(/\r?\n/).filter(l => l.trim()); if (lines.length < 2) return { headers: [], rows: [] }; function splitLine(line) { const result = []; let current = ''; let inQuotes = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; } else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; } else { current += ch; } } result.push(current.trim()); return result; } const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g,'').trim()); const rows = lines.slice(1).map(line => { const vals = splitLine(line); const obj = {}; headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g,'').trim(); }); return obj; }).filter(r => Object.values(r).some(v => v)); return { headers, rows };
} function handleDrop(e) { e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag-over'); const file = e.dataTransfer.files[0]; if (file) processFile(file);
} function handleFileSelect(e) { const file = e.target.files[0]; if (file) processFile(file);
} function processFile(file) { if (!file.name.match(/\.(csv|txt)$/i)) { showToast('Please upload a .csv file'); return; } const reader = new FileReader(); reader.onload = (e) => { const { headers, rows } = parseCSV(e.target.result); if (!headers.length || !rows.length) { showToast('Could not parse CSV — check the file format'); return; } csvHeaders = headers; csvRawRows = rows; csvMapping = autoDetectMapping(headers); document.getElementById('modal-next-btn').disabled = false; document.getElementById('modal-next-btn').textContent = 'Map Columns →'; document.getElementById('drop-zone').style.background = '#e8f5e9'; document.getElementById('drop-zone').innerHTML = ` <div class="drop-zone-icon" style="font-size:28px;color:#aab;margin-bottom:8px;">&#8679;</div> <div class="drop-zone-text">${escapeHtml(file.name)}</div> <div class="drop-zone-sub">${rows.length.toLocaleString()} rows · ${headers.length} columns detected</div> `; showToast(`Parsed ${rows.length} rows from ${file.name}`); }; reader.readAsText(file);
} function buildMappingUI() { const colOptions = ['(skip)', ...csvHeaders].map(h => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join(''); const sampleRow = csvRawRows[0] || {}; document.getElementById('mapping-body').innerHTML = CES_FIELDS.map(f => { const mapped = csvMapping[f.key] || ''; const sample = mapped ? (sampleRow[mapped] || '—') : '—'; const opts = CES_FIELDS[0]; const selectOpts = ['(skip)', ...csvHeaders].map(h => `<option value="${escapeHtml(h)}" ${escapeHtml(h) === mapped ? 'selected' : ''}>${escapeHtml(h)}</option>` ).join(''); return ` <tr> <td><strong>${f.label}</strong>${f.required ? '<span class="field-required">REQ</span>' : ''}</td> <td><select onchange="csvMapping['${f.key}']=this.value;updateMappingSample('${f.key}',this.value)" id="map-${f.key}"> <option value="(skip)">(skip)</option> ${csvHeaders.map(h => `<option value="${escapeHtml(h)}" ${escapeHtml(h) === mapped ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('')} </select></td> <td id="sample-${f.key}" style="color:#666;font-size:12px;">${escapeHtml(sample)}</td> </tr> `; }).join('');
} function updateMappingSample(field, col) { const sampleRow = csvRawRows[0] || {}; document.getElementById(`sample-${field}`).textContent = col === '(skip)' ? '—' : (sampleRow[col] || '—');
} function buildPreview() { const leads = csvToLeads(csvRawRows.slice(0, 5)); const cols = ['Company', 'Contact', 'Title', 'Industry', 'Location', 'Email', 'Phone']; document.getElementById('preview-thead').innerHTML = `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`; document.getElementById('preview-tbody').innerHTML = leads.map(l => ` <tr> <td><strong>${escapeHtml(l.company)}</strong></td> <td>${escapeHtml(l.contact_name)}</td> <td>${escapeHtml(l.contact_title)}</td> <td>${escapeHtml(l.industry)}</td> <td>${escapeHtml(l.location)}</td> <td>${escapeHtml(l.contact_email)}</td> <td>${escapeHtml(l.contact_phone)}</td> </tr> `).join(''); const total = csvRawRows.length; const valid = csvToLeads(csvRawRows).length; document.getElementById('preview-stats').innerHTML = `<strong style="color:#00356C;">${valid}</strong> of <strong>${total}</strong> rows will be imported as leads. ` + (total - valid > 0 ? `<span style="color:#c62828;">${total - valid} rows skipped (missing company or name).</span>` : '<span style="color:#2e7d32;">All rows valid </span>'); document.getElementById('modal-next-btn').textContent = `Import ${valid} Leads`;
} function csvToLeads(rows) { const get = (row, field) => { const col = csvMapping[field]; return (col && col !== '(skip)') ? (row[col] || '') : ''; }; return rows.map((row, i) => { let name = get(row, 'contact_name'); if (!name) { const fn = get(row, 'first_name'); const ln = get(row, 'last_name'); name = [fn, ln].filter(Boolean).join(' '); } const company = get(row, 'company'); if (!name || !company) return null; const empRaw = get(row, 'employees').replace(/,/g,''); const empNum = parseInt(empRaw) || 0; let size = '200-500'; if (empNum <= 200) size = '50-200'; else if (empNum <= 500) size = '200-500'; else if (empNum <= 1000) size = '500-1000'; else if (empNum <= 5000) size = '1000-5000'; else if (empNum > 5000) size = '5000+'; const ind = get(row, 'industry') || 'Other'; return { company, contact_name: name, contact_title: get(row, 'contact_title') || '—', industry: ind, size, employees: empNum || 0, location: get(row, 'location') || '—', contact_email: get(row, 'contact_email') || '—', contact_phone: get(row, 'contact_phone') || '—', website: get(row, 'website') || '—', it_type: inferITType(ind), current_infra: 'Not specified — enrich after import', pain_points: inferPainPoints(get(row, 'contact_title'), ind), annual_it_budget: '—', icp: inferICP(ind, empNum), tier: inferTier(ind, empNum, ''), imported: true, }; }).filter(Boolean);
} async function importModalNext() { if (importStep === 1) { if (!csvRawRows.length) return; buildMappingUI(); setImportStep(2); document.getElementById('modal-next-btn').textContent = 'Preview →'; document.getElementById('modal-back-btn').style.display = 'inline-block'; } else if (importStep === 2) { const missing = CES_FIELDS.filter(f => f.required && (!csvMapping[f.key] || csvMapping[f.key] === '(skip)')); const hasName = (csvMapping.contact_name && csvMapping.contact_name !== '(skip)') || ((csvMapping.first_name && csvMapping.first_name !== '(skip)') && (csvMapping.last_name && csvMapping.last_name !== '(skip)')); const hasCompany = csvMapping.company && csvMapping.company !== '(skip)'; if (!hasName || !hasCompany) { showToast('Please map at least Contact Name (or First+Last Name) and Company Name'); return; } buildPreview(); setImportStep(3); document.getElementById('modal-next-btn').textContent = `Import ${csvToLeads(csvRawRows).length} Leads`; } else if (importStep === 3) { const newLeads = csvToLeads(csvRawRows); const rowsM = newLeads.map(l => leadToDbRow(l)); window._supabase.from('leads').insert(rowsM).select().then(({ data: savedM }) => { if (savedM) { savedM.forEach(s => allLeads.push(dbRowToLead({ ...s, imported: true }))); } else { newLeads.forEach(l => allLeads.push({ ...l, imported: true })); } closeImportModal(); refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${newLeads.length} leads imported successfully!`); });
  }
} function importModalBack() { if (importStep === 2) setImportStep(1); else if (importStep === 3) setImportStep(2);
} function setImportStep(n) { importStep = n; document.getElementById('import-step1').style.display = n === 1 ? 'block' : 'none'; document.getElementById('import-step2').style.display = n === 2 ? 'block' : 'none'; document.getElementById('import-step3').style.display = n === 3 ? 'block' : 'none'; ['step1-tab','step2-tab','step3-tab'].forEach((id, i) => { const el = document.getElementById(id); el.className = 'step' + (i + 1 < n ? ' done' : i + 1 === n ? ' active' : ''); }); document.getElementById('modal-back-btn').style.display = n > 1 ? 'inline-block' : 'none'; if (n === 1) document.getElementById('modal-next-btn').textContent = 'Map Columns →'; if (n === 2) document.getElementById('modal-next-btn').textContent = 'Preview →';
} // PP_THEMES moved to data/inference.js
 function detectTheme(pp) { const lower = pp.toLowerCase(); for (const t of PP_THEMES) { if (t.keys.some(k => lower.includes(k))) return t.label; } return ' Other';
} function openPainPointsGlance() { document.getElementById('pp-glance-modal').classList.add('open'); document.getElementById('pp-search').value = ''; renderPPGlance();
} function closePainPointsGlance() { document.getElementById('pp-glance-modal').classList.remove('open');
} function renderPPGlance() { const query = (document.getElementById('pp-search').value || '').toLowerCase(); const groupBy = document.getElementById('pp-group').value; let items = []; allLeads.forEach(l => { (l.pain_points || []).forEach(pp => { if (!query || pp.toLowerCase().includes(query) || l.company.toLowerCase().includes(query)) { items.push({ pp, company: l.company, leadId: l.id, theme: detectTheme(pp) }); } }); }); document.getElementById('pp-count').textContent = `${items.length} pain point${items.length !== 1 ? 's' : ''}`; let html = ''; if (groupBy === 'company') { const map = {}; items.forEach(it => { if (!map[it.company]) map[it.company] = { leadId: it.leadId, items: [] }; map[it.company].items.push(it); }); Object.entries(map).forEach(([company, data]) => { html += `<div style="margin-bottom:16px;"> <div style="font-weight:700;font-size:14px;color:#00356C;padding:8px 12px;background:#e8f0fa;border-radius:8px 8px 0 0;border-left:4px solid #F99D1C;display:flex;justify-content:space-between;align-items:center;"> <span> ${escapeHtml(company)}</span> <button class="btn btn-primary btn-sm" onclick="closePainPointsGlance();goToScript(${data.leadId})" style="font-size:11px;padding:3px 10px;">Generate Script →</button> </div> <div style="border:1px solid #e0e6f8;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">`; data.items.forEach((it, i) => { const bg = i % 2 === 0 ? '#fff' : '#f8f9ff'; html += `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 14px;background:${bg};border-bottom:1px solid #f0f0f0;"> <span style="background:#fff3e0;color:#e65100;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600;white-space:nowrap;margin-top:1px;">${it.theme}</span> <span style="font-size:13px;color:#333;line-height:1.4;">${escapeHtml(it.pp)}</span> </div>`; }); html += `</div></div>`; }); } else { const map = {}; items.forEach(it => { if (!map[it.theme]) map[it.theme] = []; map[it.theme].push(it); }); const themeOrder = PP_THEMES.map(t => t.label).concat([' Other']); themeOrder.filter(t => map[t]).forEach(theme => { const group = map[theme]; html += `<div style="margin-bottom:16px;"> <div style="font-weight:700;font-size:14px;color:#00356C;padding:8px 12px;background:#e8f0fa;border-radius:8px 8px 0 0;border-left:4px solid #F99D1C;"> ${theme} <span style="font-weight:400;color:#666;font-size:12px;">(${group.length})</span> </div> <div style="border:1px solid #e0e6f8;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">`; group.forEach((it, i) => { const bg = i % 2 === 0 ? '#fff' : '#f8f9ff'; html += `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 14px;background:${bg};border-bottom:1px solid #f0f0f0;"> <span style="font-size:11px;color:#555;white-space:nowrap;margin-top:2px;min-width:160px;"> ${escapeHtml(it.company)}</span> <span style="font-size:13px;color:#333;line-height:1.4;">${escapeHtml(it.pp)}</span> <button class="btn btn-primary btn-sm" onclick="closePainPointsGlance();goToScript(${it.leadId})" style="font-size:11px;padding:2px 8px;white-space:nowrap;margin-left:auto;">Script →</button> </div>`; }); html += `</div></div>`; }); } if (!html) html = `<div style="text-align:center;padding:40px;color:#999;">No pain points match your search.</div>`; document.getElementById('pp-glance-body').innerHTML = html;
}
function openImportModal() { importStep = 1; csvRawRows = []; csvHeaders = []; csvMapping = {}; document.getElementById('csv-file-input').value = ''; document.getElementById('drop-zone').style.background = ''; document.getElementById('drop-zone').innerHTML = ` <div class="drop-zone-icon" style="font-size:28px;color:#aab;margin-bottom:8px;">&#8679;</div> <div class="drop-zone-text">Drop your LinkedIn CSV here, or click to browse</div> <div class="drop-zone-sub">Supports LinkedIn Sales Navigator, LinkedIn Connections export, and any custom CSV · Max 5,000 rows</div> <input type="file" id="csv-file-input" accept=".csv,.txt" onchange="handleFileSelect(event)"/> `; setImportStep(1); document.getElementById('modal-next-btn').disabled = true; document.getElementById('modal-next-btn').textContent = 'Map Columns →'; document.getElementById('import-modal').classList.add('open');
} function closeImportModal() { document.getElementById('import-modal').classList.remove('open');
} async function clearImportedLeads() { const importedLeads = allLeads.filter(l => l.imported); if (!confirm(`Remove all ${importedLeads.length} imported leads?`)) return; const ids = importedLeads.map(l => l.id); await window._supabase.from('leads').delete().in('id', ids); allLeads = allLeads.filter(l => !l.imported); refreshLeadSources(); showToast('Imported leads cleared.');
} function refreshLeadSources() { const allIndustries = [...new Set(allLeads.map(l => l.industry))].sort(); const sel = document.getElementById('f-industry'); const cur = sel.value; sel.innerHTML = '<option value="">All Industries</option>'; allIndustries.forEach(ind => { const opt = document.createElement('option'); opt.value = ind; opt.textContent = ind; if (ind === cur) opt.selected = true; sel.appendChild(opt); }); const statsEl = document.getElementById('import-stats'); const clearBtn = document.getElementById('clear-imported-btn'); const importedLeads = allLeads.filter(l => l.imported); if (importedLeads.length) { statsEl.style.display = 'flex'; statsEl.innerHTML = `<strong>${importedLeads.length}</strong> imported leads loaded &nbsp;·&nbsp; ${[...new Set(importedLeads.map(l=>l.industry))].slice(0,4).join(', ')} &nbsp;·&nbsp; <span style="font-size:11px;color:#5c6bc0;">IT Type &amp; ICP inferred — review per lead</span>`; clearBtn.style.display = 'inline-block'; } else { statsEl.style.display = 'none'; clearBtn.style.display = 'none'; } renderLeads(); updateSidebarStats();
} function initFilters() { const industries = [...new Set(allLeads.map(l => l.industry))].sort(); const sel = document.getElementById('f-industry'); industries.forEach(ind => { const opt = document.createElement('option'); opt.value = ind; opt.textContent = ind; sel.appendChild(opt); }); const importedLeadsLocal = allLeads.filter(l => l.imported); if (importedLeadsLocal.length) refreshLeadSources();
} function clearFilters() { ['f-industry','f-ittype','f-icp','f-tier','f-size'].forEach(id => document.getElementById(id).value = ''); document.getElementById('f-search').value = ''; renderLeads();
} function itBadgeClass(t) { return t === 'Cloud' ? 'badge-cloud' : t === 'On-Premise' ? 'badge-onprem' : 'badge-hybrid'; } function renderLeads() { const ind = document.getElementById('f-industry').value; const type = document.getElementById('f-ittype').value; const icp = document.getElementById('f-icp').value; const tier = document.getElementById('f-tier').value; const size = document.getElementById('f-size').value; const q = document.getElementById('f-search').value.toLowerCase().trim(); let leads = allLeads.filter(l => (!ind || l.industry === ind) && (!type || l.it_type === type) && (!icp || (l.icp && l.icp.startsWith(icp))) && (!tier || l.tier === tier) && (!size || l.size === size) && (!q || l.company.toLowerCase().includes(q) || l.contact_name.toLowerCase().includes(q)) ); const importedCount = leads.filter(l => l.imported).length; const mockCount = leads.length - importedCount; document.getElementById('results-count').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} found` + (importedCount ? ` (${mockCount} demo · ${importedCount} imported)` : ''); const container = document.getElementById('lead-list'); if (!leads.length) { container.innerHTML = '<div class="empty-state"><div class="empty-icon"></div>No leads match your filters.</div>'; return; } container.innerHTML = leads.map(l => ` <div class="lead-card" ${l.imported ? 'style="border-left:4px solid #388e3c;"' : ''}> <div class="lead-card-header"> <div> <div class="lead-title"> ${escapeHtml(l.company)} ${l.imported ? '<span class="badge-source">LinkedIn Import</span>' : ''} </div> <div class="lead-meta">${escapeHtml(l.location)} · ${l.employees ? l.employees.toLocaleString() + ' employees' : 'employees unknown'}</div> </div> </div> <div class="badges"> <span class="badge ${l.it_type === 'Unknown' ? '' : itBadgeClass(l.it_type)}" style="${l.it_type === 'Unknown' ? 'background:#f5f5f5;color:#888;' : ''}">${escapeHtml(l.it_type)}</span> <span class="badge badge-industry">${escapeHtml(l.industry)}</span> ${l.icp ? `<span class="badge badge-icp">${escapeHtml(l.icp)}</span>` : ''} ${l.tier ? `<span class="badge badge-${l.tier.toLowerCase().replace(' ','')}" style="background:${l.tier === 'Tier 1' ? '#e8f5e9' : l.tier === 'Tier 2' ? '#fff8e1' : '#f5f5f5'};color:${l.tier === 'Tier 1' ? '#1b5e20' : l.tier === 'Tier 2' ? '#e65100' : '#616161'};">${escapeHtml(l.tier)}</span>` : ''} ${l.size ? `<span class="badge" style="background:#e0f7fa;color:#006064;">${escapeHtml(l.size)} emp</span>` : ''} </div> <div class="lead-contact"> <strong>${escapeHtml(l.contact_name)}</strong> — ${escapeHtml(l.contact_title)}<br> ${escapeHtml(l.contact_email)} &nbsp;|&nbsp; ${escapeHtml(l.contact_phone)} ${l.website && l.website !== '—' ? `&nbsp;|&nbsp; <a href="${l.website.startsWith('http') ? l.website : 'https://'+l.website}" target="_blank" style="color:var(--accent)">LinkedIn</a>` : ''} </div> <div class="lead-infra"> <strong>Infra:</strong> ${escapeHtml(l.current_infra)}</div> <div class="lead-pain" style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;"> <span> <strong>Pain Points:</strong> <span class="pp-chips">${(l.pain_points||[]).length ? (l.pain_points||[]).map(p => `<span class="pp-chip" onclick="openEditPainPoints(${l.id})" title="Click to edit">${escapeHtml(p)}</span>`).join('') : '<em style="color:#aaa">No pain points set</em>'}</span></span> <button onclick="openEditPainPoints(${l.id})" title="Edit pain points" style="background:none;border:1px solid #aac4e0;border-radius:6px;padding:1px 8px;font-size:11px;color:#00356C;cursor:pointer;white-space:nowrap;flex-shrink:0;"> Edit</button> <button onclick="openEditIcpTier(${l.id})" title="Edit ICP / Tier" style="background:none;border:1px solid #aac4e0;border-radius:6px;padding:1px 8px;font-size:11px;color:#004d40;cursor:pointer;white-space:nowrap;flex-shrink:0;"> ICP</button> </div> <div class="lead-budget"> <strong>IT Budget:</strong> ${escapeHtml(l.annual_it_budget)}</div> <div class="lead-actions"> <button class="btn btn-primary btn-sm" onclick="goToScript(${l.id})">Generate Script</button> <button class="btn btn-secondary btn-sm" onclick="goToTracker(${l.id})">Log a Call</button> <button class="btn btn-accent btn-sm" onclick="runIntelligence(${l.id})" style="background:var(--accent);color:#fff;border-color:var(--accent);">Intelligence</button> <button class="btn btn-danger btn-sm" onclick="deleteLead(${l.id})">Remove</button> </div> </div> `).join('');
} async function deleteLead(id) { const lead = allLeads.find(l => l.id === id); if (!lead) return; if (lead.imported) await window._supabase.from('leads').delete().eq('id', id); allLeads = allLeads.filter(l => l.id !== id); refreshLeadSources(); renderLeads(); renderPPGlance(); showToast(`Removed ${lead.company}`);
} let editPPLeadId = null; function renderPPChips() {
  const chips = document.getElementById('edit-pp-chips');
  const pps = window._editPPList || [];
  chips.innerHTML = pps.map((pp, i) => { const _pp = escapeHtml(pp); return `
    <div style="display:flex;align-items:center;gap:6px;background:#e8f0fb;border:1px solid #aac4e0;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:500;color:#00356C;">
      <span contenteditable="true" onblur="updatePPChip(${i}, this.textContent)" style="outline:none;min-width:20px;">${_pp}</span>
      <button onclick="removePPChip(${i})" style="background:none;border:none;cursor:pointer;color:#c62828;font-size:15px;line-height:1;padding:0 2px;" title="Remove">&times;</button>
    </div>`}).join('');
}
function addPainPointChip() {
  const input = document.getElementById('edit-pp-input');
  const val = input.value.trim();
  if (!val) { showToast('Enter a pain point first.'); return; }
  if (!window._editPPList) window._editPPList = [];
  window._editPPList.push(val);
  input.value = '';
  renderPPChips();
  input.focus();
}
function removePPChip(i) {
  window._editPPList.splice(i, 1);
  renderPPChips();
}
function updatePPChip(i, val) {
  const v = val.trim();
  if (v) window._editPPList[i] = v;
  else { window._editPPList.splice(i, 1); renderPPChips(); }
}
function openEditPainPoints(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  editPPLeadId = id;
  window._editPPList = [...(lead.pain_points || [])];
  document.getElementById('edit-pp-company').textContent = `${lead.company} — ${lead.contact_name}`;
  document.getElementById('edit-pp-input').value = '';
  renderPPChips();
  document.getElementById('edit-pp-modal').classList.add('open');
}
function closeEditPainPoints() {
  document.getElementById('edit-pp-modal').classList.remove('open');
  editPPLeadId = null;
  window._editPPList = [];
}
async function saveEditPainPoints() {
  const lead = allLeads.find(l => l.id === editPPLeadId);
  if (!lead) return;
  const lines = (window._editPPList || []).map(s => s.trim()).filter(Boolean);
  if (!lines.length) { showToast('Add at least one pain point.'); return; }
  const { error } = await supabase.from('leads').update({ pain_points: lines }).eq('id', editPPLeadId);
  if (error) { showToast('Error saving pain points: ' + error.message); return; }
  lead.pain_points = lines;
  manuallyEditedLeads.add(lead.id);
  closeEditPainPoints();
  renderLeads();
  renderPPGlance();
  showToast(`Pain points saved for ${lead.company}`);
}
function reInferPainPoints() {
  const lead = allLeads.find(l => l.id === editPPLeadId);
  if (!lead) return;
  window._editPPList = inferPainPoints(lead.contact_title || '', lead.industry || '');
  renderPPChips();
  showToast('Re-inferred from title & industry');
}
let editIcpLeadId = null;
function openEditIcpTier(id) {
  const lead = allLeads.find(l => l.id === id);
  if (!lead) return;
  editIcpLeadId = id;
  document.getElementById('edit-icp-company').textContent = `${lead.company} — ${lead.contact_name}`;
  document.getElementById('edit-icp-select').value = lead.icp || '';
  document.getElementById('edit-tier-select').value = lead.tier || '';
  document.getElementById('edit-icp-modal').classList.add('open');
}
function closeEditIcpTier() {
  document.getElementById('edit-icp-modal').classList.remove('open');
  editIcpLeadId = null;
}
async function saveEditIcpTier() {
  const lead = allLeads.find(l => l.id === editIcpLeadId);
  if (!lead) return;
  const icpVal = document.getElementById('edit-icp-select').value;
  const tierVal = document.getElementById('edit-tier-select').value;
  const { error } = await supabase.from('leads').update({ icp: icpVal || null, tier: tierVal || null }).eq('id', editIcpLeadId);
  if (error) { showToast('Error saving ICP/Tier: ' + error.message); return; }
  lead.icp = icpVal || '';
  lead.tier = tierVal || '';
  closeEditIcpTier();
  renderLeads();
  showToast(`ICP/Tier saved for ${lead.company}`);
}
// End Edit Pain Points // // TONE SELECTOR
function initToneSelector() { const container = document.getElementById('tone-selector'); container.innerHTML = Object.entries(TONES).map(([key, t]) => ` <label class="tone-opt"> <input type="radio" name="tone" value="${key}" ${key === activeTone ? 'checked' : ''} onchange="activeTone='${key}'; renderScript()"/> <div class="tone-card"> ${t.icon ? `<span class="tone-icon">${t.icon}</span>` : ``} <div class="tone-name">${t.label}</div> <div class="tone-desc">${t.desc}</div> </div> </label> `).join('');
} // // SCRIPT GENERATOR
function initScriptSelect() { const sel = document.getElementById('script-lead-select'); sel.innerHTML = allLeads.map(l => `<option value="${l.id}">${escapeHtml(l.company)} — ${escapeHtml(l.contact_name)}${l.imported ? ' ' : ''}</option>`).join('');
} function refreshScriptSelect() { const sel = document.getElementById('script-lead-select'); const cur = sel.value; sel.innerHTML = allLeads.map(l => `<option value="${l.id}">${escapeHtml(l.company)} — ${escapeHtml(l.contact_name)}${l.imported ? ' ' : ''}</option>`).join(''); if (cur) sel.value = cur;
} function firstName(lead) { const parts = lead.contact_name.replace(/^Dr\.\s*/,'').split(' '); return parts[0];
} function fill(template, lead, solutions) { const fn = firstName(lead); const solutionNames = solutions.map(s => s.service).join(' and '); return template .replace(/{firstName}/g, fn) .replace(/{rep}/g, REP_NAME) .replace(/{company}/g, lead.company) .replace(/{industry}/g, lead.industry) .replace(/{pain1}/g, lead.pain_points[0] || 'infrastructure complexity') .replace(/{pain2}/g, lead.pain_points[1] || 'rising costs') .replace(/{infra}/g, lead.current_infra) .replace(/{solutions}/g, solutionNames);
} function copySection(btn) {
  const box = btn.closest('.script-section').querySelector('.script-box');
  navigator.clipboard.writeText(box.innerText).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.color = '#2e7d32';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
  });
}
function renderScript() { const sel = document.getElementById('script-lead-select'); if (selectedLeadId) { sel.value = selectedLeadId; selectedLeadId = null; } const lead = allLeads.find(l => l.id == sel.value) || allLeads[0]; sel.value = lead.id; const tone = TONES[activeTone]; const allSolutions = []; lead.pain_points.forEach(pp => { const matched = matchSolutions(pp); matched.forEach(sol => { if (!allSolutions.find(s => s.service === sol.service)) allSolutions.push(sol); }); }); const urgencyLabel = { critical: 'Critical', high: 'High', medium: 'Active' }; const urgencyClass = { critical: 'urgency-critical', high: 'urgency-high', medium: 'urgency-medium' }; const allCards = []; const seenServices = new Set(); lead.pain_points.forEach(pp => { matchSolutions(pp).forEach(sol => { if (!seenServices.has(sol.service)) { seenServices.add(sol.service); allCards.push({ pp, sol }); } }); }); document.getElementById('solutions-grid').innerHTML = allCards.map(({ pp, sol }) => ` <div class="solution-card"> <div class="solution-card-icon">${sol.icon}</div> <div class="solution-card-body"> <div class="solution-card-top"> <div class="solution-name">${sol.service}</div> <span class="urgency-badge ${urgencyClass[sol.urgency]}">${urgencyLabel[sol.urgency]}</span> </div> <div class="solution-pain">Pain: ${escapeHtml(pp)}</div> <div class="solution-trend">${escapeHtml(sol.trend)}</div> <div class="solution-buysignal">${escapeHtml(sol.buySignal)}</div> <hr class="solution-divider"/> <div class="solution-pitch">${escapeHtml(sol.pitch)}</div> <div class="solution-stat">${escapeHtml(sol.stat)}</div> </div> </div> `).join(''); const criticalSols = allCards.filter(c => c.sol.urgency === 'critical'); const topSol = allCards[0] ? allCards[0].sol : null; const talkingPoints = [ `Lead with: ${lead.it_type === 'Cloud' ? '"AI cost governance and cloud overspend"' : lead.it_type === 'On-Premise' ? '"EOL risk and the cost of staying put"' : '"hybrid complexity — visibility gaps and security blind spots"'}`, `Relevant trend to mention: ${criticalSols.length ? `"${criticalSols[0].sol.trend}"` : `Gartner ranks IT modernization as a top-3 CIO priority in 2025`}`, `Market signal: ${criticalSols.length ? criticalSols[0].sol.buySignal : 'Active budget allocated for managed infrastructure in 2025'}`, `Biggest pain to focus on: "${lead.pain_points[0]}" → lead with ${topSol ? topSol.service : 'CES managed services'}`, `Stat to back it up: ${topSol ? topSol.stat : 'CES clients average 30% cost reduction within 90 days'}`, `${lead.annual_it_budget !== 'N/A' ? `Budget context: ${lead.annual_it_budget} IT budget — this is a real spend conversation` : 'Research their IT spend from LinkedIn/Apollo before calling'}`, `Tone: ${tone.label} — ${tone.note}. Don't jump to pricing. Always lead with the free Infrastructure Assessment.`, ]; document.getElementById('talking-points-list').innerHTML = talkingPoints.map((tp, i) => ` <div class="tp-item"> <div class="tp-bullet">${i+1}</div> <div>${tp}</div> </div> `).join(''); const sections = [ { label: 'Opening', key: 'hook' }, { label: 'Discovery', key: 'pain' }, { label: 'Value', key: 'value' }, { label: 'If they push back', key: 'objection' }, { label: 'Close', key: 'cta' }, ]; document.getElementById('script-output').innerHTML = ` <div class="script-header"> <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;"> <span class="badge ${itBadgeClass(lead.it_type)}">${lead.it_type}</span> <span class="badge badge-industry">${lead.industry}</span> <span style="font-size:12px;background:#e8f5e9;color:#2e7d32;padding:3px 10px;border-radius:20px;font-weight:700;">${tone.label} Tone</span> </div> <div class="script-header-name">${lead.contact_name} — ${lead.company}</div> <div class="script-header-meta">${lead.contact_title} · ${lead.contact_phone} · ${lead.contact_email}</div> </div> ${sections.map(s => ` <div class="script-section"> <div class="section-label" style="display:flex;align-items:center;justify-content:space-between;"> <span>${s.label} <span class="tone-note">${tone.label}</span></span> <button onclick="copySection(this)" style="background:none;border:1px solid #aac4e0;border-radius:6px;padding:2px 10px;font-size:11px;color:#00356C;cursor:pointer;font-family:inherit;white-space:nowrap;">Copy</button> </div> <div class="script-box">${fill(tone.scripts[s.key], lead, allSolutions)}</div> </div> `).join('')} `; document.getElementById('objections-panel').innerHTML = OBJECTIONS.map(o => ` <div class="objection-item"> <div class="objection-q">${o.q}</div> <div class="objection-a">${fill(o.responses[activeTone] || o.responses.consultative, lead, allSolutions)}</div> </div> `).join('');
} function toggleObjections() { const panel = document.getElementById('objections-panel'); const lbl = document.getElementById('obj-toggle-label'); panel.classList.toggle('open'); lbl.textContent = panel.classList.contains('open') ? 'Hide Common Objections' : 'Show Common Objections';
} function buildFullScript() { const lead = allLeads.find(l => l.id == document.getElementById('script-lead-select').value) || allLeads[0]; const tone = TONES[activeTone]; const allSolutions = []; lead.pain_points.forEach(pp => matchSolutions(pp).forEach(sol => { if (!allSolutions.find(s => s.service === sol.service)) allSolutions.push(sol); })); const sections = [ ['Opening', tone.scripts.hook], ['Discovery', tone.scripts.pain], ['Value', tone.scripts.value], ['If they push back', tone.scripts.objection], ['Close', tone.scripts.cta], ]; const header = `CES Cold Call Script
${tone.label} tone | ${lead.contact_name}, ${lead.contact_title}
${lead.company} | ${lead.contact_phone} | ${lead.contact_email}\n\n`; return header + sections.map(([t, c]) => `${t}\n${fill(c, lead, allSolutions)}`).join('\n\n');
} function downloadScript() { const lead = allLeads.find(l => l.id == document.getElementById('script-lead-select').value) || allLeads[0]; const blob = new Blob([buildFullScript()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Script_${lead.company.replace(/\s+/g,'_')}_${activeTone}.txt`; a.click();
} function copyScript() { navigator.clipboard.writeText(buildFullScript()).then(() => showToast('Script copied to clipboard!'));
} // // CALL TRACKER
function initLogForm() { refreshLogLeadSelect(); document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
} function refreshLogLeadSelect() { const cur = document.getElementById('log-lead').value; document.getElementById('log-lead').innerHTML = allLeads.map(l => `<option value="${l.id}">${escapeHtml(l.company)} — ${escapeHtml(l.contact_name)}${l.imported ? ' ' : ''}</option>`).join(''); if (cur) document.getElementById('log-lead').value = cur;
} function renderTracker() { if (selectedLeadId) { document.getElementById('log-lead').value = selectedLeadId; selectedLeadId = null; } renderPipeline(); renderFollowupAlert(); renderCallLog();
} function renderPipeline() { const statuses = ['Prospect','Contacted','Voicemail','Follow-up Scheduled','Qualified','Not Interested','Closed Won']; document.getElementById('pipeline-row').innerHTML = statuses.map(s => ` <div class="pipeline-card"> <div class="p-label">${s}</div> <div class="p-count">${callLog.filter(c => c.outcome === s).length}</div> </div> `).join('');
} function renderFollowupAlert() { const today = new Date().toISOString().split('T')[0]; const due = callLog.filter(c => c.follow_up && c.follow_up <= today); document.getElementById('followup-alert').innerHTML = due.length ? `<div class="alert alert-warning"><strong>${due.length} follow-up${due.length > 1 ? 's' : ''} due:</strong> ${due.map(d => `<strong>${escapeHtml(d.company)}</strong> (due ${escapeHtml(d.follow_up)})`).join(', ')}</div>` : '';

} const STATUS_CLASS = { 'Prospect':'s-prospect','Contacted':'s-contacted','Voicemail':'s-voicemail','Follow-up Scheduled':'s-followup','Qualified':'s-qualified','Not Interested':'s-notinterested','Closed Won':'s-closedwon' }; function renderCallLog() { const filterOutcome = document.getElementById('tracker-filter-outcome').value; const search = document.getElementById('tracker-search').value.toLowerCase(); let logs = [...callLog].reverse().filter(c => (!filterOutcome || c.outcome === filterOutcome) && (!search || c.company.toLowerCase().includes(search)) ); const el = document.getElementById('call-log-table'); if (!logs.length) { el.innerHTML = callLog.length ? '<div class="empty-state"><div class="empty-icon"></div>No calls match the current filters.</div>' : '<div class="empty-state"><div class="empty-icon"></div>No calls logged yet. Use the form above to get started.</div>'; return; } el.innerHTML = `<table><thead><tr> <th>Date</th><th>Company</th><th>Contact</th><th>Title</th><th>Outcome</th><th>Notes</th><th>Follow-up</th><th></th> </tr></thead><tbody> ${logs.map(c => `<tr> <td style="white-space:nowrap">${escapeHtml(c.date)}</td> <td><strong>${escapeHtml(c.company)}</strong></td> <td>${escapeHtml(c.contact_name)}</td> <td style="color:#666">${escapeHtml(c.contact_title)}</td> <td><span class="status-badge ${STATUS_CLASS[c.outcome]||''}">${escapeHtml(c.outcome)}</span></td> <td style="max-width:200px;color:#555">${escapeHtml(c.notes)||'—'}</td> <td style="white-space:nowrap">${escapeHtml(c.follow_up)||'—'}</td> <td><button class="btn btn-danger btn-sm" onclick="deleteCall(${c.id})">Delete</button></td> </tr>`).join('')} </tbody></table>`;
} async function saveCall() { const leadId = parseInt(document.getElementById('log-lead').value); const lead = allLeads.find(l => l.id === leadId); const date = document.getElementById('log-date').value; if (!date) { showToast('Please enter a call date.'); return; } const entry = { lead_id: leadId, rep: REP_NAME, date, outcome: document.getElementById('log-outcome').value, notes: document.getElementById('log-notes').value.trim(), next_action_date: document.getElementById('log-followup').value || null }; const { data: saved, error } = await window._supabase.from('call_logs').insert(entry).select().single(); if (error) { showToast('Error saving call: ' + error.message); return; } const enriched = { ...saved, company: lead.company, contact_name: lead.contact_name, contact_title: lead.contact_title, follow_up: saved.next_action_date }; callLog.push(enriched); saveLog(); showToast(`Call logged for ${lead.company}`); clearLogForm(); renderTracker();
} function clearLogForm() { document.getElementById('log-notes').value = ''; document.getElementById('log-followup').value = ''; document.getElementById('log-outcome').value = 'Prospect'; document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
} async function deleteCall(id) { if (!confirm('Delete this call log entry?')) return; await window._supabase.from('call_logs').delete().eq('id', id); callLog = callLog.filter(c => c.id !== id); saveLog(); renderTracker(); showToast('Entry deleted.');
} function exportCSV() { if (!callLog.length) { showToast('No calls to export.'); return; } const headers = ['Date','Company','Contact','Title','Outcome','Notes','Follow-up']; const rows = callLog.map(c => [c.date, c.company, c.contact_name, c.contact_title, c.outcome, `"${(c.notes||'').replace(/"/g,'""')}"`, c.follow_up||'']); const csv = [headers,...rows].map(r => r.join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `CES_Call_Log_${new Date().toISOString().split('T')[0]}.csv`; a.click();
} // // API SOURCES
let apiKeys = JSON.parse(localStorage.getItem('ces_api_keys') || '{}');
let apolloResults = [];
let hunterResults = [];
let clearbitTimer = null; function saveApiKey(source) { if (source === 'apollo') { const key = document.getElementById('apollo-key').value.trim(); if (!key) { showToast('Please enter a key first.'); return; } apiKeys.apollo = key; } else if (source === 'hunter') { const key = document.getElementById('hunter-key').value.trim(); if (!key) { showToast('Please enter a key first.'); return; } apiKeys.hunter = key; } else if (source === 'snov') { const id = document.getElementById('snov-client-id').value.trim(); const sec = document.getElementById('snov-client-secret').value.trim(); if (!id || !sec) { showToast('Please enter both Client ID and Secret.'); return; } apiKeys.snov_id = id; apiKeys.snov_secret = sec; } localStorage.setItem('ces_api_keys', JSON.stringify(apiKeys)); updateApiKeyStatuses(); showToast('API key saved!');
} function markApiKeyDirty(source) { const statusEl = document.getElementById(source + '-key-status'); if (statusEl) { statusEl.textContent = 'Unsaved'; statusEl.className = 'api-key-status status-missing'; }
} function toggleKeyVisibility(inputId) { const el = document.getElementById(inputId); el.type = el.type === 'password' ? 'text' : 'password';
} function updateApiKeyStatuses() { const setStatus = (id, msg, cls) => { const el = document.getElementById(id); if (el) { el.textContent = msg; el.className = 'api-key-status ' + cls; } }; const updateTabBadge = (id, msg, connected) => { const el = document.getElementById('tab-badge-' + id); if (el) { el.textContent = msg; el.className = 'tab-badge' + (connected ? ' connected' : ''); } }; if (apiKeys.apollo) { setStatus('apollo-key-status', 'Key saved', 'status-ok'); updateTabBadge('apollo', 'Connected', true); document.getElementById('apollo-key').value = '•'.repeat(20); } else { setStatus('apollo-key-status', 'Not saved', 'status-missing'); updateTabBadge('apollo', 'Not connected', false); } if (apiKeys.hunter) { setStatus('hunter-key-status', 'Key saved', 'status-ok'); updateTabBadge('hunter', 'Connected', true); document.getElementById('hunter-key').value = '•'.repeat(20); } else { setStatus('hunter-key-status', 'Not saved', 'status-missing'); updateTabBadge('hunter', 'Not connected', false); } if (apiKeys.snov_id) { setStatus('snov-key-status', 'Keys saved', 'status-ok'); updateTabBadge('snov', 'Connected', true); } else { setStatus('snov-key-status', 'Not saved', 'status-missing'); updateTabBadge('snov', 'Not connected', false); } document.getElementById('tab-badge-clearbit').className = 'tab-badge connected';
} function switchApiTab(tab) { document.querySelectorAll('.api-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.api-panel').forEach(p => p.classList.remove('active')); document.getElementById('api-panel-' + tab).classList.add('active'); event.currentTarget.classList.add('active');
} function initApiPage() { updateApiKeyStatuses(); } const apolloTitles = ['CTO', 'CIO', 'VP of IT', 'IT Director', 'Head of Infrastructure'];
function renderApolloTitleTags() { const container = document.getElementById('apollo-titles-tags'); const input = document.getElementById('apollo-titles-input'); container.innerHTML = ''; apolloTitles.forEach((t, i) => { const tag = document.createElement('span'); tag.className = 'tag'; tag.innerHTML = `${t} <span class="tag-remove" onclick="removeApolloTitle(${i})"></span>`; container.appendChild(tag); }); container.appendChild(input);
}
function addTag(e, id) { if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); if (id === 'apollo-titles') { apolloTitles.push(e.target.value.trim()); e.target.value = ''; renderApolloTitleTags(); } }
}
function removeApolloTitle(i) { apolloTitles.splice(i,1); renderApolloTitleTags(); } async function runApolloSearch() { if (!apiKeys.apollo) { showToast('Please save your Apollo.io API key first.'); return; } const btn = document.getElementById('apollo-search-btn'); const statusEl = document.getElementById('apollo-search-status'); btn.innerHTML = '<span class="spinner"></span>Searching…'; btn.disabled = true; statusEl.textContent = ''; document.getElementById('apollo-cors-warning').style.display = 'none'; document.getElementById('apollo-results-section').style.display = 'none'; const size = document.getElementById('apollo-size').value; const body = { api_key: apiKeys.apollo, page: 1, per_page: parseInt(document.getElementById('apollo-per-page').value), person_titles: apolloTitles.length ? apolloTitles : undefined, q_keywords: document.getElementById('apollo-keywords').value.trim() || undefined, person_locations: document.getElementById('apollo-location').value.trim() ? [document.getElementById('apollo-location').value.trim()] : undefined, organization_num_employees_ranges: size ? [size] : undefined, organization_industry_tag_ids: undefined, }; const ind = document.getElementById('apollo-industry').value; if (ind) body.organization_industry_tag_ids = [ind]; const curlCmd = buildApolloCurl(body); document.getElementById('apollo-curl-box').textContent = curlCmd; try { const resp = await fetch('https://api.apollo.io/v1/mixed_people/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, body: JSON.stringify(body), }); if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.message || `HTTP ${resp.status}`); } const data = await resp.json(); apolloResults = data.people || data.contacts || []; renderApolloResults(data); } catch(err) { if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {  document.getElementById('apollo-cors-warning').style.display = 'block'; statusEl.textContent = 'Direct call blocked by browser — use the Terminal command below.'; statusEl.style.color = '#e65100'; } else { statusEl.textContent = ' ' + err.message; statusEl.style.color = '#c62828'; } } finally { btn.textContent = 'Search Apollo'; btn.disabled = false; }
} function buildApolloCurl(body) { return `curl -X POST "https://api.apollo.io/v1/mixed_people/search" \\ -H "Content-Type: application/json" \\ -d '${JSON.stringify(body, null, 2)}'`;
} function copyApolloCommand() { navigator.clipboard.writeText(document.getElementById('apollo-curl-box').textContent); showToast('Command copied!');
} function renderApolloResults(data) { const people = data.people || data.contacts || []; const total = data.pagination?.total_entries || people.length; apolloResults = people; document.getElementById('apollo-results-section').style.display = 'block'; document.getElementById('apollo-results-count').textContent = `${people.length} results returned${total > people.length ? ` of ${total.toLocaleString()} total` : ''} — Apollo.io`; if (!people.length) { document.getElementById('apollo-results-list').innerHTML = '<div class="empty-state"><div class="empty-icon"></div>No results. Try broader filters.</div>'; document.getElementById('apollo-import-all-btn').style.display = 'none'; return; } document.getElementById('apollo-import-all-btn').style.display = 'inline-block'; document.getElementById('apollo-results-list').innerHTML = people.map((p, i) => { const org = p.organization || p.account || {}; const email = p.email || (p.contact && p.contact.email) || '—'; const phone = p.phone_numbers?.[0]?.raw_number || p.phone || '—'; const city = escapeHtml(p.city || ''); const state = escapeHtml(p.state || ''); const country = escapeHtml(p.country || ''); const linkedin = p.linkedin_url ? escapeHtml(p.linkedin_url) : ''; return ` <div class="api-result-card"> <div class="api-result-info"> <div class="api-result-name">${escapeHtml(p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '—')}</div> <div class="api-result-title">${escapeHtml(p.title || '—')}</div> <div class="api-result-company">${escapeHtml(org.name || p.organization_name || '—')}</div> <div class="api-result-meta"> <span> ${escapeHtml(email)}</span> <span> ${escapeHtml(phone)}</span> <span> ${escapeHtml(org.industry || p.industry || '—')}</span> <span> ${org.employee_count ? org.employee_count.toLocaleString() + ' emp' : '—'}</span> <span> ${city} ${state} ${country}</span> ${linkedin ? `<span> <a href="${linkedin}" target="_blank" style="color:var(--accent)">LinkedIn</a></span>` : ''} </div> </div> <div class="api-result-actions"> <button class="btn btn-primary btn-sm" onclick="importSingleApolloResult(${i})">+ Add Lead</button> ${email !== '—' ? '<span style="font-size:10px;color:#2e7d32;font-weight:700;"> Has Email</span>' : '<span style="font-size:10px;color:#aaa;">No email</span>'} </div> </div> `; }).join('');
} function apolloPersonToLead(p, idx) { const org = p.organization || p.account || {}; const emp = org.employee_count || 0; let size = '200-500'; if (emp <= 50) size = '1-50'; else if (emp <= 200) size = '50-200'; else if (emp <= 500) size = '200-500'; else if (emp <= 1000) size = '500-1000'; else if (emp <= 5000) size = '1000-5000'; else size = '5000+'; const ind = org.industry || p.industry || 'Other'; return { company: org.name || p.organization_name || '—', contact_name: p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '—', contact_title: p.title || '—', industry: ind, size, employees: emp, location: [p.city, p.state, p.country].filter(Boolean).join(', ') || '—', contact_email: p.email || '—', contact_phone: p.phone_numbers?.[0]?.raw_number || p.phone || '—', website: p.linkedin_url || org.website_url || '—', it_type: inferITType(ind), current_infra: 'Apollo.io import — enrich after qualifying', pain_points: inferPainPoints(p.title, ind), annual_it_budget: '—', icp: inferICP(ind, emp), tier: inferTier(ind, emp, ''), imported: true, _source: 'Apollo.io', };
} async function importSingleApolloResult(i) { const lead = apolloPersonToLead(apolloResults[i], i); const row = leadToDbRow(lead); const { data: saved } = await window._supabase.from('leads').insert(row).select().single(); const newLead = saved ? dbRowToLead({ ...saved, imported: true }) : { ...lead, imported: true }; allLeads.push(newLead); refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${lead.contact_name} added to leads`);
} async function importAllApolloResults() { const newLeads = apolloResults.map((p, i) => apolloPersonToLead(p, i)); const rows = newLeads.map(l => leadToDbRow(l)); const { data: saved } = await window._supabase.from('leads').insert(rows).select(); if (saved) { saved.forEach(s => allLeads.push(dbRowToLead({ ...s, imported: true }))); } else { newLeads.forEach(l => allLeads.push({ ...l, imported: true })); } refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${newLeads.length} Apollo leads imported!`);
} function clearApolloResults() { apolloResults = []; document.getElementById('apollo-results-section').style.display = 'none'; document.getElementById('apollo-cors-warning').style.display = 'none'; document.getElementById('apollo-search-status').textContent = '';
} function parseApolloJson() { try { const raw = document.getElementById('apollo-paste-json').value.trim(); const data = JSON.parse(raw); renderApolloResults(data); document.getElementById('apollo-cors-warning').style.display = 'none'; } catch(e) { showToast('Invalid JSON — check the pasted content'); }
} async function runHunterSearch() { if (!apiKeys.hunter) { showToast('Please save your Hunter.io API key first.'); return; } const domain = document.getElementById('hunter-domain').value.trim(); if (!domain) { showToast('Please enter a company domain.'); return; } const statusEl = document.getElementById('hunter-search-status'); statusEl.innerHTML = '<span class="spinner"></span>Searching…'; document.getElementById('hunter-results-section').style.display = 'none'; const limit = document.getElementById('hunter-limit').value; const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=${limit}&api_key=${apiKeys.hunter}`; try { const resp = await fetch(url); if (!resp.ok) throw new Error(`HTTP ${resp.status}`); const data = await resp.json(); hunterResults = (data.data?.emails || []).map(e => ({ ...e, domain, organization: data.data?.organization })); renderHunterResults(data.data, domain); statusEl.textContent = ''; } catch(err) { statusEl.textContent = ' ' + (err.message.includes('fetch') ? 'Network error — check your API key and domain.' : err.message); statusEl.style.color = '#c62828'; }
} function renderHunterResults(data, domain) { if (!data) return; const emails = data.emails || []; document.getElementById('hunter-results-section').style.display = 'block'; document.getElementById('hunter-results-count').textContent = `${emails.length} emails found for ${escapeHtml(data.organization || domain)} — Hunter.io`; if (!emails.length) { document.getElementById('hunter-results-list').innerHTML = '<div class="empty-state"><div class="empty-icon"></div>No emails found for this domain.</div>'; return; } const escDomain = escapeJsStr(domain); const escOrg = escapeJsStr(data.organization || domain); document.getElementById('hunter-results-list').innerHTML = emails.map((e, i) => ` <div class="api-result-card"> <div class="api-result-info"> <div class="api-result-name">${escapeHtml([e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown')}</div> <div class="api-result-title">${escapeHtml(e.position || '—')}</div> <div class="api-result-company">${escapeHtml(data.organization || domain)}</div> <div class="api-result-meta"> <span> ${escapeHtml(e.value)}</span> <span style="color:${e.confidence > 70 ? '#2e7d32' : '#e65100'};"> ${escapeHtml(e.confidence)}% confidence</span> ${e.linkedin ? `<span> <a href="${escapeHtml(e.linkedin)}" target="_blank" style="color:var(--accent)">LinkedIn</a></span>` : ''} <span>${e.sources?.length || 0} source(s)</span> </div> </div> <div class="api-result-actions"> <button class="btn btn-primary btn-sm" onclick="importSingleHunterResult(${i}, '${escDomain}', '${escOrg}')">+ Add Lead</button> <span style="font-size:10px;color:${e.confidence > 70 ? '#2e7d32' : '#e65100'};font-weight:700;">${e.confidence > 70 ? ' Verified' : '~ Guessed'}</span> </div> </div> `).join('');
} async function importSingleHunterResult(i, domain, orgName) { const e = hunterResults[i]; const lead = { company: orgName, contact_name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown', contact_title: e.position || '—', industry: 'Other', size: '—', employees: 0, location: '—', contact_email: e.value, contact_phone: '—', website: e.linkedin || `https://${domain}`, it_type: inferITType(null), current_infra: 'Hunter.io import — enrich after qualifying', pain_points: inferPainPoints(e.position, null), annual_it_budget: '—', icp: inferICP('Other', 0), tier: inferTier('Other', 0, ''), imported: true, _source: 'Hunter.io', }; const rowH = leadToDbRow(lead); const { data: savedH } = await window._supabase.from('leads').insert(rowH).select().single(); const newLeadH = savedH ? dbRowToLead({ ...savedH, imported: true }) : { ...lead, imported: true }; allLeads.push(newLeadH); refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${lead.contact_name} added to leads`);
} async function importAllHunterResults() { const domain = document.getElementById('hunter-domain').value.trim(); const newLeads = hunterResults.map((e, i) => ({ company: e.organization || domain, contact_name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown', contact_title: e.position || '—', industry: 'Other', size: '—', employees: 0, location: '—', contact_email: e.value, contact_phone: '—', website: e.linkedin || `https://${domain}`, it_type: inferITType(null), current_infra: 'Hunter.io import — enrich after qualifying', pain_points: inferPainPoints(e.position, null), annual_it_budget: '—', icp: inferICP('Other', 0), tier: inferTier('Other', 0, ''), imported: true, _source: 'Hunter.io', })); const rowsHA = newLeads.map(l => leadToDbRow(l)); const { data: savedHA } = await window._supabase.from('leads').insert(rowsHA).select(); if (savedHA) { savedHA.forEach(s => allLeads.push(dbRowToLead({ ...s, imported: true }))); } else { newLeads.forEach(l => allLeads.push({ ...l, imported: true })); } refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${newLeads.length} Hunter.io leads imported!`);
} function debouncedClearbit() { clearTimeout(clearbitTimer); clearbitTimer = setTimeout(runClearbitSearch, 350);
} async function runClearbitSearch() { const q = document.getElementById('clearbit-query').value.trim(); const container = document.getElementById('clearbit-results-list'); if (q.length < 2) { container.innerHTML = ''; return; } container.innerHTML = '<span class="spinner"></span> Searching…'; try { const resp = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`); const data = await resp.json(); if (!data.length) { container.innerHTML = '<div style="color:#888;font-size:13px;padding:8px;">No companies found.</div>'; return; } container.innerHTML = data.slice(0, 10).map((c, i) => ` <div class="api-result-card" style="align-items:center;"> <img src="${escapeHtml(c.logo || '')}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:6px;object-fit:contain;background:#f0f4ff;"/> <div class="api-result-info"> <div class="api-result-name">${escapeHtml(c.name)}</div> <div class="api-result-meta"> <span> ${escapeHtml(c.domain)}</span> </div> </div> <div class="api-result-actions"> <button class="btn btn-primary btn-sm" onclick="importClearbitCompany(${i})">+ Add Lead</button> </div> </div> `).join(''); container._data = data; } catch(e) { container.innerHTML = '<div style="color:#c62828;font-size:13px;padding:8px;">Search error — check your connection.</div>'; }
} async function importClearbitCompany(i) { const data = document.getElementById('clearbit-results-list')._data; if (!data || !data[i]) return; const c = data[i]; const ind = c.type || 'Other'; const emp = 0; const lead = { company: c.name, contact_name: 'To be found', contact_title: '—', industry: ind, size: '—', employees: emp, location: '—', contact_email: '—', contact_phone: '—', website: `https://${c.domain}`, it_type: inferITType(ind), current_infra: 'Clearbit import — enrich via Hunter.io or Apollo', pain_points: inferPainPoints(null, ind), annual_it_budget: '—', icp: inferICP(ind, emp), tier: inferTier(ind, emp, ''), imported: true, _source: 'Clearbit', }; const rowC = leadToDbRow(lead); const { data: savedC } = await window._supabase.from('leads').insert(rowC).select().single(); const newLeadC = savedC ? dbRowToLead({ ...savedC, imported: true }) : { ...lead, imported: true }; allLeads.push(newLeadC); refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${c.name} added — use Hunter.io to find contacts`);
} async function runSnovSearch() { if (!apiKeys.snov_id || !apiKeys.snov_secret) { showToast('Please save your Snov.io credentials first.'); return; } const fn = document.getElementById('snov-fname').value.trim(); const ln = document.getElementById('snov-lname').value.trim(); const domain = document.getElementById('snov-domain').value.trim(); if (!fn || !ln || !domain) { showToast('Please fill in First Name, Last Name, and Domain.'); return; } const statusEl = document.getElementById('snov-search-status'); statusEl.innerHTML = '<span class="spinner"></span>Searching…'; document.getElementById('snov-results-section').style.display = 'none'; document.getElementById('snov-cors-warning').style.display = 'none'; const tokenCmd = `# Step 1 — Get access token:\ncurl -X POST "https://api.snov.io/v1/oauth/access_token" \\\n -d "grant_type=client_credentials&client_id=${apiKeys.snov_id}&client_secret=${apiKeys.snov_secret}"\n\n# Step 2 — Find email (replace TOKEN with result from step 1):\ncurl "https://api.snov.io/v1/get-emails-from-names?firstName=${encodeURIComponent(fn)}&lastName=${encodeURIComponent(ln)}&domain=${encodeURIComponent(domain)}&access_token=TOKEN"`; document.getElementById('snov-curl-box').textContent = tokenCmd; try { const tokenResp = await fetch('https://api.snov.io/v1/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=client_credentials&client_id=${apiKeys.snov_id}&client_secret=${apiKeys.snov_secret}`, }); if (!tokenResp.ok) throw new Error('Token fetch failed'); const tokenData = await tokenResp.json(); const token = tokenData.access_token; const searchResp = await fetch(`https://api.snov.io/v1/get-emails-from-names?firstName=${encodeURIComponent(fn)}&lastName=${encodeURIComponent(ln)}&domain=${encodeURIComponent(domain)}&access_token=${token}`); if (!searchResp.ok) throw new Error('Search failed'); const searchData = await searchResp.json(); renderSnovResults(searchData, fn, ln, domain); statusEl.textContent = ''; } catch(err) { if (err.message.includes('fetch') || err.name === 'TypeError') { document.getElementById('snov-cors-warning').style.display = 'block'; statusEl.textContent = 'CORS blocked — use Terminal command below.'; } else { statusEl.textContent = ' ' + err.message; } statusEl.style.color = '#c62828'; }
} function renderSnovResults(data, fn, ln, domain) { const emails = data.emails || []; document.getElementById('snov-results-section').style.display = 'block'; if (!emails.length) { document.getElementById('snov-results-list').innerHTML = '<div style="color:#888;font-size:13px;">No emails found for this name + domain combination.</div>'; return; } const escFn = escapeJsStr(fn); const escLn = escapeJsStr(ln); const escDomain = escapeJsStr(domain); document.getElementById('snov-results-list').innerHTML = emails.map((e, i) => ` <div class="api-result-card"> <div class="api-result-info"> <div class="api-result-name">${escapeHtml(fn)} ${escapeHtml(ln)}</div> <div class="api-result-meta"> <span> ${escapeHtml(e.email)}</span> <span style="color:${e.confidence > 70 ? '#2e7d32' : '#e65100'};"> ${escapeHtml(e.confidence)}% confidence</span> <span>${escapeHtml(e.smtpStatus || '—')}</span> </div> </div> <div class="api-result-actions"> <button class="btn btn-primary btn-sm" onclick="importSnovResult('${escFn} ${escLn}','${escapeJsStr(e.email)}','${escDomain}')">+ Add Lead</button> </div> </div> `).join('');
} async function importSnovResult(name, email, domain) { const ind = 'Other'; const lead = { company: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1), contact_name: name, contact_title: '—', industry: ind, size: '—', employees: 0, location: '—', contact_email: email, contact_phone: '—', website: `https://${domain}`, it_type: inferITType(ind), current_infra: 'Snov.io import — enrich after qualifying', pain_points: inferPainPoints(null, ind), annual_it_budget: '—', icp: inferICP(ind, 0), tier: inferTier(ind, 0, ''), imported: true, _source: 'Snov.io', }; const rowS = leadToDbRow(lead); const { data: savedS } = await window._supabase.from('leads').insert(rowS).select().single(); const newLeadS = savedS ? dbRowToLead({ ...savedS, imported: true }) : { ...lead, imported: true }; allLeads.push(newLeadS); refreshLeadSources(); refreshScriptSelect(); refreshLogLeadSelect(); showToast(`${name} added to leads`);
} function parseSnovJson() { try { const raw = document.getElementById('snov-paste-json').value.trim(); const data = JSON.parse(raw); renderSnovResults(data, document.getElementById('snov-fname').value, document.getElementById('snov-lname').value, document.getElementById('snov-domain').value ); document.getElementById('snov-cors-warning').style.display = 'none'; } catch(e) { showToast('Invalid JSON'); }
} function copySnovCommand() { navigator.clipboard.writeText(document.getElementById('snov-curl-box').textContent); showToast('Command copied!');
} // // TOAST
let toastTimer;
function showToast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// // TOAST

// // INIT
const manuallyEditedLeads = new Set();
async function refreshAllPainPoints() {
  const btn = document.getElementById('refresh-pp-btn');
  btn.disabled = true;
  btn.textContent = 'Refreshing...';
  let updated = 0;
  for (const lead of allLeads) {
    if (manuallyEditedLeads.has(lead.id)) continue;
    const title = lead.contact_title || '';
    const industry = lead.industry || '';
    const newPoints = inferPainPoints(title, industry);
    if (newPoints && newPoints.length) {
      const { error } = await supabase.from('leads').update({ pain_points: newPoints }).eq('id', lead.id);
      if (error) { console.warn('Refresh PP error for', lead.id, error.message); continue; }
      lead.pain_points = newPoints;
      updated++;
    }
  }
  renderLeads();
  renderPPGlance && renderPPGlance();
  btn.disabled = false;
  btn.textContent = ' Refresh Pain Points';
  showToast(`Updated pain points for ${updated} leads from Gartner/McKinsey/Forrester research`);
}

let editSolutionId = null;
async function loadSolutions() {
  try {
    const { data: dbSolutions, error } = await supabase.from('solutions').select('*').order('created_at');
    if (error || !dbSolutions || dbSolutions.length === 0) {
      const { data: seeded, error: seedErr } = await supabase.from('solutions').insert(SEED_SOLUTIONS).select();
      if (seedErr || !seeded) { solutions = SEED_SOLUTIONS; return; }
      solutions = seeded;
    } else {
      solutions = dbSolutions;
    }
  } catch(e) { console.warn('loadSolutions error:', e); solutions = SEED_SOLUTIONS; }
}
function renderSolutionsPage() {
  const el = document.getElementById('solutions-list');
  const adminBar = document.getElementById('solutions-admin-bar');
  if (currentUserRole === 'admin') adminBar.style.display = 'block'; else adminBar.style.display = 'none';
  if (!solutions.length) { el.innerHTML = '<p style="color:#aaa;">No solutions defined.</p>'; return; }
  const q = (document.getElementById('solutions-search').value || '').toLowerCase();
  const uf = document.getElementById('solutions-urgency-filter').value;
  let filtered = solutions;
  if (q) filtered = filtered.filter(s => s.service.toLowerCase().includes(q) || (s.keywords || []).some(k => k.toLowerCase().includes(q)));
  if (uf) filtered = filtered.filter(s => s.urgency === uf);
  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px;">';
  for (const s of filtered) {
    const urgClass = s.urgency === 'critical' ? 'urgency-critical' : s.urgency === 'high' ? 'urgency-high' : 'urgency-medium';
    const keywordsHtml = (s.keywords || []).map(k => '<span style="font-size:10px;background:#dce8f5;color:#00356C;padding:2px 8px;border-radius:10px;font-weight:600;">' + k + '</span>').join('');
    const pitchHtml = s.pitch ? '<div style="font-size:12px;color:#333;line-height:1.6;margin-bottom:6px;">' + s.pitch + '</div>' : '';
    const trendHtml = s.trend ? '<div style="font-size:11px;color:#005f8e;background:#e0f0fa;border-radius:4px;padding:4px 8px;margin-bottom:5px;line-height:1.4;">' + s.trend + '</div>' : '';
    const buyHtml = s.buySignal ? '<div style="font-size:11px;color:#e65100;background:#fff3e0;border-radius:4px;padding:4px 8px;margin-bottom:5px;line-height:1.4;">' + s.buySignal + '</div>' : '';
    const statHtml = s.stat ? '<div style="font-size:11px;color:#2e7d32;font-weight:600;">' + s.stat + '</div>' : '';
    const adminBtns = currentUserRole === 'admin'
      ? '<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn btn-primary btn-sm" onclick="openSolutionModal(\'' + s.id + '\')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteSolution(\'' + s.id + '\',\'' + s.service.replace(/'/g, "\\'") + '\')">Delete</button></div>'
      : '';
    html += '<div class="solution-card" style="flex-direction:column;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:22px;">' + (s.icon || '🔧') + '</span>'
      + '<span style="font-size:14px;font-weight:800;color:#00356C;">' + s.service + '</span>'
      + '</div>'
      + '<span class="urgency-badge ' + urgClass + '">' + s.urgency + '</span>'
      + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">' + keywordsHtml + '</div>'
      + pitchHtml + trendHtml + buyHtml + statHtml
      + adminBtns
      + '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}
function openSolutionModal(id) {
  editSolutionId = id || null;
  document.getElementById('solution-modal-title').textContent = id ? 'Edit Solution' : 'Add Solution';
  const fields = ['service','urgency','icon','keywords','trend','buysignal','pitch','stat'];
  fields.forEach(f => document.getElementById('sol-' + f).value = '');
  if (id) {
    const sol = solutions.find(s => s.id === id);
    if (sol) {
      document.getElementById('sol-service').value = sol.service || '';
      document.getElementById('sol-urgency').value = sol.urgency || 'medium';
      document.getElementById('sol-icon').value = sol.icon || '';
      document.getElementById('sol-keywords').value = (sol.keywords || []).join(', ');
      document.getElementById('sol-trend').value = sol.trend || '';
      document.getElementById('sol-buysignal').value = sol.buySignal || '';
      document.getElementById('sol-pitch').value = sol.pitch || '';
      document.getElementById('sol-stat').value = sol.stat || '';
    }
  }
  document.getElementById('solution-modal').classList.add('open');
}
function closeSolutionModal() {
  document.getElementById('solution-modal').classList.remove('open');
  editSolutionId = null;
}
async function saveSolution() {
  const data = {
    service: document.getElementById('sol-service').value.trim(),
    urgency: document.getElementById('sol-urgency').value,
    icon: document.getElementById('sol-icon').value.trim(),
    keywords: document.getElementById('sol-keywords').value.split(',').map(s => s.trim()).filter(Boolean),
    trend: document.getElementById('sol-trend').value.trim(),
    buySignal: document.getElementById('sol-buysignal').value.trim(),
    pitch: document.getElementById('sol-pitch').value.trim(),
    stat: document.getElementById('sol-stat').value.trim(),
  };
  if (!data.service) { showToast('Service name is required.'); return; }
  try {
    if (editSolutionId) {
      const { error } = await supabase.from('solutions').update(data).eq('id', editSolutionId);
      if (error) { showToast('Error: ' + error.message); return; }
      Object.assign(solutions.find(s => s.id === editSolutionId), data);
    } else {
      const { data: inserted, error } = await supabase.from('solutions').insert(data).select().single();
      if (error) { showToast('Error: ' + error.message); return; }
      if (inserted) solutions.push(inserted);
    }
    closeSolutionModal();
    renderSolutionsPage();
    showToast(editSolutionId ? 'Solution updated.' : 'Solution added.');
  } catch(e) { showToast('Error: ' + e.message); }
}
async function deleteSolution(id, name) {
  if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
  try {
    const { error } = await supabase.from('solutions').delete().eq('id', id);
    if (error) { showToast('Error: ' + error.message); return; }
    solutions = solutions.filter(s => s.id !== id);
    renderSolutionsPage();
    showToast('Deleted ' + name);
  } catch(e) { showToast('Error: ' + e.message); }
}

// Expose as globals for legacy inline onclick handlers
window.addPainPointChip = addPainPointChip;
window.applyIntelAll = applyIntelAll;
window.applyIntelPP = applyIntelPP;
window.clearApolloResults = clearApolloResults;
window.clearFilters = clearFilters;
window.clearImportedLeads = clearImportedLeads;
window.clearLogForm = clearLogForm;
window.closeAiSettings = closeAiSettings;
window.closeEditIcpTier = closeEditIcpTier;
window.closeEditPainPoints = closeEditPainPoints;
window.closeImportModal = closeImportModal;
window.closeIntelModal = closeIntelModal;
window.closePainPointsGlance = closePainPointsGlance;
window.closeSolutionModal = closeSolutionModal;
window.copyApolloCommand = copyApolloCommand;
window.copyScript = copyScript;
window.copySnovCommand = copySnovCommand;
window.currentLeadId = currentLeadId;
window.doSignout = doSignout;
window.downloadScript = downloadScript;
window.exportCSV = exportCSV;
window.goToTracker = goToTracker;
window.importAllApolloResults = importAllApolloResults;
window.importAllHunterResults = importAllHunterResults;
window.importModalBack = importModalBack;
window.importModalNext = importModalNext;
window.openAiSettings = openAiSettings;
window.openImportModal = openImportModal;
window.openPainPointsGlance = openPainPointsGlance;
window.openSolutionModal = openSolutionModal;
window.parseApolloJson = parseApolloJson;
window.parseSnovJson = parseSnovJson;
window.reInferPainPoints = reInferPainPoints;
window.refreshAllPainPoints = refreshAllPainPoints;
window.runApolloSearch = runApolloSearch;
window.runHunterSearch = runHunterSearch;
window.runSnovSearch = runSnovSearch;
window.saveAiSettings = saveAiSettings;
window.saveApiKey = saveApiKey;
window.saveCall = saveCall;
window.saveEditIcpTier = saveEditIcpTier;
window.saveEditPainPoints = saveEditPainPoints;
window.saveSolution = saveSolution;
window.showPage = showPage;
window.switchApiTab = switchApiTab;
window.switchAuthTab = switchAuthTab;
window.toggleKeyVisibility = toggleKeyVisibility;
window.toggleObjections = toggleObjections;

window.initApp = async function() {
  window._supabase = supabase;
  window._dbg = (msg) => {
    const bar = document.getElementById('debug-bar');
    bar.style.display = 'block';
    bar.innerHTML += '<div>' + new Date().toISOString().slice(11,19) + ' ' + msg + '</div>';
    bar.scrollTop = bar.scrollHeight;
    console.log('[DBG]', msg);
  };
  window._dbg('init started');
  showToast('Loading data...');
  try {
    await loadSolutions();
    window._dbg('fetching leads...'); const { data: dbLeads, error: leadsErr } = await supabase.from('leads').select('*').order('created_at'); window._dbg('leads result: ' + (leadsErr ? 'ERR:'+JSON.stringify(leadsErr) : (dbLeads ? dbLeads.length + ' rows' : 'null')));
    if (leadsErr) throw leadsErr;

    if (!dbLeads || dbLeads.length === 0) {
      const seedRows = LEADS.map(l => leadToDbRow(l));
      const { data: seeded, error: seedErr } = await supabase.from('leads').insert(seedRows).select();
      if (seedErr) throw seedErr;
      allLeads = (seeded || []).map(dbRowToLead);
    } else {
      allLeads = dbLeads.map(dbRowToLead);
    }

    const { data: dbLogs, error: logsErr } = await supabase.from('call_logs').select('*').order('created_at');
    if (logsErr) throw logsErr;

    callLog = (dbLogs || []).map(log => {
      const lead = allLeads.find(l => l.id === log.lead_id) || {};
      return {
        ...log,
        company: lead.company || '—',
        contact_name: lead.contact_name || '—',
        contact_title: lead.contact_title || '—',
        follow_up: log.next_action_date,
      };
    });

    // Auto-apply research-based pain points to any lead with fewer than 6
    const leadsNeedingUpdate = allLeads.filter(l => !l.pain_points || l.pain_points.length < 6);
    if (leadsNeedingUpdate.length) {
      for (const lead of leadsNeedingUpdate) {
        const newPoints = inferPainPoints(lead.contact_title || '', lead.industry || '');
        if (newPoints.length) {
          await supabase.from('leads').update({ pain_points: newPoints }).eq('id', lead.id);
          lead.pain_points = newPoints;
        }
      }
    }
    initFilters();
    initScriptSelect();
    initToneSelector();
    initLogForm();
    renderLeads();
    updateSidebarStats();
    renderApolloTitleTags();
    updateApiKeyStatuses();
    window._appInited = true;
    window._dbg('init complete, allLeads=' + allLeads.length); showToast('Ready'); document.getElementById('debug-bar').style.display='none';
  } catch (err) {
    window._dbg('CATCH: ' + (err.message || JSON.stringify(err)));
    console.error('Init error:', err);
    showToast('Error: ' + (err.message || err));
  }
};

initAuth().catch(e => console.error('initAuth unhandled:', e));

