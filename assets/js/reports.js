/**
 * reports.js — Search, filter, summary, CSV export, PDF print
 */

import { db } from './db.js';
import { getSession, isAdmin } from './auth.js';
import {
  pad, fmtDate, fmtDateLong, fmtTime, fmtHours, fmtDuration,
  msToDecimalHours, splitOvertime, todayKey, downloadText, toCSV,
  CATEGORIES, el
} from './utils.js';

// ── Filter state ──────────────────────────────────────────────────────────────
let filters = {};

export async function renderReportsPanel() {
  const session = getSession();
  const [workers, customers, sites] = await Promise.all([
    db.list('workers',   w => w.active !== false),
    db.list('customers', c => c.active !== false),
    db.list('sites'),
  ]);

  // Default date range: this month
  const d  = new Date();
  const from = `${d.getFullYear()}-${pad(d.getMonth()+1)}-01`;
  const to   = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(new Date(d.getFullYear(), d.getMonth()+1, 0).getDate())}`;

  const panel = el('reportsPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Raportit</h2>
    </div>

    <div class="card filter-card">
      <div class="card-title">Hakusuodattimet</div>
      <div class="filter-grid">
        <div>
          <label class="field-lbl">Alku</label>
          <input type="date" class="inp inp-sm" id="rf_from" value="${from}">
        </div>
        <div>
          <label class="field-lbl">Loppu</label>
          <input type="date" class="inp inp-sm" id="rf_to" value="${to}">
        </div>
        ${session?.role === 'admin' ? `
        <div>
          <label class="field-lbl">Työntekijä</label>
          <select class="inp inp-sm" id="rf_worker">
            <option value="">Kaikki</option>
            ${workers.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
          </select>
        </div>` : ''}
        <div>
          <label class="field-lbl">Asiakas</label>
          <select class="inp inp-sm" id="rf_customer">
            <option value="">Kaikki</option>
            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-lbl">Työkohde</label>
          <select class="inp inp-sm" id="rf_site">
            <option value="">Kaikki</option>
            ${sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-lbl">Tehtävä</label>
          <select class="inp inp-sm" id="rf_category">
            <option value="">Kaikki</option>
            ${Object.entries(CATEGORIES).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-lbl">Tila</label>
          <select class="inp inp-sm" id="rf_status">
            <option value="">Kaikki</option>
            <option value="submitted">Lähetetty</option>
            <option value="approved">Hyväksytty</option>
            <option value="rejected">Hylätty</option>
          </select>
        </div>
      </div>
      <div class="btn-row mt-3">
        <button class="btn btn-primary" onclick="window.runReport()">🔍 Hae</button>
        <button class="btn btn-ghost"   onclick="window.exportCSVReport()">⬇ CSV</button>
        <button class="btn btn-ghost"   onclick="window.exportPDF()">🖨 PDF</button>
      </div>
    </div>

    <div id="reportSummary"></div>
    <div id="reportTable"></div>
  `;

  await runReport();
}

// ── Run report ────────────────────────────────────────────────────────────────
export async function runReport() {
  const session = getSession();
  filters = collectFilters(session);

  const entries   = await fetchFiltered(filters, session);
  const workers   = await db.list('workers');
  const sites     = await db.list('sites');
  const customers = await db.list('customers');

  renderReportSummary(entries);
  renderReportTable(entries, workers, sites, customers);
}

function collectFilters(session) {
  const f = {
    from:     el('rf_from')?.value     || '',
    to:       el('rf_to')?.value       || '',
    workerId: el('rf_worker')?.value   || (session?.role !== 'admin' ? session?.workerId : ''),
    custId:   el('rf_customer')?.value || '',
    siteId:   el('rf_site')?.value     || '',
    category: el('rf_category')?.value || '',
    status:   el('rf_status')?.value   || '',
  };
  return f;
}

async function fetchFiltered(f) {
  return db.list('entries', e => {
    if (f.from     && e.date < f.from)           return false;
    if (f.to       && e.date > f.to)             return false;
    if (f.workerId && e.workerId !== f.workerId)  return false;
    if (f.custId   && e.customerId !== f.custId)  return false;
    if (f.siteId   && e.siteId !== f.siteId)     return false;
    if (f.category && e.category !== f.category) return false;
    if (f.status   && e.status   !== f.status)   return false;
    return true;
  });
}

function renderReportSummary(entries) {
  const totalMs   = entries.reduce((s, e) => s + (e.netMs || 0), 0);
  const totalBreak = entries.reduce((s, e) => s + (e.breakMin || 0), 0);
  const { regularMs, overtimeMs } = splitOvertime(totalMs);
  const approvedCount   = entries.filter(e => e.status === 'approved').length;
  const submittedCount  = entries.filter(e => e.status === 'submitted').length;

  el('reportSummary').innerHTML = `
    <div class="card mt-3">
      <div class="card-title">Yhteenveto · ${entries.length} kirjausta</div>
      <div class="stat-row">
        <div class="stat-box"><div class="stat-val">${fmtHours(totalMs)}</div><div class="stat-lbl">Nettotunnit</div></div>
        <div class="stat-box"><div class="stat-val">${fmtHours(regularMs)}</div><div class="stat-lbl">Normaali</div></div>
        <div class="stat-box" ${overtimeMs>0?'style="color:var(--accent)"':''}><div class="stat-val">${fmtHours(overtimeMs)}</div><div class="stat-lbl">Ylityö</div></div>
        <div class="stat-box"><div class="stat-val">${totalBreak}</div><div class="stat-lbl">Taukominuutit</div></div>
        <div class="stat-box"><div class="stat-val">${approvedCount}</div><div class="stat-lbl">Hyväksytty</div></div>
        <div class="stat-box"><div class="stat-val">${submittedCount}</div><div class="stat-lbl">Odottaa</div></div>
      </div>
    </div>
  `;
}

const STATUS_FI = { draft:'Luonnos', submitted:'Lähetetty', approved:'Hyväksytty', rejected:'Hylätty' };

function renderReportTable(entries, workers, sites, customers) {
  if (!entries.length) {
    el('reportTable').innerHTML = '<p class="empty-msg mt-3">Ei kirjauksia valituilla suodattimilla.</p>';
    return;
  }

  const sorted = [...entries].sort((a, b) => a.startISO.localeCompare(b.startISO));
  const wMap   = Object.fromEntries(workers.map(w   => [w.id, w.name]));
  const sMap   = Object.fromEntries(sites.map(s     => [s.id, s.name]));
  const cMap   = Object.fromEntries(customers.map(c => [c.id, c.name]));

  el('reportTable').innerHTML = `
    <div class="table-wrapper mt-3">
      <table class="data-table">
        <thead><tr>
          <th>Päivä</th><th>Työntekijä</th><th>Asiakas</th><th>Työkohde</th>
          <th>Tehtävä</th><th>Alkoi</th><th>Päättyi</th><th>Tauko</th>
          <th>Netto</th><th>Ylityö</th><th>GPS</th><th>Tila</th>
          <th></th>
        </tr></thead>
        <tbody>
        ${sorted.map(e => {
          const { overtimeMs } = splitOvertime(e.netMs || 0);
          return `<tr>
            <td>${fmtDate(e.date, {year:false})}</td>
            <td>${wMap[e.workerId] || '–'}</td>
            <td>${cMap[e.customerId] || '–'}</td>
            <td>${sMap[e.siteId] || '–'}</td>
            <td>${CATEGORIES[e.category] || e.category}</td>
            <td>${fmtTime(e.startISO)}</td>
            <td>${fmtTime(e.endISO)}</td>
            <td>${e.breakMin}min</td>
            <td><strong>${fmtDuration(e.netMs)}</strong></td>
            <td>${overtimeMs > 0 ? `<span style="color:var(--accent)">${fmtHours(overtimeMs)}</span>` : '–'}</td>
            <td>${e.gpsVerified ? '✓' : e.checkInGps ? '📍' : '–'}</td>
            <td><span class="status-badge status-${e.status}">${STATUS_FI[e.status] || e.status}</span></td>
            <td><button class="icon-btn" onclick="window.openEntryDetail('${e.id}')">🔍</button></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── CSV export ────────────────────────────────────────────────────────────────
export async function exportCSVReport() {
  const session   = getSession();
  filters         = collectFilters(session);
  const entries   = await fetchFiltered(filters, session);
  const workers   = await db.list('workers');
  const sites     = await db.list('sites');
  const customers = await db.list('customers');
  const wMap      = Object.fromEntries(workers.map(w   => [w.id, w.name]));
  const sMap      = Object.fromEntries(sites.map(s     => [s.id, s.name]));
  const cMap      = Object.fromEntries(customers.map(c => [c.id, c.name]));

  if (!entries.length) { alert('Ei kirjauksia valituilla suodattimilla.'); return; }

  const rows = entries.sort((a, b) => a.startISO.localeCompare(b.startISO)).map(e => {
    const { regularMs, overtimeMs } = splitOvertime(e.netMs || 0);
    return {
      'Päivä':           e.date,
      'Työntekijä':      wMap[e.workerId]   || '',
      'Asiakas':         cMap[e.customerId] || '',
      'Työkohde':        sMap[e.siteId]     || '',
      'Tehtävä':         CATEGORIES[e.category] || e.category,
      'Kuvaus':          e.description  || '',
      'Alkoi':           fmtTime(e.startISO),
      'Päättyi':         fmtTime(e.endISO),
      'Tauko (min)':     e.breakMin || 0,
      'Brutto (h)':      msToDecimalHours(e.durationMs),
      'Netto (h)':       msToDecimalHours(e.netMs),
      'Normaali (h)':    msToDecimalHours(regularMs),
      'Ylityö (h)':      msToDecimalHours(overtimeMs),
      'GPS sisään lat':  e.checkInGps?.lat  ?? '',
      'GPS sisään lon':  e.checkInGps?.lon  ?? '',
      'GPS ulos lat':    e.checkOutGps?.lat ?? '',
      'GPS ulos lon':    e.checkOutGps?.lon ?? '',
      'GPS vahvistettu': e.gpsVerified ? 'Kyllä' : 'Ei',
      'Tila':            STATUS_FI[e.status] || e.status,
      'Muistiinpanot':   e.notes || '',
    };
  });

  const from = filters.from || 'alku';
  const to   = filters.to   || 'loppu';
  downloadText('﻿' + toCSV(rows), `tyoajat_${from}_${to}.csv`, 'text/csv;charset=utf-8');
}

// ── PDF print ─────────────────────────────────────────────────────────────────
export async function exportPDF() {
  const session   = getSession();
  filters         = collectFilters(session);
  const entries   = await fetchFiltered(filters, session);
  const workers   = await db.list('workers');
  const sites     = await db.list('sites');
  const customers = await db.list('customers');
  const wMap      = Object.fromEntries(workers.map(w   => [w.id, w.name]));
  const sMap      = Object.fromEntries(sites.map(s     => [s.id, s.name]));
  const cMap      = Object.fromEntries(customers.map(c => [c.id, c.name]));

  const totalMs = entries.reduce((s, e) => s + (e.netMs || 0), 0);
  const { regularMs, overtimeMs } = splitOvertime(totalMs);
  const sorted = [...entries].sort((a, b) => a.startISO.localeCompare(b.startISO));

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html lang="fi"><head>
    <meta charset="UTF-8">
    <title>Työraportti</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 20px; }
      h1 { font-size: 16px; margin-bottom: 4px; }
      .subtitle { color: #666; margin-bottom: 16px; font-size: 10px; }
      .summary { display: flex; gap: 24px; margin-bottom: 16px; background: #f4f4f4; padding: 10px 14px; border-radius: 6px; }
      .sum-item { }
      .sum-val { font-size: 15px; font-weight: 700; }
      .sum-lbl { font-size: 9px; color: #888; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { text-align: left; padding: 5px 6px; background: #1e2d1e; color: white; font-size: 9px; text-transform: uppercase; }
      td { padding: 4px 6px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #fafafa; }
      .footer { margin-top: 20px; font-size: 9px; color: #aaa; text-align: center; }
      @media print { body { margin: 10px; } }
    </style>
  </head><body>
    <h1>Työraportti — Työajanseuranta</h1>
    <div class="subtitle">
      Aikaväli: ${filters.from || '–'} – ${filters.to || '–'} &nbsp;|&nbsp;
      Tulostettu: ${new Date().toLocaleString('fi-FI')} &nbsp;|&nbsp;
      ${entries.length} kirjausta
    </div>
    <div class="summary">
      <div class="sum-item"><div class="sum-val">${fmtHours(totalMs)}</div><div class="sum-lbl">Nettotunnit</div></div>
      <div class="sum-item"><div class="sum-val">${fmtHours(regularMs)}</div><div class="sum-lbl">Normaali</div></div>
      <div class="sum-item"><div class="sum-val">${fmtHours(overtimeMs)}</div><div class="sum-lbl">Ylityö</div></div>
      <div class="sum-item"><div class="sum-val">${entries.reduce((s,e)=>s+(e.breakMin||0),0)} min</div><div class="sum-lbl">Tauot yhteensä</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Päivä</th><th>Työntekijä</th><th>Kohde</th><th>Tehtävä</th>
        <th>Alkoi</th><th>Päättyi</th><th>Tauko</th><th>Netto</th><th>GPS</th><th>Tila</th>
      </tr></thead>
      <tbody>
      ${sorted.map(e => `<tr>
        <td>${e.date}</td>
        <td>${wMap[e.workerId]||'–'}</td>
        <td>${sMap[e.siteId]||'–'}</td>
        <td>${CATEGORIES[e.category]||e.category}</td>
        <td>${fmtTime(e.startISO)}</td>
        <td>${fmtTime(e.endISO)}</td>
        <td>${e.breakMin||0}min</td>
        <td>${fmtDuration(e.netMs)}</td>
        <td>${e.gpsVerified?'✓':e.checkInGps?'📍':'–'}</td>
        <td>${STATUS_FI[e.status]||e.status}</td>
      </tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">Luotu: Työajanseuranta Platform · ${new Date().toISOString()}</div>
    <script>setTimeout(()=>window.print(),400)<\/script>
  </body></html>`);
  win.document.close();
}

const STATUS_FI = { draft:'Luonnos', submitted:'Lähetetty', approved:'Hyväksytty', rejected:'Hylätty' };
