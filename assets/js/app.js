/**
 * app.js — Application entry point, router, global event wiring
 */

import { db }                       from './db.js';
import { seedIfEmpty }              from './seed.js';
import { getSession, handleLogin, appendPin, clearPin,
         logout, showLogin, restoreSession, onSessionReady } from './auth.js';
import { renderTimerPanel, startShift, stopShift,
         detectGPS, resumeTimerIfActive }                    from './timer.js';
import { renderCalendar, setCalendarView, calNav, calToday,
         calGotoDay, applyCalendarFilters, openEntryDetail } from './calendar.js';
import { renderWorkersPanel, filterWorkers, openWorkerForm,
         saveWorker, toggleWorkerActive,
         renderCustomersPanel, filterCustomers, openCustomerForm, saveCustomer,
         renderSitesPanel, filterSites, openSiteForm, saveSite,
         toggleSiteStatus, approveEntry, rejectEntry, deleteEntry } from './admin.js';
import { renderReportsPanel, runReport, exportCSVReport, exportPDF } from './reports.js';
import { toast, closeModal, el, isAdmin }                    from './utils.js';

// ── Expose to inline onclick handlers in HTML ─────────────────────────────────
Object.assign(window, {
  // Auth
  handleLogin, appendPin, clearPin, logout,

  // Timer
  startShift, stopShift, detectGPS,

  // Calendar
  setCalendarView, calNav, calToday, calGotoDay, applyCalendarFilters, openEntryDetail,

  // Admin
  filterWorkers, openWorkerForm, saveWorker, toggleWorkerActive,
  filterCustomers, openCustomerForm, saveCustomer,
  filterSites, openSiteForm, saveSite, toggleSiteStatus,

  // Entry actions
  approveEntry, rejectEntry, deleteEntry,

  // Reports
  runReport, exportCSVReport, exportPDF,

  // Utilities
  closeModal: (id) => { closeModal(id); document.body.classList.remove('modal-lock'); },
  switchPanel,

  // Data management
  exportData, importData,
});

// ── Panel routing ─────────────────────────────────────────────────────────────
const PANELS = ['home', 'timer', 'calendar', 'workers', 'customers', 'sites', 'reports', 'settings'];
let activePanel = 'home';

export async function switchPanel(name, arg = null) {
  activePanel = name;
  PANELS.forEach(p => {
    const el_p = document.getElementById(`panel-${p}`);
    if (el_p) el_p.style.display = p === name ? '' : 'none';
  });
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.panel === name);
  });

  if (name === 'home')      await renderHome();
  if (name === 'timer')     await renderTimerPanel();
  if (name === 'calendar')  await renderCalendar();
  if (name === 'workers')   await renderWorkersPanel();
  if (name === 'customers') await renderCustomersPanel();
  if (name === 'sites')     await renderSitesPanel(arg);
  if (name === 'reports')   await renderReportsPanel();
  if (name === 'settings')  renderSettings();
}

// ── Home / dashboard ──────────────────────────────────────────────────────────
async function renderHome() {
  const session   = getSession();
  const today     = new Date().toISOString().slice(0, 10);
  const [workers, sites, customers, allEntries] = await Promise.all([
    db.list('workers',   w => w.active !== false),
    db.list('sites'),
    db.list('customers', c => c.active !== false),
    db.list('entries'),
  ]);

  const todayEntries   = allEntries.filter(e => e.date === today);
  const monthStart     = today.slice(0, 7) + '-01';
  const monthEntries   = allEntries.filter(e => e.date >= monthStart && e.date <= today);
  const pendingEntries = allEntries.filter(e => e.status === 'submitted');

  const totalToday = todayEntries.reduce((s, e) => s + (e.netMs || 0), 0);
  const totalMonth = monthEntries.reduce((s, e) => s + (e.netMs || 0), 0);

  // Hours by worker for today (admin view)
  const byWorker = {};
  todayEntries.forEach(e => { byWorker[e.workerId] = (byWorker[e.workerId] || 0) + (e.netMs || 0); });

  // My own today
  const myToday = todayEntries.filter(e => e.workerId === session?.workerId)
    .reduce((s, e) => s + (e.netMs || 0), 0);
  const myMonth = monthEntries.filter(e => e.workerId === session?.workerId)
    .reduce((s, e) => s + (e.netMs || 0), 0);

  const fmtH = ms => {
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, '0')}`;
  };

  const isAdminUser = session?.role === 'admin';

  el('panelHome').innerHTML = `
    <div class="dashboard">
      <h2 class="panel-title">Hyvää päivää, ${session?.workerName?.split(' ')[0] || ''}!</h2>

      <div class="stat-row mt-3">
        <div class="stat-box">
          <div class="stat-val">${fmtH(isAdminUser ? totalToday : myToday)}</div>
          <div class="stat-lbl">Tänään</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">${fmtH(isAdminUser ? totalMonth : myMonth)}</div>
          <div class="stat-lbl">Tässä kuussa</div>
        </div>
        ${isAdminUser ? `
        <div class="stat-box">
          <div class="stat-val">${new Set(todayEntries.map(e => e.workerId)).size} / ${workers.length}</div>
          <div class="stat-lbl">Töissä tänään</div>
        </div>
        <div class="stat-box ${pendingEntries.length > 0 ? 'stat-warn' : ''}">
          <div class="stat-val">${pendingEntries.length}</div>
          <div class="stat-lbl">Odottaa hyväksyntää</div>
        </div>` : `
        <div class="stat-box">
          <div class="stat-val">${todayEntries.filter(e => e.workerId === session?.workerId).length}</div>
          <div class="stat-lbl">Kirjauksia tänään</div>
        </div>`}
      </div>

      ${isAdminUser ? `
      <div class="card mt-4">
        <div class="card-title">Tänään töissä</div>
        ${workers.map(w => {
          const ms = byWorker[w.id] || 0;
          const wEntries = todayEntries.filter(e => e.workerId === w.id);
          const siteNames = [...new Set(wEntries.map(e => sites.find(s => s.id === e.siteId)?.name || '–'))].join(', ');
          return `<div class="worker-row">
            <div>
              <div class="worker-name">${w.name}</div>
              <div class="worker-sites">${siteNames || 'Ei kirjauksia'}</div>
            </div>
            <div class="worker-hours ${ms > 0 ? 'has-hours' : ''}">${ms > 0 ? fmtH(ms) : '–'}</div>
          </div>`;
        }).join('')}
      </div>

      ${pendingEntries.length > 0 ? `
      <div class="card mt-3">
        <div class="card-title">⏳ Odottaa hyväksyntää (${pendingEntries.length})</div>
        ${pendingEntries.slice(0,5).map(e => {
          const w = workers.find(x => x.id === e.workerId);
          const s = sites.find(x => x.id === e.siteId);
          return `<div class="pending-row" onclick="window.openEntryDetail('${e.id}')">
            <div><strong>${w?.name || '–'}</strong> · ${s?.name || '–'}</div>
            <div style="font-size:.78rem;color:var(--muted)">${e.date} · ${fmtH(e.netMs||0)}</div>
          </div>`;
        }).join('')}
        ${pendingEntries.length > 5 ? `<div style="font-size:.8rem;color:var(--muted);padding:8px">+ ${pendingEntries.length-5} lisää</div>` : ''}
      </div>` : ''}` : ''}

      <div class="quick-actions mt-4">
        <button class="btn btn-green" onclick="window.switchPanel('timer')">▶ Aloita työvuoro</button>
        <button class="btn btn-ghost" onclick="window.switchPanel('calendar')">📅 Kalenteri</button>
        <button class="btn btn-ghost" onclick="window.switchPanel('reports')">📊 Raportit</button>
      </div>
    </div>
  `;
}

// ── Settings ──────────────────────────────────────────────────────────────────
function renderSettings() {
  el('panelSettings').innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Asetukset</h2>
    </div>

    <div class="card mt-3">
      <div class="card-title">Tiedot</div>
      <p style="font-size:.85rem;color:var(--muted)">
        Kaikki tiedot tallennetaan selaimesi localStorage-muistiin.
        Tiedot säilyvät selainkohtaisesti.
      </p>
      <div class="btn-row mt-3">
        <button class="btn btn-ghost" onclick="window.exportData()">⬇ Varmuuskopioi JSON</button>
        <label class="btn btn-ghost" style="cursor:pointer">
          ⬆ Palauta JSON
          <input type="file" accept=".json" style="display:none" onchange="window.importData(event)">
        </label>
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-title">Demo-data</div>
      <p style="font-size:.85rem;color:var(--muted)">Nollaa kaikki data ja lataa alkuperäinen demo-data uudelleen.</p>
      <div class="btn-row mt-3">
        <button class="btn btn-danger" onclick="window.resetToDemo()">⚠️ Nollaa demo-data</button>
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-title">Versio</div>
      <p style="font-size:.8rem;color:var(--muted)">Työajanseuranta Platform v1.0.0<br>
        Tietokanta: localStorage (Supabase-yhteensopiva rakenne)<br>
        Tuetut selaimet: Chrome 90+, Firefox 90+, Safari 15+</p>
    </div>
  `;
}

function exportData() {
  const snap = db.export();
  const blob = JSON.stringify(snap, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([blob], { type: 'application/json' }));
  a.download = `tyoajanseuranta_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const snap = JSON.parse(text);
    if (!confirm('Tämä korvaa kaiken nykyisen datan. Jatketaanko?')) return;
    db.import(snap);
    toast('Data palautettu onnistuneesti.', 'success');
    location.reload();
  } catch {
    toast('Tiedoston lukeminen epäonnistui.', 'error');
  }
}

window.resetToDemo = async () => {
  if (!confirm('⚠️ Kaikki data poistetaan ja demo-data ladataan uudelleen. Jatketaanko?')) return;
  await db.resetAll();
  await seedIfEmpty();
  toast('Demo-data palautettu.', 'success');
  switchPanel('home');
};

// ── Refresh hook for timer/calendar ──────────────────────────────────────────
window.refreshPanels = () => {
  if (activePanel === 'home')     renderHome();
  if (activePanel === 'timer')    renderTimerPanel();
  if (activePanel === 'calendar') renderCalendar();
  if (activePanel === 'reports')  renderReportsPanel();
};

// ── Close modals on background click ─────────────────────────────────────────
document.querySelectorAll('.modal-bg').forEach(bg => {
  bg.addEventListener('click', e => {
    if (e.target === bg) {
      bg.classList.remove('open');
      document.body.classList.remove('modal-lock');
    }
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await seedIfEmpty();

  // Make switchPanel available globally (for inline onclick before module settles)
  window.switchPanel = switchPanel;

  onSessionReady(async (session) => {
    document.getElementById('app').classList.add('visible');
    await switchPanel('home');
    resumeTimerIfActive();
  });

  const restored = await restoreSession();
  if (!restored) await showLogin();
}

init();
