import type { Gender } from '../core/types';
import { useApp } from '../core/store';
// OWNER: voice worker. Keep these exports and signatures exactly (detectGender, applyGenderDetection, setManualGender).
//
// Placeholder classifier until a model trained on Saudi children's voices exists (docs/plan/Voice_and_AI.md
// "Gender from the voice"): YIN pitch on voiced frames -> median F0 + range, LPC formants F1/F2,
// a logistic score around a child pitch boundary. Before puberty the overlap is large, so confidence
// is often below 0.75 and the last known gender then stays.

/** Placeholder thresholds (tune with real recordings). */
export const GENDER_MODEL = {
  /** Median F0 (Hz) where boy/girl are equally likely for ages 6-12. */
  f0Boundary: 255,
  /** Hz per logistic unit: smaller = more decisive. */
  f0Scale: 16,
  /** F2 (Hz) boundary and scale; girls' shorter vocal tracts give slightly higher formants. */
  f2Boundary: 2500,
  f2Scale: 600,
  /** Weight of the formant term, clamped to +-maxFormantUnits. */
  f2Weight: 0.5,
  maxFormantUnits: 0.6,
  /** Voiced frames (15 ms hop) needed before any answer; full confidence from fullFrames. */
  minFrames: 12,
  fullFrames: 40,
};

export const MIN_CONFIDENCE = 0.75;
export const MANUAL_OVERRIDE_MS = 30 * 60 * 1000;

export interface VoiceAnalysis {
  f0Median: number;
  /** p10..p90 spread in semitones. */
  f0RangeSt: number;
  f1: number | null;
  f2: number | null;
  voicedFrames: number;
  /** Probability the speaker is a girl (placeholder model). */
  pGirl: number;
}

/* ------------------------------------------------------------------ DSP */

function decimate(x: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return x;
  const n = Math.floor(x.length / factor);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const o = i * factor;
    for (let k = 0; k < factor; k++) s += x[o + k];
    y[i] = s / factor;
  }
  return y;
}

function rms(x: Float32Array, start: number, len: number): number {
  let s = 0;
  for (let i = start; i < start + len; i++) s += x[i] * x[i];
  return Math.sqrt(s / len);
}

/** YIN pitch of one frame; returns Hz or 0 when unvoiced. */
function yin(x: Float32Array, start: number, W: number, tauMin: number, tauMax: number, sr: number, d: Float32Array): number {
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let j = start; j < start + W; j++) {
      const v = x[j] - x[j + tau];
      s += v * v;
    }
    running += s;
    d[tau] = running > 0 ? (s * tau) / running : 1;
  }
  const threshold = 0.15;
  let best = -1;
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (d[tau] < threshold) {
      while (tau + 1 < tauMax && d[tau + 1] < d[tau]) tau++;
      best = tau;
      break;
    }
  }
  if (best < 0) return 0;
  // Parabolic interpolation around the minimum.
  const a = d[best - 1] ?? d[best];
  const b = d[best];
  const c = d[best + 1] ?? d[best];
  const den = a + c - 2 * b;
  const shift = den !== 0 ? (a - c) / (2 * den) : 0;
  const t = best + Math.max(-1, Math.min(1, shift));
  return sr / t;
}

/** LPC coefficients (Levinson-Durbin) of a pre-emphasized, Hamming-windowed frame. */
function lpc(x: Float32Array, start: number, len: number, order: number): Float64Array | null {
  const w = new Float64Array(len);
  let prev = start > 0 ? x[start - 1] : 0;
  for (let i = 0; i < len; i++) {
    const v = x[start + i];
    w[i] = (v - 0.97 * prev) * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (len - 1)));
    prev = v;
  }
  const r = new Float64Array(order + 1);
  for (let k = 0; k <= order; k++) {
    let s = 0;
    for (let i = k; i < len; i++) s += w[i] * w[i - k];
    r[k] = s;
  }
  if (r[0] <= 1e-9) return null;
  r[0] *= 1.0001; // tiny white-noise correction for stability
  const a = new Float64Array(order + 1);
  a[0] = 1;
  let e = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / e;
    const tmp = a.slice();
    for (let j = 1; j < i; j++) a[j] = tmp[j] + k * tmp[i - j];
    a[i] = k;
    e *= 1 - k * k;
    if (e <= 0) return null;
  }
  return a;
}

/** First two peaks of the LPC envelope (rough F1, F2). */
function formants(a: Float64Array, sr: number): [number | null, number | null] {
  const N = 256;
  const fMax = Math.min(5000, sr / 2);
  const env = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const w = (2 * Math.PI * (n / N) * fMax) / sr;
    let re = 0;
    let im = 0;
    for (let k = 0; k < a.length; k++) {
      re += a[k] * Math.cos(w * k);
      im -= a[k] * Math.sin(w * k);
    }
    env[n] = 1 / Math.max(1e-9, re * re + im * im);
  }
  const peaks: number[] = [];
  for (let n = 1; n < N - 1; n++) if (env[n] > env[n - 1] && env[n] >= env[n + 1]) peaks.push((n / N) * fMax);
  const f1 = peaks.find((f) => f >= 250 && f <= 1400) ?? null;
  const f2 = f1 !== null ? peaks.find((f) => f >= Math.max(800, f1 + 250) && f <= 4000) ?? null : null;
  return [f1, f2];
}

const median = (v: number[]) => {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (v: number[], q: number) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Full analysis of an utterance, or null when there is too little voiced audio. */
export function analyzeVoice(samples: Float32Array, sampleRate: number): VoiceAnalysis | null {
  if (!samples || !sampleRate || samples.length < sampleRate * 0.2) return null;
  const factor = Math.max(1, Math.round(sampleRate / 16000));
  const x = decimate(samples, factor);
  const sr = sampleRate / factor;
  const tauMin = Math.floor(sr / 600);
  const tauMax = Math.ceil(sr / 90);
  const W = Math.round(sr * 0.025);
  const hop = Math.round(sr * 0.015);
  const span = W + tauMax + 1;
  if (x.length < span) return null;

  let starts: number[] = [];
  for (let s = 0; s + span <= x.length; s += hop) starts.push(s);
  const MAX_FRAMES = 600;
  if (starts.length > MAX_FRAMES) {
    const step = starts.length / MAX_FRAMES;
    starts = Array.from({ length: MAX_FRAMES }, (_, i) => starts[Math.floor(i * step)]);
  }
  const energies = starts.map((s) => rms(x, s, W));
  const loud = quantile(energies, 0.95);
  const gate = Math.max(0.004, loud * 0.12);

  const d = new Float32Array(tauMax + 2);
  const f0s: number[] = [];
  const voicedStarts: number[] = [];
  starts.forEach((s, i) => {
    if (energies[i] < gate) return;
    const f = yin(x, s, W, tauMin, tauMax, sr, d);
    if (f >= 100 && f <= 600) {
      f0s.push(f);
      voicedStarts.push(s);
    }
  });
  if (f0s.length < GENDER_MODEL.minFrames) return null;

  // Drop octave jumps around the first median, then recompute.
  const m0 = median(f0s);
  const keep = f0s.map((f) => Math.abs(Math.log2(f / m0)) < 0.45);
  const clean = f0s.filter((_, i) => keep[i]);
  const cleanStarts = voicedStarts.filter((_, i) => keep[i]);
  if (clean.length < GENDER_MODEL.minFrames) return null;
  const f0Median = median(clean);
  const f0RangeSt = 12 * Math.log2(quantile(clean, 0.9) / quantile(clean, 0.1));

  // Formants on up to 40 voiced frames.
  const f1s: number[] = [];
  const f2s: number[] = [];
  const fl = Math.round(sr * 0.03);
  const stepF = Math.max(1, Math.floor(cleanStarts.length / 40));
  for (let i = 0; i < cleanStarts.length; i += stepF) {
    const s = cleanStarts[i];
    if (s + fl > x.length) continue;
    const a = lpc(x, s, fl, Math.min(14, Math.round(sr / 1000) + 2));
    if (!a) continue;
    const [f1, f2] = formants(a, sr);
    if (f1 !== null) f1s.push(f1);
    if (f2 !== null) f2s.push(f2);
  }
  const f1 = f1s.length >= 5 ? median(f1s) : null;
  const f2 = f2s.length >= 5 ? median(f2s) : null;

  const M = GENDER_MODEL;
  let z = (f0Median - M.f0Boundary) / M.f0Scale;
  if (f2 !== null) z += Math.max(-M.maxFormantUnits, Math.min(M.maxFormantUnits, ((f2 - M.f2Boundary) / M.f2Scale) * M.f2Weight));
  const pGirl = sigmoid(z);
  return { f0Median, f0RangeSt, f1, f2, voicedFrames: clean.length, pGirl };
}

export function detectGender(samples: Float32Array, sampleRate: number): { gender: Gender; confidence: number } | null {
  let a: VoiceAnalysis | null = null;
  try {
    a = analyzeVoice(samples, sampleRate);
  } catch (e) {
    console.warn('[gender] analysis failed', e);
    return null;
  }
  if (!a) return null;
  const gender: Gender = a.pGirl >= 0.5 ? 'girl' : 'boy';
  const p = Math.max(a.pGirl, 1 - a.pGirl);
  // Less voiced audio -> pull the confidence toward 0.5.
  const amount = Math.min(1, a.voicedFrames / GENDER_MODEL.fullFrames);
  const confidence = Math.round((0.5 + (p - 0.5) * amount) * 1000) / 1000;
  return { gender, confidence };
}

/* ------------------------------------------------------------------ store rules */

const MANUAL_KEY = 'alrashed.gender.manual.v1';

/** Apply a detection to the app store following the plan's rules (75% confidence, manual override 30 min). */
export function applyGenderDetection(r: { gender: Gender; confidence: number } | null): void {
  if (!r) return;
  const st = useApp.getState();
  if (st.genderManualUntil > Date.now()) return;
  if (!(r.confidence >= MIN_CONFIDENCE)) return;
  if (r.gender !== 'boy' && r.gender !== 'girl') return;
  st.set({ gender: r.gender, genderSource: 'detected' });
}

/** Manual choice from settings (overrides detection for 30 minutes). */
export function setManualGender(g: Gender): void {
  const until = Date.now() + MANUAL_OVERRIDE_MS;
  useApp.getState().set({ gender: g, genderSource: 'manual', genderManualUntil: until });
  try {
    localStorage.setItem(MANUAL_KEY, JSON.stringify({ gender: g, until }));
  } catch {
    /* private mode */
  }
}

/** Restore a manual choice that is still active (runs on module load). */
export function restoreManualGender(): void {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MANUAL_KEY) : null;
    if (!raw) return;
    const j = JSON.parse(raw) as { gender?: Gender; until?: number };
    if ((j.gender === 'boy' || j.gender === 'girl') && typeof j.until === 'number' && j.until > Date.now()) {
      useApp.getState().set({ gender: j.gender, genderSource: 'manual', genderManualUntil: j.until });
    } else {
      localStorage.removeItem(MANUAL_KEY);
    }
  } catch {
    /* ignore */
  }
}
restoreManualGender();
