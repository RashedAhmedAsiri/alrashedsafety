import type { SfxName } from '../core/types';
import { useApp } from '../core/store';
import { Kit, type Voice } from './kit';
import { RECIPES } from './recipes';
import { MenuMusic } from './music';
// OWNER: ui worker. Sound effects synthesized with the Web Audio API (no sound files needed).
// Keep these exports and signatures exactly.
//
// - Every SfxName has a recipe in recipes.ts (menuMusic lives in music.ts).
// - Volume follows settings.sfxVolume; music follows settings.music AND setMusic(on).
// - playSfx(name, { loop: true }) is idempotent per name: a second call while that loop plays is ignored.
// - One-shots requested before the first user gesture (audio still locked) are dropped silently.

interface ActiveVoice extends Voice {
  name: SfxName;
  loop: boolean;
  gain: GainNode;
  endTimer: number;
  done: boolean;
}

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let music: MenuMusic | null = null;
let musicWanted = false;
const active: ActiveVoice[] = [];
/** Loops requested before the first gesture; started by unlockAudio(). */
const pendingLoops = new Map<SfxName, { volume?: number; loop?: boolean }>();
let unlocked = false;
const MAX_PER_NAME = 5;
const MUSIC_LEVEL = 0.55;

const vol = (v: number) => Math.max(0, Math.min(1, v)) ** 1.6;

/** Creating an AudioContext before any user gesture only produces a browser warning, so wait for one. */
function gestureSeen(): boolean {
  if (unlocked) return true;
  const ua = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return !!ua?.hasBeenActive;
}

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined' || !gestureSeen()) return null;
  const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 10;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  comp.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(comp);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(comp);
  applyVolumes(true);
  useApp.subscribe((s, prev) => {
    if (s.settings !== prev.settings) applyVolumes(false);
  });
  return ctx;
}

function applyVolumes(immediate: boolean) {
  if (!ctx || !sfxBus || !musicBus) return;
  const s = useApp.getState().settings;
  const now = ctx.currentTime;
  sfxBus.gain.cancelScheduledValues(now);
  sfxBus.gain.setTargetAtTime(vol(s.sfxVolume), now, immediate ? 0.001 : 0.05);
  updateMusic();
}

function updateMusic() {
  if (!ctx || !musicBus) return;
  const on = musicWanted && useApp.getState().settings.music && ctx.state === 'running';
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  if (on) {
    if (!music) music = new MenuMusic(ctx, musicBus);
    if (!music.running) {
      musicBus.gain.setValueAtTime(0, now);
      music.start();
    }
    musicBus.gain.setTargetAtTime(MUSIC_LEVEL * Math.max(0.35, vol(useApp.getState().settings.sfxVolume) ** 0.5), now, 0.5);
  } else if (music?.running) {
    musicBus.gain.setTargetAtTime(0, now, 0.25);
    const m = music;
    window.setTimeout(() => {
      // Only stop when nobody asked for the music again in the meantime.
      if (!(musicWanted && useApp.getState().settings.music)) m.stop();
    }, 1200);
  }
}

/** Resume (or create) the audio context. Call from a user gesture (first tap/click). */
export function unlockAudio(): void {
  unlocked = true;
  const c = ensureCtx();
  if (!c) return;
  if (pendingLoops.size) {
    const list = [...pendingLoops];
    pendingLoops.clear();
    for (const [name, opts] of list) playSfx(name, opts);
  }
  if (c.state !== 'running') {
    // iOS needs a sound started inside the gesture.
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
    c.resume().then(updateMusic, () => undefined);
  } else updateMusic();
}

function stopVoice(v: ActiveVoice, fade = 0.12) {
  if (v.done) return;
  v.done = true;
  for (const t of v.timers) window.clearInterval(t);
  window.clearTimeout(v.endTimer);
  const i = active.indexOf(v);
  if (i >= 0) active.splice(i, 1);
  if (!ctx) return;
  const now = ctx.currentTime;
  try {
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + fade);
  } catch {
    /* ignore */
  }
  const sources = v.sources.slice();
  for (const s of sources) {
    try {
      s.stop(now + fade + 0.02);
    } catch {
      /* already stopped */
    }
  }
  window.setTimeout(() => v.gain.disconnect(), (fade + 0.2) * 1000);
}

export function playSfx(name: SfxName, opts?: { volume?: number; loop?: boolean }): void {
  if (name === 'menuMusic') {
    setMusic(true);
    return;
  }
  const loop = !!opts?.loop;
  const c = ensureCtx();
  if (!c || !sfxBus) {
    if (loop) pendingLoops.set(name, opts ?? {});
    return;
  }
  const recipe = RECIPES[name];
  if (!recipe) return;
  if (c.state !== 'running') {
    c.resume().catch(() => undefined);
    // A one-shot would play late once unlocked; loops are fine to start (they begin when audio resumes).
    if (!loop) return;
  }
  if (loop && active.some((v) => v.name === name && v.loop)) return;
  const same = active.filter((v) => v.name === name);
  if (same.length >= MAX_PER_NAME) stopVoice(same[0], 0.05);

  const gain = c.createGain();
  gain.gain.value = Math.max(0, opts?.volume ?? 1);
  gain.connect(sfxBus);
  const voice: ActiveVoice = { name, loop, gain, sources: [], timers: [], endTimer: 0, done: false };
  active.push(voice);
  const kit = new Kit(c, gain, c.currentTime + 0.01, voice);

  try {
    if (loop) {
      if (recipe.loop) recipe.loop(kit);
      else if (recipe.once) {
        const once = recipe.once;
        let len = 0.5;
        kit.repeat(
          (k) => {
            len = once(k);
          },
          () => (recipe.period ? recipe.period() : len + 0.15),
        );
      }
    } else if (recipe.once) {
      const len = recipe.once(kit);
      voice.endTimer = window.setTimeout(() => stopVoice(voice, 0.01), (len + 0.3) * 1000);
    } else if (recipe.loop) {
      recipe.loop(kit);
      const len = recipe.onceFor ?? 2;
      voice.endTimer = window.setTimeout(() => stopVoice(voice, 0.6), len * 1000);
    }
  } catch {
    stopVoice(voice, 0.01);
  }
}

export function stopSfx(name: SfxName): void {
  if (name === 'menuMusic') {
    setMusic(false);
    return;
  }
  pendingLoops.delete(name);
  for (const v of active.filter((x) => x.name === name)) stopVoice(v, v.loop ? 0.4 : 0.1);
}

/** Stops every sound effect (music is separate: use setMusic). */
export function stopAllSfx(): void {
  pendingLoops.clear();
  for (const v of active.slice()) stopVoice(v, 0.15);
}

/** Ask for the menu tune on/off. It actually plays only when settings.music is also on. */
export function setMusic(on: boolean): void {
  musicWanted = on;
  if (!ensureCtx()) return;
  updateMusic();
}
