/**
 * calendar.js — Day / Week / Month views
 */

import { db } from './db.js';
import { getSession } from './auth.js';
import {
  pad, dateKey, fmtDate, fmtDateLong, fmtTime, fmtHours, fmtDuration,
  monthLabel, weekStart, addDays, splitOvertime, WEEKDAYS_SHORT, CATEGORIES, el, html
} from './utils.js';

// ── State ─────────────────────────────────────────────────────────────────────
let calView   = 'month'; // 'day' | 'week' | 'month'
let calDate   = new Date();
let filterWid = 'me';    // 'me' | 'all' | workerId
let filterSid = 'all';
let filterCid = 'all';

// ── Public entry point ────────────────────────────────────────────────────────
export async function renderCalendar() {
  await populateCalendarFilters();
  await drawCalendar();
}

export function setCalendarView(view) {
  calView = view;
  document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  drawCalendar();
}

export function calNav(dir) {
  if (calView === 'day')   calDate = addDays(calDate, dir);
  else if (calView === 'week') calDate = addDays(calDate, dir * 7);
  else {
    calDate = new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1);
  }
  drawCalendar();
}

export function calToday() {
  calDate = new Date();
  drawCalendar();
}

// ── Filter helpers ────────────────────────────────────────────────────────────
async function populateCalendarFilters() {
  const session   = getSession();
  const workers   = await db.list('workers',   w => w.active !== false);
  const sites     = await db.list('sites');
  const customers = await db.list('customers', c => c.active !== false);

  const wSel = el('calFilterWorker');
  const sSel = el('calFilterSite');
  const cSel = el('calFilterCustomer');

  if (wSel && session?.role === 'admin') {
    wSel.innerHTML = `<option value="me">Minä</option><option value="all">Kaikki</option>` +
      workers.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    wSel.style.display = '';
  } else if (wSel) {
    wSel.style.display = 'none';
  }

  if (sSel) sSel.innerHTML = `<option value="all">Kaikki kohteet</option>` +
    sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (cSel) cSel.innerHTML = `<option value="all">Kaikki asiakkaat</option>` +
    customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

export function applyCalendarFilters() {
  filterWid = el('calFilterWorker')?.value ?? 'me';
  filterSid = el('calFilterSite')?.value   ?? 'all';
  filterCid = el('calFilterCustomer')?.value ?? 'all';
  drawCalendar();
}

async function fetchEntries(from, to) {
  const session = getSession();
  const fromKey = dateKey(from), toKey = dateKey(to);
  return db.list('entries', e => {
    if (e.date < fromKey || e.date > toKey) return false;
    const wOk = filterWid === 'all' ? true
      : filterWid === 'me' ? e.workerId === session?.workerId
      : e.workerId === filterWid;
    const sOk = filterSid === 'all' || e.siteId      === filterSid;
    const cOk = filterCid === 'all' || e.customerId  === filterCid;
    return wOk && sOk && cOk;
  });
}

// ── Main draw router ──────────────────────────────────────────────────────────
async function drawCalendar() {
  updateCalNavLabel();
  if (calView === 'day')   await drawDay();
  else if (calView === 'week') await drawWeek();
  else await drawMonth();
}

function updateCalNavLabel() {
  const lbl = el('calNavLabel');
  if (!lbl) return;
  if (calView === 'day') {
    lbl.textContent = fmtDateLong(dateKey(calDate));
  } else if (calView === 'week') {
    const ws = weekStart(calDate), we = addDays(ws, 6);
    lbl.textContent = `${fmtDate(dateKey(ws), {year:false})} – ${fmtDate(dateKey(we))}`;
  } else {
    lbl.textContent = monthLabel(calDate.getFullYear(), calDate.getMonth());
  }
}

// ── Day view ──────────────────────────────────────────────────────────────────
async function drawDay() {
  const today   = dateKey(calDate);
  const entries = await fetchEntries(calDate, calDate);
  const sites   = await db.list('sites');
  const workers = await db.list('workers');
  const customers = await db.list('customers');

  const totalMs = entries.reduce((s, e) => s + (e.netMs || 0), 0);
  const { regularMs, overtimeMs } = splitOvertime(totalMs);

  const HOUR_PX = 60;
  const START_H = 5; // 05:00
  const END_H   = 22;
  const totalH  = END_H - START_H;

  // Build time blocks for entries
  const blocks = entries.map(e => {
    const sh = new Date(e.startISO), eh = new Date(e.endISO);
    const startMin = sh.getHours() * 60 + sh.getMinutes() - START_H * 60;
    const endMin   = eh.getHours() * 60 + eh.getMinutes() - START_H * 60;
    const top  = Math.max(0, startMin / 60 * HOUR_PX);
    const height = Math.max(20, (endMin - startMin) / 60 * HOUR_PX);
    const site = sites.find(s => s.id === e.siteId);
    const worker = workers.find(w => w.id === e.workerId);
    return { e, top, height, site, worker };
  });

  html('calContent', `
    <div class="day-summary">
      <div class="stat-box"><div class="stat-val">${fmtHours(totalMs)}</div><div class="stat-lbl">Netto</div></div>
      <div class="stat-box"><div class="stat-val">${fmtHours(regularMs)}</div><div class="stat-lbl">Normaali</div></div>
      <div class="stat-box" ${overtimeMs > 0 ? 'style="color:var(--accent)"' : ''}>
        <div class="stat-val">${fmtHours(overtimeMs)}</div><div class="stat-lbl">Ylityö</div>
      </div>
    </div>
    <div class="time-grid" style="height:${totalH * HOUR_PX}px">
      <div class="time-labels">
        ${Array.from({length: totalH + 1}, (_, i) =>
          `<div class="time-label" style="top:${i * HOUR_PX}px">${pad(START_H + i)}:00</div>`
        ).join('')}
      </div>
      <div class="time-events" style="position:relative;height:100%">
        ${blocks.map(({ e, top, height, site, worker }) => `
          <div class="time-block" style="top:${top}px;height:${height}px"
               onclick="window.openEntryDetail('${e.id}')">
            <div class="time-block-title">${site?.name || '–'}</div>
            <div class="time-block-sub">${CATEGORIES[e.category] || ''} · ${fmtTime(e.startISO)}–${fmtTime(e.endISO)}</div>
            ${worker ? `<div class="time-block-sub">${worker.name}</div>` : ''}
          </div>`).join('')}
        ${Array.from({length: totalH}, (_, i) =>
          `<div class="time-grid-line" style="top:${i * HOUR_PX}px"></div>`
        ).join('')}
      </div>
    </div>
    ${entries.length === 0 ? '<p class="empty-msg mt-3">Ei kirjauksia tälle päivälle.</p>' : ''}
  `);
}

// ── Week view ─────────────────────────────────────────────────────────────────
async function drawWeek() {
  const ws   = weekStart(calDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const entries = await fetchEntries(ws, days[6]);
  const sites   = await db.list('sites');
  const today   = dateKey(new Date());

  html('calContent', `
    <div class="week-grid">
      <div class="week-header">
        ${days.map(d => {
          const key = dateKey(d);
          const dayEntries = entries.filter(e => e.date === key);
          const ms = dayEntries.reduce((s,e) => s+(e.netMs||0),0);
          return `<div class="week-day-hdr${key===today?' today':''}" onclick="window.calGotoDay('${key}')">
            <div>${WEEKDAYS_SHORT[(d.getDay()+6)%7]}</div>
            <div class="week-day-num">${d.getDate()}</div>
            ${ms > 0 ? `<div class="week-hours">${fmtHours(ms)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="week-body">
        ${days.map(d => {
          const key = dateKey(d);
          const dayEntries = entries.filter(e => e.date === key);
          return `<div class="week-day-col${key===today?' today':''}">
            ${dayEntries.length === 0
              ? '<div class="week-empty">–</div>'
              : dayEntries.map(e => {
                  const site = sites.find(s => s.id === e.siteId);
                  return `<div class="week-entry" onclick="window.openEntryDetail('${e.id}')">
                    <div class="week-entry-site">${site?.name || '–'}</div>
                    <div class="week-entry-time">${fmtTime(e.startISO)}–${fmtTime(e.endISO)}</div>
                    <div class="week-entry-dur">${fmtDuration(e.netMs)}</div>
                  </div>`;
                }).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>
  `);
}

// ── Month view ────────────────────────────────────────────────────────────────
async function drawMonth() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay  = new Date(y, m + 1, 0);
  const firstDow = (firstDay.getDay() + 6) % 7;
  const days     = lastDay.getDate();
  const today    = dateKey(new Date());

  const entries = await fetchEntries(firstDay, lastDay);
  const sites   = await db.list('sites');

  // Group by date
  const byDate = {};
  entries.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });

  let cells = Array(firstDow).fill(null);
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${pad(m+1)}-${pad(d)}`;
    cells.push({ key, d, entries: byDate[key] || [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  html('calContent', `
    <div class="month-grid">
      ${WEEKDAYS_SHORT.map(d => `<div class="month-hdr">${d}</div>`).join('')}
      ${cells.map(cell => {
        if (!cell) return '<div class="month-cell empty"></div>';
        const ms = cell.entries.reduce((s,e) => s+(e.netMs||0),0);
        return `<div class="month-cell${cell.key===today?' today':''}" onclick="window.calGotoDay('${cell.key}')">
          <div class="month-cell-num">${cell.d}</div>
          ${ms > 0 ? `<div class="month-cell-hours">${fmtHours(ms)}</div>` : ''}
          ${cell.entries.slice(0,2).map(e => {
            const site = sites.find(s => s.id === e.siteId);
            return `<div class="month-entry-dot" title="${site?.name||''}">&bull;</div>`;
          }).join('')}
          ${cell.entries.length > 2 ? `<div class="month-more">+${cell.entries.length - 2}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
  `);
}

// ── Go to a specific day in day-view ─────────────────────────────────────────
export function calGotoDay(key) {
  const [y,m,d] = key.split('-').map(Number);
  calDate = new Date(y, m-1, d);
  calView = 'day';
  document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'day'));
  drawCalendar();
}

// ── Entry detail modal ────────────────────────────────────────────────────────
export async function openEntryDetail(id) {
  const entry     = await db.get('entries', id);
  if (!entry) return;
  const site      = await db.get('sites',     entry.siteId);
  const customer  = await db.get('customers', entry.customerId);
  const worker    = await db.get('workers',   entry.workerId);
  const { regularMs, overtimeMs } = splitOvertime(entry.netMs || 0);
  const session   = getSession();

  const modalBody = el('entryDetailBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <table class="detail-table">
      <tr><th>Työntekijä</th><td>${worker?.name || '–'}</td></tr>
      <tr><th>Asiakas</th><td>${customer?.name || '–'}</td></tr>
      <tr><th>Työkohde</th><td>${site?.name || '–'} · ${site?.city || ''}</td></tr>
      <tr><th>Päivä</th><td>${fmtDateLong(entry.date)}</td></tr>
      <tr><th>Alkoi</th><td>${fmtTime(entry.startISO)}</td></tr>
      <tr><th>Päättyi</th><td>${fmtTime(entry.endISO)}</td></tr>
      <tr><th>Tauko</th><td>${entry.breakMin} min</td></tr>
      <tr><th>Brutto</th><td>${fmtDuration(entry.durationMs)}</td></tr>
      <tr><th>Netto</th><td><strong>${fmtDuration(entry.netMs)}</strong></td></tr>
      <tr><th>Normaali</th><td>${fmtHours(regularMs)}</td></tr>
      <tr><th>Ylityö</th><td>${overtimeMs > 0 ? `<span style="color:var(--accent)">${fmtHours(overtimeMs)}</span>` : '–'}</td></tr>
      <tr><th>Tehtävä</th><td>${CATEGORIES[entry.category] || entry.category}</td></tr>
      ${entry.description ? `<tr><th>Kuvaus</th><td>${entry.description}</td></tr>` : ''}
      ${entry.notes ? `<tr><th>Muistiinpanot</th><td>${entry.notes}</td></tr>` : ''}
      <tr><th>GPS sisään</th><td>${entry.checkInGps ? `${entry.checkInGps.lat.toFixed(5)}, ${entry.checkInGps.lon.toFixed(5)} (±${entry.checkInGps.acc}m)` : '–'}</td></tr>
      <tr><th>GPS ulos</th><td>${entry.checkOutGps ? `${entry.checkOutGps.lat.toFixed(5)}, ${entry.checkOutGps.lon.toFixed(5)} (±${entry.checkOutGps.acc}m)` : '–'}</td></tr>
      <tr><th>Sijainti vahvistettu</th><td>${entry.gpsVerified ? '✓ Kyllä' : '✗ Ei'}</td></tr>
      <tr><th>Tila</th><td><span class="status-badge status-${entry.status}">${{draft:'Luonnos',submitted:'Lähetetty',approved:'Hyväksytty',rejected:'Hylätty'}[entry.status]||entry.status}</span></td></tr>
    </table>
    ${session?.role === 'admin' ? `
      <div class="btn-row mt-4">
        <button class="btn btn-green btn-sm" onclick="window.approveEntry('${id}')">✓ Hyväksy</button>
        <button class="btn btn-ghost btn-sm" onclick="window.rejectEntry('${id}')">✗ Hylkää</button>
        <button class="btn btn-danger btn-sm" onclick="window.deleteEntry('${id}')">🗑 Poista</button>
      </div>` : ''}
  `;
  document.getElementById('entryDetailModal')?.classList.add('open');
  document.body.classList.add('modal-lock');
}
