/**
 * auth.js — Session & role management
 *
 * Session is kept in sessionStorage (survives refresh, cleared on tab close).
 * Replace with JWT / Supabase Auth when moving to a real backend.
 */

import { db } from './db.js';
import { toast, el } from './utils.js';

const SESSION_KEY = 'wt_session';

// ── Public helpers ────────────────────────────────────────────────────────────
export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

export function isAdmin() {
  return getSession()?.role === 'admin';
}

export function requireAuth() {
  if (!getSession()) { showLogin(); return false; }
  return true;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

// ── Login UI ──────────────────────────────────────────────────────────────────
export async function showLogin() {
  const workers = await db.list('workers', w => w.active !== false);
  const overlay = document.getElementById('loginOverlay');
  if (!overlay) return;

  document.getElementById('loginWorkerSelect').innerHTML =
    '<option value="">– Valitse nimesi –</option>' +
    workers.map(w => `<option value="${w.id}">${w.name}${w.role === 'admin' ? ' (Admin)' : ''}</option>`).join('');

  overlay.classList.add('open');
  document.getElementById('loginPin').value = '';
  document.getElementById('loginError').textContent = '';
}

export function hideLogin() {
  document.getElementById('loginOverlay')?.classList.remove('open');
}

export async function handleLogin() {
  const workerId = document.getElementById('loginWorkerSelect').value;
  const pin      = document.getElementById('loginPin').value;

  if (!workerId) { document.getElementById('loginError').textContent = 'Valitse työntekijä.'; return; }

  const worker = await db.get('workers', workerId);
  if (!worker) { document.getElementById('loginError').textContent = 'Käyttäjää ei löydy.'; return; }

  if (worker.pin && worker.pin !== pin) {
    document.getElementById('loginError').textContent = 'Väärä PIN-koodi.';
    document.getElementById('loginPin').value = '';
    document.getElementById('loginPin').focus();
    return;
  }

  const session = {
    workerId: worker.id,
    workerName: worker.name,
    role: worker.role,
    loginAt: new Date().toISOString(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

  hideLogin();
  initAppForSession(session);
}

// ── PIN pad (mobile-friendly) ─────────────────────────────────────────────────
export function appendPin(digit) {
  const input = el('loginPin');
  if (input && input.value.length < 6) input.value += digit;
}

export function clearPin() {
  const input = el('loginPin');
  if (input) input.value = '';
}

// ── Internal ──────────────────────────────────────────────────────────────────
let _initCallback = null;

export function onSessionReady(cb) { _initCallback = cb; }

function initAppForSession(session) {
  // Update header
  const nameEl = document.getElementById('headerWorkerName');
  const roleEl = document.getElementById('headerWorkerRole');
  if (nameEl) nameEl.textContent = session.workerName;
  if (roleEl) {
    roleEl.textContent = session.role === 'admin' ? 'Admin' : 'Työntekijä';
    roleEl.className = `role-badge role-${session.role}`;
  }

  // Show/hide admin-only nav items
  document.querySelectorAll('[data-admin-only]').forEach(el => {
    el.style.display = session.role === 'admin' ? '' : 'none';
  });

  if (_initCallback) _initCallback(session);
}

/** Called on app start to restore a previous session without re-login */
export async function restoreSession() {
  const session = getSession();
  if (!session) return false;
  // Verify worker still exists & active
  const worker = await db.get('workers', session.workerId);
  if (!worker || worker.active === false) {
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  initAppForSession(session);
  return true;
}
