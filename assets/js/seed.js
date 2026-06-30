/**
 * seed.js — Demo data for development / first run
 * Run once when localStorage is empty.
 */

import { db } from './db.js';

const WORKERS = [
  { id: 'w1', name: 'Matti Virtanen',  role: 'admin',    pin: '1234', email: 'matti@esimerkki.fi',   phone: '040-1234567', hourlyRate: 22, overtimeMultiplier: 1.5, active: true },
  { id: 'w2', name: 'Juha Korhonen',   role: 'worker',   pin: '0000', email: 'juha@esimerkki.fi',    phone: '040-7654321', hourlyRate: 18, overtimeMultiplier: 1.5, active: true },
  { id: 'w3', name: 'Sari Mäkinen',    role: 'worker',   pin: '0000', email: 'sari@esimerkki.fi',    phone: '050-1112233', hourlyRate: 18, overtimeMultiplier: 1.5, active: true },
  { id: 'w4', name: 'Pekka Leinonen',  role: 'worker',   pin: '0000', email: 'pekka@esimerkki.fi',   phone: '044-9988776', hourlyRate: 20, overtimeMultiplier: 1.5, active: true },
];

const CUSTOMERS = [
  { id: 'c1', name: 'Rakennusliike Oy',        contactPerson: 'Timo Aho',    email: 'timo@rakennusliike.fi',  phone: '09-1234567', address: 'Mannerheimintie 1', city: 'Helsinki',  businessId: '1234567-8', notes: '',            active: true },
  { id: 'c2', name: 'Kiinteistö Oy Vantaa',    contactPerson: 'Liisa Niemi', email: 'liisa@kiinteisto.fi',    phone: '09-9876543', address: 'Tikkurilantie 10',  city: 'Vantaa',    businessId: '8765432-1', notes: 'VIP-asiakas', active: true },
  { id: 'c3', name: 'Espoo Rakennus Oy',        contactPerson: 'Kari Salo',   email: 'kari@espoo-rak.fi',      phone: '09-5551234', address: 'Espoonkatu 5',      city: 'Espoo',     businessId: '2345678-9', notes: '',            active: true },
];

const SITES = [
  // Customer 1
  { id: 's1', customerId: 'c1', name: 'Työmaa Helsinki A', address: 'Mannerheimintie 12', city: 'Helsinki', lat: 60.1699, lon: 24.9384, gpsRadius: 200, status: 'active', notes: 'Perustukset', createdAt: '' },
  { id: 's2', customerId: 'c1', name: 'Työmaa Helsinki B', address: 'Aleksanterinkatu 5',  city: 'Helsinki', lat: 60.1683, lon: 24.9429, gpsRadius: 150, status: 'active', notes: 'Sisävalmistelu', createdAt: '' },
  // Customer 2
  { id: 's3', customerId: 'c2', name: 'Työmaa Vantaa',     address: 'Tikkurilantie 20',   city: 'Vantaa',   lat: 60.2924, lon: 25.0378, gpsRadius: 300, status: 'active', notes: '', createdAt: '' },
  { id: 's4', customerId: 'c2', name: 'Varasto Vantaa',    address: 'Varastotie 3',        city: 'Vantaa',   lat: 60.2880, lon: 25.0300, gpsRadius: 100, status: 'active', notes: 'Materiaalien säilytys', createdAt: '' },
  // Customer 3
  { id: 's5', customerId: 'c3', name: 'Työmaa Espoo',      address: 'Espoonkatu 8',        city: 'Espoo',    lat: 60.2052, lon: 24.6559, gpsRadius: 200, status: 'active', notes: '', createdAt: '' },
  { id: 's6', customerId: 'c3', name: 'Espoo Renovointi',  address: 'Leppävaarankatu 1',   city: 'Espoo',    lat: 60.2178, lon: 24.8120, gpsRadius: 150, status: 'done',   notes: 'Valmistunut', createdAt: '' },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = x => String(x).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function makeEntry(overrides) {
  const date  = overrides.date;
  const start = `${date}T${overrides.startH}:00:00.000Z`;
  const end   = `${date}T${overrides.endH}:00:00.000Z`;
  const durationMs = (new Date(end) - new Date(start));
  const breakMin   = overrides.breakMin || 30;
  const netMs      = durationMs - breakMin * 60000;
  return {
    id:          crypto.randomUUID(),
    workerId:    overrides.workerId,
    siteId:      overrides.siteId,
    customerId:  overrides.customerId,
    date,
    startISO:    start,
    endISO:      end,
    durationMs,
    breakMin,
    netMs,
    category:    overrides.category || 'installation',
    description: overrides.description || '',
    checkInGps:  overrides.gps || null,
    checkOutGps: overrides.gps || null,
    gpsVerified: !!overrides.gps,
    status:      overrides.status || 'approved',
    notes:       '',
    createdAt:   new Date().toISOString(),
  };
}

const ENTRIES = [
  // Today
  makeEntry({ workerId:'w2', siteId:'s1', customerId:'c1', date:daysAgo(0), startH:'06', endH:'15', breakMin:30, category:'demolition',  description:'Vanhan lattian purku' }),
  makeEntry({ workerId:'w3', siteId:'s3', customerId:'c2', date:daysAgo(0), startH:'07', endH:'14', breakMin:30, category:'installation', description:'Sähköasennukset' }),
  // Yesterday
  makeEntry({ workerId:'w2', siteId:'s1', customerId:'c1', date:daysAgo(1), startH:'06', endH:'14', breakMin:30, category:'installation' }),
  makeEntry({ workerId:'w2', siteId:'s3', customerId:'c2', date:daysAgo(1), startH:'15', endH:'17', breakMin: 0, category:'transport',    description:'Materiaalien ajo' }),
  makeEntry({ workerId:'w3', siteId:'s5', customerId:'c3', date:daysAgo(1), startH:'07', endH:'16', breakMin:45, category:'cleaning' }),
  makeEntry({ workerId:'w4', siteId:'s2', customerId:'c1', date:daysAgo(1), startH:'07', endH:'17', breakMin:30, category:'installation', description:'Kipsilevyseinät', status:'submitted' }),
  // 2 days ago
  makeEntry({ workerId:'w2', siteId:'s5', customerId:'c3', date:daysAgo(2), startH:'06', endH:'16', breakMin:30, category:'demolition' }),
  makeEntry({ workerId:'w3', siteId:'s1', customerId:'c1', date:daysAgo(2), startH:'07', endH:'15', breakMin:30, category:'installation' }),
  makeEntry({ workerId:'w4', siteId:'s3', customerId:'c2', date:daysAgo(2), startH:'08', endH:'18', breakMin:60, category:'material_handling', description:'Betonilattia' }),
  // 3 days ago
  makeEntry({ workerId:'w2', siteId:'s2', customerId:'c1', date:daysAgo(3), startH:'06', endH:'15', breakMin:30, category:'installation' }),
  makeEntry({ workerId:'w3', siteId:'s4', customerId:'c2', date:daysAgo(3), startH:'08', endH:'16', breakMin:30, category:'transport' }),
  makeEntry({ workerId:'w4', siteId:'s5', customerId:'c3', date:daysAgo(3), startH:'07', endH:'16', breakMin:30, category:'cleaning' }),
  // Last week
  makeEntry({ workerId:'w2', siteId:'s1', customerId:'c1', date:daysAgo(7), startH:'06', endH:'16', breakMin:30, category:'demolition',  status:'approved' }),
  makeEntry({ workerId:'w3', siteId:'s3', customerId:'c2', date:daysAgo(7), startH:'07', endH:'17', breakMin:30, category:'installation',status:'approved' }),
  makeEntry({ workerId:'w4', siteId:'s2', customerId:'c1', date:daysAgo(8), startH:'06', endH:'15', breakMin:30, category:'inspection',  status:'approved' }),
  makeEntry({ workerId:'w2', siteId:'s5', customerId:'c3', date:daysAgo(9), startH:'07', endH:'14', breakMin:30, category:'other',       status:'approved' }),
];

export async function seedIfEmpty() {
  const workers = await db.list('workers');
  if (workers.length > 0) return; // already seeded

  const now = new Date().toISOString();
  await Promise.all(WORKERS.map(w    => db.insert('workers',   { ...w,    createdAt: now })));
  await Promise.all(CUSTOMERS.map(c  => db.insert('customers', { ...c,    createdAt: now })));
  await Promise.all(SITES.map(s      => db.insert('sites',     { ...s,    createdAt: now })));
  await Promise.all(ENTRIES.map(e    => db.insert('entries',   e)));

  console.info('[seed] Demo data inserted');
}
