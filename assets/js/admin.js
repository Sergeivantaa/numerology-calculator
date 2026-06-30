/**
 * admin.js — CRUD panels for Workers, Customers, Sites
 * Admin-only. All mutations go through db.js.
 */

import { db } from './db.js';
import { toast, openModal, closeModal, fmtDate, fmtHours, CATEGORIES, el } from './utils.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ESC = v => String(v ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ═══════════════════════════════════════════════════════════════════
//  WORKERS
// ═══════════════════════════════════════════════════════════════════
export async function renderWorkersPanel() {
  const workers = await db.list('workers');
  const panel   = el('workersPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Työntekijät</h2>
      <button class="btn btn-primary btn-sm" onclick="window.openWorkerForm()">+ Lisää</button>
    </div>
    <div class="search-row">
      <input class="inp inp-sm" id="workerSearch" placeholder="🔍 Hae nimellä..." oninput="window.filterWorkers(this.value)">
    </div>
    <div id="workersTable">
      ${workersTable(workers)}
    </div>
  `;
}

function workersTable(workers) {
  if (!workers.length) return '<p class="empty-msg">Ei työntekijöitä.</p>';
  return `<table class="data-table">
    <thead><tr>
      <th>Nimi</th><th>Rooli</th><th>Sähköposti</th><th>Puhelin</th><th>Tuntipalkka</th><th>Tila</th><th></th>
    </tr></thead>
    <tbody>
    ${workers.map(w => `<tr class="${w.active===false?'row-inactive':''}">
      <td><strong>${ESC(w.name)}</strong></td>
      <td><span class="role-badge role-${w.role}">${w.role==='admin'?'Admin':'Työntekijä'}</span></td>
      <td>${ESC(w.email)}</td>
      <td>${ESC(w.phone)}</td>
      <td>${w.hourlyRate ? w.hourlyRate+'€/h' : '–'}</td>
      <td><span class="status-badge ${w.active!==false?'status-approved':'status-rejected'}">${w.active!==false?'Aktiivinen':'Ei aktiivinen'}</span></td>
      <td class="row-actions">
        <button class="icon-btn" title="Muokkaa" onclick="window.openWorkerForm('${w.id}')">✏️</button>
        <button class="icon-btn" title="${w.active!==false?'Deaktivoi':'Aktivoi'}" onclick="window.toggleWorkerActive('${w.id}',${w.active!==false})">${w.active!==false?'🚫':'✅'}</button>
      </td>
    </tr>`).join('')}
    </tbody>
  </table>`;
}

export async function filterWorkers(q) {
  const workers = await db.list('workers', w => w.name.toLowerCase().includes(q.toLowerCase()));
  const t = el('workersTable');
  if (t) t.innerHTML = workersTable(workers);
}

let _editWorkerId = null;
export async function openWorkerForm(id = null) {
  _editWorkerId = id;
  const modal = el('workerModal');
  if (!modal) return;
  el('workerModalTitle').textContent = id ? 'Muokkaa työntekijää' : 'Uusi työntekijä';

  if (id) {
    const w = await db.get('workers', id);
    ['name','email','phone','role','pin','hourlyRate','overtimeMultiplier'].forEach(k => {
      const inp = el('wf_'+k);
      if (inp) inp.value = w[k] ?? '';
    });
  } else {
    el('workerForm')?.reset();
    const om = el('wf_overtimeMultiplier');
    if (om) om.value = '1.5';
  }
  openModal('workerModal');
}

export async function saveWorker() {
  const fields = ['name','email','phone','role','pin','hourlyRate','overtimeMultiplier'];
  const data = {};
  for (const k of fields) {
    const inp = el('wf_'+k);
    data[k] = inp ? inp.value.trim() : '';
  }
  if (!data.name) { toast('Nimi on pakollinen.', 'warn'); return; }
  data.hourlyRate         = parseFloat(data.hourlyRate)         || 0;
  data.overtimeMultiplier = parseFloat(data.overtimeMultiplier) || 1.5;

  if (_editWorkerId) {
    await db.update('workers', _editWorkerId, data);
    toast('Työntekijä päivitetty.', 'success');
  } else {
    await db.insert('workers', { ...data, active: true });
    toast('Työntekijä lisätty.', 'success');
  }
  closeModal('workerModal');
  renderWorkersPanel();
}

export async function toggleWorkerActive(id, currentlyActive) {
  await db.update('workers', id, { active: !currentlyActive });
  toast(currentlyActive ? 'Deaktivoitu.' : 'Aktivoitu.', 'info');
  renderWorkersPanel();
}

// ═══════════════════════════════════════════════════════════════════
//  CUSTOMERS
// ═══════════════════════════════════════════════════════════════════
export async function renderCustomersPanel() {
  const customers = await db.list('customers');
  const panel     = el('customersPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Asiakkaat</h2>
      <button class="btn btn-primary btn-sm" onclick="window.openCustomerForm()">+ Lisää</button>
    </div>
    <div class="search-row">
      <input class="inp inp-sm" placeholder="🔍 Hae nimellä..." oninput="window.filterCustomers(this.value)" id="custSearch">
    </div>
    <div id="customersTable">${customersTable(customers)}</div>
  `;
}

function customersTable(customers) {
  if (!customers.length) return '<p class="empty-msg">Ei asiakkaita.</p>';
  return `<table class="data-table">
    <thead><tr>
      <th>Yritys</th><th>Yhteyshenkilö</th><th>Sähköposti</th><th>Puhelin</th><th>Y-tunnus</th><th>Kaupunki</th><th></th>
    </tr></thead>
    <tbody>
    ${customers.map(c => `<tr>
      <td><strong>${ESC(c.name)}</strong></td>
      <td>${ESC(c.contactPerson)}</td>
      <td><a href="mailto:${ESC(c.email)}">${ESC(c.email)}</a></td>
      <td>${ESC(c.phone)}</td>
      <td>${ESC(c.businessId)}</td>
      <td>${ESC(c.city)}</td>
      <td class="row-actions">
        <button class="icon-btn" title="Muokkaa"    onclick="window.openCustomerForm('${c.id}')">✏️</button>
        <button class="icon-btn" title="Työkohteet" onclick="window.switchPanel('sites','${c.id}')">📍</button>
      </td>
    </tr>`).join('')}
    </tbody>
  </table>`;
}

export async function filterCustomers(q) {
  const customers = await db.list('customers', c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.contactPerson || '').toLowerCase().includes(q.toLowerCase())
  );
  const t = el('customersTable');
  if (t) t.innerHTML = customersTable(customers);
}

let _editCustomerId = null;
export async function openCustomerForm(id = null) {
  _editCustomerId = id;
  el('customerModalTitle').textContent = id ? 'Muokkaa asiakasta' : 'Uusi asiakas';
  if (id) {
    const c = await db.get('customers', id);
    ['name','contactPerson','email','phone','address','city','businessId','notes'].forEach(k => {
      const inp = el('cf_'+k);
      if (inp) inp.value = c[k] ?? '';
    });
  } else {
    el('customerForm')?.reset();
  }
  openModal('customerModal');
}

export async function saveCustomer() {
  const fields = ['name','contactPerson','email','phone','address','city','businessId','notes'];
  const data = {};
  fields.forEach(k => { const i = el('cf_'+k); data[k] = i ? i.value.trim() : ''; });
  if (!data.name) { toast('Yrityksen nimi on pakollinen.', 'warn'); return; }

  if (_editCustomerId) {
    await db.update('customers', _editCustomerId, data);
    toast('Asiakas päivitetty.', 'success');
  } else {
    await db.insert('customers', { ...data, active: true });
    toast('Asiakas lisätty.', 'success');
  }
  closeModal('customerModal');
  renderCustomersPanel();
}

// ═══════════════════════════════════════════════════════════════════
//  SITES
// ═══════════════════════════════════════════════════════════════════
export async function renderSitesPanel(prefilterCustomerId = null) {
  const [sites, customers] = await Promise.all([db.list('sites'), db.list('customers')]);
  const panel = el('sitesPanel');
  if (!panel) return;

  const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));

  panel.innerHTML = `
    <div class="panel-header">
      <h2 class="panel-title">Työkohteet</h2>
      <button class="btn btn-primary btn-sm" onclick="window.openSiteForm()">+ Lisää</button>
    </div>
    <div class="filter-row">
      <input class="inp inp-sm" id="siteSearch" placeholder="🔍 Hae..." oninput="window.filterSites(this.value)">
      <select class="inp inp-sm" id="siteFilterCust" onchange="window.filterSites(document.getElementById('siteSearch').value)" style="max-width:180px">
        <option value="">Kaikki asiakkaat</option>
        ${customers.map(c => `<option value="${c.id}" ${c.id===prefilterCustomerId?'selected':''}>${c.name}</option>`).join('')}
      </select>
      <select class="inp inp-sm" id="siteFilterStatus" onchange="window.filterSites(document.getElementById('siteSearch').value)" style="max-width:130px">
        <option value="">Kaikki tilat</option>
        <option value="active">Aktiivinen</option>
        <option value="done">Valmis</option>
      </select>
    </div>
    <div id="sitesTable">${sitesTable(sites, custMap)}</div>
  `;
  if (prefilterCustomerId) el('siteFilterCust').value = prefilterCustomerId;
}

function sitesTable(sites, custMap) {
  if (!sites.length) return '<p class="empty-msg">Ei työkohteita.</p>';
  return `<table class="data-table">
    <thead><tr>
      <th>Kohde</th><th>Asiakas</th><th>Osoite</th><th>Kaupunki</th><th>GPS</th><th>Tila</th><th></th>
    </tr></thead>
    <tbody>
    ${sites.map(s => `<tr>
      <td><strong>${ESC(s.name)}</strong></td>
      <td>${ESC(custMap[s.customerId] || '–')}</td>
      <td>${ESC(s.address)}</td>
      <td>${ESC(s.city)}</td>
      <td>${s.lat ? `📍 ±${s.gpsRadius||200}m` : '–'}</td>
      <td><span class="status-badge ${s.status==='active'?'status-approved':'status-rejected'}">${s.status==='active'?'Aktiivinen':'Valmis'}</span></td>
      <td class="row-actions">
        <button class="icon-btn" title="Muokkaa" onclick="window.openSiteForm('${s.id}')">✏️</button>
        <button class="icon-btn" title="${s.status==='active'?'Merkitse valmiiksi':'Aktivoi'}"
          onclick="window.toggleSiteStatus('${s.id}','${s.status}')">${s.status==='active'?'✅':'🔄'}</button>
      </td>
    </tr>`).join('')}
    </tbody>
  </table>`;
}

export async function filterSites(q) {
  const custId   = el('siteFilterCust')?.value   || '';
  const statusV  = el('siteFilterStatus')?.value || '';
  const sites    = await db.list('sites', s => {
    const matchQ = !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.city.toLowerCase().includes(q.toLowerCase());
    const matchC = !custId || s.customerId === custId;
    const matchS = !statusV || s.status === statusV;
    return matchQ && matchC && matchS;
  });
  const customers = await db.list('customers');
  const custMap   = Object.fromEntries(customers.map(c => [c.id, c.name]));
  const t = el('sitesTable');
  if (t) t.innerHTML = sitesTable(sites, custMap);
}

let _editSiteId = null;
export async function openSiteForm(id = null) {
  _editSiteId = id;
  const customers = await db.list('customers', c => c.active !== false);
  const custSel   = el('sf_customerId');
  if (custSel) {
    custSel.innerHTML = '<option value="">– Asiakas –</option>' +
      customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  el('siteModalTitle').textContent = id ? 'Muokkaa kohdetta' : 'Uusi työkohde';
  if (id) {
    const s = await db.get('sites', id);
    ['name','customerId','address','city','lat','lon','gpsRadius','status','notes'].forEach(k => {
      const inp = el('sf_'+k);
      if (inp) inp.value = s[k] ?? '';
    });
  } else {
    el('siteForm')?.reset();
    const sr = el('sf_gpsRadius');
    if (sr) sr.value = '200';
    const ss = el('sf_status');
    if (ss) ss.value = 'active';
  }
  openModal('siteModal');
}

export async function saveSite() {
  const fields = ['name','customerId','address','city','lat','lon','gpsRadius','status','notes'];
  const data = {};
  fields.forEach(k => { const i = el('sf_'+k); data[k] = i ? i.value.trim() : ''; });
  if (!data.name)       { toast('Kohteen nimi on pakollinen.', 'warn'); return; }
  if (!data.customerId) { toast('Valitse asiakas.',            'warn'); return; }
  data.lat       = parseFloat(data.lat)       || null;
  data.lon       = parseFloat(data.lon)       || null;
  data.gpsRadius = parseInt(data.gpsRadius)   || 200;

  if (_editSiteId) {
    await db.update('sites', _editSiteId, data);
    toast('Kohde päivitetty.', 'success');
  } else {
    await db.insert('sites', data);
    toast('Kohde lisätty.', 'success');
  }
  closeModal('siteModal');
  renderSitesPanel();
}

export async function toggleSiteStatus(id, current) {
  const next = current === 'active' ? 'done' : 'active';
  await db.update('sites', id, { status: next });
  toast(next === 'active' ? 'Aktivoitu.' : 'Merkitty valmiiksi.', 'info');
  renderSitesPanel();
}

// ═══════════════════════════════════════════════════════════════════
//  ENTRY APPROVAL (admin)
// ═══════════════════════════════════════════════════════════════════
export async function approveEntry(id) {
  await db.update('entries', id, { status: 'approved' });
  toast('Kirjaus hyväksytty.', 'success');
  closeModal('entryDetailModal');
  document.body.classList.remove('modal-lock');
  if (typeof window.refreshPanels === 'function') window.refreshPanels();
}

export async function rejectEntry(id) {
  await db.update('entries', id, { status: 'rejected' });
  toast('Kirjaus hylätty.', 'warn');
  closeModal('entryDetailModal');
  document.body.classList.remove('modal-lock');
  if (typeof window.refreshPanels === 'function') window.refreshPanels();
}

export async function deleteEntry(id) {
  if (!confirm('Poistetaanko kirjaus pysyvästi?')) return;
  await db.remove('entries', id);
  toast('Poistettu.', 'info');
  closeModal('entryDetailModal');
  document.body.classList.remove('modal-lock');
  if (typeof window.refreshPanels === 'function') window.refreshPanels();
}
