// Cloudflare Worker for the Alrashed app. Routes (all under /api):
//   POST /creative   Gemini answer (JSON) + Azure TTS audio as a data URL
//   POST /tiebreak   Gemini picks one of two ids (never text)
//   POST /judge      Gemini judges an open exam answer (concept ids only)
//   POST /exam       save one exam result (D1)
//   GET  /results    all results (needs the teacher PIN in the X-Teacher-Pin header)
//   GET  /pin        { set: boolean }          POST /pin/check { pin }          POST /pin/set { pin, current? | admin? }
// Secrets: GEMINI_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, ADMIN_PIN. Details in docs/deploy.md.
import { GENDER_PLACEHOLDER, RULE_LOCATIONS, SYSTEM_RULES_TEMPLATE } from './prompt';

/* ------------------------------------------------------------------------------ http */

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Teacher-Pin',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(env: Env, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(env) },
  });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Per-IP sliding-window limits. In memory per Worker instance: best effort, free, no storage. */
const hits = new Map<string, number[]>();
const LIMITS: Record<string, [number, number]> = {
  creative: [6, 60_000],
  tiebreak: [20, 60_000],
  judge: [20, 60_000],
  exam: [30, 60_000],
  results: [20, 60_000],
  pin: [10, 60_000],
};
function rateLimit(ip: string, route: string) {
  const [max, windowMs] = LIMITS[route] ?? [20, 60_000];
  const now = Date.now();
  const key = `${route}|${ip}`;
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, 'rate limit');
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 120_000) hits.delete(k);
}

async function readJson(req: Request, maxBytes = 8192): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get('Content-Length') ?? '0');
  if (len > maxBytes) throw new HttpError(413, 'too large');
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too large');
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'bad json');
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, 'bad body');
  return v as Record<string, unknown>;
}

function onlyKeys(o: Record<string, unknown>, allowed: string[]) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new HttpError(400, `unexpected field ${k}`);
}

function str(v: unknown, min: number, max: number, what: string): string {
  if (typeof v !== 'string') throw new HttpError(400, `${what} must be text`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw new HttpError(400, `${what} length`);
  // No control characters.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) throw new HttpError(400, `${what} characters`);
  return s;
}

/* ---------------------------------------------------------------------------- crypto */

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
function safeEqual(a: string, b: string): boolean {
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

/* ------------------------------------------------------------------------ teacher PIN */

const PIN_RE = /^[0-9]{4}$/;

async function getSetting(env: Env, key: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return r?.value ?? null;
}
async function putSetting(env: Env, key: string, value: string) {
  await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value).run();
}
async function pinIsSet(env: Env): Promise<boolean> {
  return (await getSetting(env, 'pin_hash')) !== null;
}
async function pinMatches(env: Env, pin: string): Promise<boolean> {
  if (!PIN_RE.test(pin)) return false;
  const salt = await getSetting(env, 'pin_salt');
  const hash = await getSetting(env, 'pin_hash');
  if (!salt || !hash) return false;
  return safeEqual(await sha256(salt + pin), hash);
}
const adminMatches = (env: Env, v: unknown) => typeof v === 'string' && !!env.ADMIN_PIN && v.length <= 64 && safeEqual(v, env.ADMIN_PIN);

async function storePin(env: Env, pin: string) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  await putSetting(env, 'pin_salt', salt);
  await putSetting(env, 'pin_hash', await sha256(salt + pin));
}

async function handlePin(env: Env, req: Request, sub: string): Promise<Response> {
  if (sub === '' && req.method === 'GET') return json(env, { set: await pinIsSet(env) });
  if (req.method !== 'POST') throw new HttpError(405, 'method');
  const body = await readJson(req, 512);
  if (sub === '/check') {
    onlyKeys(body, ['pin']);
    return json(env, { ok: await pinMatches(env, String(body.pin ?? '')) });
  }
  if (sub === '/set') {
    onlyKeys(body, ['pin', 'current', 'admin']);
    const pin = String(body.pin ?? '');
    if (!PIN_RE.test(pin)) throw new HttpError(400, 'pin must be 4 digits');
    const first = !(await pinIsSet(env));
    const allowed = first || adminMatches(env, body.admin) || (typeof body.current === 'string' && (await pinMatches(env, body.current)));
    if (!allowed) return json(env, { ok: false }, first ? 400 : 403);
    await storePin(env, pin);
    return json(env, { ok: true });
  }
  throw new HttpError(404, 'not found');
}

/* ------------------------------------------------------------------------- exam rows */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function handleExamPost(env: Env, req: Request): Promise<Response> {
  const b = await readJson(req, 2048);
  onlyKeys(b, ['id', 'device_id', 'phase', 'score', 'answers', 'input', 'gender', 'created_at', 'app_version', 'exam_version']);
  const id = String(b.id ?? '');
  const device = String(b.device_id ?? '');
  if (!UUID_RE.test(id) || !UUID_RE.test(device)) throw new HttpError(400, 'ids');
  if (b.phase !== 'pre' && b.phase !== 'post') throw new HttpError(400, 'phase');
  const answers = String(b.answers ?? '');
  const input = String(b.input ?? '');
  if (!/^[01]{10}$/.test(answers) || !/^[vt]{10}$/.test(input)) throw new HttpError(400, 'answers');
  const score = b.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score !== [...answers].filter((c) => c === '1').length) throw new HttpError(400, 'score');
  if (b.gender !== 'boy' && b.gender !== 'girl' && b.gender !== 'unknown') throw new HttpError(400, 'gender');
  const created = String(b.created_at ?? '');
  const t = Date.parse(created);
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(created) || Number.isNaN(t) || t > Date.now() + 86_400_000 || t < Date.now() - 400 * 86_400_000) throw new HttpError(400, 'created_at');
  const app = String(b.app_version ?? '');
  if (!/^[\w.\-]{1,20}$/.test(app)) throw new HttpError(400, 'app_version');
  const ev = b.exam_version;
  if (typeof ev !== 'number' || !Number.isInteger(ev) || ev < 1 || ev > 1000) throw new HttpError(400, 'exam_version');

  const r = await env.DB.prepare(
    'INSERT OR IGNORE INTO exam_results (id, device_id, phase, score, answers, input, gender, created_at, app_version, exam_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id.toLowerCase(), device.toLowerCase(), b.phase, score, answers, input, b.gender, created, app, ev)
    .run();
  return json(env, { ok: true }, (r.meta?.changes ?? 1) === 0 ? 409 : 201);
}

async function handleResults(env: Env, req: Request, url: URL): Promise<Response> {
  const pin = req.headers.get('X-Teacher-Pin') ?? '';
  if (!(await pinIsSet(env))) return json(env, { error: 'no pin' }, 428);
  if (!(await pinMatches(env, pin)) && !adminMatches(env, pin)) return json(env, { error: 'bad pin' }, 401);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const iso = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/;
  if ((from && !iso.test(from)) || (to && !iso.test(to))) throw new HttpError(400, 'dates');
  const where: string[] = [];
  const args: unknown[] = [];
  if (from) {
    where.push('created_at >= ?');
    args.push(from);
  }
  if (to) {
    where.push('created_at <= ?');
    args.push(to.length === 10 ? `${to}T23:59:59.999Z` : to);
  }
  const sql = `SELECT id, device_id, phase, score, answers, input, gender, created_at, app_version, exam_version FROM exam_results ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 5000`;
  const r = await env.DB.prepare(sql).bind(...args).all();
  return json(env, { rows: r.results ?? [] });
}

/* ----------------------------------------------------------------------------- Gemini */

const SAFETY = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map((category) => ({
  category,
  threshold: 'BLOCK_LOW_AND_ABOVE',
}));

interface GeminiPart {
  text?: string;
}
interface GeminiReply {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

async function gemini(
  env: Env,
  o: { system?: string; contents: { role: 'user' | 'model'; parts: GeminiPart[] }[]; schema: unknown; temperature: number; maxTokens: number; timeoutMs: number },
): Promise<Record<string, unknown> | null> {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'gemini not configured');
  const model = (env.GEMINI_MODEL || 'gemini-flash-latest').replace(/[^\w.\-]/g, '');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), o.timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
        contents: o.contents,
        generationConfig: { responseMimeType: 'application/json', responseSchema: o.schema, temperature: o.temperature, maxOutputTokens: o.maxTokens },
        safetySettings: SAFETY,
      }),
    });
    if (!res.ok) throw new HttpError(502, `gemini ${res.status}`);
    const data = (await res.json()) as GeminiReply;
    if (data.promptFeedback?.blockReason) return null;
    const cand = data.candidates?.[0];
    if (!cand || cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') return null;
    const text = cand.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      const v = JSON.parse(text) as unknown;
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(504, 'gemini timeout');
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------------------- creative mode */

const WEATHERS = ['sunny', 'rain', 'wet', 'dust'];
const EXPRESSIONS = ['explaining', 'warning', 'happy', 'lightbulb', 'worried'];

const CREATIVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    on_topic: { type: 'BOOLEAN' },
    location: { type: 'STRING', enum: [...RULE_LOCATIONS] },
    weather: { type: 'STRING', enum: WEATHERS, nullable: true },
    expression: { type: 'STRING', enum: EXPRESSIONS },
    answer: { type: 'STRING' },
  },
  required: ['on_topic', 'location', 'expression', 'answer'],
};

const OFF_TOPIC = { on_topic: false, location: null, weather: null, expression: 'lightbulb', answer: '' };

const stripMarks = (s: string) => s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '');
const BANNED = ['هاتف', 'جوال', 'اتصل', 'اتصال'];

/** The plan's checks: Arabic letters only (plus Arabic punctuation), no phone words, at most 120 words. */
export function checkAnswer(answer: string): boolean {
  const a = answer.trim();
  if (!a) return false;
  if (!/^[؀-ۿ\s.,:;!?\-"'()«»]+$/.test(a)) return false;
  if (/[٠-٩۰-۹]/.test(a)) return false; // digits
  if (!/[ء-ي]/.test(a)) return false;
  const plain = stripMarks(a);
  if (BANNED.some((w) => plain.includes(w))) return false;
  if (a.split(/\s+/).length > 120) return false;
  return true;
}

function ssml(text: string): string {
  const esc = text.replace(/[!！]/g, '').replace(/\s+/g, ' ').trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return (
    '<speak version="1.0" xml:lang="ar-SA" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts">' +
    `<voice name="ar-SA-HamedNeural"><prosody rate="0.92" pitch="+6%">${esc}</prosody></voice></speak>`
  );
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Azure TTS REST -> MP3 data URL, or null when Azure is not configured or fails (the app then uses the browser voice). */
async function azureSpeech(env: Env, text: string): Promise<string | null> {
  const region = (env.AZURE_SPEECH_REGION ?? '').replace(/[^a-z0-9]/gi, '');
  if (!env.AZURE_SPEECH_KEY || !region) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'alrashed-worker',
      },
      body: ssml(text),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 200 || buf.byteLength > 3_000_000) return null;
    return `data:audio/mpeg;base64,${toBase64(buf)}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function handleCreative(env: Env, req: Request): Promise<Response> {
  const b = await readJson(req, 12_000);
  onlyKeys(b, ['question', 'gender', 'history']);
  const question = str(b.question, 1, 300, 'question');
  if (b.gender !== 'boy' && b.gender !== 'girl') throw new HttpError(400, 'gender');
  const hist: { q: string; a: string }[] = [];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history) || b.history.length > 6) throw new HttpError(400, 'history');
    for (const h of b.history) {
      if (!h || typeof h !== 'object') throw new HttpError(400, 'history');
      const o = h as Record<string, unknown>;
      onlyKeys(o, ['q', 'a']);
      hist.push({ q: str(o.q, 0, 300, 'history'), a: str(o.a, 0, 600, 'history') });
    }
  }
  const system = SYSTEM_RULES_TEMPLATE.replace(GENDER_PLACEHOLDER, b.gender);
  const contents: { role: 'user' | 'model'; parts: GeminiPart[] }[] = [];
  for (const h of hist) {
    if (h.q) contents.push({ role: 'user', parts: [{ text: h.q }] });
    if (h.a) contents.push({ role: 'model', parts: [{ text: JSON.stringify({ on_topic: true, answer: h.a }) }] });
  }
  contents.push({ role: 'user', parts: [{ text: question }] });

  const out = await gemini(env, { system, contents, schema: CREATIVE_SCHEMA, temperature: 0.7, maxTokens: 900, timeoutMs: 20_000 });
  if (!out || out.on_topic !== true || typeof out.answer !== 'string' || !checkAnswer(out.answer)) return json(env, OFF_TOPIC);

  const location = (RULE_LOCATIONS as readonly string[]).includes(String(out.location)) ? String(out.location) : 'classroom';
  const weather = WEATHERS.includes(String(out.weather)) ? String(out.weather) : null;
  const expression = EXPRESSIONS.includes(String(out.expression)) ? String(out.expression) : 'lightbulb';
  const answer = out.answer.trim();
  const audioUrl = await azureSpeech(env, answer);
  // Visemes stay empty: the app animates the mouth from the audio amplitude.
  return json(env, { on_topic: true, location, weather, expression, answer, ...(audioUrl ? { audioUrl } : {}), visemes: [] });
}

/* ------------------------------------------------------------------------- tie break */

async function handleTieBreak(env: Env, req: Request): Promise<Response> {
  const b = await readJson(req, 4096);
  onlyKeys(b, ['question', 'candidates']);
  const question = str(b.question, 1, 300, 'question');
  if (!Array.isArray(b.candidates) || b.candidates.length !== 2) throw new HttpError(400, 'candidates');
  const cands = b.candidates.map((c) => {
    if (!c || typeof c !== 'object') throw new HttpError(400, 'candidates');
    const o = c as Record<string, unknown>;
    onlyKeys(o, ['id', 'title']);
    const id = str(o.id, 1, 64, 'id');
    if (!/^[a-z0-9_]+$/.test(id)) throw new HttpError(400, 'id');
    return { id, title: str(o.title, 1, 120, 'title') };
  });
  if (cands[0].id === cands[1].id) throw new HttpError(400, 'candidates');
  const prompt =
    'A school child asked a safety robot a question in Arabic. Decide which of the two topics the child meant. ' +
    'Answer with the id only.\n' +
    `Question: ${question}\n` +
    cands.map((c) => `- ${c.id}: ${c.title}`).join('\n');
  const out = await gemini(env, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    schema: { type: 'OBJECT', properties: { id: { type: 'STRING', enum: cands.map((c) => c.id) } }, required: ['id'] },
    temperature: 0,
    maxTokens: 60,
    timeoutMs: 4000,
  });
  const id = out?.id;
  if (typeof id !== 'string' || !cands.some((c) => c.id === id)) throw new HttpError(502, 'no choice');
  return json(env, { id });
}

/* --------------------------------------------------------------------------- judge */

interface OpenSpec {
  topic: string;
  concepts: Record<string, string>;
  unsafe: string;
  pass: (found: string[]) => boolean;
}
/** Concept ids match src/content/data/exam.ts. Gemini only reports ids; the pass rule lives here. */
const OPEN: Record<string, OpenSpec> = {
  q4_nosebleed: {
    topic: 'What to do when your nose bleeds',
    concepts: { sit: 'sit down', lean_forward: 'lean the head forward', pinch_nose: 'pinch the nose', tell_adult: 'tell a teacher, the clinic or an adult' },
    unsafe: 'tilting the head back, or lying on the back',
    pass: (f) => f.length >= 2,
  },
  q7_open_sewer: {
    topic: 'You see an open sewer hole on your way',
    concepts: { stay_away: 'stay away from it', go_around: 'walk around it or take another way', tell_adult: 'tell an adult' },
    unsafe: 'looking into it, jumping over it, or trying to close it',
    pass: (f) => f.includes('stay_away') || f.includes('go_around'),
  },
  q10_friend_fainted: {
    topic: 'A classmate faints in the line',
    concepts: { call_teacher: 'call or tell the teacher / counselor', give_space: 'give space and air, do not crowd around' },
    unsafe: 'giving water, or lifting the child alone',
    pass: (f) => f.includes('call_teacher'),
  },
};

async function handleJudge(env: Env, req: Request): Promise<Response> {
  const b = await readJson(req, 2048);
  onlyKeys(b, ['questionId', 'concepts', 'text']);
  const qid = String(b.questionId ?? '');
  const spec = OPEN[qid];
  if (!spec) throw new HttpError(400, 'question');
  const text = str(b.text, 1, 300, 'text');
  const ids = Object.keys(spec.concepts);
  const prompt =
    'You judge a young child\'s spoken answer (Saudi Arabic dialect, may contain speech-recognition mistakes) to a school safety question.\n' +
    `Question topic: ${spec.topic}\n` +
    'Concepts the answer may contain:\n' +
    ids.map((id) => `- ${id}: ${spec.concepts[id]}`).join('\n') +
    `\nUnsafe ideas: ${spec.unsafe}\n` +
    'Report which concept ids the child clearly expressed (do not count ideas the child says NOT to do), and whether the child suggested an unsafe idea.\n' +
    `Child's answer: ${text}`;
  const out = await gemini(env, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    schema: {
      type: 'OBJECT',
      properties: { concepts: { type: 'ARRAY', items: { type: 'STRING', enum: ids } }, unsafe: { type: 'BOOLEAN' } },
      required: ['concepts', 'unsafe'],
    },
    temperature: 0,
    maxTokens: 120,
    timeoutMs: 5000,
  });
  if (!out || !Array.isArray(out.concepts)) throw new HttpError(502, 'no verdict');
  const found = [...new Set(out.concepts.filter((c): c is string => typeof c === 'string' && ids.includes(c)))];
  const unsafe = out.unsafe === true;
  return json(env, { pass: !unsafe && spec.pass(found), concepts: found, unsafe });
}

/* -------------------------------------------------------------------------- router */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env) });
    try {
      const url = new URL(req.url);
      const path = url.pathname.replace(/\/+$/, '');
      const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
      if (path === '/api/health') return json(env, { ok: true });
      if (path === '/api/creative' && req.method === 'POST') return rateLimit(ip, 'creative'), await handleCreative(env, req);
      if (path === '/api/tiebreak' && req.method === 'POST') return rateLimit(ip, 'tiebreak'), await handleTieBreak(env, req);
      if (path === '/api/judge' && req.method === 'POST') return rateLimit(ip, 'judge'), await handleJudge(env, req);
      if (path === '/api/exam' && req.method === 'POST') return rateLimit(ip, 'exam'), await handleExamPost(env, req);
      if (path === '/api/results' && req.method === 'GET') return rateLimit(ip, 'results'), await handleResults(env, req, url);
      if (path === '/api/pin' || path.startsWith('/api/pin/')) return rateLimit(ip, 'pin'), await handlePin(env, req, path.slice('/api/pin'.length));
      throw new HttpError(404, 'not found');
    } catch (e) {
      if (e instanceof HttpError) return json(env, { error: e.message }, e.status);
      return json(env, { error: 'server error' }, 500);
    }
  },
};
