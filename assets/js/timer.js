/**
 * timer.js — Active shift management, GPS check-in/check-out
 */

import { db } from './db.js';
import { getSession } from './auth.js';
import {
  uid, todayKey, fmtTime, fmtDuration, fmtHours, splitOvertime,
  getCurrentPosition, gpsDistance, toast, CATEGORIES, el, dateKey
} from './utils.js';

const SHIFT_KEY = 'wt_active_shift';

// ── State ─────────────────────────────────────────────────────────────────────
let _interval = null;
let _gpsCoords = null;

export function getActiveShift() {
  try { return JSON.parse(sessionStorage.getItem(SHIFT_KEY)); }
  catch { return null; }
}
function saveActiveShift(shift) {
  sessionStorage.setItem(SHIFT_KEY, JSON.stringify(shift));
}
function clearActiveShift() {
  sessionStorage.removeItem(SHIFT_KEY);
}

// ── GPS helper ────────────────────────────────────────────────────────────────
export async function detectGPS(statusElId = 'gpsStatus') {
  const statusEl = el(statusElId);
  if (statusEl) { statusEl.className = 'gps-status'; statusEl.textContent = 'Haetaan sijaintia...'; }
  try {
    _gpsCoords = await getCurrentPosition();
    if (statusEl) {
      statusEl.className = 'gps-status gps-ok';
      statusEl.textContent = `✓ ${_gpsCoords.lat.toFixed(5)}, ${_gpsCoords.lon.toFixed(5)} (±${_gpsCoords.acc}m)`;
    }
    return _gpsCoords;
  } catch (err) {
    _gpsCoords = null;
    if (statusEl) {
      statusEl.className = 'gps-status gps-err';
      statusEl.textContent = err.code === 1
        ? 'Sijaintilupa evätty — jatka ilman GPS:ää.'
        : 'GPS-haku epäonnistui.';
    }
    return null;
  }
}

/** Verify worker's GPS against site's expected location */
async function verifyLocation(site) {
  if (!site?.lat || !site?.lon) return { verified: false, distance: null, coords: _gpsCoords };
  if (!_gpsCoords) {
    try { _gpsCoords = await getCurrentPosition(); } catch { return { verified: false, distance: null, coords: null }; }
  }
  const dist = Math.round(gpsDistance(_gpsCoords.lat, _gpsCoords.lon, site.lat, site.lon));
  const radius = site.gpsRadius || 200;
  return { verified: dist <= radius, distance: dist, coords: _gpsCoords };
}

// ── Start / Stop ──────────────────────────────────────────────────────────────
export async function startShift() {
  const session = getSession();
  if (!session) { toast('Kirjaudu ensin sisään.', 'error'); return; }

  const siteId      = el('shiftSite')?.value;
  const customerId  = el('shiftCustomer')?.value;
  const category    = el('shiftCategory')?.value;
  const description = el('shiftDescription')?.value?.trim() ?? '';

  if (!siteId)     { toast('Valitse työkohde.', 'warn'); return; }
  if (!customerId) { toast('Valitse asiakas.',   'warn'); return; }

  const site = await db.get('sites', siteId);
  const geo  = await verifyLocation(site);

  if (site?.lat && !geo.verified && geo.distance !== null) {
    const ok = confirm(`⚠️ Sijaintisi on ${geo.distance}m päässä työkohteesta (sallittu ${site.gpsRadius}m).\nJatketaanko silti?`);
    if (!ok) return;
  }

  const shift = {
    workerId:    session.workerId,
    siteId,
    customerId,
    category,
    description,
    startISO:    new Date().toISOString(),
    checkInGps:  geo.coords,
    gpsVerified: geo.verified,
  };
  saveActiveShift(shift);
  startTimerDisplay();
  toast(`Työvuoro aloitettu — ${site?.name || ''}`, 'success');
  renderTimerPanel();
}

export async function stopShift() {
  const shift = getActiveShift();
  if (!shift) return;

  const breakMin = parseInt(el('shiftBreak')?.value || '0', 10) || 0;
  const notes    = el('shiftNotes')?.value?.trim() ?? '';

  // GPS check-out
  let checkOutGps = null;
  try { checkOutGps = await getCurrentPosition(); } catch { /* ignore */ }

  const endISO     = new Date().toISOString();
  const durationMs = new Date(endISO) - new Date(shift.startISO);
  const netMs      = Math.max(0, durationMs - breakMin * 60000);

  const entry = {
    workerId:    shift.workerId,
    siteId:      shift.siteId,
    customerId:  shift.customerId,
    date:        dateKey(new Date(shift.startISO)),
    startISO:    shift.startISO,
    endISO,
    durationMs,
    breakMin,
    netMs,
    category:    shift.category,
    description: shift.description,
    checkInGps:  shift.checkInGps,
    checkOutGps,
    gpsVerified: shift.gpsVerified,
    status:      'submitted',
    notes,
  };

  await db.insert('entries', entry);
  stopTimerDisplay();
  clearActiveShift();
  _gpsCoords = null;
  toast('Työvuoro kirjattu!', 'success');
  renderTimerPanel();

  // Refresh home & calendar if open
  if (typeof window.refreshPanels === 'function') window.refreshPanels();
}

// ── Timer display ─────────────────────────────────────────────────────────────
function startTimerDisplay() {
  stopTimerDisplay();
  _interval = setInterval(updateTimerDisplay, 500);
  updateTimerDisplay();
}

function stopTimerDisplay() {
  clearInterval(_interval); _interval = null;
  const d = el('timerDisplay');
  if (d) { d.textContent = '00:00:00'; d.className = 'timer-display'; }
  const b = el('headerShiftBadge');
  if (b) b.style.display = 'none';
}

function updateTimerDisplay() {
  const shift = getActiveShift();
  if (!shift) return;
  const ms = Date.now() - new Date(shift.startISO).getTime();
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const txt = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

  const d = el('timerDisplay');
  if (d) { d.textContent = txt; d.className = 'timer-display running'; }

  const b = el('headerShiftBadge');
  if (b) { b.style.display = ''; b.textContent = `▶ ${txt}`; }
}

// ── Populate site/customer dropdowns ─────────────────────────────────────────
export async function populateTimerDropdowns() {
  const customers = await db.list('customers', c => c.active !== false);
  const custSel   = el('shiftCustomer');
  if (!custSel) return;

  custSel.innerHTML = '<option value="">– Asiakas –</option>' +
    customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  // When customer changes, filter sites
  custSel.onchange = async () => {
    await populateSiteDropdown(custSel.value);
  };
  await populateSiteDropdown(custSel.value);
}

async function populateSiteDropdown(customerId) {
  const sites   = await db.list('sites', s => s.status === 'active' && (!customerId || s.customerId === customerId));
  const siteSel = el('shiftSite');
  if (!siteSel) return;
  siteSel.innerHTML = '<option value="">– Työkohde –</option>' +
    sites.map(s => `<option value="${s.id}">${s.name} · ${s.city}</option>`).join('');
}

// ── Render timer panel ────────────────────────────────────────────────────────
export async function renderTimerPanel() {
  const shift   = getActiveShift();
  const session = getSession();
  const panel   = el('timerPanel');
  if (!panel) return;

  // Resolve related records
  const sites     = await db.list('sites',     s => s.status === 'active');
  const customers = await db.list('customers', c => c.active !== false);

  // Today's entries for this worker
  const today   = todayKey();
  const entries = await db.list('entries', e => e.workerId === session?.workerId && e.date === today);
  const totalMs = entries.reduce((s, e) => s + (e.netMs || 0), 0);

  if (shift) {
    const ms   = Date.now() - new Date(shift.startISO).getTime();
    const site = sites.find(s => s.id === shift.siteId);
    const cust = customers.find(c => c.id === shift.customerId);
    panel.innerHTML = `
      <div class="timer-card active-shift">
        <div class="timer-label">Työvuoro käynnissä</div>
        <div class="timer-display running" id="timerDisplay">00:00:00</div>
        <div class="shift-meta">
          <span class="chip chip-green">${site?.name || '–'}</span>
          <span class="chip chip-blue">${CATEGORIES[shift.category] || shift.category}</span>
          ${shift.description ? `<span class="chip chip-gray">${shift.description}</span>` : ''}
        </div>
        <div class="shift-meta" style="font-size:.8rem;color:var(--muted);margin-top:4px">
          Aloitettu ${fmtTime(shift.startISO)}
          ${shift.gpsVerified ? '&nbsp;📍 Sijainti vahvistettu' : shift.checkInGps ? '&nbsp;📍 GPS tallennettu' : ''}
        </div>

        <div class="form-row mt-3">
          <label class="field-lbl">Tauko (min)</label>
          <input type="number" id="shiftBreak" min="0" max="480" value="30" class="inp inp-sm" style="width:100px">
        </div>
        <div class="form-row mt-2">
          <label class="field-lbl">Muistiinpanoja</label>
          <textarea id="shiftNotes" class="inp" rows="2" placeholder="Valinnainen kommentti..."></textarea>
        </div>

        <div class="btn-row mt-4">
          <button class="btn btn-red btn-full" onclick="window.stopShift()">⏹ Lopeta työvuoro</button>
        </div>
      </div>

      ${todayEntriesHTML(entries, sites, customers)}
      ${todaySummaryHTML(entries, totalMs, sites)}
    `;
    startTimerDisplay();
  } else {
    panel.innerHTML = `
      <div class="timer-card">
        <div class="timer-display" id="timerDisplay">00:00:00</div>

        <div class="form-grid mt-3">
          <div>
            <label class="field-lbl">Asiakas</label>
            <select id="shiftCustomer" class="inp"></select>
          </div>
          <div>
            <label class="field-lbl">Työkohde</label>
            <select id="shiftSite" class="inp"></select>
          </div>
          <div>
            <label class="field-lbl">Tehtävätyyppi</label>
            <select id="shiftCategory" class="inp">
              ${Object.entries(CATEGORIES).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-lbl">Tehtävän kuvaus (valinnainen)</label>
            <input id="shiftDescription" class="inp" placeholder="Lyhyt kuvaus...">
          </div>
        </div>

        <div class="gps-row mt-3">
          <button class="btn btn-ghost btn-sm" onclick="window.detectGPS()">📡 Tunnista sijainti</button>
          <div id="gpsStatus" class="gps-status">Sijaintia ei tallennettu.</div>
        </div>

        <div class="btn-row mt-4">
          <button class="btn btn-green btn-full" onclick="window.startShift()">▶ Aloita työvuoro</button>
        </div>
      </div>

      ${todayEntriesHTML(entries, sites, customers)}
      ${todaySummaryHTML(entries, totalMs, sites)}
    `;
    await populateTimerDropdowns();
  }
}

function todaySummaryHTML(entries, totalMs, sites) {
  if (!entries.length) return '';
  const bySite = {};
  entries.forEach(e => { bySite[e.siteId] = (bySite[e.siteId] || 0) + (e.netMs || 0); });
  const { regularMs, overtimeMs } = splitOvertime(totalMs);

  return `<div class="card mt-3">
    <div class="card-title">Tänään yhteensä</div>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-val">${fmtHours(totalMs)}</div><div class="stat-lbl">Nettotunnit</div></div>
      <div class="stat-box"><div class="stat-val">${fmtHours(regularMs)}</div><div class="stat-lbl">Normaali</div></div>
      <div class="stat-box" style="${overtimeMs > 0 ? 'color:var(--accent)' : ''}">
        <div class="stat-val">${fmtHours(overtimeMs)}</div><div class="stat-lbl">Ylityö</div>
      </div>
    </div>
    <div class="site-hours-list mt-2">
      ${Object.entries(bySite).map(([id, ms]) => {
        const site = sites.find(s => s.id === id);
        return `<div class="site-hours-row">
          <span>${site?.name || '–'}</span>
          <strong>${fmtHours(ms)}</strong>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function todayEntriesHTML(entries, sites, customers) {
  if (!entries.length) return `<div class="card mt-3"><p class="empty-msg">Ei kirjauksia tänään.</p></div>`;
  return `<div class="card mt-3">
    <div class="card-title">Tämän päivän kirjaukset</div>
    ${entries.map(e => entryRow(e, sites, customers)).join('')}
  </div>`;
}

export function entryRow(e, sites, customers) {
  const site = sites.find(s => s.id === e.siteId);
  const cust = customers.find(c => c.id === e.customerId);
  const gpsIcon = e.gpsVerified ? '📍' : e.checkInGps ? '📍' : '';
  return `<div class="entry-row">
    <div class="entry-main">
      <span class="entry-site">${site?.name || '–'}</span>
      <span class="chip chip-gray" style="font-size:.72rem">${CATEGORIES[e.category] || e.category}</span>
    </div>
    <div class="entry-meta">
      ${fmtTime(e.startISO)} – ${fmtTime(e.endISO)}
      · Tauko ${e.breakMin}min
      ${gpsIcon}
      ${e.description ? `· <em>${e.description}</em>` : ''}
    </div>
    <div class="entry-right">
      <strong>${fmtDuration(e.netMs)}</strong>
      <span class="status-badge status-${e.status}">${statusFi(e.status)}</span>
    </div>
  </div>`;
}

function statusFi(s) {
  return { draft:'Luonnos', submitted:'Lähetetty', approved:'Hyväksytty', rejected:'Hylätty' }[s] || s;
}

// ── Resume on load ────────────────────────────────────────────────────────────
export function resumeTimerIfActive() {
  const shift = getActiveShift();
  if (shift) startTimerDisplay();
}
