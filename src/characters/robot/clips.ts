/**
 * Alrashed's procedural clips. Each clip fills a Pose for time t (seconds since the clip started,
 * already multiplied by clipSpeed). D is the length the clip will play for: actor.clipDuration when
 * it is a one-shot, Infinity when it loops. One-shot gestures ease in, hold or repeat their middle,
 * and ease out just before D, so the StageDriver's switch back to idle is seamless; played as a
 * loop (no dur) they keep going / hold their pose.
 */
import * as THREE from 'three';
import type { RobotClip } from '../../core/types';
import { lookLRLCurve, LOOK_LRL_DUR } from './face';
import { DIM, HEIGHTS, REST, clamp, envelope, lerp, ramp, shoulderRest, sideSign, smooth, type ArmSuffix, type Pose, type Side } from './rig';

export interface ClipCtx {
  /** Gait phase in cycles (accumulated by the component, continuous across speed changes). */
  phase: number;
  /** Current move speed (m/s), 0 when standing. */
  speed: number;
  /** lookAt target in root space (null when none). */
  target: THREE.Vector3 | null;
  flags: Record<string, boolean | number | string>;
  /** The right hand holds an item. */
  holdR: boolean;
  holdL: boolean;
}

export interface ClipDef {
  /** Natural length in seconds (the recommended `dur` for one-shots; the cycle for loops). */
  dur: number;
  /** True: meant to loop (walk, idle, talk...). False: a one-shot gesture. */
  loop: boolean;
  /** Gait cycles per second as a function of speed (only walking clips). */
  gait?: (speed: number) => number;
  fill(p: Pose, t: number, D: number, c: ClipCtx): void;
}

/* ------------------------------------------------------------------ helpers */

type ArmVals = Partial<Record<ArmSuffix, number>>;

function arm(p: Pose, s: Side, v: ArmVals, k = 1) {
  for (const key in v) {
    const pk = `${s}${key}` as keyof Pose;
    p[pk] = lerp(p[pk], v[key as ArmSuffix]!, k);
  }
}
const HAND = {
  open: { fi: 0.04, fm: 0.04, fr: 0.06, fp: 0.08, t: 0.15 },
  fist: { fi: 1, fm: 1, fr: 1, fp: 1, t: 0.9 },
  point: { fi: 0, fm: 1, fr: 1, fp: 1, t: 0.85 },
  thumb: { fi: 1, fm: 1, fr: 1, fp: 1, t: 0 },
  grip: { fi: 0.86, fm: 0.9, fr: 0.92, fp: 0.94, t: 0.7 },
  soft: { fi: 0.12, fm: 0.16, fr: 0.2, fp: 0.24, t: 0.35 },
} satisfies Record<string, ArmVals>;

/** Put a wrist (root-space) target on an arm with IK weight k. */
function ik(p: Pose, s: Side, x: number, y: number, z: number, k = 1, po?: number) {
  p[`${s}ik`] = lerp(p[`${s}ik`], 1, k);
  p[`${s}ikx`] = x;
  p[`${s}iky`] = y;
  p[`${s}ikz`] = z;
  if (po !== undefined) p[`${s}po`] = lerp(p[`${s}po`], po, k);
}

/** Shoulder angles that point the (straight) arm along dir (root space, from the shoulder). */
function aimAngles(s: Side, dir: THREE.Vector3) {
  const d = dir.clone().normalize();
  const sg = sideSign(s);
  const sz = Math.asin(clamp(sg * d.x, -0.6, 0.999));
  const sx = Math.atan2(d.z, -d.y);
  return { sx: clamp(sx, -0.6, 3.0), sz };
}

const tmpV = new THREE.Vector3();
/** Direction from a shoulder to the look target (or a default). */
function aimDir(s: Side, c: ClipCtx, fallback: [number, number, number]) {
  if (c.target) {
    tmpV.copy(c.target).sub(shoulderRest(s));
    if (tmpV.z > -0.2 && tmpV.lengthSq() > 0.05) return tmpV.clone();
  }
  // fallback[0] is the outward amount (toward the gesturing arm's side)
  return new THREE.Vector3(fallback[0] * sideSign(s), fallback[1], fallback[2]);
}
/** Which arm should gesture toward the target: the left one if it is clearly to his left. */
const sideFor = (c: ClipCtx): Side => (c.target && c.target.x > 0.35 && !c.holdL ? 'l' : c.holdR && !c.holdL ? 'l' : 'r');

/** Idle life: breathing, small weight shifts and head drift. Used under most standing clips. */
function idleBase(p: Pose, t: number, amount = 1) {
  const b = Math.sin((t * Math.PI * 2) / 3.6);
  const w = Math.sin((t * Math.PI * 2) / 7.3);
  p.sp += 0.014 * b * amount;
  p.np -= 0.012 * b * amount;
  p.py += 0.004 * b * amount;
  p.lsz += 0.014 * b * amount;
  p.rsz += 0.014 * b * amount;
  p.px += 0.01 * w * amount;
  p.hr -= 0.022 * w * amount;
  p.sr += 0.018 * w * amount;
  p.ny += (0.07 * Math.sin((t * Math.PI * 2) / 9.1 + 1) + 0.03 * Math.sin((t * Math.PI * 2) / 4.3)) * amount;
  p.nr += 0.035 * Math.sin((t * Math.PI * 2) / 6.7) * amount;
  p.lsx += 0.02 * Math.sin((t * Math.PI * 2) / 5.1) * amount;
  p.rsx += 0.02 * Math.sin((t * Math.PI * 2) / 5.7 + 2) * amount;
}

/** Walking legs/hips/arms. */
export function walkFreq(speed: number) {
  return 2.0 * Math.sqrt(Math.max(0.3, speed) / 1.2);
}
function gaitBody(p: Pose, phase: number, speed: number, o: { lift: number; bounce: number; armSwing: number; elbow: number; lean: number; stance: number }) {
  const freq = walkFreq(speed);
  const sweep = clamp((speed * o.stance) / freq, 0.05, 0.4);
  for (const s of ['l', 'r'] as const) {
    let ph = phase + (s === 'l' ? 0 : 0.5);
    ph -= Math.floor(ph);
    if (ph < o.stance) {
      const u = ph / o.stance;
      p[`${s}az`] = sweep * (0.5 - u);
      p[`${s}ay`] = 0;
      p[`${s}ap`] = 0;
    } else {
      const u = (ph - o.stance) / (1 - o.stance);
      p[`${s}az`] = sweep * (-0.5 + smooth(u));
      p[`${s}ay`] = o.lift * Math.sin(Math.PI * u);
      p[`${s}ap`] = 0.35 * Math.sin(Math.PI * u) - 0.25 * Math.sin(Math.PI * u * 2);
    }
  }
  const mid = o.stance / 2;
  p.py += -0.042 - (o.bounce * 0.5) + o.bounce * Math.cos(Math.PI * 4 * (phase - mid));
  p.px += 0.012 * Math.cos(Math.PI * 2 * (phase - mid));
  p.hr += -0.03 * Math.cos(Math.PI * 2 * (phase - mid));
  p.hy += 0.06 * Math.sin(Math.PI * 2 * (phase - mid));
  p.sy -= 0.1 * Math.sin(Math.PI * 2 * (phase - mid));
  p.sp += o.lean;
  p.np -= o.lean * 0.6 + 0.02 * Math.cos(Math.PI * 4 * (phase - mid));
  p.nr += 0.03 * Math.cos(Math.PI * 2 * (phase - mid));
  const sw = Math.cos(Math.PI * 2 * (phase - 0.5));
  p.lsx = 0.05 + o.armSwing * sw;
  p.rsx = 0.05 - o.armSwing * sw;
  p.le = o.elbow + 0.15 * Math.max(0, sw);
  p.re = o.elbow + 0.15 * Math.max(0, -sw);
  p.lsz = p.rsz = 0.2;
}

/* ------------------------------------------------------------------ clips */

const WALK = { lift: 0.07, bounce: 0.022, armSwing: 0.42, elbow: 0.35, lean: 0.05, stance: 0.56 };
const JOG = { lift: 0.11, bounce: 0.04, armSwing: 0.75, elbow: 1.45, lean: 0.14, stance: 0.42 };

/**
 * Seated legs. The robot root stays on the FLOOR point under his hips (same convention as seated
 * people); the hips rest on a seat `seatHeight` m above it. On a seat higher than his short legs
 * (anything above ~0.3 m, e.g. the bus driver's seat) the feet dangle with the toes down.
 */
export function seatedLegs(p: Pose, seatHeight = 0.42) {
  const hipY = seatHeight + 0.06;
  p.py = hipY - (DIM.PELVIS_Y + DIM.HIP_DY);
  p.pz = -0.02;
  p.hp = -0.06;
  const reach = DIM.THIGH + DIM.SHIN - 0.012;
  for (const s of ['l', 'r'] as const) {
    const sg = sideSign(s);
    // knee forward at hip height, shin hanging down; the foot rests on the floor when it reaches it
    const ankleY = Math.max(DIM.ANKLE_H, hipY - DIM.SHIN * 0.96);
    const dy = hipY - ankleY;
    const z = Math.min(0.3, Math.sqrt(Math.max(0, reach * reach - dy * dy)));
    p[`${s}ax`] = sg * 0.02;
    p[`${s}ay`] = ankleY - DIM.ANKLE_H;
    p[`${s}az`] = z;
    p[`${s}ap`] = ankleY > DIM.ANKLE_H + 0.01 ? 0.3 : 0;
    p[`${s}aw`] = sg * 0.06;
  }
}

/** Crouch / kneel leg setups (feet planted, knees bend by IK). */
function crouchLegs(p: Pose, k: number) {
  p.py += -0.24 * k;
  p.pz += -0.07 * k;
  p.hp += 0.12 * k;
  p.sp += 0.2 * k;
  p.np -= 0.12 * k;
  p.lax += 0.035 * k;
  p.rax -= 0.035 * k;
  p.laz += 0.04 * k;
  p.raz -= 0.03 * k;
  p.law += 0.15 * k;
  p.raw -= 0.15 * k;
}
function kneelLegs(p: Pose, k: number) {
  p.py += -0.25 * k;
  p.pz += -0.02 * k;
  p.sp += 0.08 * k;
  // left foot forward and planted, right knee down with the toes on the ground behind
  p.laz += 0.2 * k;
  p.lax += 0.02 * k;
  p.raz += -0.17 * k;
  p.ray += 0.012 * k;
  p.rap += 1.05 * k;
  p.raw -= 0.05 * k;
}

const CLIPS: Record<RobotClip, ClipDef> = {
  idle: {
    dur: 7.3,
    loop: true,
    fill(p, t) {
      idleBase(p, t);
    },
  },

  talk: {
    dur: 4,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.4, 0.4);
      idleBase(p, t, 0.7);
      const beat = Math.sin(t * Math.PI * 2 * 0.9);
      const beat2 = Math.sin(t * Math.PI * 2 * 0.55 + 1.3);
      arm(p, 'r', { sx: 0.35 + 0.12 * beat, sz: 0.25, sy: 0.35, e: 1.15 + 0.18 * beat, wy: -0.9, wx: -0.1, ...HAND.soft }, k);
      arm(p, 'l', { sx: 0.22 + 0.08 * beat2, sz: 0.22, sy: 0.25, e: 0.75 + 0.15 * beat2, wy: -0.6, ...HAND.soft }, k * 0.8);
      p.np += 0.05 * Math.sin(t * Math.PI * 2 * 1.1) * k;
      p.sy += 0.05 * beat2 * k;
    },
  },

  explain1: {
    // both hands open in front, palms up, presenting outward in beats
    dur: 2.6,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      idleBase(p, t, 0.6);
      const b = 0.5 - 0.5 * Math.cos((t * Math.PI * 2) / 1.3);
      for (const s of ['l', 'r'] as const) arm(p, s, { sx: 0.5 + 0.1 * b, sz: 0.25 + 0.35 * b, sy: 0.2, e: 1.25 - 0.25 * b, wy: -1.25, wx: -0.25, ...HAND.open }, k);
      p.sp -= 0.04 * b * k;
      p.np -= 0.04 * b * k;
    },
  },

  explain2: {
    // right hand sweeps out to the side palm up, left hand rests near the belly
    dur: 2.8,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      idleBase(p, t, 0.6);
      const b = smooth(0.5 - 0.5 * Math.cos((t * Math.PI * 2) / 2.8));
      arm(p, 'r', { sx: 0.6 - 0.15 * b, sz: 0.3 + 0.75 * b, sy: 0.25, e: 1.2 - 0.55 * b, wy: -1.3, wx: -0.35, ...HAND.open }, k);
      arm(p, 'l', { sx: 0.35, sz: 0.1, sy: 0.6, e: 1.45, wy: -0.4, wx: 0.2, ...HAND.soft }, k);
      p.sy -= 0.12 * b * k;
      p.ny -= 0.15 * b * k;
      p.nr += 0.05 * b * k;
    },
  },

  explain3: {
    // shaping a ball with both hands, then the right index finger up to make a point
    dur: 3.2,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      idleBase(p, t, 0.6);
      const ph = (t % 3.2) / 3.2;
      const ball = 1 - ramp(ph, 0.45, 0.6) + ramp(ph, 0.9, 1);
      const roll = Math.sin(t * Math.PI * 2 * 0.9);
      for (const s of ['l', 'r'] as const) {
        const sg = sideSign(s);
        arm(p, s, { sx: 0.75 + 0.08 * roll * sg, sz: 0.12, sy: 0.55, e: 1.35 + 0.1 * roll * sg, wy: -0.35, wx: 0.15, ...HAND.soft }, k * ball);
      }
      const pt = 1 - ball;
      arm(p, 'r', { sx: 0.45, sz: 0.25, sy: 0.15, e: 1.9, wy: -0.2, wx: -0.15, ...HAND.point }, k * pt);
      p.np += (0.06 * pt - 0.04 * ball) * k;
      p.nr -= 0.06 * pt * k;
    },
  },

  wave: {
    dur: 2.2,
    loop: false,
    fill(p, t, D, c) {
      const k = envelope(t, D, 0.4, 0.45);
      idleBase(p, t, 0.5);
      const s: Side = c.holdR && !c.holdL ? 'l' : 'r';
      const sg = sideSign(s);
      const w = Math.sin(t * Math.PI * 2 * 1.9);
      arm(p, s, { sx: 0.25, sz: 1.35, sy: -1.45 + 0.32 * w, e: 1.45, wy: 0.05, wx: -0.15, wz: 0.15 * w, ...HAND.open }, k);
      p.sr += -sg * 0.05 * k;
      p.nr += -sg * 0.08 * k;
      p.ny += sg * 0.06 * k;
      p.py += 0.008 * Math.sin(t * Math.PI * 2 * 1.9) * k;
    },
  },

  walk: {
    dur: 0,
    loop: true,
    gait: walkFreq,
    fill(p, _t, _D, c) {
      gaitBody(p, c.phase, Math.max(c.speed, 1.2), WALK);
    },
  },

  holdHandWalk: {
    dur: 0,
    loop: true,
    gait: walkFreq,
    fill(p, _t, _D, c) {
      gaitBody(p, c.phase, Math.max(c.speed, 1.0), { ...WALK, armSwing: 0.3 });
      // the hand-hold overlay (Robot.tsx) lowers the right arm; this keeps the default if no flag
    },
  },

  jog: {
    dur: 0,
    loop: true,
    gait: (s) => 2.6 * Math.sqrt(Math.max(0.5, s) / 2.2),
    fill(p, _t, _D, c) {
      gaitBody(p, c.phase, Math.max(c.speed, 2.2), JOG);
      for (const s of ['l', 'r'] as const) arm(p, s, HAND.fist, 0.8);
    },
  },

  lookLeft: {
    dur: 1.6,
    loop: false,
    fill(p, t, D) {
      idleBase(p, t, 0.5);
      const k = envelope(t, D, 0.3, 0.35);
      p.ny += 1.0 * k;
      p.sy += 0.22 * k;
      p.np += 0.06 * k;
      p.sp += 0.04 * k;
    },
  },

  lookRight: {
    dur: 1.6,
    loop: false,
    fill(p, t, D) {
      idleBase(p, t, 0.5);
      const k = envelope(t, D, 0.3, 0.35);
      p.ny -= 1.0 * k;
      p.sy -= 0.22 * k;
      p.np += 0.06 * k;
      p.sp += 0.04 * k;
    },
  },

  lookLRL: {
    dur: LOOK_LRL_DUR,
    loop: false,
    fill(p, t) {
      idleBase(p, t, 0.4);
      const y = lookLRLCurve(t);
      p.ny += 1.0 * y;
      p.sy += 0.22 * y;
      const away = Math.min(1, Math.abs(y) * 2);
      p.np += 0.06 * away;
      p.sp += 0.05 * away;
    },
  },

  point: {
    dur: 1.8,
    loop: false,
    fill(p, t, D, c) {
      idleBase(p, t, 0.4);
      const k = envelope(t, D, 0.3, 0.4);
      const s = sideFor(c);
      const sg = sideSign(s);
      const a = aimAngles(s, aimDir(s, c, [0.35, -0.05, 1]));
      arm(p, s, { sx: a.sx, sz: a.sz, sy: 0.1, e: 0.12, wy: 0.15, wx: 0, wz: 0.1, ...HAND.point }, k);
      const yaw = c.target ? clamp(Math.atan2(c.target.x, c.target.z), -0.6, 0.6) : -sg * 0.1;
      p.sy += yaw * 0.35 * k;
      p.sp += 0.05 * k;
      p.np -= 0.02 * k;
    },
  },

  stopHand: {
    dur: 1.6,
    loop: false,
    fill(p, t, D, c) {
      idleBase(p, t, 0.3);
      const k = envelope(t, D, 0.22, 0.35);
      const both = !!c.flags.bothHands;
      const calm = !!c.flags.calm;
      const sides: Side[] = both ? ['l', 'r'] : [sideFor(c)];
      for (const s of sides) {
        if (calm) {
          // palms down, pressing gently: "calm down"
          const pr = 0.06 * Math.sin(t * Math.PI * 2 * 1.4);
          arm(p, s, { sx: 0.75 + pr, sz: 0.35, sy: 0.3, e: 0.75, wy: 1.45, wx: -0.25, wz: 0, ...HAND.open }, k);
        } else {
          const a = aimAngles(s, aimDir(s, c, [both ? -0.15 : 0.1, 0.1, 1]));
          arm(p, s, { sx: a.sx * 0.95, sz: a.sz, sy: 0.2, e: 0.55, wy: 1.5, wx: -1.05, wz: 0, ...HAND.open }, k);
        }
      }
      p.sp -= 0.03 * k;
      p.py -= 0.01 * k;
    },
  },

  warnRaise: {
    dur: 1.6,
    loop: false,
    fill(p, t, D, c) {
      idleBase(p, t, 0.3);
      const k = envelope(t, D, 0.2, 0.4);
      const s = c.holdR && !c.holdL ? 'l' : 'r';
      const sg = sideSign(s);
      const shake = Math.sin(t * Math.PI * 2 * 2.2) * ramp(t, 0.25, 0.4) * 0.06;
      arm(p, s, { sx: 2.35 + shake, sz: 0.35, sy: 0.1, e: 0.45, wy: 0.0, wx: 0.0, wz: 0, ...HAND.point }, k);
      p.sp -= 0.05 * k;
      p.sr += -sg * 0.04 * k;
      p.np -= 0.04 * k;
    },
  },

  thumbsUp: {
    dur: 1.8,
    loop: false,
    fill(p, t, D, c) {
      idleBase(p, t, 0.4);
      const k = envelope(t, D, 0.3, 0.4);
      const s = c.holdR && !c.holdL ? 'l' : 'r';
      const sg = sideSign(s);
      const bob = Math.sin(t * Math.PI * 2 * 1.5) * ramp(t, 0.3, 0.5) * 0.05;
      arm(p, s, { sx: 0.75 + bob, sz: 0.25, sy: 0.35, e: 1.3, wy: -0.1, wx: 0.0, wz: 0.15, ...HAND.thumb }, k);
      p.nr += -sg * 0.08 * k;
      p.np += 0.03 * k;
      p.sy += sg * 0.06 * k;
    },
  },

  nod: {
    dur: 1.2,
    loop: false,
    fill(p, t, D) {
      idleBase(p, t, 0.4);
      const k = envelope(t, D, 0.12, 0.2);
      p.np += (0.08 + 0.17 * Math.max(0, Math.sin(t * Math.PI * 2 * 2.2))) * k;
      p.sp += 0.03 * k;
    },
  },

  headShake: {
    dur: 1.4,
    loop: false,
    fill(p, t, D) {
      idleBase(p, t, 0.4);
      const k = envelope(t, D, 0.12, 0.25);
      p.ny += 0.36 * Math.sin(t * Math.PI * 2 * 2.6) * k;
      p.np += 0.06 * k;
      p.sy += 0.05 * Math.sin(t * Math.PI * 2 * 2.6 - 0.6) * k;
    },
  },

  clap: {
    dur: 2.0,
    loop: true,
    fill(p, t, D) {
      idleBase(p, t, 0.4);
      const k = envelope(t, D, 0.3, 0.35);
      const f = 2.6;
      const ph = (t * f) % 1;
      const gap = 0.042 + 0.09 * Math.pow(Math.sin(ph * Math.PI), 0.7);
      for (const s of ['l', 'r'] as const) {
        const sg = sideSign(s);
        ik(p, s, sg * gap, 0.84, 0.25, k, 0.85);
        arm(p, s, { wy: 0.0, wx: -0.15, wz: 0.55, ...HAND.open }, k);
      }
      p.py += 0.006 * Math.cos(ph * Math.PI * 2) * k;
      p.np += 0.03 * k;
    },
  },

  celebrate: {
    dur: 3.2,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.3, 0.4);
      const beat = t * 2.1;
      const b = Math.sin(beat * Math.PI * 2);
      const half = Math.sin(beat * Math.PI);
      const bounce = Math.abs(Math.sin(beat * Math.PI));
      p.py += (-0.05 * bounce + 0.0) * k;
      p.hy += 0.22 * half * k;
      p.sy -= 0.12 * half * k;
      p.hr += 0.05 * half * k;
      p.sr -= 0.08 * half * k;
      p.nr += 0.12 * half * k;
      p.np -= 0.06 * k;
      // arms up in a V, pumping alternately
      arm(p, 'l', { sx: 0.45 + 0.25 * b, sz: 2.35 + 0.15 * b, sy: -0.2, e: 0.45 - 0.25 * b, wy: 0.2, ...HAND.open }, k);
      arm(p, 'r', { sx: 0.45 - 0.25 * b, sz: 2.35 - 0.15 * b, sy: -0.2, e: 0.45 + 0.25 * b, wy: 0.2, ...HAND.open }, k);
      // little steps on the spot
      p.lay += 0.045 * Math.max(0, Math.sin(beat * Math.PI)) * k;
      p.ray += 0.045 * Math.max(0, -Math.sin(beat * Math.PI)) * k;
      p.lap += -0.15 * Math.max(0, Math.sin(beat * Math.PI)) * k;
      p.rap += -0.15 * Math.max(0, -Math.sin(beat * Math.PI)) * k;
    },
  },

  bow: {
    dur: 1.8,
    loop: false,
    fill(p, t, D) {
      idleBase(p, t, 0.3);
      const k = envelope(t, D, 0.45, 0.5);
      p.hp += 0.12 * k;
      p.sp += 0.33 * k;
      p.np += 0.25 * k;
      p.pz -= 0.03 * k;
      arm(p, 'r', { sx: 0.55, sz: -0.05, sy: 0.9, e: 1.75, wy: -0.2, wx: 0.15, ...HAND.soft }, k);
      arm(p, 'l', { sx: 0.25, sz: 0.12, e: 0.25 }, k);
    },
  },

  sitDrive: {
    dur: 6,
    loop: true,
    fill(p, t, _D, c) {
      seatedLegs(p, Number(c.flags.seatHeight ?? 0.42) || 0.42);
      p.sp -= 0.02;
      const wx = Number(c.flags.wheelX ?? 0);
      const wy = Number(c.flags.wheelY ?? 0.4);
      const wz = Number(c.flags.wheelZ ?? 0.36);
      const steer = 0.1 * Math.sin(t * 0.7) + 0.04 * Math.sin(t * 1.9);
      for (const s of ['l', 'r'] as const) {
        const sg = sideSign(s);
        const a = Math.PI / 2 - sg * 1.0 + steer; // 10 and 2 o'clock on a wheel tilted back
        const r = 0.17;
        const gx = wx + Math.cos(a) * r;
        const gy = wy + Math.sin(a) * r * 0.85;
        const gz = wz - Math.sin(a) * r * 0.45;
        ik(p, s, gx + sg * 0.03, gy - 0.02, gz - 0.07, 1, 0.75);
        arm(p, s, { wy: -0.25, wx: 0.25, wz: 0.55, ...HAND.grip });
      }
      p.ny += 0.05 * Math.sin(t * 0.5);
      p.np += 0.02;
    },
  },

  closeUmbrella: {
    // 0-0.6 lower the open umbrella in front, 0.6-1.3 left hand slides up the shaft (swap the item to
    // 'umbrellaClosed' at ~1.0 s), 1.3-2.0 shake it, 2.0-2.6 tuck it down at the side
    dur: 2.6,
    loop: false,
    fill(p, t, D) {
      idleBase(p, t, 0.3);
      const k = envelope(t, D, 0.25, 0.4);
      const low = ramp(t, 0, 0.6);
      const slide = ramp(t, 0.6, 1.0) - ramp(t, 1.15, 1.35);
      const shake = t > 1.3 && t < 2.0 ? Math.sin((t - 1.3) * Math.PI * 2 * 4) * Math.sin(((t - 1.3) / 0.7) * Math.PI) : 0;
      const tuck = ramp(t, 2.0, 2.5);
      const hy = lerp(lerp(0.98, 0.78, low), 0.62, tuck);
      ik(p, 'r', -0.13 + 0.015 * shake, hy + 0.02 * shake, lerp(0.3, 0.12, tuck), k, 0.6);
      arm(p, 'r', { wy: -0.3, wx: 0.2, ...HAND.grip }, k);
      p.rix = lerp(0, 0.25, tuck) * k;
      p.riz = -0.15 * shake * k;
      // left hand closes the canopy: grips the shaft above the right hand and slides up
      const lk = k * (ramp(t, 0.5, 0.75) - ramp(t, 1.25, 1.5));
      ik(p, 'l', -0.06, hy + 0.12 + 0.22 * slide, 0.3, lk, 0.7);
      arm(p, 'l', { wy: -0.4, wz: 0.4, ...HAND.grip }, lk);
      p.np += 0.12 * k * (1 - tuck);
      p.sp += 0.04 * k;
    },
  },

  crouch: {
    dur: 2,
    loop: false,
    fill(p, t, D) {
      const k = envelope(t, D, 0.5, 0.5);
      idleBase(p, t, 0.35);
      crouchLegs(p, k);
      for (const s of ['l', 'r'] as const) arm(p, s, { sx: 0.55, sz: 0.3, sy: 0.3, e: 0.75, wy: -0.6, ...HAND.soft }, k);
    },
  },

  kneel: {
    dur: 2,
    loop: false,
    fill(p, t, D) {
      const k = envelope(t, D, 0.55, 0.55);
      idleBase(p, t, 0.3);
      kneelLegs(p, k);
      // left forearm rests on the raised knee, right hand reaches gently forward
      arm(p, 'l', { sx: 0.75, sz: 0.25, sy: 0.4, e: 0.7, wy: -0.5, wx: 0.3, ...HAND.soft }, k);
      arm(p, 'r', { sx: 0.7, sz: 0.2, sy: 0.25, e: 0.55, wy: -0.9, ...HAND.soft }, k);
      p.np += 0.1 * k;
    },
  },

  catch: {
    // quick lunge with both arms out, absorb, recover
    dur: 1.6,
    loop: false,
    fill(p, t, D) {
      const k = envelope(t, D, 0.18, 0.45);
      const absorb = ramp(t, 0.18, 0.35) * (1 - ramp(t, 0.5, 0.9));
      p.raz += 0.17 * k;
      p.laz -= 0.05 * k;
      p.py += (-0.07 - 0.04 * absorb) * k;
      p.pz += 0.06 * k;
      p.sp += (0.22 + 0.06 * absorb) * k;
      p.np -= 0.12 * k;
      for (const s of ['l', 'r'] as const) arm(p, s, { sx: 1.25 - 0.15 * absorb, sz: 0.3, sy: 0.3, e: 0.35 + 0.35 * absorb, wy: -0.9, wx: -0.2, ...HAND.open }, k);
    },
  },

  extinguisher: {
    // 4 s loop: 0-1 pull the pin, 1-1.8 aim the hose, 1.8-2.4 squeeze, 2.4-4 sweep left-right.
    // Play with speed 0.5 for the 8 s shot-table timing.
    dur: 4,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      const ph = t % 4;
      // stance: feet apart, knees soft, leaning in
      p.laz += 0.1 * k;
      p.raz -= 0.06 * k;
      p.lax += 0.03 * k;
      p.rax -= 0.03 * k;
      p.py -= 0.035 * k;
      p.sp += 0.12 * k;
      p.np += 0.18 * k;
      const squeeze = ramp(ph, 1.8, 2.1);
      const sweep = ph > 2.4 ? Math.sin(((ph - 2.4) / 1.6) * Math.PI * 2) * Math.sin(((ph - 2.4) / 1.6) * Math.PI) : 0;
      const recoil = squeeze * (1 - ramp(ph, 3.8, 4)) * 0.01 * Math.sin(ph * 60);
      // right hand carries the extinguisher by its handle in front of the hips
      ik(p, 'r', -0.1 + sweep * 0.03, 0.66 + recoil, 0.24, k, 0.5);
      arm(p, 'r', { wy: -0.2, wx: 0.15, ...HAND.grip, fi: lerp(0.86, 1, squeeze), fm: lerp(0.9, 1, squeeze) }, k);
      p.riz = sweep * 0.12 * k;
      // left hand: pull pin (0-1), then hold the hose nozzle aimed low and sweep
      const pull = ramp(ph, 0.35, 0.8);
      const toPin = ramp(ph, 0, 0.3) * (1 - ramp(ph, 0.85, 1.1));
      const aim = ramp(ph, 1.0, 1.6);
      const lx = lerp(lerp(0.05, -0.05 + 0.18 * pull, toPin), 0.04 + sweep * 0.16, aim);
      const ly = lerp(lerp(0.62, 0.8 + 0.04 * pull, toPin), 0.68, aim);
      const lz = lerp(lerp(0.12, 0.26, toPin), 0.42, aim);
      ik(p, 'l', lx, ly, lz, k, 0.4);
      arm(p, 'l', { wy: lerp(-0.4, -0.2, aim), wx: lerp(0.2, -0.2, aim), wz: 0.2, ...HAND.grip }, k);
      p.sy += sweep * 0.12 * k;
      p.ny += sweep * 0.18 * k;
    },
  },

  washHands: {
    dur: 3,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      idleBase(p, t, 0.3);
      const a = t * Math.PI * 2 * 1.6;
      for (const s of ['l', 'r'] as const) {
        const sg = sideSign(s);
        ik(p, s, sg * (0.04 + 0.025 * Math.cos(a)) , 0.76 + 0.02 * Math.sin(a * sg), 0.27 + sg * 0.025 * Math.sin(a), k, 0.8);
        arm(p, s, { wy: 0.2 + 0.25 * Math.sin(a), wx: 0.1, wz: 0.6, ...HAND.open, t: 0.4 }, k);
      }
      p.sp += 0.1 * k;
      p.np += 0.28 * k;
    },
  },

  bandage: {
    // kneeling, both hands low in front pressing the bandage edges in turn
    dur: 3,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.5, 0.5);
      idleBase(p, t, 0.2);
      kneelLegs(p, k);
      p.sp += 0.16 * k;
      p.np += 0.35 * k;
      const press = (s: number) => Math.max(0, Math.sin(t * Math.PI * 2 * 0.9 + s)) * 0.03;
      ik(p, 'l', 0.07, 0.42 - press(0), 0.36, k, 0.7);
      ik(p, 'r', -0.07, 0.42 - press(Math.PI), 0.36, k, 0.7);
      for (const s of ['l', 'r'] as const) arm(p, s, { wy: 1.2, wx: 0.1, wz: 0.2, fi: 0.1, fm: 0.4, fr: 0.5, fp: 0.6, t: 0.1 }, k);
    },
  },

  gloves: {
    // pull a glove onto the right hand, snap; then the left; then show both hands
    dur: 3.4,
    loop: false,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      idleBase(p, t, 0.3);
      p.np += 0.22 * k;
      const first = 1 - ramp(t, 1.45, 1.65);
      const show = ramp(t, 2.9, 3.1);
      const pullA = ramp(t, 0.25, 1.0);
      const pullB = ramp(t, 1.75, 2.5);
      const snapA = Math.exp(-Math.max(0, t - 1.05) * 12) * (t > 1.05 ? 1 : 0);
      const snapB = Math.exp(-Math.max(0, t - 2.55) * 12) * (t > 2.55 ? 1 : 0);
      // the gloved hand points fingers forward, the other hand pulls the cuff back toward the elbow
      const work = (gloved: Side, puller: Side, pull: number, snap: number, w: number) => {
        const sg = sideSign(gloved);
        ik(p, gloved, sg * 0.02, 0.84, 0.26, w, 0.8);
        arm(p, gloved, { wy: -0.2, wx: 0, wz: 0.3, ...HAND.open }, w);
        ik(p, puller, sg * 0.03, 0.85 + 0.02 * snap, 0.33 - 0.1 * pull + 0.03 * snap, w, 0.7);
        arm(p, puller, { wy: -1.0, wx: 0.3, ...HAND.grip }, w);
      };
      work('r', 'l', pullA, snapA, k * first * (1 - show));
      work('l', 'r', pullB, snapB, k * (1 - first) * (1 - show));
      for (const s of ['l', 'r'] as const) arm(p, s, { ik: 0, sx: 1.0, sz: 0.3, sy: 0.3, e: 1.2, wy: -1.4, wx: -0.4, ...HAND.open }, k * show);
      p.np -= 0.15 * show * k;
    },
  },

  coverFace: {
    dur: 2,
    loop: false,
    fill(p, t, D, c) {
      const k = envelope(t, D, 0.3, 0.4);
      idleBase(p, t, 0.3);
      const s = c.holdR && !c.holdL ? 'l' : 'r';
      const sg = sideSign(s);
      // the hand lies across the lower half of the face screen, palm toward it
      ik(p, s, sg * 0.1, 1.06, 0.2, k, 1.0);
      arm(p, s, { wy: -1.35, wx: 0.95, wz: 0.1, fi: 0.08, fm: 0.06, fr: 0.06, fp: 0.08, t: 0.35 }, k);
      p.np += 0.12 * k;
      p.sp += 0.06 * k;
      p.sr -= sg * 0.03 * k;
    },
  },

  countFingers: {
    // left hand raised, palm out; fingers come up one by one (1..4, then the thumb = 5)
    dur: 3.4,
    loop: true,
    fill(p, t, D) {
      const k = envelope(t, D, 0.35, 0.4);
      idleBase(p, t, 0.3);
      const ph = t % 3.4;
      const up = (i: number) => 1 - ramp(ph, 0.45 + i * 0.5, 0.6 + i * 0.5);
      ik(p, 'l', 0.12, 0.98, 0.26, k, 0.7);
      arm(p, 'l', { wy: 1.5, wx: -0.4, wz: 0, fi: up(0), fm: up(1), fr: up(2), fp: up(3), t: lerp(0.95, 0, 1 - up(4)) }, k);
      p.ny += 0.18 * k;
      p.np += 0.06 * k;
      p.nr += 0.05 * k;
    },
  },

  // (no clip should be missing; RobotClip is exhaustive here)
} satisfies Record<RobotClip, ClipDef>;

export function clipDef(name: string): ClipDef {
  return (CLIPS as Record<string, ClipDef>)[name] ?? CLIPS.idle;
}

export const CLIP_NAMES = Object.keys(CLIPS) as RobotClip[];

/** Fill a pose for clip `name` at time t (starting from the rest pose). */
export function poseFor(out: Pose, name: string, t: number, D: number, c: ClipCtx) {
  for (const k in REST) out[k as keyof Pose] = REST[k as keyof Pose];
  clipDef(name).fill(out, t, D, c);
  return out;
}

export { HEIGHTS };
