// OWNER: voice worker. Keep these exports and signatures exactly (Heard, ListenError, ListenResult, canListen, listenOnce).
//
// One phrase per call (docs/plan/Voice_and_AI.md "Listening"):
//  - primary: the browser's SpeechRecognition (ar-SA, one phrase, no interim results)
//  - in parallel: a getUserMedia capture that keeps the utterance's samples (gender detection) and
//    ends the phrase after `silenceMs` of quiet once speech started (`maxMs` at most)
//  - fallback: Whisper (transformers.js, src/voice/whisper.worker.ts) on desktop-class devices only,
//    when the browser has no recognition (Firefox) or it fails, and offline once the model is cached.
// The microphone tracks are released at the end of every call.

export interface Heard {
  text: string;
  /** Mono samples of the utterance for gender detection (null when not captured). */
  samples: Float32Array | null;
  sampleRate: number;
}
export type ListenError = 'no-mic' | 'denied' | 'no-speech' | 'offline' | 'unsupported' | 'aborted' | 'error';
export type ListenResult = { ok: true; heard: Heard } | { ok: false; error: ListenError };

/** Hugging Face model id used by the worker (keep in sync with whisper.worker.ts). */
export const WHISPER_MODEL = 'onnx-community/whisper-base';
const WHISPER_RATE = 16000;

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

/* ------------------------------------------------------------------ capability checks */

type RecCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function recognitionCtor(): RecCtor | null {
  if (!isBrowser) return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** iPad (including iPadOS reporting as Mac), iPhone, Android and other mobiles are not desktop-class. */
export function isDesktopClass(): boolean {
  if (!isBrowser) return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod|Android|Mobile|Silk|Kindle/i.test(ua)) return false;
  if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return false; // iPadOS
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (cores < 4) return false;
  if (typeof mem === 'number' && mem < 4) return false;
  return true;
}

function whisperCapable(): boolean {
  return (
    isBrowser &&
    isDesktopClass() &&
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

let whisperCached: boolean | null = null;
let cacheCheck: Promise<boolean> | null = null;

/** Whether the Whisper model files are already in the browser cache (transformers.js uses Cache Storage). */
export function checkWhisperCached(): Promise<boolean> {
  if (cacheCheck) return cacheCheck;
  cacheCheck = (async () => {
    try {
      if (!isBrowser || typeof caches === 'undefined') return (whisperCached = false);
      const c = await caches.open('transformers-cache');
      const keys = await c.keys();
      const urls = keys.map((r) => r.url);
      const has = (part: string) => urls.some((u) => u.includes('whisper-base') && u.includes(part));
      whisperCached = has('encoder_model') && has('decoder_model_merged');
    } catch {
      whisperCached = false;
    }
    return whisperCached;
  })();
  return cacheCheck;
}

export function canListen(): { available: boolean; needsInternet: boolean } {
  const sr = !!recognitionCtor();
  const w = whisperCapable();
  if (w && whisperCached === null) void checkWhisperCached();
  return { available: sr || w, needsInternet: !(w && whisperCached === true) };
}

/* ------------------------------------------------------------------ Whisper worker */

let worker: Worker | null = null;
let msgId = 0;
const pending = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let readyP: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let readyReject: ((e: Error) => void) | null = null;
/** Download progress of the Whisper model 0..1 (null until a download starts). */
export let whisperProgress: number | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
  const fileProgress = new Map<number, number>();
  worker.onmessage = (ev: MessageEvent) => {
    const m = ev.data as { type: string; id?: number; text?: string; message?: string; loaded?: number; total?: number };
    if (m.type === 'progress') {
      if (m.total) fileProgress.set(m.total, m.loaded ?? 0);
      let l = 0;
      let t = 0;
      fileProgress.forEach((v, k) => {
        l += v;
        t += k;
      });
      whisperProgress = t ? l / t : null;
    } else if (m.type === 'ready') {
      whisperCached = true;
      whisperProgress = 1;
      readyResolve?.();
    } else if (m.type === 'result' && m.id !== undefined) {
      pending.get(m.id)?.resolve(m.text ?? '');
      pending.delete(m.id);
    } else if (m.type === 'error') {
      const err = new Error(m.message ?? 'whisper error');
      if (m.id !== undefined) {
        pending.get(m.id)?.reject(err);
        pending.delete(m.id);
      } else {
        readyReject?.(err);
        readyP = null;
      }
    }
  };
  worker.onerror = (e) => {
    const err = new Error(e.message || 'whisper worker failed');
    pending.forEach((p) => p.reject(err));
    pending.clear();
    readyReject?.(err);
    readyP = null;
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/**
 * Start downloading the Whisper model in the background (desktop-class devices only, online, not on
 * data saver). Call once after the app has loaded. Resolves when ready; rejects on failure.
 */
export function preloadWhisper(): Promise<void> {
  if (!whisperCapable()) return Promise.reject(new Error('whisper not supported on this device'));
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return Promise.reject(new Error('data saver on'));
  if (readyP) return readyP;
  readyP = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  try {
    getWorker().postMessage({ type: 'load' });
  } catch (e) {
    readyReject?.(e as Error);
    readyP = null;
    return Promise.reject(e);
  }
  return readyP;
}

/** Background warm-up for the UI to call after the first load (never throws). */
export function warmUpListening(): void {
  if (!whisperCapable()) return;
  void checkWhisperCached().then((cached) => {
    if (cached || (navigator.onLine && !recognitionCtor()) || navigator.onLine) {
      preloadWhisper().catch(() => {});
    }
  });
}

function transcribe(audio16k: Float32Array, timeoutMs = 60000): Promise<string> {
  const id = ++msgId;
  return new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => {
      pending.delete(id);
      reject(new Error('whisper timeout'));
    }, timeoutMs);
    pending.set(id, {
      resolve: (s) => {
        clearTimeout(t);
        resolve(s);
      },
      reject: (e) => {
        clearTimeout(t);
        reject(e);
      },
    });
    try {
      getWorker().postMessage({ type: 'transcribe', id, audio: audio16k }, [audio16k.buffer]);
    } catch (e) {
      clearTimeout(t);
      pending.delete(id);
      reject(e as Error);
    }
  });
}

/** Whisper's typical outputs on silence or noise (it was trained on subtitles). */
const HALLUCINATION = /نانسي|اشترك|القناة|ترجمة|موسيقى|\[|\(|♪/;

export function resample(x: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return x.slice();
  const ratio = from / to;
  const n = Math.floor(x.length / ratio);
  const y = new Float32Array(n);
  if (ratio > 1) {
    // Average over each output step (cheap low-pass), then pick.
    for (let i = 0; i < n; i++) {
      const a = Math.floor(i * ratio);
      const b = Math.min(x.length, Math.floor((i + 1) * ratio));
      let s = 0;
      for (let k = a; k < b; k++) s += x[k];
      y[i] = b > a ? s / (b - a) : x[a] ?? 0;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const p = i * ratio;
      const a = Math.floor(p);
      const f = p - a;
      y[i] = (x[a] ?? 0) * (1 - f) + (x[a + 1] ?? x[a] ?? 0) * f;
    }
  }
  return y;
}

/* ------------------------------------------------------------------ microphone capture + VAD */

interface Capture {
  /** 'ok', or why the microphone could not be opened. */
  ready: Promise<'ok' | 'denied' | 'no-mic' | 'error'>;
  /** Resolves when the phrase ended (silence after speech, maxMs, or stop()). */
  ended: Promise<void>;
  speechStarted(): boolean;
  samples(): Float32Array | null;
  sampleRate: number;
  stop(): void;
}

function startCapture(o: { silenceMs: number; maxMs: number }): Capture {
  let ctx: AudioContext | null = null;
  const AC: typeof AudioContext | undefined = isBrowser
    ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;
  // Created synchronously so it starts inside the user's tap (iPad).
  try {
    if (AC) ctx = new AC();
  } catch {
    ctx = null;
  }
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let proc: ScriptProcessorNode | null = null;
  let stopped = false;
  let endResolve: () => void = () => {};
  const ended = new Promise<void>((r) => (endResolve = r));

  const sampleRate = ctx?.sampleRate ?? 48000;
  const PRE_ROLL = Math.round(0.35 * sampleRate);
  const ring: Float32Array[] = [];
  let ringLen = 0;
  const kept: Float32Array[] = [];
  let total = 0; // samples seen
  let started = false;
  let loudRun = 0;
  let lastLoud = 0; // sample index
  let noise = -1;
  let calib = 0;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (maxTimer) clearTimeout(maxTimer);
    maxTimer = null;
    endResolve();
    release();
  };

  const release = () => {
    try {
      if (proc) proc.onaudioprocess = null;
      proc?.disconnect();
      source?.disconnect();
    } catch {
      /* ignore */
    }
    stream?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    stream = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
  };

  const onChunk = (chunk: Float32Array) => {
    if (stopped) return;
    total += chunk.length;
    let s = 0;
    for (let i = 0; i < chunk.length; i++) s += chunk[i] * chunk[i];
    const level = Math.sqrt(s / chunk.length);
    if (calib < 5) {
      noise = noise < 0 ? level : Math.min(noise, level) * 0.5 + noise * 0.5;
      calib++;
    }
    const threshold = Math.max(0.012, noise * 3.2);
    const loud = level > threshold;
    if (!started) {
      ring.push(chunk);
      ringLen += chunk.length;
      while (ringLen - ring[0].length > PRE_ROLL) ringLen -= ring.shift()!.length;
      if (!loud) noise = noise * 0.96 + level * 0.04;
      loudRun = loud ? loudRun + 1 : 0;
      if (loudRun >= 2) {
        started = true;
        lastLoud = total;
        kept.push(...ring);
        ring.length = 0;
        ringLen = 0;
      }
    } else {
      kept.push(chunk);
      if (loud) lastLoud = total;
      if (((total - lastLoud) / sampleRate) * 1000 >= o.silenceMs) stopNow();
    }
    if ((total / sampleRate) * 1000 >= o.maxMs) stopNow();
  };

  const stopNow = () => {
    if (stopped) return;
    stopped = true;
    finish();
  };

  const ready = (async (): Promise<'ok' | 'denied' | 'no-mic' | 'error'> => {
    if (!isBrowser || !navigator.mediaDevices?.getUserMedia) {
      stopNow();
      return 'no-mic';
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const name = (e as DOMException)?.name ?? '';
      stopNow();
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
      if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError' || name === 'DevicesNotFoundError') return 'no-mic';
      return 'error';
    }
    if (stopped) {
      release();
      return 'ok';
    }
    maxTimer = setTimeout(stopNow, o.maxMs + 500);
    if (!ctx) return 'ok'; // no Web Audio: recognition still works, no samples/VAD
    try {
      if (ctx.state !== 'running') await ctx.resume();
      source = ctx.createMediaStreamSource(stream);
      proc = ctx.createScriptProcessor(2048, 1, 1);
      proc.onaudioprocess = (ev) => onChunk(new Float32Array(ev.inputBuffer.getChannelData(0)));
      source.connect(proc);
      proc.connect(ctx.destination); // output stays silent; needed for processing to run
    } catch {
      /* capture unavailable; recognition may still work */
    }
    return 'ok';
  })();

  return {
    ready,
    ended,
    sampleRate,
    speechStarted: () => started,
    samples: () => {
      if (!started || !kept.length) return null;
      // Keep up to 0.3 s of the trailing silence.
      const tailDrop = Math.max(0, total - lastLoud - Math.round(0.3 * sampleRate));
      let n = kept.reduce((a, c) => a + c.length, 0) - tailDrop;
      if (n <= 0) return null;
      const out = new Float32Array(n);
      let o2 = 0;
      for (const c of kept) {
        if (o2 >= n) break;
        const take = Math.min(c.length, n - o2);
        out.set(take === c.length ? c : c.subarray(0, take), o2);
        o2 += take;
      }
      return out;
    },
    stop: stopNow,
  };
}

/* ------------------------------------------------------------------ recognition */

type RecOutcome = { text: string } | { error: string };

function startRecognition(Rec: RecCtor): { outcome: Promise<RecOutcome>; stop(): void; abort(): void } {
  const rec = new Rec();
  rec.lang = 'ar-SA';
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  let resolveOut: (o: RecOutcome) => void = () => {};
  const outcome = new Promise<RecOutcome>((r) => (resolveOut = r));
  let text = '';
  let err: string | null = null;
  rec.onresult = (e) => {
    const parts: string[] = [];
    for (let i = 0; i < e.results.length; i++) {
      const alt = e.results[i]?.[0];
      if (alt?.transcript) parts.push(alt.transcript);
    }
    if (parts.length) text = parts.join(' ').trim();
  };
  rec.onerror = (e) => {
    err = e?.error || 'error';
  };
  rec.onend = () => {
    if (text) resolveOut({ text });
    else resolveOut({ error: err ?? 'no-speech' });
  };
  try {
    rec.start();
  } catch (e) {
    resolveOut({ error: (e as DOMException)?.name === 'NotAllowedError' ? 'not-allowed' : 'error' });
  }
  return {
    outcome,
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
    abort: () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      resolveOut(text ? { text } : { error: 'aborted' });
    },
  };
}

/* ------------------------------------------------------------------ listenOnce */

export async function listenOnce(opts?: { signal?: AbortSignal; maxMs?: number; silenceMs?: number }): Promise<ListenResult> {
  const signal = opts?.signal;
  const maxMs = opts?.maxMs ?? 12000;
  const silenceMs = opts?.silenceMs ?? 1500;
  if (signal?.aborted) return { ok: false, error: 'aborted' };
  if (!isBrowser) return { ok: false, error: 'unsupported' };

  const Rec = recognitionCtor();
  const wCapable = whisperCapable();
  if (!Rec && !wCapable) return { ok: false, error: 'unsupported' };
  const online = navigator.onLine !== false;
  if (wCapable && whisperCached === null) await Promise.race([checkWhisperCached(), new Promise((r) => setTimeout(r, 50))]);
  const whisperUsable = () => wCapable && (online || whisperCached === true);

  // Everything below starts synchronously-enough to stay inside the tap on iPad.
  const cap = startCapture({ silenceMs, maxMs });
  const useRec = !!Rec && (online || !whisperUsable());
  const rec = useRec ? startRecognition(Rec!) : null;

  let aborted = false;
  let abortResolve: () => void = () => {};
  const abortP = new Promise<'aborted'>((r) => (abortResolve = () => r('aborted')));
  const onAbort = () => {
    aborted = true;
    rec?.abort();
    cap.stop();
    abortResolve();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  let hardStop: ReturnType<typeof setTimeout> | null = null;
  const fail = (error: ListenError): ListenResult => ({ ok: false, error });

  try {
    const micState = await Promise.race([cap.ready, abortP]);
    if (micState === 'aborted' || aborted) return fail('aborted');
    if (micState === 'denied') {
      rec?.abort();
      return fail('denied');
    }
    if (micState !== 'ok' && !rec) return fail(micState === 'no-mic' ? 'no-mic' : 'error');

    let srError: string | null = null;
    if (rec) {
      // Our silence detection (or maxMs) asks the recognizer to finalize; a hard stop after that.
      void cap.ended.then(() => rec.stop());
      hardStop = setTimeout(() => rec.abort(), maxMs + 3000);
      const out = await Promise.race([rec.outcome, abortP]);
      if (out === 'aborted' || aborted) return fail('aborted');
      if ('text' in out && out.text) {
        cap.stop();
        return { ok: true, heard: { text: out.text, samples: cap.samples(), sampleRate: cap.sampleRate } };
      }
      srError = 'error' in out ? out.error : 'no-speech';
      if (srError === 'not-allowed') return fail('denied');
      if (srError === 'audio-capture') return fail('no-mic');
      if (srError === 'aborted') return fail(micState === 'ok' && cap.speechStarted() && whisperUsable() ? 'no-speech' : 'no-speech');
      const fallbackable = srError !== 'no-speech' || cap.speechStarted();
      if (!fallbackable || !whisperUsable() || micState !== 'ok') {
        cap.stop();
        if (srError === 'no-speech') return fail('no-speech');
        if (srError === 'network') return fail('offline');
        if (srError === 'service-not-allowed' || srError === 'language-not-supported') return fail(online ? 'unsupported' : 'offline');
        return fail(online ? 'error' : 'offline');
      }
    } else if (micState !== 'ok') {
      return fail(micState === 'no-mic' ? 'no-mic' : 'error');
    }

    // Whisper path: wait for the phrase to end, then transcribe the captured samples.
    const endOrAbort = await Promise.race([cap.ended.then(() => 'ended' as const), abortP]);
    if (endOrAbort === 'aborted' || aborted) return fail('aborted');
    const samples = cap.samples();
    if (!cap.speechStarted() || !samples || samples.length < cap.sampleRate * 0.25) return fail('no-speech');
    if (!whisperUsable()) return fail('offline');
    let text = '';
    try {
      const t = await Promise.race([transcribe(resample(samples, cap.sampleRate, WHISPER_RATE)), abortP]);
      if (t === 'aborted' || aborted) return fail('aborted');
      text = t.trim();
    } catch (e) {
      console.warn('[listen] whisper failed', e);
      return fail(online ? 'error' : 'offline');
    }
    if (!text || HALLUCINATION.test(text) || !/[؀-ۿ]/.test(text)) return fail('no-speech');
    return { ok: true, heard: { text, samples, sampleRate: cap.sampleRate } };
  } catch (e) {
    console.warn('[listen] failed', e);
    return fail('error');
  } finally {
    if (hardStop) clearTimeout(hardStop);
    signal?.removeEventListener('abort', onAbort);
    cap.stop(); // always release the microphone
  }
}
