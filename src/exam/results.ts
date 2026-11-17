// OWNER: exam worker. Result rows: device id, local copy, offline queue (IndexedDB) and upload.
import { postExamResult, type ExamRow } from '../backend/api';

export const EXAM_VERSION = 1;
export const APP_VERSION: string = ((import.meta.env?.VITE_APP_VERSION as string | undefined) ?? '0.1.0').slice(0, 20);

const DEVICE_KEY = 'alrashed.deviceId.v1';
const LOCAL_KEY = 'alrashed.exam.results.v1';
const FALLBACK_QUEUE_KEY = 'alrashed.exam.queue.v1';
const MAX_LOCAL = 2000;

export function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  const h = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

let memDevice: string | null = null;
/** Random id created on first launch; not linked to a person. */
export function deviceId(): string {
  const saved = lsGet(DEVICE_KEY);
  if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
  memDevice ??= uuid();
  lsSet(DEVICE_KEY, memDevice);
  return memDevice;
}

export function buildRow(o: { phase: 'pre' | 'post'; answers: boolean[]; input: ('v' | 't')[]; gender: ExamRow['gender']; now?: Date }): ExamRow {
  const score = o.answers.filter(Boolean).length;
  return {
    id: uuid(),
    device_id: deviceId(),
    phase: o.phase,
    score,
    answers: o.answers.map((a) => (a ? '1' : '0')).join(''),
    input: o.input.join(''),
    gender: o.gender,
    created_at: (o.now ?? new Date()).toISOString(),
    app_version: APP_VERSION,
    exam_version: EXAM_VERSION,
  };
}

/** Shape check shared with the dashboard (rows from the server or storage). */
export function validRow(r: unknown): r is ExamRow {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  return (
    typeof x.id === 'string' &&
    typeof x.device_id === 'string' &&
    (x.phase === 'pre' || x.phase === 'post') &&
    typeof x.score === 'number' &&
    typeof x.answers === 'string' &&
    /^[01]{10}$/.test(x.answers) &&
    typeof x.input === 'string' &&
    typeof x.created_at === 'string' &&
    !Number.isNaN(Date.parse(x.created_at)) &&
    typeof x.exam_version === 'number'
  );
}

/* ------------------------------------------------------------------------ local copy */

export function loadLocalRows(): ExamRow[] {
  try {
    const raw = lsGet(LOCAL_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter(validRow) : [];
  } catch {
    return [];
  }
}

function saveLocalRow(row: ExamRow) {
  const rows = loadLocalRows();
  if (rows.some((r) => r.id === row.id)) return;
  rows.push(row);
  lsSet(LOCAL_KEY, JSON.stringify(rows.slice(-MAX_LOCAL)));
}

/* ------------------------------------------------------------------- IndexedDB queue */

const DB_NAME = 'alrashed-exam';
const STORE = 'queue';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function queueAll(): Promise<ExamRow[]> {
  const db = await openDb();
  if (!db) {
    try {
      const arr = JSON.parse(lsGet(FALLBACK_QUEUE_KEY) ?? '[]') as unknown;
      return Array.isArray(arr) ? arr.filter(validRow) : [];
    } catch {
      return [];
    }
  }
  const all = (await tx<ExamRow[]>(db, 'readonly', (s) => s.getAll())) ?? [];
  db.close();
  return all.filter(validRow);
}

async function queuePut(row: ExamRow) {
  const db = await openDb();
  if (!db) {
    const q = await queueAll();
    if (!q.some((r) => r.id === row.id)) q.push(row);
    lsSet(FALLBACK_QUEUE_KEY, JSON.stringify(q.slice(-500)));
    return;
  }
  await tx(db, 'readwrite', (s) => s.put(row));
  db.close();
}

async function queueDelete(id: string) {
  const db = await openDb();
  if (!db) {
    const q = (await queueAll()).filter((r) => r.id !== id);
    lsSet(FALLBACK_QUEUE_KEY, JSON.stringify(q));
    return;
  }
  await tx(db, 'readwrite', (s) => s.delete(id));
  db.close();
}

/* --------------------------------------------------------------------------- upload */

let flushing = false;
/** Send every queued row; rows the server accepts or will never accept leave the queue. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const row of await queueAll()) {
      const out = await postExamResult(row);
      if (out === 'failed') break; // offline or server down: try again later
      await queueDelete(row.id);
      if (out === 'ok') sent++;
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Save a finished test: local copy, queue, then try to send right away. Never throws. */
export async function saveResult(row: ExamRow): Promise<void> {
  try {
    saveLocalRow(row);
    await queuePut(row);
    await flushQueue();
  } catch (e) {
    console.error('[exam] save', e);
  }
}

let started = false;
/** Flush at app start and whenever the browser comes back online. */
export function startResultSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => void flushQueue());
  setTimeout(() => void flushQueue(), 4000);
}
