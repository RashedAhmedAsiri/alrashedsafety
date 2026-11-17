import type { Gender, SpeechPart } from '../core/types';
import { useApp } from '../core/store';
import { plainForVoice } from './ssml';
import { chunkText, edgeTtsUrl, EDGE_TTS_MAX_CHARS, netTtsUrl } from './netTts';
// OWNER: voice worker. Keep these exports and signatures exactly (SpeakOpts, speak, stopSpeech, estimateDuration).
//
// Sources, in order (see docs/voice.md):
//  (a) recorded file public/audio/voice/<key>.<b|g>.mp3 listed in manifest.json, lip sync from <key>.<v>.json
//  (b) live audio (creative mode): opts.live.audioUrl, visemes or (when empty) the audio amplitude
//  (c) the browser's speechSynthesis with the best Arabic voice (rate 0.92, pitch 1.1)
//  (d) online Arabic voice (Google Translate TTS through <audio>, needs internet; netTts.ts)
//  (e) a timed mouth animation lasting estimateDuration(text)
// Every path drives useApp.mouth (0..1) and useApp.viseme and leaves mouth = 0 when it ends.

export interface SpeakOpts {
  /** Recording key, e.g. 'crossing_road.must.2' or 'sys.greet_call' (see docs/ARCHITECTURE.md "Voice keys"). */
  key: string;
  /** Text already rendered for the current gender (no markup). Used by the fallback voice. */
  text: string;
  part?: SpeechPart;
  signal?: AbortSignal;
  /** Creative mode: audio + visemes returned by the server. */
  live?: { audioUrl: string; visemes: [number, number][] };
}

/* ------------------------------------------------------------------ constants */

export const TTS_RATE = 0.92;
export const TTS_PITCH = 1.1;
/** Letters (no diacritics) per second of Alrashed's voice at rate 0.92. */
const LETTERS_PER_SEC = 12;

/**
 * Mouth openness 0..1 for each Azure viseme id 0..21
 * (https://learn.microsoft.com/azure/ai-services/speech-service/how-to-speech-synthesis-viseme).
 */
export const VISEME_OPENNESS: readonly number[] = [
  0, // 0 silence
  0.72, // 1 æ ə ʌ
  0.95, // 2 ɑ
  0.7, // 3 ɔ
  0.55, // 4 ɛ ʊ
  0.5, // 5 ɝ
  0.35, // 6 j i ɪ
  0.3, // 7 w u
  0.6, // 8 o
  0.8, // 9 aʊ
  0.65, // 10 ɔɪ
  0.8, // 11 aɪ
  0.42, // 12 h
  0.35, // 13 ɹ
  0.35, // 14 l
  0.18, // 15 s z
  0.28, // 16 ʃ tʃ dʒ ʒ
  0.25, // 17 ð
  0.14, // 18 f v
  0.3, // 19 d t n θ
  0.36, // 20 k g ŋ
  0.02, // 21 p b m
];

const BASE: string = (() => {
  try {
    return (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
  } catch {
    return './';
  }
})();
const VOICE_DIR = `${BASE.endsWith('/') ? BASE : BASE + '/'}audio/voice/`;

const isBrowser = typeof window !== 'undefined';

/* ------------------------------------------------------------------ helpers */

const abortError = () => new DOMException('Speech aborted', 'AbortError');
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const voiceVolume = () => clamp01(useApp.getState().settings?.voiceVolume ?? 1);

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/**
 * Rough seconds to speak a text at the app's rate (for timing when no audio exists).
 * Counts letters without diacritics (~12 per second at rate 0.92) plus pauses at punctuation.
 */
export function estimateDuration(text: string): number {
  if (!text) return 0.6;
  const t = text.replace(/\{([^{}/]*)\/([^{}]*)\}/g, '$1').replace(DIACRITICS, '');
  const letters = (t.match(/\p{L}/gu) ?? []).length;
  const digits = (t.match(/\p{N}/gu) ?? []).length;
  const commas = (t.match(/[،,؛;:]/g) ?? []).length;
  const stops = (t.replace(/\.\.+/g, ' ').match(/[.!؟?]/g) ?? []).length;
  const slogan = (t.match(/\.\.+/g) ?? []).length;
  const s = 0.3 + (letters + digits * 3) / LETTERS_PER_SEC + commas * 0.22 + stops * 0.3 + slogan * 0.25;
  return Math.max(0.6, Math.round(s * 100) / 100);
}

/* ------------------------------------------------------------------ mouth driver */

let lastMouth = -1;
let lastViseme = -1;
function writeMouth(mouth: number, viseme: number) {
  const m = Math.round(clamp01(mouth) * 100) / 100;
  if (m === lastMouth && viseme === lastViseme) return;
  lastMouth = m;
  lastViseme = viseme;
  useApp.getState().set({ mouth: m, viseme });
}
function resetMouth() {
  lastMouth = -1;
  lastViseme = -1;
  useApp.getState().set({ mouth: 0, viseme: 0 });
}

/**
 * Runs `sample(tSeconds)` every frame and eases the mouth toward its target (fast open, slower close).
 * Returns a stop function. Uses rAF when visible, a timer otherwise (and in tests).
 */
function driveMouth(sample: (t: number) => { open: number; viseme: number }): () => void {
  const t0 = now();
  let prev = t0;
  let mouth = 0;
  let stopped = false;
  let handle: number | ReturnType<typeof setTimeout> = 0;
  const useRaf = isBrowser && typeof requestAnimationFrame === 'function';
  const tick = () => {
    if (stopped) return;
    const n = now();
    const dt = Math.min(0.1, (n - prev) / 1000);
    prev = n;
    const { open, viseme } = sample((n - t0) / 1000);
    const tau = open > mouth ? 0.04 : 0.07;
    mouth += (open - mouth) * (1 - Math.exp(-dt / tau));
    writeMouth(mouth, viseme);
    schedule();
  };
  const schedule = () => {
    if (stopped) return;
    if (useRaf && document.visibilityState === 'visible') handle = requestAnimationFrame(tick);
    else handle = setTimeout(tick, 33);
  };
  schedule();
  return () => {
    stopped = true;
    if (useRaf) cancelAnimationFrame(handle as number);
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  };
}

/** Viseme timeline lookup ([[ms, id], ...] sorted by ms). */
function visemeAt(timeline: [number, number][], ms: number): number {
  let lo = 0;
  let hi = timeline.length - 1;
  if (hi < 0 || ms < timeline[0][0]) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeline[mid][0] <= ms) lo = mid;
    else hi = mid - 1;
  }
  return timeline[lo][1] | 0;
}
function visemeOpen(id: number) {
  return VISEME_OPENNESS[id] ?? 0.4;
}

/** Syllable-like oscillation (about 4.5 syllables a second, slightly irregular). */
function babble(t: number, seed: number): number {
  const a = Math.sin(2 * Math.PI * 4.4 * t + seed);
  const b = Math.sin(2 * Math.PI * 2.3 * t + seed * 1.7);
  const v = Math.max(0, a * 0.8 + b * 0.35);
  return clamp01(0.08 + 0.62 * Math.pow(v / 1.15, 0.8));
}
/** A pseudo viseme id that matches the openness (for faces that draw by viseme). */
function fakeViseme(open: number): number {
  if (open < 0.06) return 0;
  if (open < 0.22) return 15;
  if (open < 0.4) return 19;
  if (open < 0.62) return 4;
  if (open < 0.82) return 1;
  return 2;
}

/* ------------------------------------------------------------------ session */

class Session {
  aborted = false;
  private hooks = new Set<() => void>();
  onAbort(fn: () => void): () => void {
    if (this.aborted) {
      fn();
      return () => {};
    }
    this.hooks.add(fn);
    return () => this.hooks.delete(fn);
  }
  abort() {
    if (this.aborted) return;
    this.aborted = true;
    for (const f of this.hooks) {
      try {
        f();
      } catch {
        /* ignore */
      }
    }
    this.hooks.clear();
  }
}

let current: Session | null = null;

/* ------------------------------------------------------------------ audio context */

let ctx: AudioContext | null = null;
let unlocked = false;

function gestureSeen(): boolean {
  if (unlocked) return true;
  const ua = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return !!ua?.hasBeenActive;
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (!isBrowser || !gestureSeen()) return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: 'interactive' });
  } catch {
    ctx = null;
  }
  return ctx;
}

async function runningCtx(): Promise<AudioContext | null> {
  const c = getCtx();
  if (!c) return null;
  if (c.state !== 'running') {
    try {
      await Promise.race([c.resume(), new Promise((r) => setTimeout(r, 400))]);
    } catch {
      /* ignore */
    }
  }
  return (c.state as string) === 'running' ? c : null;
}

/**
 * Call from a user gesture (first tap). Unlocks Web Audio for the voice (iPad Safari), warms up
 * speechSynthesis and starts loading the recordings manifest. Safe to call many times.
 */
export function unlockVoice(): void {
  if (!isBrowser) return;
  const first = !unlocked;
  unlocked = true;
  const c = getCtx();
  if (c) {
    try {
      if (c.state !== 'running') void c.resume();
      if (first) {
        const b = c.createBuffer(1, 1, 22050);
        const s = c.createBufferSource();
        s.buffer = b;
        s.connect(c.destination);
        s.start(0);
      }
    } catch {
      /* ignore */
    }
  }
  if (first) {
    try {
      const synth = window.speechSynthesis;
      if (synth && typeof SpeechSynthesisUtterance !== 'undefined') {
        synth.getVoices();
        // iOS only lets speechSynthesis speak after it spoke once inside a gesture.
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.lang = 'ar-SA';
        synth.speak(u);
      }
    } catch {
      /* ignore */
    }
    unlockHtmlAudio();
    void loadManifest();
  }
}

/** One silent play() inside the first gesture so later HTMLAudioElement lines (online tier) are not blocked. */
function unlockHtmlAudio(): void {
  try {
    if (typeof Audio === 'undefined') return;
    const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ manifest + files */

interface Manifest {
  version: number;
  keys: Record<string, string[]>;
}
let manifestP: Promise<Manifest> | null = null;

/** The recordings manifest (loaded once; missing or broken manifest = nothing recorded). */
export function loadManifest(): Promise<Manifest> {
  if (manifestP) return manifestP;
  const empty: Manifest = { version: 1, keys: {} };
  if (!isBrowser || typeof fetch !== 'function') return (manifestP = Promise.resolve(empty));
  manifestP = (async () => {
    try {
      const r = await fetch(`${VOICE_DIR}manifest.json`, { cache: 'no-cache' });
      if (!r.ok) return empty;
      const j = (await r.json()) as Partial<Manifest>;
      if (!j || typeof j !== 'object' || !j.keys || typeof j.keys !== 'object') return empty;
      return { version: j.version ?? 1, keys: j.keys };
    } catch {
      return empty; // includes the dev server answering with index.html
    }
  })();
  return manifestP;
}

/** Which recording variant to play for a key and gender, or null when none fits. */
export function pickVariant(variants: string[] | undefined, gender: Gender): 'b' | 'g' | null {
  if (!variants || !variants.length) return null;
  const want = gender === 'girl' ? 'g' : 'b';
  if (variants.includes(want)) return want;
  // A line without gender markup is recorded only as 'b' and serves both.
  if (variants.length === 1 && variants[0] === 'b') return 'b';
  return null;
}

/** True when a recording exists for this key and the current gender. */
export async function hasRecording(key: string, gender: Gender = useApp.getState().gender): Promise<boolean> {
  const m = await loadManifest();
  return pickVariant(m.keys[key], gender) !== null;
}

const bufferCache = new Map<string, Promise<AudioBuffer | null>>();
const CACHE_MAX = 12;
function decoded(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let p = bufferCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const data = await r.arrayBuffer();
        return await c.decodeAudioData(data);
      } catch {
        return null;
      }
    })();
    bufferCache.set(url, p);
    while (bufferCache.size > CACHE_MAX) bufferCache.delete(bufferCache.keys().next().value as string);
    void p.then((b) => {
      if (!b) bufferCache.delete(url);
    });
  }
  return p;
}

const visemeCache = new Map<string, Promise<[number, number][] | null>>();
function visemeFile(url: string): Promise<[number, number][] | null> {
  let p = visemeCache.get(url);
  if (!p) {
    p = (async () => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const j = await r.json();
        if (!Array.isArray(j)) return null;
        return (j as [number, number][]).filter((x) => Array.isArray(x) && x.length >= 2).sort((a, b) => a[0] - b[0]);
      } catch {
        return null;
      }
    })();
    visemeCache.set(url, p);
  }
  return p;
}

/** Warm up the recording of a key (decode ahead) so the next line starts without a gap. */
export async function prefetchVoice(key: string): Promise<void> {
  const m = await loadManifest();
  const v = pickVariant(m.keys[key], useApp.getState().gender);
  if (!v) return;
  void visemeFile(`${VOICE_DIR}${key}.${v}.json`);
  const c = getCtx();
  if (c) void decoded(c, `${VOICE_DIR}${key}.${v}.mp3`);
}

/* ------------------------------------------------------------------ sources */

/**
 * Play an audio URL with lip sync from `visemes`, or from the amplitude when visemes is null.
 * Resolves true when played (or aborted), false when it could not play (caller falls back).
 */
async function playUrl(url: string, visemes: [number, number][] | null, s: Session): Promise<boolean> {
  const c = await runningCtx();
  if (s.aborted) return true;
  if (c) {
    const buf = await decoded(c, url);
    if (s.aborted) return true;
    if (buf) return playBuffer(c, buf, visemes, s);
  }
  return playElement(url, visemes, s);
}

function playBuffer(c: AudioContext, buf: AudioBuffer, visemes: [number, number][] | null, s: Session): Promise<boolean> {
  return new Promise((resolve) => {
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = voiceVolume();
    src.connect(gain);
    gain.connect(c.destination);
    let analyser: AnalyserNode | null = null;
    let data: Float32Array<ArrayBuffer> | null = null;
    if (!visemes || !visemes.length) {
      analyser = c.createAnalyser();
      analyser.fftSize = 1024;
      data = new Float32Array(analyser.fftSize);
      src.connect(analyser);
    }
    const startAt = c.currentTime + 0.02;
    let done = false;
    const stopMouth = driveMouth(() => {
      gain.gain.value = voiceVolume();
      const ms = (c.currentTime - startAt) * 1000;
      if (visemes && visemes.length) {
        const id = visemeAt(visemes, ms);
        return { open: visemeOpen(id), viseme: id };
      }
      if (analyser && data) {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const open = clamp01((rms - 0.012) * 7);
        return { open, viseme: fakeViseme(open) };
      }
      return { open: 0, viseme: 0 };
    });
    const finish = () => {
      if (done) return;
      done = true;
      off();
      stopMouth();
      try {
        src.disconnect();
        gain.disconnect();
        analyser?.disconnect();
      } catch {
        /* ignore */
      }
      resolve(true);
    };
    const off = s.onAbort(() => {
      try {
        src.stop();
      } catch {
        /* ignore */
      }
      finish();
    });
    src.onended = finish;
    try {
      src.start(startAt);
    } catch {
      done = true;
      off();
      stopMouth();
      resolve(false);
    }
  });
}

/** <audio> element path (Web Audio unavailable or still locked). */
function playElement(url: string, visemes: [number, number][] | null, s: Session): Promise<boolean> {
  if (!isBrowser || typeof Audio === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = url;
    a.volume = voiceVolume();
    let started = false;
    let done = false;
    const seed = Math.random() * 6;
    let stopMouth: () => void = () => {};
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      off();
      stopMouth();
      a.onended = a.onerror = null;
      try {
        a.pause();
        a.removeAttribute('src');
        a.load();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    const off = s.onAbort(() => finish(true));
    a.onended = () => finish(true);
    a.onerror = () => finish(started);
    a.play().then(
      () => {
        if (done) return;
        started = true;
        stopMouth = driveMouth(() => {
          a.volume = voiceVolume();
          if (a.paused) return { open: 0, viseme: 0 };
          if (visemes && visemes.length) {
            const id = visemeAt(visemes, a.currentTime * 1000);
            return { open: visemeOpen(id), viseme: id };
          }
          const open = babble(a.currentTime, seed);
          return { open, viseme: fakeViseme(open) };
        });
      },
      () => finish(false), // NotAllowedError (locked) or unsupported format
    );
  });
}

/* ---- voice status + first-gesture queue */

/** 'locked' = waiting for the first tap; 'no-voice' = no Arabic voice installed; 'blocked' = the browser never started the voice; 'net' = the online Arabic voice is speaking. */
export type VoiceStatus = 'ok' | 'locked' | 'no-voice' | 'blocked' | 'net';
/** Which tier produced sound last: 'net' = online Google TTS. Mirrors VoiceStatus 'net' while it plays. */
let voiceStatus: VoiceStatus = 'ok';
const statusHooks = new Set<(v: VoiceStatus) => void>();
export function getVoiceStatus(): VoiceStatus {
  return voiceStatus;
}
export function onVoiceStatus(fn: (v: VoiceStatus) => void): () => void {
  statusHooks.add(fn);
  return () => statusHooks.delete(fn);
}
function setVoiceStatus(v: VoiceStatus) {
  if (v === voiceStatus) return;
  voiceStatus = v;
  for (const f of [...statusHooks]) {
    try {
      f(v);
    } catch {
      /* ignore */
    }
  }
}
const warned = new Set<string>();
function warnOnce(id: string, msg: string) {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`[voice] ${msg}`);
}

/** True when the browser reports that no user gesture happened yet (speech and audio are then blocked). */
export function isVoiceLocked(): boolean {
  if (!isBrowser || unlocked) return false;
  const ua = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return !!ua && !ua.hasBeenActive;
}

/**
 * Resolves true on the first user gesture (and unlocks the voice inside it), false after `timeoutMs`
 * or when `signal`/the session aborts. Resolves true at once when nothing is locked.
 */
export function whenVoiceUnlocked(timeoutMs = 0, signal?: AbortSignal): Promise<boolean> {
  if (!isVoiceLocked()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const evs = ['pointerdown', 'touchend', 'mousedown', 'keydown', 'click'];
    let t: ReturnType<typeof setTimeout> | null = null;
    const end = (ok: boolean) => {
      evs.forEach((e) => window.removeEventListener(e, onGesture, true));
      signal?.removeEventListener('abort', onAbort);
      if (t) clearTimeout(t);
      resolve(ok);
    };
    const onGesture = () => {
      unlockVoice();
      end(true);
    };
    const onAbort = () => end(false);
    evs.forEach((e) => window.addEventListener(e, onGesture, true));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) return end(false);
    if (timeoutMs > 0) t = setTimeout(() => end(false), timeoutMs);
  });
}

/** speechSynthesis must start within this long or the next tier is used. */
export const TTS_START_TIMEOUT_MS = 1500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ---- browser speechSynthesis */

let voiceP: Promise<SpeechSynthesisVoice | null> | null = null;

function scoreVoice(v: SpeechSynthesisVoice): number {
  const lang = (v.lang || '').replace('_', '-').toLowerCase();
  if (!lang.startsWith('ar')) return -1;
  let s = lang === 'ar-sa' ? 20 : 10;
  const n = v.name.toLowerCase();
  if (/hamed|naayf|maged|majed|tarik|fahed|shakir|male/.test(n)) s += 4; // male voices suit Alrashed
  if (/neural|natural|online|premium|enhanced/.test(n)) s += 3;
  if (/google|microsoft|apple/.test(n)) s += 1;
  if (v.localService) s += 1; // works offline
  return s;
}

function voicesNow(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis?.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** Best Arabic voice of the browser, or null. Waits briefly for the voice list on first use. */
export function pickArabicVoice(): Promise<SpeechSynthesisVoice | null> {
  if (!isBrowser || !window.speechSynthesis) return Promise.resolve(null);
  if (voiceP) return voiceP;
  const best = (list: SpeechSynthesisVoice[]) => {
    let top: SpeechSynthesisVoice | null = null;
    let ts = -1;
    for (const v of list) {
      const sc = scoreVoice(v);
      if (sc > ts) {
        ts = sc;
        top = v;
      }
    }
    return ts >= 0 ? top : null;
  };
  voiceP = new Promise((resolve) => {
    const list = voicesNow();
    if (list.length) return resolve(best(list));
    const synth = window.speechSynthesis;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.('voiceschanged', done);
      const v = best(voicesNow());
      // An empty list may only mean "not loaded yet": allow another look next time.
      if (!voicesNow().length) voiceP = null;
      resolve(v);
    };
    synth.addEventListener?.('voiceschanged', done);
    setTimeout(done, 1200);
  });
  return voiceP;
}
if (isBrowser && window.speechSynthesis) {
  try {
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      voiceP = null;
    });
  } catch {
    /* ignore */
  }
}

function playTts(text: string, s: Session): Promise<boolean> {
  if (!isBrowser || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve(false);
  const spoken = plainForVoice(text);
  if (!spoken) return Promise.resolve(false);
  return (async () => {
    // Browsers block speech before the first tap: queue the line and play it on that tap.
    if (isVoiceLocked()) {
      setVoiceStatus('locked');
      const ctl = new AbortController();
      const offWait = s.onAbort(() => ctl.abort());
      const ok = await whenVoiceUnlocked(6000, ctl.signal);
      offWait();
      if (s.aborted) return true;
      if (!ok) {
        warnOnce('locked', 'speech is blocked until the first tap; using the silent mouth animation');
        return false;
      }
      setVoiceStatus('ok');
    }
    const voice = await pickArabicVoice();
    if (s.aborted) return true;
    const known = voicesNow().length > 0;
    if (!voice && known) {
      setVoiceStatus('no-voice');
      warnOnce('no-voice', 'no Arabic speechSynthesis voice installed; add one in the system settings or record voices (docs/voice.md)');
      return false;
    }
    const synth = window.speechSynthesis;
    // Chrome: stale or paused queues swallow new utterances. Clear them and give the engine a moment.
    try {
      if (synth.speaking || synth.pending || synth.paused) {
        synth.cancel();
        synth.resume();
        await sleep(60);
        if (s.aborted) return true;
      }
    } catch {
      /* ignore */
    }
    return new Promise<boolean>((resolve) => {
      const u = new SpeechSynthesisUtterance(spoken);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || 'ar-SA';
      u.rate = TTS_RATE;
      u.pitch = TTS_PITCH;
      u.volume = voiceVolume();
      const est = estimateDuration(text);
      const seed = Math.random() * 6;
      let started = false;
      let done = false;
      let lastBoundary = -1;
      let tStart = 0;
      let stopMouth: () => void = () => {};
      const timers: ReturnType<typeof setTimeout>[] = [];
      let keepAlive: ReturnType<typeof setInterval> | null = null;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        off();
        stopMouth();
        timers.forEach(clearTimeout);
        if (keepAlive) clearInterval(keepAlive);
        u.onstart = u.onend = u.onerror = u.onboundary = null;
        resolve(ok);
      };
      const off = s.onAbort(() => {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
        finish(true);
      });
      u.onstart = () => {
        if (started) return;
        started = true;
        setVoiceStatus('ok');
        tStart = now();
        stopMouth = driveMouth((t) => {
          // Word boundaries close the mouth briefly between words.
          const sinceB = lastBoundary < 0 ? 1 : (now() - lastBoundary) / 1000;
          const gap = sinceB < 0.07 ? 0.25 : 1;
          const open = babble(t, seed) * gap;
          return { open, viseme: fakeViseme(open) };
        });
        // Chrome's network voices stop after ~15 s unless nudged.
        if (!voice || !voice.localService) {
          keepAlive = setInterval(() => {
            if (synth.speaking && !synth.paused) {
              synth.pause();
              synth.resume();
            }
          }, 10000);
        }
        // Safety: some browsers never fire onend.
        timers.push(setTimeout(() => finish(true), (est * 2.2 + 4) * 1000));
      };
      u.onboundary = () => {
        lastBoundary = now();
      };
      u.onend = () => finish(true);
      u.onerror = (e) => {
        const err = (e as SpeechSynthesisErrorEvent).error;
        if (err === 'interrupted' || err === 'canceled') finish(true);
        else finish(started && now() - tStart > 300);
      };
      try {
        synth.speak(u);
        if (synth.paused) synth.resume();
      } catch {
        finish(false);
        return;
      }
      // Never started (locked on iOS, no audio output): give up and use the timed mouth.
      timers.push(
        setTimeout(() => {
          if (!started) {
            setVoiceStatus('blocked');
            warnOnce('blocked', 'speechSynthesis did not start (muted device, locked audio or no output); using the silent mouth animation');
            try {
              synth.cancel();
            } catch {
              /* ignore */
            }
            finish(false);
          }
        }, TTS_START_TIMEOUT_MS),
      );
    });
  })();
}

/* ---- online tier: Google Translate TTS through <audio> */

/** Plays chunks in order. Resolves false when the very first chunk cannot play (offline, blocked). */
/** Edge neural voice from /api/tts, one request per chunk; the mouth follows the audio loudness. */
let edgeDown = false;
async function playEdge(text: string, s: Session): Promise<boolean> {
  if (!isBrowser || edgeDown) return false;
  const chunks = chunkText(plainForVoice(text), EDGE_TTS_MAX_CHARS);
  if (!chunks.length) return false;
  let any = false;
  for (const chunk of chunks) {
    if (s.aborted) return true;
    const ok = await playUrl(edgeTtsUrl(chunk), null, s);
    if (!ok) {
      // No endpoint here (dev server, offline, preview host): skip this tier for the rest of the visit.
      if (!any) edgeDown = true;
      return any;
    }
    any = true;
  }
  return any;
}

function playNet(text: string, s: Session): Promise<boolean> {
  if (!isBrowser || typeof Audio === 'undefined') return Promise.resolve(false);
  const chunks = chunkText(plainForVoice(text));
  if (!chunks.length) return Promise.resolve(false);
  return (async () => {
    if (isVoiceLocked()) {
      setVoiceStatus('locked');
      const ctl = new AbortController();
      const offWait = s.onAbort(() => ctl.abort());
      const ok = await whenVoiceUnlocked(6000, ctl.signal);
      offWait();
      if (s.aborted) return true;
      if (!ok) return false;
      setVoiceStatus('ok');
    }
    let anyPlayed = false;
    const seed = Math.random() * 6;
    let cur: HTMLAudioElement | null = null;
    let curEst = 0;
    let closed = false;
    const mk = (chunk: string) => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = netTtsUrl(chunk);
      return a;
    };
    let next: HTMLAudioElement | null = chunks.length ? mk(chunks[0]) : null;
    const stopMouth = driveMouth((t) => {
      const a = cur;
      if (!a || a.paused || a.ended) return { open: 0, viseme: 0 };
      const dur = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : curEst;
      if (a.currentTime > dur - 0.1) return { open: 0, viseme: 0 };
      a.volume = voiceVolume();
      const open = babble(t, seed);
      return { open, viseme: fakeViseme(open) };
    });
    const release = (a: HTMLAudioElement | null) => {
      if (!a) return;
      try {
        a.onended = a.onerror = null;
        a.pause();
        a.removeAttribute('src');
        a.load();
      } catch {
        /* ignore */
      }
    };
    const off = s.onAbort(() => {
      closed = true;
      release(cur);
      release(next);
    });
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (s.aborted) return true;
        const a = next as HTMLAudioElement;
        next = i + 1 < chunks.length ? mk(chunks[i + 1]) : null;
        cur = a;
        curEst = estimateDuration(chunks[i]);
        let off2: () => void = () => {};
        const ok = await new Promise<boolean>((resolve) => {
          const startTimer = setTimeout(() => finish(false), 8000);
          const finish = (r: boolean) => {
            clearTimeout(startTimer);
            a.onended = a.onerror = null;
            resolve(r);
          };
          off2 = s.onAbort(() => finish(true));
          a.onended = () => finish(true);
          a.onerror = () => finish(false);
          a.volume = voiceVolume();
          a.play().then(
            () => {
              clearTimeout(startTimer);
              anyPlayed = true;
              setVoiceStatus('net');
            },
            () => finish(false),
          );
        });
        off2();
        release(a);
        if (closed || s.aborted) return true;
        if (!ok) {
          if (!anyPlayed) {
            warnOnce('net', 'online Arabic voice unavailable (offline or blocked); using the silent mouth animation');
            return false;
          }
          return true; // part of the line was heard: do not repeat it
        }
      }
      return true;
    } finally {
      off();
      release(cur);
      release(next);
      stopMouth();
      if (voiceStatus === 'net') setVoiceStatus('ok');
    }
  })();
}
/* ---- timed mouth animation */

function playTimed(text: string, s: Session): Promise<boolean> {
  return new Promise((resolve) => {
    const dur = estimateDuration(text);
    const seed = Math.random() * 6;
    const stopMouth = driveMouth((t) => {
      if (t > dur - 0.12) return { open: 0, viseme: 0 };
      const open = babble(t, seed);
      return { open, viseme: fakeViseme(open) };
    });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      off();
      stopMouth();
      resolve(true);
    };
    const timer = setTimeout(finish, dur * 1000);
    const off = s.onAbort(finish);
  });
}

/* ------------------------------------------------------------------ public API */

/** Which source the last speak() used (for dev pages and tests). */
export let lastSource: 'recorded' | 'live' | 'edge' | 'tts' | 'net' | 'timed' | null = null;

export type VoiceTier = 'recorded' | 'edge' | 'tts' | 'net';
/** The one place that sets the order of voice sources (live audio always goes first, the timed mouth last). */
export const VOICE_TIER_ORDER: VoiceTier[] = ['recorded', 'edge', 'tts', 'net'];
/** Tier that produced the last line (null before any, 'timed' = silent mouth). */
export function getVoiceTier(): typeof lastSource {
  return lastSource;
}

/** Speak one line. Resolves when done, rejects with AbortError when aborted. Drives app.mouth/viseme. */
export async function speak(opts: SpeakOpts): Promise<void> {
  // One voice at a time: a new line stops the previous one (which rejects with AbortError).
  stopSpeech();
  const signal = opts.signal;
  if (signal?.aborted) throw abortError();
  const s = new Session();
  current = s;
  const onAbort = () => s.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const text = opts.text ?? '';
  try {
    let played = false;
    if (opts.live?.audioUrl) {
      const v = opts.live.visemes?.length ? [...opts.live.visemes].sort((a, b) => a[0] - b[0]) : null;
      played = await playUrl(opts.live.audioUrl, v, s);
      if (played) lastSource = 'live';
    }
    for (const tier of VOICE_TIER_ORDER) {
      if (played || s.aborted) break;
      if (tier === 'recorded' && opts.key) {
        const m = await loadManifest();
        const v = pickVariant(m.keys[opts.key], useApp.getState().gender);
        if (v && !s.aborted) {
          const visemes = await visemeFile(`${VOICE_DIR}${opts.key}.${v}.json`);
          if (!s.aborted) played = await playUrl(`${VOICE_DIR}${opts.key}.${v}.mp3`, visemes, s);
          if (played) lastSource = 'recorded';
        }
      } else if (tier === 'edge' && text.trim()) {
        played = await playEdge(text, s);
        if (played) lastSource = 'edge';
      } else if (tier === 'tts' && text.trim()) {
        played = await playTts(text, s);
        if (played) lastSource = 'tts';
      } else if (tier === 'net' && text.trim()) {
        played = await playNet(text, s);
        if (played) lastSource = 'net';
      }
    }
    if (!played && !s.aborted) {
      await playTimed(text, s);
      lastSource = 'timed';
    }
    if (s.aborted) throw abortError();
  } finally {
    signal?.removeEventListener('abort', onAbort);
    if (current === s) current = null;
    resetMouth();
  }
}

/** Stop any speech immediately (the pending speak() rejects with AbortError). Leaves mouth at 0. */
export function stopSpeech(): void {
  const s = current;
  current = null;
  s?.abort();
  if (isBrowser) {
    try {
      const synth = window.speechSynthesis;
      if (synth && (synth.speaking || synth.pending)) synth.cancel();
    } catch {
      /* ignore */
    }
  }
  try {
    resetMouth();
  } catch {
    /* store not ready */
  }
}

/** True while a speak() is running. */
export function isSpeaking(): boolean {
  return current !== null;
}
