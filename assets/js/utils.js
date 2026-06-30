/** Shared utility functions — no side-effects, no imports */

// ── IDs & dates ───────────────────────────────────────────────────────────────
export const uid = () => crypto.randomUUID();

export function pad(n) { return String(n).padStart(2, '0'); }

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToKey(iso) {
  return iso ? iso.slice(0, 10) : '';
}

export function fmtTime(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDate(key, opts = {}) {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fi-FI', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: opts.year !== false ? 'numeric' : undefined,
    ...opts,
  });
}

export function fmtDateLong(key) {
  return fmtDate(key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function monthLabel(y, m) {
  const s = new Date(y, m, 1).toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekStart(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── Duration helpers ──────────────────────────────────────────────────────────
export function fmtDuration(ms) {
  if (!ms || ms < 0) return '0 min';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? `${h}t ${m}min` : `${m}min`;
}

export function fmtHours(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalMin = Math.floor(ms / 60000);
  return `${Math.floor(totalMin / 60)}:${pad(totalMin % 60)}`;
}

export function msToDecimalHours(ms) {
  return +(ms / 3600000).toFixed(2);
}

/** Regular vs overtime split. stdHours default 8. Returns {regularMs, overtimeMs}. */
export function splitOvertime(netMs, stdHours = 8) {
  const stdMs = stdHours * 3600000;
  if (netMs <= stdMs) return { regularMs: netMs, overtimeMs: 0 };
  return { regularMs: stdMs, overtimeMs: netMs - stdMs };
}

// ── GPS ───────────────────────────────────────────────────────────────────────
/** Haversine distance in metres between two lat/lon pairs */
export function gpsDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Prompt geolocation and resolve with {lat, lon, acc} or reject */
export function getCurrentPosition(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('not_supported')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 12000, ...opts }
    );
  });
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
export function el(id) { return document.getElementById(id); }

export function qs(selector, scope = document) { return scope.querySelector(selector); }

export function qsa(selector, scope = document) { return [...scope.querySelectorAll(selector)]; }

export function html(id, markup) {
  const e = document.getElementById(id);
  if (e) e.innerHTML = markup;
}

/** Show/hide element by id */
export function show(id, visible = true) {
  const e = document.getElementById(id);
  if (e) e.style.display = visible ? '' : 'none';
}

// ── Toast notifications ───────────────────────────────────────────────────────
let toastTimer;
export function toast(msg, type = 'info', durationMs = 3200) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  clearTimeout(toastTimer);
  container.textContent = msg;
  container.className = `toast toast-${type} toast-visible`;
  toastTimer = setTimeout(() => container.classList.remove('toast-visible'), durationMs);
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.classList.add('modal-lock');
}
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.classList.remove('modal-lock');
}

// ── Form helpers ──────────────────────────────────────────────────────────────
export function formData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  return Object.fromEntries(new FormData(form).entries());
}

export function setFormValues(formId, data) {
  const form = document.getElementById(formId);
  if (!form) return;
  Object.entries(data).forEach(([k, v]) => {
    const el = form.elements[k];
    if (el) el.value = v ?? '';
  });
}

// ── CSV / download ────────────────────────────────────────────────────────────
export function downloadText(content, filename, mime = 'text/plain;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [keys.join(';'), ...rows.map(r => keys.map(k => esc(r[k])).join(';'))].join('\r\n');
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

export const WEEKDAYS_SHORT = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
export const WEEKDAYS_LONG  = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];

export const CATEGORIES = {
  demolition:        'Purkutyö',
  installation:      'Asennus',
  cleaning:          'Siivous',
  transport:         'Kuljetus',
  material_handling: 'Materiaalien käsittely',
  planning:          'Suunnittelu',
  inspection:        'Tarkastus',
  other:             'Muu',
};

export const ENTRY_STATUS = {
  draft:     'Luonnos',
  submitted: 'Lähetetty',
  approved:  'Hyväksytty',
  rejected:  'Hylätty',
};
