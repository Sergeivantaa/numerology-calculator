/**
 * db.js — Promise-based data layer
 *
 * All persistence is routed through this module.
 * To migrate to Supabase/PostgreSQL, replace only this file.
 * The public API (list, get, insert, update, remove, query) must stay identical.
 *
 * Supabase drop-in (example):
 *   import { createClient } from '@supabase/supabase-js'
 *   const sb = createClient(URL, ANON_KEY)
 *   export const db = {
 *     async list(table)          { const {data} = await sb.from(table).select('*'); return data; },
 *     async get(table, id)       { const {data} = await sb.from(table).select('*').eq('id',id).single(); return data; },
 *     async insert(table, row)   { const {data} = await sb.from(table).insert(row).select().single(); return data; },
 *     async update(table, id, d) { const {data} = await sb.from(table).update(d).eq('id',id).select().single(); return data; },
 *     async remove(table, id)    { await sb.from(table).delete().eq('id',id); },
 *     async query(table, col, op, val) { const {data} = await sb.from(table).select('*').filter(col,op,val); return data; },
 *   }
 */

const P = 'wt_'; // namespace prefix

function read(table) {
  try { return JSON.parse(localStorage.getItem(P + table) || '[]'); }
  catch { return []; }
}
function write(table, rows) {
  localStorage.setItem(P + table, JSON.stringify(rows));
}

export const db = {
  /** Return all rows, optionally filtered by a predicate */
  async list(table, predicate = null) {
    const rows = read(table);
    return predicate ? rows.filter(predicate) : rows;
  },

  /** Return one row by id, or null */
  async get(table, id) {
    return read(table).find(r => r.id === id) ?? null;
  },

  /** Insert and return the new row (id & createdAt injected if missing) */
  async insert(table, row) {
    const rows = read(table);
    const record = {
      ...row,
      id: row.id || crypto.randomUUID(),
      createdAt: row.createdAt || new Date().toISOString(),
    };
    write(table, [...rows, record]);
    return record;
  },

  /** Merge changes into an existing row and return updated row */
  async update(table, id, changes) {
    const rows = read(table);
    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) throw new Error(`${table}/${id} not found`);
    rows[idx] = { ...rows[idx], ...changes, updatedAt: new Date().toISOString() };
    write(table, rows);
    return rows[idx];
  },

  /** Delete a row by id */
  async remove(table, id) {
    write(table, read(table).filter(r => r.id !== id));
  },

  /** Simple equality filter: query('entries', 'workerId', 'w1') */
  async query(table, col, _op, val) {
    return read(table).filter(r => r[col] === val);
  },

  /** Wipe all data (useful for tests / reset) */
  async resetAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(P))
      .forEach(k => localStorage.removeItem(k));
  },

  /** Export full snapshot (for backup / migration) */
  export() {
    const snap = {};
    Object.keys(localStorage)
      .filter(k => k.startsWith(P))
      .forEach(k => { snap[k.slice(P.length)] = JSON.parse(localStorage.getItem(k)); });
    return snap;
  },

  /** Import a snapshot (e.g. from backend seed) */
  import(snapshot) {
    Object.entries(snapshot).forEach(([table, rows]) => write(table, rows));
  },
};
