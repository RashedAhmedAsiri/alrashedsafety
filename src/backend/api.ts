import type { Gender, LocationId, Expression, Weather } from '../core/types';
import { SCENARIO_BY_ID, SHORT_BY_ID } from '../content';
// OWNER: exam/backend worker. Client for the Cloudflare Worker (workers/src/index.ts).
// Keep the original exports exactly (API_BASE, CreativeAnswer, askCreative, tieBreak, isOnline).
//
// Every call resolves to null (never throws) when VITE_API_BASE is empty, the browser is offline,
// the request times out, is aborted, or the server answers with an error. Callers then use their
// offline fallback. The server contract is documented in docs/exam.md.

export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').trim().replace(/\/+$/, '');

export interface CreativeAnswer {
  on_topic: boolean;
  location: LocationId | null;
  weather: Weather | null;
  expression: Expression;
  answer: string;
  audioUrl?: string;
  visemes?: [number, number][];
}

/** One saved exam result (docs/plan/Exam.md "Saved per finished test"). No name, audio or transcript. */
export interface ExamRow {
  id: string;
  device_id: string;
  phase: 'pre' | 'post';
  score: number;
  /** Ten characters of 1 or 0, in question order. */
  answers: string;
  /** Ten characters of v (voice) or t (tap). */
  input: string;
  gender: 'boy' | 'girl' | 'unknown';
  /** UTC ISO timestamp. */
  created_at: string;
  app_version: string;
  exam_version: number;
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? false : navigator.onLine;
}

/** True when a Worker is configured and the browser says it is online. */
export function backendAvailable(): boolean {
  return API_BASE !== '' && isOnline();
}

/* ------------------------------------------------------------------------------ plumbing */

type Result<T> = { status: number; data: T | null };

/** Combine the caller's signal with a timeout. */
function withTimeout(ms: number, outer?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  const onAbort = () => ac.abort();
  if (outer) {
    if (outer.aborted) ac.abort();
    else outer.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: ac.signal,
    done: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    },
  };
}

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  o: { body?: unknown; headers?: Record<string, string>; timeoutMs: number; signal?: AbortSignal },
): Promise<Result<T> | null> {
  if (!backendAvailable()) return null;
  const t = withTimeout(o.timeoutMs, o.signal);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: t.signal,
      headers: { ...(o.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(o.headers ?? {}) },
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      credentials: 'omit',
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch {
    return null;
  } finally {
    t.done();
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/* --------------------------------------------------------------------------- creative mode */

export async function askCreative(question: string, gender: Gender, history: { q: string; a: string }[], signal?: AbortSignal): Promise<CreativeAnswer | null> {
  const r = await call<unknown>('POST', '/api/creative', {
    body: { question: question.slice(0, 300), gender, history: history.slice(-6).map((h) => ({ q: h.q.slice(0, 300), a: h.a.slice(0, 600) })) },
    timeoutMs: 25000,
    signal,
  });
  if (!r || r.status !== 200 || !isObj(r.data)) return null;
  const d = r.data;
  if (typeof d.on_topic !== 'boolean' || typeof d.answer !== 'string') return null;
  const out: CreativeAnswer = {
    on_topic: d.on_topic,
    location: typeof d.location === 'string' ? (d.location as LocationId) : null,
    weather: typeof d.weather === 'string' ? (d.weather as Weather) : null,
    expression: typeof d.expression === 'string' ? (d.expression as Expression) : 'lightbulb',
    answer: d.answer,
  };
  if (typeof d.audioUrl === 'string' && d.audioUrl.startsWith('data:audio/')) out.audioUrl = d.audioUrl;
  if (Array.isArray(d.visemes)) {
    out.visemes = d.visemes.filter((v): v is [number, number] => Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number');
  }
  return out;
}

/** A short title for a scenario / short answer id, so the model can compare two candidates. */
function titleOf(id: string): string {
  const sc = SCENARIO_BY_ID[id];
  if (sc) return sc.title;
  const sh = SHORT_BY_ID[id];
  if (sh) return sh.asks?.[0] ?? sh.chip;
  return id;
}

/** Close match: ask the model which of two ids the student meant. Returns one of the two ids or null. */
export async function tieBreak(question: string, ids: [string, string], signal?: AbortSignal): Promise<string | null> {
  const r = await call<{ id?: unknown }>('POST', '/api/tiebreak', {
    body: { question: question.slice(0, 300), candidates: ids.map((id) => ({ id, title: titleOf(id).slice(0, 120) })) },
    timeoutMs: 5000,
    signal,
  });
  if (!r || r.status !== 200 || !isObj(r.data)) return null;
  const id = r.data.id;
  return typeof id === 'string' && (ids as string[]).includes(id) ? id : null;
}

/* --------------------------------------------------------------------------------- exam */

export interface OpenJudgement {
  pass: boolean;
  /** Concept ids the model found (ids from the exam content). */
  concepts: string[];
  /** True when the model heard an unsafe idea (a «wrong word» concept). */
  unsafe: boolean;
}

/** Online judge for an open question when the offline check found no concept. */
export async function judgeOpen(questionId: string, concepts: string[], text: string, signal?: AbortSignal): Promise<OpenJudgement | null> {
  const r = await call<unknown>('POST', '/api/judge', {
    body: { questionId, concepts, text: text.slice(0, 300) },
    timeoutMs: 6000,
    signal,
  });
  if (!r || r.status !== 200 || !isObj(r.data)) return null;
  const d = r.data;
  if (typeof d.pass !== 'boolean' || !Array.isArray(d.concepts)) return null;
  return { pass: d.pass, concepts: d.concepts.filter((c): c is string => typeof c === 'string'), unsafe: d.unsafe === true };
}

/** 'ok' = saved, 'rejected' = the server will never accept this row (drop it), 'failed' = try again later. */
export type PostOutcome = 'ok' | 'rejected' | 'failed';

export async function postExamResult(row: ExamRow, signal?: AbortSignal): Promise<PostOutcome> {
  const r = await call<unknown>('POST', '/api/exam', { body: row, timeoutMs: 10000, signal });
  if (!r) return 'failed';
  if (r.status === 200 || r.status === 201 || r.status === 409) return 'ok'; // 409: already saved (same id)
  if (r.status === 400 || r.status === 413 || r.status === 422) return 'rejected';
  return 'failed';
}

export type ResultsReply = { ok: true; rows: ExamRow[] } | { ok: false; reason: 'bad-pin' | 'no-pin' | 'unavailable' };

export async function getResults(pin: string, opts?: { from?: string; to?: string; signal?: AbortSignal }): Promise<ResultsReply> {
  const qs = new URLSearchParams();
  if (opts?.from) qs.set('from', opts.from);
  if (opts?.to) qs.set('to', opts.to);
  const r = await call<{ rows?: unknown }>('GET', `/api/results${qs.size ? `?${qs}` : ''}`, {
    headers: { 'X-Teacher-Pin': pin },
    timeoutMs: 15000,
    signal: opts?.signal,
  });
  if (!r) return { ok: false, reason: 'unavailable' };
  if (r.status === 401 || r.status === 403) return { ok: false, reason: 'bad-pin' };
  if (r.status === 428) return { ok: false, reason: 'no-pin' };
  if (r.status !== 200 || !isObj(r.data) || !Array.isArray(r.data.rows)) return { ok: false, reason: 'unavailable' };
  return { ok: true, rows: r.data.rows.filter(isObj) as unknown as ExamRow[] };
}

/* -------------------------------------------------------------------------- teacher PIN */

/** Whether the Worker already has a teacher PIN. null = could not ask (offline). */
export async function teacherPinIsSet(signal?: AbortSignal): Promise<boolean | null> {
  const r = await call<{ set?: unknown }>('GET', '/api/pin', { timeoutMs: 6000, signal });
  if (!r || r.status !== 200 || !isObj(r.data) || typeof r.data.set !== 'boolean') return null;
  return r.data.set;
}

/** Check a PIN against the Worker. null = could not ask. */
export async function checkTeacherPin(pin: string, signal?: AbortSignal): Promise<boolean | null> {
  const r = await call<{ ok?: unknown }>('POST', '/api/pin/check', { body: { pin }, timeoutMs: 6000, signal });
  if (!r) return null;
  if (r.status === 429 || r.status >= 500) return null;
  return r.status === 200 && isObj(r.data) && r.data.ok === true;
}

/**
 * Set the teacher PIN on the Worker. First time: `{ pin }`. Change: `{ pin, current }`. Reset with the
 * admin PIN from the Worker's secrets: `{ pin, admin }`. Returns 'ok', 'denied' (wrong current/admin
 * PIN) or null (could not reach the Worker).
 */
export async function setTeacherPin(o: { pin: string; current?: string; admin?: string }, signal?: AbortSignal): Promise<'ok' | 'denied' | null> {
  const r = await call<{ ok?: unknown }>('POST', '/api/pin/set', { body: o, timeoutMs: 8000, signal });
  if (!r) return null;
  if (r.status === 200 && isObj(r.data) && r.data.ok === true) return 'ok';
  if (r.status === 401 || r.status === 403 || r.status === 409) return 'denied';
  return null;
}
