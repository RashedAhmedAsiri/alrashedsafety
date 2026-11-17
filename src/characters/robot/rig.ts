/**
 * Alrashed's skeleton: dimensions, the Pose vector every clip writes, blending, and the code that
 * turns a Pose into group transforms (forward kinematics for the body and arms, two-bone IK for the
 * legs and for any arm whose `ik` weight is > 0).
 *
 * Frames (robot root = actor position, rotated by actor.rotY):
 *   +Y up, +Z forward (the way he faces), +X is his LEFT, -X his right.
 *   Side sign s = +1 for the left limbs, -1 for the right limbs.
 *
 * Pose conventions (radians unless noted):
 *   px,py,pz   pelvis offset from rest (m)            hp,hy,hr  pelvis pitch(+fwd)/yaw(+left)/roll
 *   sp,sy,sr   spine (waist) pitch/yaw/roll            np,ny,nr  head pitch(+down)/yaw(+left)/roll
 *   Arms ('l'/'r' prefix):
 *     sx forward raise, sz outward raise, sy inward twist, e elbow bend (forearm comes forward/up)
 *     wx wrist flex toward the palm, wy forearm pronation (palm turns backward/down), wz bend toward thumb
 *     fi fm fr fp  finger curls 0..1 (index, middle, ring, pinky), t thumb fold 0..1 (0 = sticks out)
 *     ik 0..1 weight of the IK solution toward the root-space WRIST target (ikx, iky, ikz)
 *     po elbow pole: 0 elbow points back/down, 1 elbow points out to the side
 *     ix, iz  tilt of a held item (socket) around X / Z
 *   Legs: ax, ay, az ankle offset from its rest point (root space, m), ap foot pitch (+ toe down),
 *     aw foot yaw (+ toes turn left)
 */
import * as THREE from 'three';

export const DIM = {
  /** Total height to the top of the antenna light. */
  HEIGHT: 1.45,
  PELVIS_Y: 0.55,
  HIP_X: 0.1,
  HIP_DY: -0.035,
  THIGH: 0.202,
  SHIN: 0.202,
  /** Ankle pivot above the sole. */
  ANKLE_H: 0.115,
  /** Spine pivot (waist) above the pelvis origin. */
  WAIST_DY: 0.05,
  /** Neck pivot above the waist pivot. */
  NECK_DY: 0.37,
  /** Head shell bottom above the neck pivot. */
  HEAD_DY: 0.03,
  HEAD_H: 0.362,
  SHOULDER_X: 0.255,
  /** Shoulder pivot above the waist pivot. */
  SHOULDER_DY: 0.28,
  UPPER: 0.165,
  FORE: 0.15,
  /** Wrist to knuckle line. */
  PALM: 0.074,
  /** Wrist to the centre of a closed fist (grip point), along the hand. */
  GRIP: 0.088,
} as const;

/** Rest positions (root space) for quick reference. */
export const HEIGHTS = {
  shoulder: DIM.PELVIS_Y + DIM.WAIST_DY + DIM.SHOULDER_DY, // 0.88
  neck: DIM.PELVIS_Y + DIM.WAIST_DY + DIM.NECK_DY, // 0.97
  headBottom: DIM.PELVIS_Y + DIM.WAIST_DY + DIM.NECK_DY + DIM.HEAD_DY, // 1.00
  eyes: 1.1,
  headTop: 1.362,
};

const BODY = ['px', 'py', 'pz', 'hp', 'hy', 'hr', 'sp', 'sy', 'sr', 'np', 'ny', 'nr'] as const;
const ARM = ['sx', 'sy', 'sz', 'e', 'wx', 'wy', 'wz', 'fi', 'fm', 'fr', 'fp', 't', 'ik', 'ikx', 'iky', 'ikz', 'po', 'ix', 'iz'] as const;
const LEG = ['ax', 'ay', 'az', 'ap', 'aw'] as const;
export type Side = 'l' | 'r';
export type ArmSuffix = (typeof ARM)[number];
export type LegSuffix = (typeof LEG)[number];
export type PoseKey = (typeof BODY)[number] | `${Side}${ArmSuffix}` | `${Side}a${'x' | 'y' | 'z' | 'p' | 'w'}`;
export type Pose = Record<PoseKey, number>;

export const POSE_KEYS: PoseKey[] = [
  ...BODY,
  ...(['l', 'r'] as const).flatMap((s) => ARM.map((k) => `${s}${k}` as PoseKey)),
  ...(['l', 'r'] as const).flatMap((s) => LEG.map((k) => `${s}${k}` as PoseKey)),
];
const IK_TARGET = new Set<PoseKey>(['likx', 'liky', 'likz', 'rikx', 'riky', 'rikz']);

export const sideSign = (s: Side) => (s === 'l' ? 1 : -1);

/** Rest shoulder pivot (root space). */
export const shoulderRest = (s: Side) => new THREE.Vector3(sideSign(s) * DIM.SHOULDER_X, HEIGHTS.shoulder, 0);

export function restPose(): Pose {
  const p = {} as Pose;
  for (const k of POSE_KEYS) p[k] = 0;
  for (const s of ['l', 'r'] as const) {
    p[`${s}sz`] = 0.17;
    p[`${s}sx`] = 0.04;
    p[`${s}e`] = 0.2;
    p[`${s}fi`] = 0.22;
    p[`${s}fm`] = 0.28;
    p[`${s}fr`] = 0.32;
    p[`${s}fp`] = 0.36;
    p[`${s}t`] = 0.55;
    p[`${s}wx`] = 0.12;
    p[`${s}po`] = 0.25;
    p[`${s}ikx`] = sideSign(s) * 0.3;
    p[`${s}iky`] = 0.58;
    p[`${s}ikz`] = 0.02;
  }
  return p;
}

export const REST: Readonly<Pose> = restPose();

export function copyPose(dst: Pose, src: Readonly<Pose>) {
  for (const k of POSE_KEYS) dst[k] = src[k];
  return dst;
}

/**
 * dst = lerp(a, b, k). IK targets are blended weighted by each side's IK weight so a pose that does
 * not use IK never drags the target of one that does.
 */
export function lerpPose(dst: Pose, a: Readonly<Pose>, b: Readonly<Pose>, k: number) {
  for (const key of POSE_KEYS) {
    if (IK_TARGET.has(key)) continue;
    dst[key] = a[key] + (b[key] - a[key]) * k;
  }
  for (const s of ['l', 'r'] as const) {
    const wa = a[`${s}ik`] * (1 - k);
    const wb = b[`${s}ik`] * k;
    const sum = wa + wb;
    for (const c of ['x', 'y', 'z'] as const) {
      const key = `${s}ik${c}` as PoseKey;
      dst[key] = sum > 1e-5 ? (a[key] * wa + b[key] * wb) / sum : a[key] + (b[key] - a[key]) * k;
    }
  }
  return dst;
}

/** Swap left and right (a mirrored version of the same gesture). */
export function mirrorPose(p: Pose) {
  for (const k of [...ARM, ...LEG]) {
    const kl = `l${k}` as PoseKey;
    const kr = `r${k}` as PoseKey;
    const t = p[kl];
    p[kl] = p[kr];
    p[kr] = t;
  }
  for (const s of ['l', 'r'] as const) {
    p[`${s}ikx`] = -p[`${s}ikx`];
    p[`${s}ax`] = -p[`${s}ax`];
    p[`${s}aw`] = -p[`${s}aw`];
    p[`${s}iz`] = -p[`${s}iz`];
  }
  p.px = -p.px;
  for (const k of ['hy', 'hr', 'sy', 'sr', 'ny', 'nr'] as const) p[k] = -p[k];
  return p;
}

/* ------------------------------------------------------------------ math helpers */

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** 0 -> 1 over [a, b] with smoothstep. */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
/** In over tin seconds at the start, out over tout seconds before D (D = Infinity: never out). */
export const envelope = (t: number, D: number, tin = 0.3, tout = 0.35) =>
  Math.min(ramp(t, 0, tin), Number.isFinite(D) ? 1 - ramp(t, D - tout, D) : 1);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
/** Frame-rate independent exponential approach factor. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/* -------------------------------------------------------------------- two-bone IK */

const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _u = new THREE.Vector3();
const _m = new THREE.Vector3();
const _f = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _mat = new THREE.Matrix4();

/**
 * Solve a two-bone chain whose bones point down their local -Y.
 * bendSign +1: the second bone bends toward the first bone's local +Z (elbow);
 *          -1: toward local -Z (knee).
 * Writes the first bone's orientation (in the same space as the inputs) to outQ and returns
 * the hinge angle (>= 0).
 */
export function solveTwoBone(
  start: THREE.Vector3,
  target: THREE.Vector3,
  a: number,
  b: number,
  pole: THREE.Vector3,
  bendSign: 1 | -1,
  outQ: THREE.Quaternion,
): number {
  _d.subVectors(target, start);
  let d = _d.length();
  if (d < 1e-5) _d.set(0, -1, 0), (d = 1e-5);
  _d.divideScalar(d);
  const dc = clamp(d, Math.abs(a - b) + 1e-4, a + b - 1e-4);
  const cosA = clamp((a * a + dc * dc - b * b) / (2 * a * dc), -1, 1);
  const alpha = Math.acos(cosA);
  const cosE = clamp((a * a + b * b - dc * dc) / (2 * a * b), -1, 1);
  const bend = Math.PI - Math.acos(cosE);
  // pole projected perpendicular to the start->target line
  _p.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_p.lengthSq() < 1e-8) {
    _p.set(0, 0, 1).addScaledVector(_d, -_d.z);
    if (_p.lengthSq() < 1e-8) _p.set(1, 0, 0);
  }
  _p.normalize();
  _u.copy(_d).multiplyScalar(Math.cos(alpha)).addScaledVector(_p, Math.sin(alpha)).normalize();
  _m.copy(start).addScaledVector(_u, a);
  _f.copy(_d).multiplyScalar(dc).add(start).sub(_m).normalize(); // second bone direction
  _z.copy(_f).addScaledVector(_u, -_f.dot(_u));
  if (_z.lengthSq() < 1e-8) _z.copy(_p).multiplyScalar(-1);
  _z.normalize().multiplyScalar(bendSign);
  _y.copy(_u).multiplyScalar(-1);
  _x.crossVectors(_y, _z).normalize();
  _z.crossVectors(_x, _y).normalize();
  _mat.makeBasis(_x, _y, _z);
  outQ.setFromRotationMatrix(_mat);
  return bend;
}
