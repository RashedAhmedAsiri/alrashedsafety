// OWNER: weather worker. Blend state and the per-frame "conditions" every weather piece reads.
import * as THREE from 'three';
import { useApp } from '../core/store';
import type { TimeOfDay, Weather } from '../core/types';

/** Live blend values (0..1). Re-exported from ./index as the public `weatherBlend`. */
export const weatherBlend = { rain: 0, wet: 0, dust: 0, afternoon: 0 };

type Key = keyof typeof weatherBlend;
const KEYS: Key[] = ['rain', 'wet', 'dust', 'afternoon'];

/** Linear (un-eased) progress per key; weatherBlend is smoothstep of these. */
const raw = { rain: 0, wet: 0, dust: 0, afternoon: 0 };
const BLEND_SECONDS = 3;

/** Optional preview override set by <WeatherSystem weather time/>. */
export const override: { weather?: Weather; time?: TimeOfDay } = {};

export function targetWeather(): Weather {
  return override.weather ?? useApp.getState().weather;
}
export function targetTime(): TimeOfDay {
  return override.time ?? useApp.getState().time;
}

/* ------------------------------------------------------------------ condition presets */

interface Preset {
  zenith: string;
  horizon: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  shadow: number;
  exposure: number;
  cloudCover: number;
  cloudLit: string;
  cloudShade: string;
  sunDisc: number;
  haze: number;
}

const SUNNY_MORNING: Preset = {
  zenith: '#3f9bec', horizon: '#c9e7fb', fog: '#cfe6f6', fogNear: 110, fogFar: 520,
  sun: '#fff1d8', sunI: 2.6, hemiSky: '#d6ecff', hemiGround: '#d9c6a0', hemiI: 1.25,
  shadow: 0.78, exposure: 1.0, cloudCover: 0.34, cloudLit: '#ffffff', cloudShade: '#c4d6ea', sunDisc: 1, haze: 0,
};
const SUNNY_AFTERNOON: Preset = {
  zenith: '#4893d8', horizon: '#fbdcb2', fog: '#f1dcc2', fogNear: 110, fogFar: 520,
  sun: '#ffcf96', sunI: 2.4, hemiSky: '#ffe4c4', hemiGround: '#d4b089', hemiI: 1.15,
  shadow: 0.75, exposure: 1.0, cloudCover: 0.3, cloudLit: '#fff0dc', cloudShade: '#e2bea2', sunDisc: 1, haze: 0,
};
const RAIN: Preset = {
  zenith: '#5d6a78', horizon: '#9aa5b1', fog: '#a0aab5', fogNear: 30, fogFar: 260,
  sun: '#cfdae6', sunI: 0.55, hemiSky: '#c3d0de', hemiGround: '#7d838b', hemiI: 1.6,
  shadow: 0.22, exposure: 1.0, cloudCover: 1.0, cloudLit: '#a5afba', cloudShade: '#66707d', sunDisc: 0, haze: 0.25,
};
const WET: Preset = {
  zenith: '#55a2e4', horizon: '#d6e7f3', fog: '#d2e2ee', fogNear: 80, fogFar: 440,
  sun: '#fff6e8', sunI: 2.2, hemiSky: '#d4e6f7', hemiGround: '#a6a297', hemiI: 1.25,
  shadow: 0.65, exposure: 1.0, cloudCover: 0.6, cloudLit: '#ffffff', cloudShade: '#97a6b7', sunDisc: 0.9, haze: 0,
};
const DUST: Preset = {
  zenith: '#b88350', horizon: '#e0b27a', fog: '#d8a86f', fogNear: 4, fogFar: 78,
  sun: '#ffd9a8', sunI: 1.15, hemiSky: '#f2c590', hemiGround: '#b98a58', hemiI: 1.55,
  shadow: 0.35, exposure: 1.0, cloudCover: 0.12, cloudLit: '#f2cc9c', cloudShade: '#c99360', sunDisc: 0.55, haze: 1,
};

type ColorKeys = 'zenith' | 'horizon' | 'fog' | 'sun' | 'hemiSky' | 'hemiGround' | 'cloudLit' | 'cloudShade';
type NumKeys = Exclude<keyof Preset, ColorKeys>;
const COLOR_KEYS: ColorKeys[] = ['zenith', 'horizon', 'fog', 'sun', 'hemiSky', 'hemiGround', 'cloudLit', 'cloudShade'];
const NUM_KEYS: NumKeys[] = ['fogNear', 'fogFar', 'sunI', 'hemiI', 'shadow', 'exposure', 'cloudCover', 'sunDisc', 'haze'];

type Compiled = Record<ColorKeys, THREE.Color> & Record<NumKeys, number>;
function compile(p: Preset): Compiled {
  const o = {} as Compiled;
  for (const k of COLOR_KEYS) o[k] = new THREE.Color(p[k]);
  for (const k of NUM_KEYS) o[k] = p[k];
  return o;
}
const C_SM = compile(SUNNY_MORNING);
const C_SA = compile(SUNNY_AFTERNOON);
const C_R = compile(RAIN);
const C_W = compile(WET);
const C_D = compile(DUST);
const WARM = new THREE.Color('#ffc890');

/** Sun directions (unit vectors pointing TOWARD the sun). South is +Z. */
const SUN_MORNING = new THREE.Vector3(0.5, 0.74, 0.45).normalize();
const SUN_AFTERNOON = new THREE.Vector3(-0.64, 0.46, 0.6).normalize();

/** Everything the lights, sky, fog and water read this frame. Mutated in place; never replace. */
export const cond = {
  ...compile(SUNNY_MORNING),
  sunDir: SUN_MORNING.clone(),
  /** 0..1 lightning flash brightness (rain only). */
  flash: 0,
  /** Surface wetness 0..1 = how wet the ground looks (rain or after rain). */
  wetness: 0,
  /** Puddle size 0..1. */
  puddles: 0,
  /** Seconds since start (frame time). */
  time: 0,
};

/** Wind (unit direction on XZ, strength 0..1). Dust: strong from the north-west; otherwise a breeze. */
export const WIND = { dir: new THREE.Vector2(0.94, 0.34).normalize(), strength: 0.15 };

/* ------------------------------------------------------------------ stepping */

let lastStamp = -1;
let started = false;
let flashNext = 6;
let flashStart = -10;
const thunderListeners = new Set<(delaySec: number, strength: number) => void>();

export function onThunder(fn: (delaySec: number, strength: number) => void) {
  thunderListeners.add(fn);
  return () => thunderListeners.delete(fn);
}

const smooth = (x: number) => x * x * (3 - 2 * x);
const tmp = new THREE.Color();

/**
 * Advance blends and recompute `cond`. Safe to call from many useFrame callbacks: only the first
 * call per frame (same elapsed time) does work.
 */
export function stepBlend(elapsed: number, delta: number) {
  if (elapsed === lastStamp) return;
  lastStamp = elapsed;
  const w = targetWeather();
  const t = targetTime();
  const target: Record<Key, number> = { rain: w === 'rain' ? 1 : 0, wet: w === 'wet' ? 1 : 0, dust: w === 'dust' ? 1 : 0, afternoon: t === 'afternoon' ? 1 : 0 };
  const dt = Math.min(Math.max(delta, 0), 0.1);
  for (const k of KEYS) {
    if (!started) raw[k] = target[k];
    else {
      const d = target[k] - raw[k];
      const s = dt / BLEND_SECONDS;
      raw[k] = Math.abs(d) <= s ? target[k] : raw[k] + Math.sign(d) * s;
    }
    weatherBlend[k] = smooth(raw[k]);
  }
  started = true;
  cond.time = elapsed;
  computeConditions();
  stepFlash(elapsed);
}

function computeConditions() {
  const { rain, wet, dust, afternoon: a } = weatherBlend;
  const sunny = Math.max(0, 1 - rain - wet - dust);
  const sum = sunny + rain + wet + dust || 1;
  const ws = sunny / sum, wr = rain / sum, ww = wet / sum, wd = dust / sum;

  for (const k of COLOR_KEYS) {
    const c = cond[k] as THREE.Color;
    // Sunny base blends morning -> afternoon; other weathers get a little afternoon warmth.
    tmp.copy(C_SM[k]).lerp(C_SA[k], a);
    c.setRGB(0, 0, 0);
    c.r = tmp.r * ws + C_R[k].r * wr + C_W[k].r * ww + C_D[k].r * wd;
    c.g = tmp.g * ws + C_R[k].g * wr + C_W[k].g * ww + C_D[k].g * wd;
    c.b = tmp.b * ws + C_R[k].b * wr + C_W[k].b * ww + C_D[k].b * wd;
  }
  for (const k of NUM_KEYS) {
    const base = C_SM[k] + (C_SA[k] - C_SM[k]) * a;
    cond[k] = base * ws + C_R[k] * wr + C_W[k] * ww + C_D[k] * wd;
  }
  // Afternoon warmth on non-sunny skies (sun color only; sky keeps its weather).
  const warm = a * (1 - ws) * 0.35;
  if (warm > 0) cond.sun.lerp(WARM, warm);
  cond.sunDir.copy(SUN_MORNING).lerp(SUN_AFTERNOON, a).normalize();

  cond.wetness = Math.min(1, rain + wet);
  cond.puddles = Math.min(1, rain * 0.85 + wet);
  WIND.strength = 0.15 + 0.85 * dust + 0.35 * rain;
}

function stepFlash(now: number) {
  const r = weatherBlend.rain;
  if (r < 0.6) {
    cond.flash = 0;
    flashNext = Math.max(flashNext, now + 4);
    return;
  }
  if (now >= flashNext) {
    flashStart = now;
    flashNext = now + 9 + Math.random() * 14;
    const strength = 0.6 + Math.random() * 0.4;
    for (const fn of thunderListeners) fn(0.9 + Math.random() * 1.4, strength);
  }
  const e = now - flashStart;
  // Double flicker: 0..0.09 bright, dip, 0.16..0.3 second softer pulse, then decay.
  let f = 0;
  if (e >= 0 && e < 0.09) f = 1;
  else if (e < 0.16) f = 0.25;
  else if (e < 0.3) f = 0.75;
  else if (e < 0.9) f = 0.75 * (1 - (e - 0.3) / 0.6) ** 2;
  cond.flash = f * r;
}
