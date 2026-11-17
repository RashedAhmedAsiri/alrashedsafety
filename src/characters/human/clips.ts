/**
 * Procedural clips for every human (boys and adults). Each clip fills a Pose for time t (seconds since
 * the clip started, already multiplied by clipSpeed). D is how long the clip will play: the actor's
 * clipDuration for a one-shot, Infinity when looping. One-shots are time-scaled to D when D is given,
 * so their whole motion fits; played without a duration they hold their last pose (or repeat when
 * `repeat` is set). Walking-type clips (walk, run, walkDistracted, chaseBall, holdHands, carry,
 * climbSteps, mop) move the legs with the gait phase while the actor moves and stand still otherwise.
 */
import * as THREE from 'three';
import type { HumanClip } from '../../core/types';
import type { Dims } from './body';
import type { Pose } from './rig';

export type Flags = Record<string, boolean | number | string>;

export interface ClipCtx {
  /** Gait phase in cycles (continuous across speed changes). */
  phase: number;
  /** Current speed in m/s (move speed, or the clip's nominal speed when playing in place). */
  speed: number;
  /** The actor is travelling along a path. */
  moving: boolean;
  flags: Flags;
  holdR: boolean;
  holdL: boolean;
  /** 0..1 per person (phase offsets so crowds do not move in sync). */
  seed: number;
  d: Dims;
  /** Per-person scratch memory kept across frames (smoothed values). */
  mem: Record<string, number>;
  dt: number;
}

export interface ClipDef {
  /** Natural length in seconds (one-shots: the recommended dur; loops: one cycle). */
  dur: number;
  loop: boolean;
  /** One-shot that repeats when played without a duration (nod, headShake, kick...). */
  repeat?: boolean;
  /** Walking-type clip (legs follow the gait when moving). */
  gait?: 'walk' | 'run' | 'climb';
  /** Nominal speed (m/s) used for the gait when the clip plays in place. */
  nominal?: number;
  fill(p: Pose, t: number, c: ClipCtx): void;
}

/* ------------------------------------------------------------------ helpers */

const TAU = Math.PI * 2;
const PI = Math.PI;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Smooth 0..1 between a and b. */
const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Up-hold-down window: 0 before a, ramps to 1 by b, holds, ramps back to 0 from c to d. */
const win = (t: number, a: number, b: number, c: number, d: number) => ss(a, b, t) * (1 - ss(c, d, t));
const sin = Math.sin;
const cos = Math.cos;

/** Keyframe track: [[t, v], ...] with smooth interpolation, clamped at the ends. */
function track(keys: [number, number][], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return lerp(v0, v1, ss(t0, t1, t));
    }
  }
  return keys[keys.length - 1][1];
}

const fnum = (f: Flags, k: string, def: number) => (typeof f[k] === 'number' ? (f[k] as number) : def);
const isSeated = (c: ClipCtx) => !!c.flags.seated || !!c.flags.inBus;

/* -------------------------------------------------------------- face layer */

export type FaceKind = 'smile' | 'happy' | 'laugh' | 'surprised' | 'worried' | 'sleep' | 'talk' | 'pain' | 'calm';

export function face(p: Pose, f: FaceKind, t = 0) {
  switch (f) {
    case 'happy':
      p.show('eyes', 0).show('eyesHappy', 1).show('mouth', 0).show('mouthD', 0.85);
      p.off('browL', 0, 0.006, 0).off('browR', 0, 0.006, 0);
      break;
    case 'laugh':
      p.show('eyes', 0).show('eyesHappy', 1).show('mouth', 0).show('mouthD', 0.9 + 0.12 * sin(t * 22));
      p.off('browL', 0, 0.007, 0).off('browR', 0, 0.007, 0);
      break;
    case 'surprised':
      p.show('mouth', 0).show('mouthO', 1.1);
      p.off('browL', 0, 0.012, 0).off('browR', 0, 0.012, 0);
      break;
    case 'worried':
      p.show('mouth', 0).show('mouthO', 0.55);
      p.rot('browL', 0, 0, -0.32).rot('browR', 0, 0, 0.32).off('browL', 0, 0.004, 0).off('browR', 0, 0.004, 0);
      break;
    case 'pain':
      p.show('eyes', 0).show('eyesHappy', 0).show('eyesSleep', 1).show('mouth', 0).show('mouthO', 0.7);
      p.rot('browL', 0, 0, -0.38).rot('browR', 0, 0, 0.38);
      break;
    case 'sleep':
      p.show('eyes', 0).show('eyesSleep', 1).show('mouth', 0).show('mouthO', 0.45);
      p.rot('browL', 0, 0, -0.12).rot('browR', 0, 0, 0.12).off('browL', 0, -0.003, 0).off('browR', 0, -0.003, 0);
      break;
    case 'talk': {
      const m = 0.5 + 0.5 * Math.abs(sin(t * 9.5) * sin(t * 4.1 + 1));
      p.show('mouth', m < 0.55 ? 1 : 0).show('mouthD', m > 0.55 ? m * 0.75 : 0);
      p.off('browL', 0, 0.003 * sin(t * 3), 0).off('browR', 0, 0.003 * sin(t * 3), 0);
      break;
    }
    case 'calm':
      p.off('browL', 0, -0.002, 0).off('browR', 0, -0.002, 0);
      break;
    default:
      break;
  }
}

/* -------------------------------------------------------------- body layers */

/** Relaxed arms (slightly out from the body, soft elbows). */
function armsRest(p: Pose, c: ClipCtx, k = 1) {
  const out = c.d.adult ? 0.07 : 0.11;
  p.rot('uaL', 0.03 * k, 0, out * k).rot('uaR', 0.03 * k, 0, -out * k);
  p.rot('faL', -0.14 * k).rot('faR', -0.14 * k);
  p.rot('handL', 0, -0.15 * k, 0).rot('handR', 0, 0.15 * k, 0);
}

/** Breathing and a gentle idle sway. */
function breathe(p: Pose, c: ClipCtx, t: number, k = 1) {
  const ph = t + c.seed * 10;
  const b = sin(ph * 1.9) * k;
  p.rot('spine', -0.012 * b).rot('neck', 0.01 * b);
  p.rot('uaL', 0, 0, 0.012 * b).rot('uaR', 0, 0, -0.012 * b);
  p.rot('head', 0.02 * sin(ph * 0.37), 0.06 * sin(ph * 0.23) * k, 0.02 * sin(ph * 0.31) * k);
}

/** Standing legs with a slow weight shift. */
function legsStand(p: Pose, c: ClipCtx, t: number, k = 1) {
  const w = sin((t + c.seed * 7) * 0.55) * k;
  p.off('hips', 0.008 * w, 0, 0).rot('hips', 0, 0, 0.02 * w).rot('spine', 0, 0, -0.025 * w);
  p.rot('thL', 0, 0, -0.02 * w + 0.03).rot('thR', 0, 0, -0.02 * w - 0.03);
  p.rot('ftL', 0, 0.1, -0.03).rot('ftR', 0, -0.1, 0.03);
}

/**
 * Pose both legs with the given thigh angle (forward from vertical, radians) and knee bend, and drop
 * the hips so the feet stay flat on the floor under the original spot.
 */
function legsFold(p: Pose, c: ClipCtx, thigh: number, knee: number, spread = 0.12) {
  const d = c.d;
  const Lt = d.hipY - d.kneeY;
  const Ls = d.kneeY - d.ankleY;
  const abs = thigh - knee;
  const ky = -Lt * cos(thigh);
  const kz = Lt * sin(thigh);
  const ay = ky - Ls * cos(abs);
  const az = kz + Ls * sin(abs);
  const hipNew = d.ankleY - ay;
  p.off('hips', 0, hipNew - d.hipY, -az * 0.9);
  for (const [th, sh, ft, s] of [['thL', 'shL', 'ftL', 1], ['thR', 'shR', 'ftR', -1]] as const) {
    p.rot(th, -thigh, 0, s * spread).rot(sh, knee).rot(ft, thigh - knee);
  }
  return { hipDrop: hipNew - d.hipY, back: -az };
}

/** Sitting on a seat whose surface is `seatH` above the actor's position (hips over the position). */
function sitBase(p: Pose, c: ClipCtx, t: number, seatH?: number) {
  const d = c.d;
  const natural = d.kneeY - d.pelvisBottom;
  const h = seatH ?? fnum(c.flags, 'seatH', c.flags.inBus ? (d.adult ? 0.45 : 0.42) : natural);
  const hipJ = h + d.pelvisBottom;
  p.off('hips', 0, hipJ - d.hipY, 0);
  // knee height = hip joint height (thighs level); the shin hangs or reaches forward to the floor
  const Ls = d.kneeY - d.ankleY;
  const reach = clamp((hipJ - d.ankleY) / Ls, -1, 1);
  const phi = hipJ >= d.kneeY ? 0 : Math.acos(reach);
  const dangle = hipJ > d.kneeY + 0.03 ? 1 : 0;
  const swingL = dangle * 0.18 * sin(t * 2.6 + c.seed * 5);
  const swingR = dangle * 0.18 * sin(t * 2.6 + c.seed * 5 + 2.2);
  p.rot('thL', -PI / 2, 0, 0.1).rot('thR', -PI / 2, 0, -0.1);
  p.rot('shL', PI / 2 - phi + swingL).rot('shR', PI / 2 - phi + swingR);
  p.rot('ftL', phi - swingL, 0.08).rot('ftR', phi - swingR, -0.08);
  p.rot('spine', 0.04);
  // hands resting on the thighs
  p.rot('uaL', -0.42, 0, 0.12).rot('uaR', -0.42, 0, -0.12).rot('faL', -0.55).rot('faR', -0.55);
  p.rot('handL', 0.3, -0.3).rot('handR', 0.3, 0.3);
  if (c.flags.inBus) {
    // gentle bus sway
    p.rot('spine', 0.015 * sin(t * 1.3), 0, 0.03 * sin(t * 0.9 + c.seed * 3)).rot('head', 0, 0, -0.02 * sin(t * 0.9 + c.seed * 3));
  }
}

/**
 * Up on his knees on a seat cushion `seatH` above the actor's position (default bus seat): thighs near upright,
 * knees on the front half of the cushion, shins lying back along it, toes pointing back. Arms are left as the
 * seated rest (call undoArms after, like sitBase).
 */
function kneelOnSeat(p: Pose, c: ClipCtx) {
  const d = c.d;
  const top = fnum(c.flags, 'seatH', d.adult ? 0.45 : 0.42);
  const Lt = d.hipY - d.kneeY;
  const th = 0.28; // thigh forward of vertical
  const kneeR = d.ankleY * 0.3; // knee joint above the cushion it rests on (the shin sinks a little into the padding)
  const hipJ = top + kneeR + Lt * cos(th);
  // hips a little forward of the seat spot, so the knees sit near the front edge and the shins fit the cushion
  p.off('hips', 0, hipJ - d.hipY, 0.1);
  const knee = th + PI / 2 - 0.08; // shin points back, nearly level (lying on the cushion)
  p.rot('thL', -th, 0, 0.08).rot('thR', -th, 0, -0.08);
  p.rot('shL', knee).rot('shR', knee);
  p.rot('ftL', PI - (knee - th), 0.05).rot('ftR', PI - (knee - th), -0.05);
  // hands resting on the thighs (the same rest pose as sitBase, so undoArms clears it)
  p.rot('uaL', -0.42, 0, 0.12).rot('uaR', -0.42, 0, -0.12).rot('faL', -0.55).rot('faR', -0.55);
  p.rot('handL', 0.3, -0.3).rot('handR', 0.3, 0.3);
}

/** Walking / running legs and arm swing. ph in cycles. */
function gait(p: Pose, c: ClipCtx, ph: number, kind: 'walk' | 'run' | 'climb', armK = 1) {
  const w = ph * TAU;
  const sw = sin(w);
  const cw = cos(w);
  const adult = c.d.adult;
  if (kind === 'run') {
    const A = 0.72;
    p.rot('thL', -A * sw - 0.25).rot('thR', A * sw - 0.25);
    p.rot('shL', 0.35 + 1.2 * Math.max(0, cw) ** 1.2 + 0.25 * Math.max(0, -sw)).rot('shR', 0.35 + 1.2 * Math.max(0, -cw) ** 1.2 + 0.25 * Math.max(0, sw));
    p.rot('ftL', 0.25 * sw).rot('ftR', -0.25 * sw);
    p.off('hips', 0, 0.045 * Math.abs(cw) - 0.04, 0);
    p.rot('hips', 0, 0.12 * sw, 0).rot('spine', 0.2, -0.2 * sw, 0).rot('head', -0.12, 0.1 * sw, 0);
    const a = 0.75 * armK;
    p.rot('uaL', a * sw, 0, 0.18).rot('uaR', -a * sw, 0, -0.18);
    p.rot('faL', -1.45).rot('faR', -1.45);
    p.rot('handL', 0, -0.3).rot('handR', 0, 0.3);
    return;
  }
  if (kind === 'climb') {
    // high steps (one step per half cycle)
    const lift = (x: number) => Math.max(0, x);
    p.rot('thL', -0.15 - 0.85 * lift(sw)).rot('thR', -0.15 - 0.85 * lift(-sw));
    p.rot('shL', 0.25 + 1.1 * lift(sw)).rot('shR', 0.25 + 1.1 * lift(-sw));
    p.rot('ftL', -0.15 * lift(sw)).rot('ftR', -0.15 * lift(-sw));
    p.off('hips', 0, -0.03 - 0.02 * Math.abs(sw), -0.03);
    p.rot('spine', 0.22, 0.08 * sw, 0).rot('head', -0.15);
    p.rot('uaL', 0.2 * sw * armK, 0, 0.1).rot('uaR', -0.6, 0, -0.12).rot('faL', -0.4).rot('faR', -0.6);
    return;
  }
  const A = adult ? 0.4 : 0.46;
  p.rot('thL', -A * sw).rot('thR', A * sw);
  p.rot('shL', 0.08 + 0.85 * Math.max(0, cw) ** 1.5).rot('shR', 0.08 + 0.85 * Math.max(0, -cw) ** 1.5);
  p.rot('ftL', 0.22 * sw - 0.1 * Math.max(0, cw)).rot('ftR', -0.22 * sw - 0.1 * Math.max(0, -cw));
  // bouncy, happy walk: body highest when the legs pass each other
  p.off('hips', 0, (adult ? 0.014 : 0.02) * cos(2 * w) - 0.012, 0);
  p.rot('hips', 0, 0.08 * sw, 0.03 * cw).rot('spine', 0.04, -0.12 * sw, -0.025 * cw).rot('head', 0, 0.05 * sw, 0.02 * cw);
  const a = (adult ? 0.32 : 0.42) * armK;
  p.rot('uaL', a * sw, 0, 0.09).rot('uaR', -a * sw, 0, -0.09);
  p.rot('faL', -0.25 - 0.2 * Math.max(0, -sw) * armK).rot('faR', -0.25 - 0.2 * Math.max(0, sw) * armK);
}

/** Lower body for upper-body clips: seated, walking (while moving) or standing. */
function lower(p: Pose, c: ClipCtx, t: number, armsToo = true) {
  if (isSeated(c)) {
    sitBase(p, c, t);
    if (!armsToo) undoArms(p, c);
    return;
  }
  if (c.moving) {
    gait(p, c, c.phase, c.speed > 2.2 ? 'run' : 'walk', armsToo ? 1 : 0);
    return;
  }
  legsStand(p, c, t);
  if (armsToo) armsRest(p, c);
}

/** Removes the seated hand-on-thigh rest so a clip can pose the arms from neutral. */
function undoArms(p: Pose, c: ClipCtx) {
  p.rot('uaL', 0.42, 0, -0.12).rot('uaR', 0.42, 0, 0.12).rot('faL', 0.55).rot('faR', 0.55);
  p.rot('handL', -0.3, 0.3).rot('handR', -0.3, -0.3);
}

/** Bring a hand to a target using shoulder/elbow angles (direct posing helper). */
function arm(p: Pose, side: 'L' | 'R', x: number, y: number, z: number, elbow: number, hand: [number, number, number] = [0, 0, 0]) {
  const s = side === 'L' ? 1 : -1;
  p.rot(`ua${side}`, x, s * y, s * z).rot(`fa${side}`, elbow).rot(`hand${side}`, hand[0], s * hand[1], s * hand[2]);
}

const _v = new THREE.Vector3();
const _e = new THREE.Euler();
/** Rotate the whole body about a pivot point (model space), plus a translation. */
function pivot(p: Pose, P: [number, number, number], rx: number, ry: number, rz: number, tr: [number, number, number] = [0, 0, 0]) {
  _v.set(P[0], P[1], P[2]).applyEuler(_e.set(rx, ry, rz));
  p.rot('root', rx, ry, rz).off('root', P[0] - _v.x + tr[0], P[1] - _v.y + tr[1], P[2] - _v.z + tr[2]);
}

/* -------------------------------------------------------------- flags layer */

/** Flag-driven extras shared by every clip. */
export function applyFlags(p: Pose, c: ClipCtx, clip: HumanClip, t: number) {
  const f = c.flags;
  if (f.seatbelt) p.show('belt', 1).show('lapBelt', 1);
  if (f.collarUp) p.show('collar', 1);
  if (f.scrape || f.bandage) p.show('pantShinR', 0).show('skinShinR', 1);
  if (f.scrape && !f.bandage) p.show('scrape', 1);
  if (f.bandage) p.show('bandage', 1);
  if (f.nosebleed) p.show('nosebleed', 1);
  if (f.goggles) p.show('goggles', 1);
  if (f.gloves) p.show('glovesL', 1).show('glovesR', 1);
  if (f.backpack === false) p.show('pack', 0).show('straps', 0);
  if (f.lookDown) p.rot('head', 0.35).rot('neck', 0.1);
  if (f.umbrellaOpen && !ARMS_BUSY.has(clip)) {
    // hold the open umbrella up in front of the right shoulder (socket stays upright)
    const k = 1;
    const i = 16 * 3; // reset right arm channels first
    void i;
    resetArm(p, 'R');
    arm(p, 'R', -0.42 * k, 0.1, 0.12, -1.2, [1.55, 0, 0]);
  }
  if (f.lapBag && isSeated(c) && !ARMS_BUSY.has(clip)) {
    // seated with the held backpack (hold 'backpack') lying flat across his lap: the right hand on its top handle at
    // the right thigh (the bag points across to the left, back down, pocket up), the left hand resting on top of it
    resetArm(p, 'R');
    arm(p, 'R', -0.42, 0, 0.12, -0.75, [-0.4, 0, -PI / 2]);
    resetArm(p, 'L');
    arm(p, 'L', -0.42, 0, 0.12, -0.9, [0.3, -0.3, 0]);
  }
  if (typeof f.face === 'string') {
    // explicit face overrides the clip's face
    for (const b of ['eyes', 'eyesHappy', 'eyesSleep', 'mouth', 'mouthD', 'mouthO'] as const) p.show(b, b === 'eyes' || b === 'mouth' ? 1 : 0);
    face(p, f.face as FaceKind, t);
  }
}

import { BI } from './body';
function resetArm(p: Pose, side: 'L' | 'R') {
  for (const b of side === 'L' ? (['uaL', 'faL', 'handL'] as const) : (['uaR', 'faR', 'handR'] as const)) {
    const i = BI[b] * 3;
    p.r[i] = 0;
    p.r[i + 1] = 0;
    p.r[i + 2] = 0;
  }
}

/** Clips whose right arm does its own thing (the umbrella pose does not override them). */
const ARMS_BUSY = new Set<HumanClip>(['buckle', 'hangGoal', 'swing', 'forwardRoll', 'faint', 'lieDown', 'slip', 'trip', 'drive', 'mop', 'cut', 'washHands', 'stretch', 'cheer', 'clap', 'raiseHand', 'wave', 'point', 'pushButton', 'thumbsUp', 'drink', 'eat', 'cough', 'coverNose', 'noseTiltBack', 'noseLeanForward', 'wipeForehead', 'holdHead', 'carry', 'slide', 'slideRail', 'climbSteps', 'kick', 'jump']);

/* -------------------------------------------------------------------- clips */

const walkish = (kind: 'walk' | 'run', nominal: number, upper?: (p: Pose, t: number, c: ClipCtx) => void, armK = 1): ClipDef => ({
  dur: 1,
  loop: true,
  gait: kind,
  nominal,
  fill(p, t, c) {
    if (c.moving || kind === 'run' || !upper) gait(p, c, c.phase, kind === 'run' || c.speed > 2.2 ? 'run' : 'walk', armK);
    else {
      legsStand(p, c, t);
      armsRest(p, c);
    }
    breathe(p, c, t, 0.3);
    upper?.(p, t, c);
  },
});

export const CLIPS: Record<HumanClip, ClipDef> = {
  idle: {
    dur: 4,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      breathe(p, c, t);
      // an occasional look around
      const g = sin((t + c.seed * 20) * 0.21);
      p.rot('head', 0, 0.25 * ss(0.7, 0.95, g) - 0.25 * ss(0.7, 0.95, -g), 0);
    },
  },

  walk: {
    dur: 1,
    loop: true,
    gait: 'walk',
    nominal: 1.3,
    fill(p, t, c) {
      if (isSeated(c)) return CLIPS.idle.fill(p, t, c);
      gait(p, c, c.phase, c.speed > 2.2 ? 'run' : 'walk', c.holdR ? 0.5 : 1);
      breathe(p, c, t, 0.3);
    },
  },

  run: {
    dur: 0.6,
    loop: true,
    gait: 'run',
    nominal: 3.2,
    fill(p, t, c) {
      gait(p, c, c.phase, 'run');
      face(p, 'happy');
    },
  },

  walkDistracted: {
    dur: 1,
    loop: true,
    gait: 'walk',
    nominal: 1.0,
    fill(p, t, c) {
      if (c.moving) gait(p, c, c.phase, 'walk', 0.25);
      else legsStand(p, c, t);
      // head down, hands together in front, absorbed
      p.rot('neck', 0.25).rot('head', 0.55, 0.05 * sin(t * 0.8), 0).rot('spine', 0.08);
      arm(p, 'L', -0.45, 0.15, 0.12, -1.25, [0, 0.4, 0]);
      arm(p, 'R', -0.45, 0.15, 0.12, -1.25, [0, 0.4, 0]);
    },
  },

  stopStepBack: {
    dur: 1.2,
    loop: false,
    fill(p, t, c) {
      // sudden stop, lean back, right foot steps back, hands come up
      const s = ss(0, 0.18, t);
      const back = ss(0.2, 0.6, t);
      p.rot('thR', 0.38 * back).rot('shR', 0.25 * back * (1 - ss(0.6, 0.9, t)) + 0.05).rot('ftR', -0.3 * back);
      p.rot('thL', -0.12 * back).rot('shL', 0.15 * back).rot('ftL', 0.0);
      p.off('hips', 0, -0.03 * back, -0.11 * back);
      p.rot('spine', -0.22 * s + 0.08 * back).rot('head', -0.1 * s);
      arm(p, 'L', -0.7 * s, 0, 0.35 * s, -1.0 * s, [0.6 * s, 0, 0]);
      arm(p, 'R', -0.7 * s, 0, 0.35 * s, -1.0 * s, [0.6 * s, 0, 0]);
      armsRest(p, c, 1 - s);
      face(p, 'surprised');
    },
  },

  lookUpSurprised: {
    dur: 1.6,
    loop: false,
    fill(p, t, c) {
      lower(p, c, t);
      const k = ss(0, 0.35, t);
      p.rot('head', -0.55 * k, 0, 0).rot('neck', -0.2 * k).rot('spine', -0.1 * k);
      p.rot('uaL', -0.25 * k, 0, 0.25 * k).rot('uaR', -0.25 * k, 0, -0.25 * k).rot('faL', -0.6 * k).rot('faR', -0.6 * k);
      face(p, k > 0.3 ? 'surprised' : 'smile');
    },
  },

  lookLRL: {
    dur: 3,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t);
      breathe(p, c, t, 0.4);
      // left (his left = +Y) first, then right, then left again (traffic on the right comes from the left)
      const y = track(
        [
          [0, 0],
          [0.45, 1.0],
          [0.95, 1.0],
          [1.4, -1.0],
          [1.95, -1.0],
          [2.35, 1.0],
          [2.75, 1.0],
          [3.0, 0.0],
        ],
        t,
      );
      p.rot('head', 0.02, y * 0.85, 0).rot('neck', 0, y * 0.25, 0).rot('spine', 0, y * 0.1, 0);
    },
  },

  climbSteps: {
    dur: 1,
    loop: true,
    gait: 'climb',
    nominal: 0.7,
    fill(p, t, c) {
      gait(p, c, c.moving ? c.phase : t * 0.9, 'climb');
    },
  },

  sit: {
    dur: 4,
    loop: true,
    fill(p, t, c) {
      sitBase(p, c, t);
      breathe(p, c, t, 0.6);
    },
  },

  sitDesk: {
    dur: 4,
    loop: true,
    fill(p, t, c) {
      sitBase(p, c, t);
      undoArms(p, c);
      breathe(p, c, t, 0.4);
      // forearms on the desk, right hand writing small loops
      p.rot('spine', 0.12).rot('head', 0.28 + 0.05 * sin(t * 0.5 + c.seed * 9));
      arm(p, 'L', -0.55, -0.15, 0.08, -1.15, [0.1, 0.3, 0]);
      arm(p, 'R', -0.55 + 0.04 * sin(t * 7), -0.15, 0.08, -1.1 + 0.05 * sin(t * 5.3), [0.1, 0.3, 0]);
    },
  },

  leanOut: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      // seated (bus seat), leaning toward the window on his right, right arm out of the window;
      // with flag kneelSeat he is up on his knees on the cushion (seatH = the cushion top)
      if (c.flags.kneelSeat) kneelOnSeat(p, c);
      else sitBase(p, c, t, isSeated(c) || c.flags.seatH !== undefined ? undefined : c.d.adult ? 0.45 : 0.42);
      undoArms(p, c);
      armsRest(p, c);
      const kneel = !!c.flags.kneelSeat;
      // kneeling: leans further, the arm goes up and out through the open top half of the window (above the sash bar)
      p.rot('spine', 0.02, -0.15, kneel ? -0.3 : -0.22).rot('head', 0, -0.35, kneel ? 0.2 : 0.12);
      resetArm(p, 'R');
      arm(p, 'R', -0.15, 0, kneel ? 2.15 : 1.45, -0.25 + 0.2 * sin(t * 3), [0, 0, 0.3 * sin(t * 3)]);
      face(p, 'happy');
    },
  },

  buckle: {
    dur: 2.4,
    loop: false,
    fill(p, t, c) {
      sitBase(p, c, t, isSeated(c) || c.flags.seatH !== undefined ? undefined : c.d.adult ? 0.45 : 0.42);
      undoArms(p, c);
      // right hand: reach up to the right shoulder anchor, pull the belt across to the left hip, click
      const reach = ss(0, 0.45, t);
      const pull = ss(0.5, 1.5, t);
      const back = ss(1.95, 2.4, t);
      const ux = lerp(lerp(0, -2.3, reach), -0.85, pull);
      const uz = lerp(lerp(0, -0.25, reach), 0.55, pull);
      const el = lerp(lerp(-0.2, -1.6, reach), -1.45, pull);
      arm(p, 'R', lerp(ux, -0.42, back), 0.0, lerp(uz, 0.12, back), lerp(el, -0.55, back), [lerp(0.4 * pull, 0.3, back), 0, 0]);
      // left hand holds the buckle at the hip
      const lh = win(t, 0.8, 1.3, 1.9, 2.3);
      arm(p, 'L', lerp(-0.42, -0.35, lh), 0, lerp(0.12, 0.05, lh), lerp(-0.55, -1.1, lh), [0.3, 0.3, 0]);
      p.rot('head', 0.25 * pull - 0.1 * reach * (1 - pull), -0.3 * reach * (1 - pull) + 0.2 * pull * (1 - back), 0);
      p.show('belt', Math.max(1e-3, pull)).show('lapBelt', ss(1.3, 1.6, t));
      if (t > 1.6) face(p, 'happy');
    },
  },

  holdHands: {
    dur: 1,
    loop: true,
    gait: 'walk',
    nominal: 1.3,
    fill(p, t, c) {
      if (c.moving) gait(p, c, c.phase, 'walk', 0.5);
      else {
        legsStand(p, c, t);
        armsRest(p, c);
      }
      breathe(p, c, t, 0.3);
      // the holding arm reaches out and up toward the partner (default his left hand)
      const side = c.flags.holdHand === 'right' ? 'R' : 'L';
      resetArm(p, side);
      const k = c.d.adult ? 0.5 : 1;
      arm(p, side, -0.12, 0, 0.42 * k + 0.12, -0.25, [0, 0, -0.2]);
      face(p, 'happy');
    },
  },

  chaseBall: {
    dur: 0.6,
    loop: true,
    gait: 'run',
    nominal: 2.6,
    fill(p, t, c) {
      gait(p, c, c.phase, 'run', 1.1);
      p.rot('spine', 0.12).rot('head', 0.22);
      face(p, 'happy');
    },
  },

  kick: {
    dur: 0.9,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      legsStand(p, c, t, 0.3);
      // wind up the right leg, swing it through, follow through and recover
      const th = track([[0, 0], [0.3, 0.6], [0.5, -1.15], [0.7, -0.6], [0.9, 0]], t);
      const sh = track([[0, 0.05], [0.3, 1.3], [0.48, 0.15], [0.7, 0.3], [0.9, 0.05]], t);
      p.rot('thR', th).rot('shR', sh).rot('ftR', -0.3 * ss(0.3, 0.5, t) * (1 - ss(0.7, 0.9, t)));
      p.rot('thL', -0.1).rot('shL', 0.25).off('hips', 0, -0.02, 0);
      p.rot('spine', -0.1 * ss(0.3, 0.5, t), 0.2 * sin(t * 7), 0);
      arm(p, 'L', -0.4, 0, 0.6, -0.4);
      arm(p, 'R', 0.3, 0, 0.5, -0.4);
      face(p, 'happy');
    },
  },

  hangGoal: {
    dur: 1.7,
    loop: true,
    fill(p, t, c) {
      const d = c.d;
      // arms straight up gripping the bar at height barY (default 2.0 m above the actor's position)
      const barY = fnum(c.flags, 'barY', 2.0);
      const reach = d.shoulderY + d.ua + d.fa + d.hand[1] * 1.7;
      const k = ss(0, 0.35, t);
      arm(p, 'L', -2.95 * k, 0, 0.12 * k, -0.05, [0, 0, 0]);
      arm(p, 'R', -2.95 * k, 0, -0.04 * k, -0.05, [0, 0, 0]);
      const lift = (barY - reach) * k;
      const sw = 0.28 * sin(t * TAU / 1.7) * k;
      pivot(p, [0, reach, 0], -sw, 0, 0, [0, lift, 0]);
      // legs kick and bend
      p.rot('thL', -0.35 - 0.3 * sin(t * 3.7)).rot('thR', -0.35 + 0.3 * sin(t * 3.7)).rot('shL', 0.6).rot('shR', 0.6);
      p.rot('head', -0.15);
      face(p, 'laugh', t);
    },
  },

  slideRail: {
    dur: 2,
    loop: true,
    fill(p, t, c) {
      const d = c.d;
      // sitting on the handrail (actor position = rail top under the hips), arms out for balance
      p.off('hips', 0, d.pelvisBottom - d.hipY + 0.02, 0);
      p.rot('thL', -1.25, 0, 0.25).rot('thR', -1.25, 0, -0.25).rot('shL', 1.35 + 0.15 * sin(t * 2)).rot('shR', 1.35 - 0.15 * sin(t * 2));
      p.rot('spine', -0.12, 0, 0.06 * sin(t * 2.3)).rot('head', 0.1);
      arm(p, 'L', -0.2, 0, 1.2 + 0.15 * sin(t * 2.3), -0.3);
      arm(p, 'R', -0.2, 0, 1.2 - 0.15 * sin(t * 2.3), -0.3);
      const slope = fnum(c.flags, 'slope', 0);
      if (slope) pivot(p, [0, 0, 0], slope, 0, 0);
      face(p, 'laugh', t);
    },
  },

  slip: {
    dur: 1.4,
    loop: false,
    fill(p, t, c) {
      const d = c.d;
      // feet shoot forward on the wet floor, he tips back and is caught, held leaning back
      const k = ss(0, 0.45, t);
      const settle = ss(0.6, 1.4, t);
      const tilt = -(0.6 * k - 0.15 * settle);
      pivot(p, [0, d.ankleY, 0], tilt, 0, 0);
      p.rot('thL', -0.75 * k + 0.25 * settle).rot('shL', 0.2 * k).rot('ftL', 0.3 * k);
      p.rot('thR', -0.2 * k).rot('shR', 0.5 * k).rot('ftR', -0.2 * k);
      p.rot('spine', 0.25 * k).rot('head', 0.35 * k);
      const fl = sin(t * 14) * (1 - ss(0.4, 0.8, t));
      arm(p, 'L', -1.4 * k + 0.3 * fl, 0, 0.9 * k, -0.6 * k);
      arm(p, 'R', -1.4 * k - 0.3 * fl, 0, 0.9 * k, -0.6 * k);
      face(p, 'surprised');
    },
  },

  trip: {
    dur: 1.7,
    loop: false,
    fill(p, t, c) {
      const d = c.d;
      // stumble forward, then go down softly onto the right knee, left foot planted forward
      const st = win(t, 0, 0.3, 0.45, 0.8);
      const down = ss(0.35, 1.0, t);
      p.rot('spine', 0.35 * st + 0.25 * down).rot('head', 0.2 * down);
      const Lt = d.hipY - d.kneeY;
      const kneeH = d.shinR * 0.9;
      p.off('hips', 0, (kneeH + Lt - d.hipY) * down, 0.04 * st);
      p.rot('thR', 0.05 * down).rot('shR', (PI / 2) * down).rot('ftR', 0.6 * down);
      p.rot('thL', -0.4 * st - 1.45 * down).rot('shL', 1.45 * down).rot('ftL', 0);
      // hands come forward to break the fall, then rest on the left knee
      arm(p, 'L', -0.9 * st - 0.75 * down, 0, 0.2, -0.3 - 0.4 * down, [0.4, 0, 0]);
      arm(p, 'R', -0.9 * st - 0.55 * down, 0, 0.15, -0.4 - 0.5 * down, [0.4, 0, 0]);
      face(p, down > 0.6 ? 'pain' : 'surprised');
    },
  },

  noseTiltBack: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      breathe(p, c, t, 0.4);
      // the WRONG way: head tipped back, pinching the nose
      p.rot('head', -0.55, 0, 0).rot('neck', -0.25).rot('spine', -0.06);
      resetArm(p, 'R');
      arm(p, 'R', -1.05, 0.1, 0.42, -2.05, [0.3, 0, 0]);
      p.show('nosebleed', 1);
      face(p, 'worried');
    },
  },

  noseLeanForward: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      breathe(p, c, t, 0.4);
      // the RIGHT way: leaning forward, pinching the soft part of the nose
      // seated at a desk: a slight lean (face still readable, head well clear of the desk top)
      if (isSeated(c)) p.rot('spine', 0.28).rot('neck', 0.1).rot('head', 0.18);
      else p.rot('spine', 0.3).rot('neck', 0.15).rot('head', 0.35);
      resetArm(p, 'R');
      arm(p, 'R', -1.25, 0.05, 0.4, -1.75, [0.2, 0, 0]);
      if (!isSeated(c)) {
        resetArm(p, 'L');
        arm(p, 'L', -0.35, 0, 0.12, -0.25);
      }
      p.show('nosebleed', 1);
      face(p, 'calm');
    },
  },

  cough: {
    dur: 1.6,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      // fist to the mouth, two coughs per cycle
      const u = t % 1.6;
      const jerk = Math.exp(-((u - 0.25) ** 2) / 0.004) + 0.8 * Math.exp(-((u - 0.75) ** 2) / 0.004);
      p.rot('spine', 0.15 * jerk + 0.05).rot('head', 0.2 * jerk + 0.1).rot('neck', 0.08 * jerk);
      resetArm(p, 'R');
      arm(p, 'R', -0.95, 0.1, 0.45, -2.2, [0.2, 0, 0]);
      face(p, jerk > 0.3 ? 'surprised' : 'worried');
      p.show('eyes', jerk > 0.3 ? 0 : 1).show('eyesSleep', jerk > 0.3 ? 1 : 0);
    },
  },

  laugh: {
    dur: 1.2,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      const b = sin(t * 18) * 0.5 + 0.5;
      p.rot('spine', -0.08 + 0.04 * b).rot('head', -0.18 + 0.06 * b, 0.08 * sin(t * 1.3), 0);
      p.off('hips', 0, 0.006 * b, 0);
      if (!isSeated(c)) {
        resetArm(p, 'L');
        arm(p, 'L', -0.35, 0, 0.2, -1.4, [0, 0.3, 0]);
      }
      face(p, 'laugh', t);
    },
  },

  coverNose: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      breathe(p, c, t, 0.4);
      // collar pulled up over the nose, right hand holding it there
      p.show('collar', 1);
      resetArm(p, 'R');
      arm(p, 'R', -1.0, 0.1, 0.42, -2.1, [0.2, 0, 0]);
      p.rot('head', 0.12);
      face(p, 'calm');
    },
  },

  faint: {
    dur: 3.6,
    loop: false,
    fill(p, t, c) {
      // sway, eyes droop, sink down to sit, then tip over onto his side (ends in the lieDown pose)
      const sway = ss(0, 0.4, t) * (1 - ss(1.2, 1.6, t));
      const sit = ss(1.1, 2.3, t);
      const tip = ss(2.3, 3.4, t);
      const sx = 0.09 * sin(t * 3.1) * sway;
      const sz = 0.07 * sin(t * 2.3 + 1) * sway;
      if (tip < 1) {
        const q = new PoseMix(p);
        q.a(() => {
          legsStand(p, c, t, 0);
          armsRest(p, c);
          pivot(p, [0, 0, 0], sx, 0, sz);
          p.rot('head', 0.15 + 0.2 * sway, 0, 0.1 * sin(t * 2));
        }, (1 - sit) * (1 - tip));
        q.a(() => sitFloor(p, c, t), sit * (1 - tip));
        q.a(() => lying(p, c, t), tip);
        q.done();
      } else lying(p, c, t);
      const droop = ss(0.3, 1.2, t);
      p.show('eyes', 1 - droop).show('eyesSleep', droop).show('mouth', 0).show('mouthO', 0.4);
    },
  },

  lieDown: {
    dur: 4,
    loop: true,
    fill(p, t, c) {
      if (c.flags.onBack) lyingBack(p, c, t);
      else lying(p, c, t);
      if (c.flags.awake) face(p, 'calm');
      else p.show('eyes', 0).show('eyesSleep', 1);
    },
  },

  drink: {
    dur: 2.6,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t);
      if (isSeated(c)) undoArms(p, c);
      else resetArm(p, 'R');
      const up = win(t, 0.2, 0.75, 1.95, 2.5);
      arm(p, 'R', lerp(-0.3, -1.1, up), 0.0, lerp(0.1, 0.35, up), lerp(-0.6, -2.05, up), [lerp(0.6, -0.15, up), 0, 0]);
      p.rot('head', -0.4 * up).rot('neck', -0.1 * up);
      if (up > 0.7) p.show('eyes', 0).show('eyesSleep', 1);
    },
  },

  stretch: {
    dur: 3,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t, false);
      if (!isSeated(c)) armsRest(p, c, 1 - ss(0, 0.5, t));
      const up = win(t, 0.1, 0.7, 2.3, 2.9);
      const side = sin(((t - 0.7) / 1.6) * TAU) * ss(0.7, 1.0, t) * (1 - ss(2.0, 2.3, t));
      arm(p, 'L', -2.9 * up, 0, 0.15 * up + 0.3 * side * up, -0.15);
      arm(p, 'R', -2.9 * up, 0, 0.15 * up - 0.3 * side * up, -0.15);
      p.rot('spine', -0.1 * up, 0, 0.18 * side).rot('head', -0.25 * up);
      p.off('hips', 0, 0.01 * up, 0);
      if (up > 0.6) face(p, 'sleep');
    },
  },

  forwardRoll: {
    dur: 1.8,
    loop: false,
    fill(p, t, c) {
      const d = c.d;
      // crouch, tuck and roll forward over the back (in place), stand up
      const crouch = win(t, 0, 0.35, 1.3, 1.75);
      const roll = ss(0.4, 1.25, t);
      legsFold(p, c, 1.75 * crouch, 2.3 * crouch, 0.15);
      p.rot('spine', 0.6 * crouch).rot('head', 0.6 * crouch).rot('neck', 0.2 * crouch);
      arm(p, 'L', -1.3 * crouch, 0, 0.1, -0.9 * crouch);
      arm(p, 'R', -1.3 * crouch, 0, -0.0, -0.9 * crouch);
      if (roll > 0 && roll < 1) {
        const cy = d.hipY * 0.45;
        pivot(p, [0, cy, 0.05], roll * TAU, 0, 0, [0, 0.05 * sin(roll * PI), 0.25 * sin(roll * PI)]);
      }
      if (t > 1.3) face(p, 'happy');
    },
  },

  raiseHand: {
    dur: 2,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      resetArm(p, 'R');
      const k = ss(0, 0.35, t);
      arm(p, 'R', -2.85 * k, 0, -0.12 * k + 0.05 * sin(t * 4) * k, -0.1, [0, 0, 0]);
      p.rot('spine', 0, 0, 0.06 * k).rot('head', -0.05);
      face(p, 'happy');
    },
  },

  cheer: {
    dur: 0.8,
    loop: true,
    fill(p, t, c) {
      if (isSeated(c)) sitBase(p, c, t);
      else legsStand(p, c, t, 0.2);
      if (isSeated(c)) undoArms(p, c);
      const b = Math.abs(sin(t * PI / 0.8 * 2));
      if (!isSeated(c)) p.off('hips', 0, 0.035 * b, 0).rot('shL', 0.15 * (1 - b)).rot('shR', 0.15 * (1 - b));
      arm(p, 'L', -2.6 - 0.25 * b, 0, 0.45, -0.25 - 0.3 * (1 - b));
      arm(p, 'R', -2.6 - 0.25 * b, 0, 0.45, -0.25 - 0.3 * (1 - b));
      p.rot('head', -0.15);
      face(p, 'laugh', t);
    },
  },

  clap: {
    dur: 0.4,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      if (isSeated(c)) undoArms(p, c);
      else resetArm(p, 'L'), resetArm(p, 'R');
      const o = 0.5 + 0.5 * sin(t * TAU * 2.6);
      arm(p, 'L', -1.05, -0.35 + 0.28 * o, 0.0, -1.0, [0, 0.6, 0.2]);
      arm(p, 'R', -1.05, -0.35 + 0.28 * o, 0.0, -1.0, [0, 0.6, 0.2]);
      face(p, 'happy');
    },
  },

  wave: {
    dur: 1,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      resetArm(p, 'R');
      const k = ss(0, 0.3, t);
      arm(p, 'R', -0.3 * k, 0, 1.75 * k, -0.9 * k + 0.0, [0, 0, 0.45 * sin(t * TAU * 1.6) * k]);
      p.rot('faR', 0, 0, 0).rot('uaR', 0, 0.35 * sin(t * TAU * 1.6) * k, 0);
      face(p, 'happy');
    },
  },

  point: {
    dur: 2,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      resetArm(p, 'R');
      const k = ss(0, 0.3, t);
      arm(p, 'R', -1.45 * k, 0, -0.08 * k, -0.08, [-0.0, 0, 0]);
      p.show('indexR', k > 0.5 ? 1 : 0);
      p.rot('head', 0, -0.1 * k, 0);
    },
  },

  talk: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      breathe(p, c, t, 0.6);
      // easy hand gestures and small nods
      const g = sin(t * 2.1 + c.seed * 5);
      const h = sin(t * 1.3 + c.seed * 3);
      if (!isSeated(c)) {
        resetArm(p, 'R');
        arm(p, 'R', -0.45 - 0.2 * g, 0, 0.15, -1.1 - 0.25 * g, [0, 0.8 + 0.2 * h, 0]);
        resetArm(p, 'L');
        arm(p, 'L', -0.15 - 0.12 * h, 0, 0.12, -0.5 - 0.3 * Math.max(0, h), [0, 0.4, 0]);
      }
      p.rot('head', 0.05 * sin(t * 4.3), 0.12 * h, 0.04 * g);
      face(p, 'talk', t);
    },
  },

  crouch: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      const k = ss(0, 0.35, t);
      legsFold(p, c, 1.75 * k, 2.35 * k, 0.2);
      p.rot('spine', 0.45 * k).rot('head', -0.15 * k).rot('neck', -0.1 * k);
      breathe(p, c, t, 0.4);
      // forearms resting on the knees
      arm(p, 'L', -0.95 * k, 0, 0.12, -0.6 * k, [0.3, 0.3, 0]);
      arm(p, 'R', -0.95 * k, 0, -0.0 + 0.12, -0.6 * k, [0.3, 0.3, 0]);
    },
  },

  jump: {
    dur: 0.9,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      // crouch, spring up with arms up, land softly
      const prep = win(t, 0, 0.18, 0.22, 0.3) + win(t, 0.68, 0.76, 0.82, 0.9) * 0.7;
      const air = clamp((t - 0.28) / 0.42, 0, 1);
      const h = air > 0 && air < 1 ? 4 * air * (1 - air) : 0;
      legsFold(p, c, 0.9 * prep, 1.5 * prep, 0.12);
      p.off('root', 0, 0.32 * h, 0);
      p.rot('thL', -0.25 * h).rot('thR', -0.25 * h).rot('shL', 0.5 * h).rot('shR', 0.5 * h).rot('ftL', 0.4 * h).rot('ftR', 0.4 * h);
      p.rot('spine', 0.25 * prep);
      arm(p, 'L', 0.5 * prep - 2.6 * h, 0, 0.4, -0.3);
      arm(p, 'R', 0.5 * prep - 2.6 * h, 0, 0.4, -0.3);
      face(p, 'laugh', t);
    },
  },

  wipeForehead: {
    dur: 2.2,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t);
      if (isSeated(c)) undoArms(p, c);
      else resetArm(p, 'R');
      const up = win(t, 0.1, 0.55, 1.6, 2.1);
      const swipe = ss(0.6, 1.4, t);
      arm(p, 'R', -2.15 * up, lerp(-0.3, 0.45, swipe) * up, lerp(0.55, -0.25, swipe) * up, -1.9 * up, [0, 0, 0]);
      p.rot('head', -0.12 * up);
      if (!isSeated(c)) armsRest(p, c, 1 - up);
      face(p, 'worried');
      p.show('mouthO', 0.35);
    },
  },

  holdHead: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      if (isSeated(c)) undoArms(p, c);
      else resetArm(p, 'L'), resetArm(p, 'R');
      const k = ss(0, 0.4, t);
      arm(p, 'L', -1.6 * k, 0, 1.05 * k, -2.25 * k);
      arm(p, 'R', -1.6 * k, 0, 1.05 * k, -2.25 * k);
      p.rot('head', 0.22 * k, 0, 0.06 * sin(t * 1.4)).rot('spine', 0.06 * k);
      face(p, 'pain');
    },
  },

  washHands: {
    dur: 1,
    loop: true,
    fill(p, t, c) {
      legsStand(p, c, t, 0.4);
      // hands together at the sink, rubbing
      const r = sin(t * TAU * 1.8);
      arm(p, 'L', -0.75, -0.25, 0.0, -0.75 + 0.1 * r, [0.3, 0.7, 0.3 * r]);
      arm(p, 'R', -0.75, -0.25, 0.0, -0.75 - 0.1 * r, [0.3, 0.7, -0.3 * r]);
      p.rot('spine', 0.15).rot('head', 0.4);
    },
  },

  eat: {
    dur: 3,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      if (isSeated(c)) undoArms(p, c);
      else resetArm(p, 'R');
      const u = t % 3;
      const up = win(u, 0.1, 0.55, 1.0, 1.5);
      arm(p, 'R', lerp(-0.55, -1.05, up), 0, lerp(0.15, 0.4, up), lerp(-1.2, -2.15, up), [0.4, 0, 0]);
      if (isSeated(c)) arm(p, 'L', -0.5, 0, 0.1, -1.1, [0.2, 0.3, 0]);
      const chew = u > 1.0 ? 0.5 + 0.5 * sin(t * 11) : 0;
      p.show('mouth', chew > 0.6 ? 0 : 1).show('mouthO', chew > 0.6 ? 0.5 : 0);
      p.rot('head', 0.08 - 0.05 * up);
    },
  },

  cut: {
    dur: 1,
    loop: true,
    fill(p, t, c) {
      lower(p, c, t);
      if (isSeated(c)) undoArms(p, c);
      else resetArm(p, 'L'), resetArm(p, 'R');
      // left hand holds the paper, right hand snips toward it
      const s = sin(t * TAU * 1.5);
      arm(p, 'L', -0.75, -0.2, 0.05, -1.1, [0.1, 0.5, 0]);
      arm(p, 'R', -0.8, -0.2 + 0.03 * s, 0.05, -1.1, [0.1, 0.3 + 0.1 * s, 0]);
      p.rot('head', 0.38).rot('spine', 0.08);
    },
  },

  pushButton: {
    dur: 1.5,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t);
      resetArm(p, 'R');
      const k = win(t, 0.1, 0.55, 1.0, 1.45);
      const press = win(t, 0.55, 0.65, 0.8, 0.9);
      // arm raised to shoulder height and nearly straight, so a boy's hand reaches a crossing button (~1 m up)
      arm(p, 'R', -1.95 * k, 0, 0.16 * k, -0.3 * k + 0.25 * press, [0, 0, 0]);
      p.show('indexR', k > 0.4 ? 1 : 0);
      p.rot('spine', 0.06 * press);
    },
  },

  mop: {
    dur: 2,
    loop: true,
    gait: 'walk',
    nominal: 0.6,
    fill(p, t, c) {
      if (c.moving) gait(p, c, c.phase, 'walk', 0);
      else legsStand(p, c, t, 0.4);
      // both hands on the mop handle low in front, sweeping side to side
      const s = sin(t * TAU / 2);
      p.rot('spine', 0.22, 0.25 * s, 0).rot('head', 0.35, -0.1 * s, 0).rot('hips', 0, 0.08 * s, 0);
      arm(p, 'R', -0.55, 0.0, 0.18 + 0.15 * s, -0.55, [0.55, 0, 0]);
      arm(p, 'L', -0.95, 0.0, 0.35 - 0.12 * s, -1.0, [0.3, 0.2, 0]);
      if (!c.moving) p.rot('thL', -0.15).rot('shL', 0.2).rot('thR', 0.12).off('hips', 0, -0.01, 0);
    },
  },

  drive: {
    dur: 4,
    loop: true,
    fill(p, t, c) {
      // seated low in a car seat (default seat 0.3 m above the position), hands on the wheel
      sitBase(p, c, t, fnum(c.flags, 'seatH', 0.3));
      undoArms(p, c);
      p.rot('spine', -0.12);
      const st = 0.08 * sin(t * 0.7 + c.seed * 4);
      arm(p, 'L', -1.05, 0, 0.18 + st, -0.85, [0.4, 0, 0]);
      arm(p, 'R', -1.05, 0, 0.18 - st, -0.85, [0.4, 0, 0]);
      p.rot('head', 0.02, 0.2 * ss(0.8, 0.98, sin(t * 0.25 + c.seed * 7)), 0);
    },
  },

  thumbsUp: {
    dur: 1.6,
    loop: false,
    fill(p, t, c) {
      lower(p, c, t);
      resetArm(p, 'R');
      const k = ss(0, 0.35, t);
      arm(p, 'R', -0.95 * k, 0, 0.12 * k, -1.2 * k, [0, 0, 0]);
      p.rot('handR', 0, 0, 0);
      p.show('thumbR', k > 0.4 ? 1 : 0);
      p.rot('head', -0.05, 0, 0.08 * k);
      face(p, 'happy');
    },
  },

  nod: {
    dur: 1.2,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t);
      const n = sin((t / 1.2) * TAU * 2) * win(t, 0, 0.1, 1.0, 1.2);
      p.rot('head', 0.22 * Math.max(0, n) - 0.06 * Math.max(0, -n)).rot('neck', 0.05 * n);
      face(p, 'happy');
    },
  },

  headShake: {
    dur: 1.2,
    loop: false,
    repeat: true,
    fill(p, t, c) {
      lower(p, c, t);
      const n = sin((t / 1.2) * TAU * 2.5) * win(t, 0, 0.1, 1.0, 1.2);
      p.rot('head', 0.05, 0.42 * n, 0).rot('neck', 0, 0.1 * n, 0);
    },
  },

  swing: {
    dur: 2.7,
    loop: true,
    fill(p, t, c) {
      const d = c.d;
      // seat + chains hang from a pivot 2.2 m above the actor's position (the swing frame's bar)
      p.show('swing', 1);
      const target = fnum(c.flags, 'amp', 0.55);
      const a0 = c.mem.amp ?? target;
      const amp = (c.mem.amp = a0 + (target - a0) * Math.min(1, c.dt * 1.2));
      const ang = amp * sin((t * TAU) / 2.7);
      const vel = cos((t * TAU) / 2.7);
      sitBase(p, c, t, d.swingSeat);
      undoArms(p, c);
      // hands up on the chains
      const chainX = 0.22;
      const above = d.swingPivot - d.shoulderY - (d.swingSeat + d.pelvisBottom - d.hipY);
      const up = Math.atan2(chainX - d.shoulderX, 0.25);
      void above;
      arm(p, 'L', -0.5, 0, up + 0.1, -1.3, [0.6, 0, 0]);
      arm(p, 'R', -0.5, 0, up + 0.1, -1.3, [0.6, 0, 0]);
      p.rot('uaL', -0.7).rot('uaR', -0.7);
      // pump: legs out on the forward swing, tucked on the back swing; lean back going forward
      const pump = vel * Math.min(1, amp * 2);
      p.rot('shL', -0.9 * Math.max(0, pump) + 0.25 * Math.max(0, -pump)).rot('shR', -0.9 * Math.max(0, pump) + 0.25 * Math.max(0, -pump));
      p.rot('spine', -0.25 * Math.max(0, pump) + 0.1 * Math.max(0, -pump));
      pivot(p, [0, d.swingPivot, 0], -ang, 0, 0);
      face(p, amp > 0.3 ? 'laugh' : 'happy', t);
    },
  },

  slide: {
    dur: 2,
    loop: true,
    fill(p, t, c) {
      const d = c.d;
      // sitting on the slide (actor position = slide surface under the hips), legs out, arms up
      p.off('hips', 0, d.pelvisBottom - d.hipY + 0.01, 0);
      p.rot('thL', -1.45, 0, 0.12).rot('thR', -1.45, 0, -0.12).rot('shL', 0.15).rot('shR', 0.15).rot('ftL', -0.2).rot('ftR', -0.2);
      p.rot('spine', -0.15).rot('head', 0.05);
      const k = ss(0, 0.4, t);
      arm(p, 'L', -2.4 * k, 0, 0.5, -0.3 - 0.2 * sin(t * 6));
      arm(p, 'R', -2.4 * k, 0, 0.5, -0.3 - 0.2 * sin(t * 6 + 1));
      const slope = fnum(c.flags, 'slope', 0);
      if (slope) pivot(p, [0, 0, 0], slope, 0, 0);
      face(p, 'laugh', t);
    },
  },

  carry: {
    dur: 1,
    loop: true,
    gait: 'walk',
    nominal: 1.1,
    fill(p, t, c) {
      if (c.moving) gait(p, c, c.phase, 'walk', 0);
      else legsStand(p, c, t);
      breathe(p, c, t, 0.3);
      // both hands in front at chest height (tray, box, backpack held in front)
      arm(p, 'L', -0.45, -0.2, 0.12, -1.25, [0.2, 0.5, 0]);
      arm(p, 'R', -0.45, -0.2, 0.12, -1.25, [0.2, 0.5, 0]);
      p.rot('spine', -0.05);
    },
  },
};

/* ------------------------------------------------- multi-pose helpers (faint) */

/** Sitting on the floor, slumped (faint). */
function sitFloor(p: Pose, c: ClipCtx, t: number) {
  const d = c.d;
  p.off('hips', 0, d.pelvisBottom - d.hipY, -0.05);
  p.rot('thL', -1.25, 0, 0.25).rot('thR', -1.25, 0, -0.25).rot('shL', 1.7).rot('shR', 1.7).rot('ftL', -0.3).rot('ftR', -0.3);
  p.rot('spine', 0.3, 0, 0.05 * sin(t * 2)).rot('head', 0.4, 0, 0.15);
  arm(p, 'L', -0.4, 0, 0.3, -0.4);
  arm(p, 'R', -0.4, 0, 0.3, -0.4);
}

/** Lying on his right side, knees bent, upper arm resting forward (end of faint, lieDown). */
function lying(p: Pose, c: ClipCtx, t: number) {
  const d = c.d;
  const half = d.shoulderX * 0.85;
  // rotate the standing body onto its right side about the feet, then lift and centre it
  pivot(p, [0, 0, 0], 0, 0, PI / 2, [d.hipY * 0.85, half, 0]);
  p.rot('thL', -0.9, 0, 0).rot('shL', 1.1).rot('thR', -0.5).rot('shR', 0.8);
  p.rot('spine', 0.15).rot('head', 0.1, 0, -0.25);
  arm(p, 'R', -1.4, 0, 0.1, -0.5, [0, 0, 0]);
  arm(p, 'L', -0.7, 0, 0.0, -0.6, [0, 0, 0]);
  p.rot('spine', 0.01 * sin(t * 1.7));
}

/** Lying on his back (flag onBack). */
function lyingBack(p: Pose, c: ClipCtx, t: number) {
  const d = c.d;
  pivot(p, [0, 0, 0], -PI / 2, 0, 0, [0, d.chestD + 0.02, d.hipY * 0.85]);
  p.rot('thL', -0.3).rot('shL', 0.6).rot('thR', -0.05).rot('shR', 0.1);
  arm(p, 'L', 0, 0, 0.35, -0.2);
  arm(p, 'R', 0, 0, 0.35, -0.2);
  p.rot('spine', 0.01 * sin(t * 1.7));
}

import { Pose as PoseCls } from './rig';
/** Blends several sub-poses into p with weights (used by faint). */
class PoseMix {
  private acc = new PoseCls();
  private tmp = new PoseCls();
  private sum = 0;
  constructor(private p: Pose) {
    this.acc.reset();
    this.acc.r.fill(0);
    this.acc.o.fill(0);
    this.acc.s.fill(0);
  }
  a(fn: () => void, w: number) {
    if (w <= 1e-4) return;
    this.tmp.copy(this.p);
    this.p.reset();
    fn();
    for (let i = 0; i < this.p.r.length; i++) {
      this.acc.r[i] += this.p.r[i] * w;
      this.acc.o[i] += this.p.o[i] * w;
    }
    for (let i = 0; i < this.p.s.length; i++) this.acc.s[i] += this.p.s[i] * w;
    this.sum += w;
    this.p.copy(this.tmp);
  }
  done() {
    const k = 1 / (this.sum || 1);
    for (let i = 0; i < this.p.r.length; i++) {
      this.p.r[i] += this.acc.r[i] * k;
      this.p.o[i] += this.acc.o[i] * k;
    }
    if (this.sum > 0) for (let i = 0; i < this.p.s.length; i++) this.p.s[i] = this.acc.s[i] * k;
  }
}

/** Natural durations, for docs and cutscenes. */
export const HUMAN_CLIP_INFO: Record<HumanClip, { dur: number; loop: boolean }> = Object.fromEntries(
  (Object.keys(CLIPS) as HumanClip[]).map((k) => [k, { dur: CLIPS[k].dur, loop: CLIPS[k].loop }]),
) as Record<HumanClip, { dur: number; loop: boolean }>;
