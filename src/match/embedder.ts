// Meaning score: sentence embeddings (multilingual-e5-small in a Web Worker), optional and lazy.
// Everything here degrades to "not ready" without throwing; the keyword score then stands alone.
import { corpusHash, getCorpus, type CorpusItem } from './corpus';
import { normalize } from './normalize';

export interface Embedder {
  /** L2-normalised vectors for the given texts (the e5 `query: ` prefix is the embedder's job). */
  embed(texts: string[]): Promise<Float32Array[]>;
}

/** cosine -> 0..1. e5-small cosines are compressed (unrelated ~0.78-0.82, paraphrase ~0.9+). Retune with real data. */
export const MEANING_LO = 0.8;
export const MEANING_HI = 0.94;
export const WEIGHT_KEYWORD = 0.4;
export const WEIGHT_MEANING = 0.6;

let embedder: Embedder | null = null;
let vectors: Map<string, Float32Array[]> | null = null;
let loading: Promise<boolean> | null = null;

/** Text actually embedded: dialect mapped to standard Arabic, same recipe for examples and questions. */
export function embedText(t: string): string {
  return normalize(t) || t;
}

/** Inject an embedder (tests, or a custom backend). Resets any loaded example vectors. */
export function setEmbedder(e: Embedder | null): void {
  embedder = e;
  vectors = null;
  loading = null;
}

export function isMeaningReady(): boolean {
  return !!embedder && !!vectors;
}

function lowMemory(): boolean {
  const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as (Navigator & { deviceMemory?: number }) | undefined;
  return !!nav && typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
}

function workerSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof window !== 'undefined';
}

function createWorkerEmbedder(): Embedder {
  let worker: Worker | null = null;
  let seq = 0;
  const pending = new Map<number, { ok: (v: Float32Array[]) => void; fail: (e: unknown) => void }>();
  const ensure = () => {
    if (worker) return worker;
    worker = new Worker(new URL('./embed.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent) => {
      const { id, vectors: out, error } = ev.data as { id: number; vectors?: number[][]; error?: string };
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error || !out) p.fail(new Error(error ?? 'embed failed'));
      else p.ok(out.map((v) => Float32Array.from(v)));
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.fail(e);
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  };
  return {
    embed(texts) {
      return new Promise((ok, fail) => {
        const id = ++seq;
        pending.set(id, { ok, fail });
        try {
          ensure().postMessage({ id, texts });
        } catch (e) {
          pending.delete(id);
          fail(e);
        }
      });
    },
  };
}

// ---- compact storage: int8 base64 per vector ------------------------------------------------------
export function packVector(v: Float32Array): string {
  const bytes = new Uint8Array(v.length);
  for (let i = 0; i < v.length; i++) bytes[i] = Math.max(-127, Math.min(127, Math.round(v[i] * 127))) & 0xff;
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function unpackVector(b64: string): Float32Array {
  const s = atob(b64);
  const v = new Float32Array(s.length);
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const x = (s.charCodeAt(i) << 24) >> 24;
    v[i] = x / 127;
    n += v[i] * v[i];
  }
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

export interface EmbeddingsFile {
  version: 1;
  hash: string;
  model: string;
  items: Record<string, string[]>;
}

function fromFile(f: EmbeddingsFile, items: CorpusItem[]): Map<string, Float32Array[]> | null {
  const out = new Map<string, Float32Array[]>();
  for (const it of items) {
    const arr = f.items[it.key];
    if (!arr || arr.length !== it.texts.length) return null;
    out.set(it.key, arr.map(unpackVector));
  }
  return out;
}

async function fetchPrebuilt(hash: string, items: CorpusItem[]) {
  if (typeof fetch === 'undefined' || typeof window === 'undefined') return null;
  try {
    const base = (import.meta.env?.BASE_URL as string | undefined) ?? './';
    const res = await fetch(`${base}match/embeddings.json`);
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    const f = (await res.json()) as EmbeddingsFile;
    return f.hash === hash ? fromFile(f, items) : null;
  } catch {
    return null;
  }
}

const DB = 'alrashed-match';
function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('emb');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function idbGet(hash: string): Promise<EmbeddingsFile | null> {
  const db = await idb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const rq = db.transaction('emb').objectStore('emb').get(hash);
      rq.onsuccess = () => resolve((rq.result as EmbeddingsFile | undefined) ?? null);
      rq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function idbPut(hash: string, f: EmbeddingsFile): Promise<void> {
  const db = await idb();
  if (!db) return;
  try {
    db.transaction('emb', 'readwrite').objectStore('emb').put(f, hash);
  } catch {
    /* cache only */
  }
}

async function loadVectors(e: Embedder): Promise<Map<string, Float32Array[]>> {
  const items = getCorpus();
  const hash = corpusHash(items, embedText);
  const pre = await fetchPrebuilt(hash, items);
  if (pre) return pre;
  const cached = await idbGet(hash);
  if (cached && cached.hash === hash) {
    const m = fromFile(cached, items);
    if (m) return m;
  }
  const flat: { key: string; text: string }[] = [];
  for (const it of items) for (const t of it.texts) flat.push({ key: it.key, text: embedText(t) });
  const out = new Map<string, Float32Array[]>();
  const BATCH = 24;
  for (let i = 0; i < flat.length; i += BATCH) {
    const part = flat.slice(i, i + BATCH);
    const vs = await e.embed(part.map((p) => p.text));
    part.forEach((p, j) => {
      const arr = out.get(p.key) ?? [];
      arr.push(vs[j]);
      out.set(p.key, arr);
    });
  }
  const file: EmbeddingsFile = { version: 1, hash, model: 'multilingual-e5-small', items: {} };
  for (const [k, arr] of out) file.items[k] = arr.map(packVector);
  void idbPut(hash, file);
  return out;
}

/** Start loading (idempotent). Resolves true when the meaning score is available. Never rejects. */
export function startMeaning(): Promise<boolean> {
  if (loading) return loading;
  if (!embedder) {
    if (lowMemory() || !workerSupported()) return Promise.resolve(false);
    try {
      embedder = createWorkerEmbedder();
    } catch {
      return Promise.resolve(false);
    }
  }
  const e = embedder;
  loading = loadVectors(e)
    .then((v) => {
      if (embedder === e) vectors = v;
      return embedder === e;
    })
    .catch(() => false);
  return loading;
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function calibrateCosine(c: number): number {
  return Math.max(0, Math.min(1, (c - MEANING_LO) / (MEANING_HI - MEANING_LO)));
}

/** Meaning score per item key for a question, or null when the model is not ready or fails. */
export async function meaningScores(text: string, timeoutMs = 2500): Promise<Map<string, number> | null> {
  if (!embedder || !vectors) return null;
  const e = embedder;
  const vs = vectors;
  try {
    const q = await Promise.race([
      e.embed([embedText(text)]),
      new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
    ]);
    if (!q || !q[0]) return null;
    const out = new Map<string, number>();
    for (const [key, arr] of vs) {
      let best = -1;
      for (const v of arr) best = Math.max(best, dot(q[0], v));
      out.set(key, calibrateCosine(best));
    }
    return out;
  } catch {
    return null;
  }
}
