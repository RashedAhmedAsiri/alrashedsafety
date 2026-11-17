/**
 * Human body: proportions (Dims), the bone list (rig) and the merged, skinned, vertex-colored
 * geometry for any look (boys and every adult kind). One geometry per distinct look (cached).
 *
 * Model space: feet at y = 0, facing +Z, character's left = +X. Bind pose: standing, arms hanging
 * straight down beside the body, every bone frame aligned with the model frame (except `belt`).
 */
import * as THREE from 'three';
import {
  MeshBuilder,
  V,
  M,
  col,
  mix,
  shade,
  clamp,
  smoothstep,
  segM,
  frameM,
  unitSphere,
  halfSphere,
  unitCyl,
  capsuleGeo,
  latheGeo,
  gridGeo,
  tubeGeo,
  type Influence,
  type WeightSpec,
  type ColorSpec,
  type AddOpts,
} from './build';
import { roundedBox } from '../robot/geometry';
import { SKIN_TONES, HAIR_COLORS, PANTS_COLORS, type Look, type BoyLook, type AdultLook, type HairStyle } from './looks';

/* ---------------------------------------------------------------- bones */

export const BONE_NAMES = [
  'root', 'hips', 'spine', 'neck', 'head',
  'eyes', 'eyesHappy', 'eyesSleep', 'browL', 'browR', 'mouth', 'mouthD', 'mouthO',
  'uaL', 'faL', 'handL', 'uaR', 'faR', 'handR',
  'thL', 'shL', 'ftL', 'thR', 'shR', 'ftR',
  'pack', 'straps', 'belt', 'lapBelt', 'collar', 'indexR', 'thumbR', 'goggles', 'glovesL', 'glovesR',
  'pantShinR', 'skinShinR', 'scrape', 'bandage', 'nosebleed', 'swing',
] as const;
export type BoneName = (typeof BONE_NAMES)[number];
export const BI = Object.fromEntries(BONE_NAMES.map((n, i) => [n, i])) as Record<BoneName, number>;

const PARENT: Record<BoneName, BoneName | null> = {
  root: null, hips: 'root', spine: 'hips', neck: 'spine', head: 'neck',
  eyes: 'head', eyesHappy: 'head', eyesSleep: 'head', browL: 'head', browR: 'head', mouth: 'head', mouthD: 'head', mouthO: 'head',
  uaL: 'spine', faL: 'uaL', handL: 'faL', uaR: 'spine', faR: 'uaR', handR: 'faR',
  thL: 'hips', shL: 'thL', ftL: 'shL', thR: 'hips', shR: 'thR', ftR: 'shR',
  pack: 'spine', straps: 'spine', belt: 'spine', lapBelt: 'hips', collar: 'head', indexR: 'handR', thumbR: 'handR', goggles: 'head',
  glovesL: 'handL', glovesR: 'handR', pantShinR: 'shR', skinShinR: 'shR', scrape: 'shR', bandage: 'shR', nosebleed: 'head', swing: 'root',
};
export const PARENT_INDEX = BONE_NAMES.map((n) => (PARENT[n] ? BI[PARENT[n]!] : -1));

/* ----------------------------------------------------------------- dims */

export interface Dims {
  H: number;
  adult: boolean;
  headR: [number, number, number];
  headC: number;
  headPivot: number;
  neckR: number;
  shoulderY: number;
  shoulderX: number;
  chestW: number;
  chestD: number;
  waistY: number;
  hipY: number;
  hipX: number;
  hipW: number;
  kneeY: number;
  ankleY: number;
  ua: number;
  fa: number;
  uaR: number;
  faR: number;
  hand: [number, number, number];
  thighR: number;
  shinR: number;
  foot: [number, number, number];
  footFwd: number;
  /** Seat contact below the hip joint when sitting. */
  pelvisBottom: number;
  /** Face feature angles. */
  eyeA: number;
  eyeE: number;
  eye: [number, number, number];
  mouthE: number;
  noseE: number;
  browE: number;
  /** Swing seat / chain rig (boys). */
  swingPivot: number;
  swingSeat: number;
}

function boyDims(b: BoyLook): Dims {
  const H = b.height === 'small' ? 1.15 : b.height === 'tall' ? 1.42 : 1.3;
  const sh = b.height === 'small' ? 0.95 : b.height === 'tall' ? 1.03 : 1;
  const headTotal = 0.29 * sh;
  const sv = (H - headTotal) / (1.3 - 0.29);
  const sw = (b.height === 'small' ? 0.93 : b.height === 'tall' ? 1.05 : 1) * (1 + b.chub * 0.06);
  const headR: [number, number, number] = [0.15 * sh, 0.158 * sh, 0.145 * sh];
  const headC = H - headR[1] - 0.014 * sh;
  return {
    H,
    adult: false,
    headR,
    headC,
    headPivot: headC - 0.11 * sh,
    neckR: 0.043 * sw,
    shoulderY: 0.885 * sv,
    shoulderX: 0.15 * sw,
    chestW: 0.136 * sw,
    chestD: 0.094 * sw,
    waistY: 0.625 * sv,
    hipY: 0.565 * sv,
    hipX: 0.068 * sw,
    hipW: 0.125 * sw,
    kneeY: 0.31 * sv,
    ankleY: 0.065 * sv,
    ua: 0.18 * sv,
    fa: 0.165 * sv,
    uaR: 0.04 * sw,
    faR: 0.036 * sw,
    hand: [0.03 * sw, 0.046 * sv, 0.041 * sw],
    thighR: 0.062 * sw,
    shinR: 0.052 * sw,
    foot: [0.082 * sw, 0.07 * sv, 0.175 * sv],
    footFwd: 0.035 * sv,
    pelvisBottom: 0.065 * sv,
    eyeA: 0.37,
    eyeE: -0.05,
    eye: [0.024 * sh, 0.034 * sh, 0.012 * sh],
    mouthE: -0.3,
    noseE: -0.15,
    browE: 0.2,
    swingPivot: 2.2,
    swingSeat: 0.45,
  };
}

function adultDims(a: AdultLook): Dims {
  const H = a.height;
  const sv = (H - 0.255) / (1.75 - 0.255);
  const headR: [number, number, number] = [0.122, 0.138, 0.13];
  const headC = H - headR[1] - 0.012;
  const sw = 1 + a.belly * 0.03;
  return {
    H,
    adult: true,
    headR,
    headC,
    headPivot: headC - 0.1,
    neckR: 0.056,
    shoulderY: 1.42 * sv,
    shoulderX: 0.205 * sw,
    chestW: 0.186 * sw,
    chestD: 0.123 * sw,
    waistY: 1.0 * sv,
    hipY: 0.88 * sv,
    hipX: 0.095,
    hipW: 0.165 * sw,
    kneeY: 0.48 * sv,
    ankleY: 0.085 * sv,
    ua: 0.28 * sv,
    fa: 0.25 * sv,
    uaR: 0.053,
    faR: 0.045,
    hand: [0.033, 0.055, 0.047],
    thighR: 0.082,
    shinR: 0.066,
    foot: [0.1, 0.085, 0.27],
    footFwd: 0.055,
    pelvisBottom: 0.1,
    eyeA: 0.34,
    eyeE: -0.03,
    eye: [0.017, 0.024, 0.01],
    mouthE: -0.4,
    noseE: -0.15,
    browE: 0.2,
    swingPivot: 2.2,
    swingSeat: 0.45,
  };
}

export function dimsFor(look: Look): Dims {
  return look.adult ? adultDims(look.a) : boyDims(look.boy);
}

/* ------------------------------------------------------------ head helpers */

function headDir(a: number, e: number) {
  return V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}
/** Point on the head ellipsoid surface at azimuth a (from +Z toward +X) and elevation e, pushed out by `out`. */
function headPt(d: Dims, a: number, e: number, out = 0) {
  const dir = headDir(a, e);
  const [rx, ry, rz] = d.headR;
  const n = V(dir.x / rx, dir.y / ry, dir.z / rz).normalize();
  const p = V(rx * dir.x, d.headC + ry * dir.y, rz * dir.z).addScaledVector(n, out);
  return { p, n };
}
/** Frame on the head surface: z = surface normal, y ~ up, x = character's left (viewer's right). */
function headFrame(d: Dims, a: number, e: number, out = 0, roll = 0) {
  const { p, n } = headPt(d, a, e, out);
  const x = new THREE.Vector3().crossVectors(V(0, 1, 0), n).normalize();
  const y = new THREE.Vector3().crossVectors(n, x).normalize();
  if (roll) {
    const q = new THREE.Quaternion().setFromAxisAngle(n, roll);
    x.applyQuaternion(q);
    y.applyQuaternion(q);
  }
  return { p, x, y, z: n };
}
function headM(d: Dims, a: number, e: number, out: number, s: [number, number, number], roll = 0, local: [number, number, number] = [0, 0, 0]) {
  const f = headFrame(d, a, e, out, roll);
  const p = f.p.clone().addScaledVector(f.x, local[0]).addScaledVector(f.y, local[1]).addScaledVector(f.z, local[2]);
  return frameM(p, f.x, f.y, f.z, s);
}

/** Cap over the head ellipsoid: u = azimuth (full circle), v from the top down to thetaMax(phi). */
function headCap(d: Dims, thetaMax: (phi: number) => number, thick: (v: number, phi: number) => number, nu: number, nv: number, cell?: (i: number, j: number) => THREE.Color) {
  const [rx, ry, rz] = d.headR;
  return gridGeo(
    nu,
    nv,
    (u, v) => {
      const phi = u * Math.PI * 2;
      const th = Math.max(1e-3, v * thetaMax(phi));
      const t = thick(v, phi);
      return V((rx + t) * Math.sin(th) * Math.sin(phi), d.headC + (ry + t) * Math.cos(th), (rz + t) * Math.sin(th) * Math.cos(phi));
    },
    { wrapU: true, cellColor: cell },
  );
}

/* ---------------------------------------------------------------- template */

export interface BodyTemplate {
  geometry: THREE.BufferGeometry;
  dims: Dims;
  /** Bind position (model space) of every bone. */
  bind: THREE.Vector3[];
  /** Bind rotation of every bone (identity except a few). */
  bindQ: THREE.Quaternion[];
  /** Palm centre relative to the hand bones. */
  socket: THREE.Vector3;
  look: Look;
}

export interface BuildOpts {
  /** Segment multiplier (1 = full detail, 0.6 = crowd). */
  det?: number;
  /** Crowd template: include every variant piece, tagged with variant ids. */
  template?: boolean;
}

/** Crowd palette slots. */
export const SLOT = { fixed: 0, shirt: 1, stripe: 2, pants: 3, skin: 4, hair: 5, pack: 6, shoe: 7, blush: 8, collar: 9 } as const;
/** Crowd variant ids. */
export const VARIANT = { always: 0, pack: 1, glasses: 2, crop: 3, fringe: 4, tuft: 5, side: 6, buzz: 7 } as const;

const cache = new Map<string, BodyTemplate>();

export function getBody(look: Look, opts: BuildOpts = {}): BodyTemplate {
  const key = `${look.key}|${opts.det ?? 1}|${opts.template ? 't' : ''}`;
  let t = cache.get(key);
  if (!t) {
    t = buildBody(look, opts);
    cache.set(key, t);
  }
  return t;
}

function buildBody(look: Look, opts: BuildOpts): BodyTemplate {
  const d = dimsFor(look);
  const det = opts.det ?? 1;
  const S = (n: number, min = 4) => Math.max(min, Math.round(n * det));
  const b = new MeshBuilder();
  const bind: THREE.Vector3[] = BONE_NAMES.map(() => V());
  const bindQ: THREE.Quaternion[] = BONE_NAMES.map(() => new THREE.Quaternion());
  const set = (n: BoneName, p: THREE.Vector3) => bind[BI[n]].copy(p);

  /* ---- skeleton bind positions ---- */
  const wristY = d.shoulderY - d.ua - d.fa;
  set('hips', V(0, d.hipY, 0));
  set('spine', V(0, d.waistY, 0));
  set('neck', V(0, d.shoulderY + 0.01, 0));
  set('head', V(0, d.headPivot, 0));
  for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
    set(`ua${L}`, V(s * d.shoulderX, d.shoulderY, 0));
    set(`fa${L}`, V(s * d.shoulderX, d.shoulderY - d.ua, 0));
    set(`hand${L}`, V(s * d.shoulderX, wristY, 0));
    set(`gloves${L}`, V(s * d.shoulderX, wristY - d.hand[1], 0));
    set(`th${L}`, V(s * d.hipX, d.hipY, 0));
    set(`sh${L}`, V(s * d.hipX, d.kneeY, 0));
    set(`ft${L}`, V(s * d.hipX, d.ankleY, 0));
  }
  set('indexR', V(-d.shoulderX, wristY - d.hand[1], 0));
  set('thumbR', V(-d.shoulderX, wristY - d.hand[1], 0));
  set('pantShinR', V(-d.hipX, d.kneeY, 0));
  set('skinShinR', V(-d.hipX, d.kneeY, 0));
  set('scrape', V(-d.hipX, d.kneeY, 0.01));
  set('bandage', V(-d.hipX, d.kneeY, 0.01));
  const socket = V(0, -d.hand[1] * 0.95, 0);

  // face bones
  const eyeP = headPt(d, 0, d.eyeE).p;
  set('eyes', V(0, eyeP.y, eyeP.z - 0.02));
  set('eyesHappy', V(0, eyeP.y, eyeP.z - 0.02));
  set('eyesSleep', V(0, eyeP.y, eyeP.z - 0.02));
  const mouthP = headPt(d, 0, d.mouthE).p;
  set('mouth', V(0, mouthP.y, mouthP.z - 0.012));
  set('mouthD', V(0, mouthP.y + 0.006, mouthP.z - 0.004));
  set('mouthO', V(0, mouthP.y, mouthP.z - 0.006));
  set('browL', headPt(d, d.eyeA, d.browE, 0.004).p);
  set('browR', headPt(d, -d.eyeA, d.browE, 0.004).p);
  set('collar', V(0, d.headC - d.headR[1] * 0.4, 0));
  set('goggles', V(0, eyeP.y, 0));
  set('nosebleed', headPt(d, 0, d.noseE - 0.08, -0.005).p);
  set('swing', V(0, d.swingPivot, 0));
  set('pack', V(0, (d.waistY + d.shoulderY) / 2 + 0.02, -d.chestD - 0.05));
  set('straps', V(0, d.shoulderY - 0.04, 0));
  set('lapBelt', V(0, d.hipY + 0.02, 0));
  // seat belt: anchored on the right shoulder, local -Y runs down the diagonal to the left hip
  const beltA = V(-d.shoulderX * 0.62, d.shoulderY + 0.03, d.chestD * 0.4);
  const beltB = V(d.chestW * 0.85, d.waistY - 0.02, d.chestD * 0.9);
  set('belt', beltA);
  bindQ[BI.belt].setFromUnitVectors(V(0, -1, 0), beltB.clone().sub(beltA).normalize());

  const ctx: Ctx = { b, d, S, look, opts };

  /* ---- body by kind ---- */
  if (!look.adult) buildBoy(ctx, look.boy);
  else buildAdult(ctx, look.a);

  return { geometry: b.build(), dims: d, bind, bindQ, socket, look };
}

interface Ctx {
  b: MeshBuilder;
  d: Dims;
  S: (n: number, min?: number) => number;
  look: Look;
  opts: BuildOpts;
}

/* -------------------------------------------------------------- weight fns */

const W = (n: BoneName) => BI[n];

/** Torso: spine above the waist, blending into the hips below. */
function torsoWeights(d: Dims): WeightSpec {
  return (p) => {
    const s = smoothstep(d.waistY - 0.06, d.waistY + 0.05, p.y);
    return [
      [BI.spine, s],
      [BI.hips, 1 - s],
    ];
  };
}

/** Long robe (thobe / coverall-free skirt): spine on top, hips at the waist, legs below. */
function robeWeights(d: Dims): WeightSpec {
  const top = d.hipY + 0.07;
  const bot = d.ankleY;
  const kneeF = (top - d.kneeY) / (top - bot);
  return (p) => {
    if (p.y > d.hipY + 0.07) {
      const s = smoothstep(d.waistY - 0.07, d.waistY + 0.06, p.y);
      return [
        [BI.spine, s],
        [BI.hips, 1 - s],
      ];
    }
    const f = clamp((top - p.y) / (top - bot), 0, 1);
    const follow = smoothstep(0.0, 0.42, f) * 0.92;
    const sx = clamp(p.x / (d.hipW * 1.05), -1, 1);
    const wl = smoothstep(-0.6, 0.6, sx);
    const shin = smoothstep(kneeF - 0.06, kneeF + 0.22, f);
    const inf: Influence[] = [
      [BI.hips, 1 - follow],
      [BI.thL, follow * wl * (1 - shin)],
      [BI.shL, follow * wl * shin],
      [BI.thR, follow * (1 - wl) * (1 - shin)],
      [BI.shR, follow * (1 - wl) * shin],
    ];
    return inf;
  };
}

/* -------------------------------------------------------------- shared parts */

function ell(c: Ctx, center: THREE.Vector3, r: [number, number, number], color: ColorSpec, w: WeightSpec, seg: [number, number] = [14, 10], o?: AddOpts, rot: [number, number, number] = [0, 0, 0]) {
  c.b.add(unitSphere(c.S(seg[0], 6), c.S(seg[1], 4)), M(center, rot, r), color, w, o);
}
function caps(c: Ctx, a: THREE.Vector3, bb: THREE.Vector3, r: number, color: ColorSpec, w: WeightSpec, radial = 10, o?: AddOpts) {
  const { g, m } = capsuleGeo(a, bb, r, c.S(radial, 6), c.S(3, 2));
  c.b.add(g, m, color, w, o);
  g.dispose();
}
function cyl(c: Ctx, a: THREE.Vector3, bb: THREE.Vector3, r: number, color: ColorSpec, w: WeightSpec, radial = 12, rt = 1, o?: AddOpts, open = false) {
  c.b.add(unitCyl(c.S(radial, 6), rt, open), segM(a, bb, r, r), color, w, o);
}

/** Arms: shoulder ball, upper arm, elbow, forearm, hand (mitten + thumb). sleeve: 'short' | 'long'. */
function arms(c: Ctx, skin: THREE.Color, cloth: ColorSpec, sleeve: 'short' | 'long', clothOpts: AddOpts = {}, skinOpts: AddOpts = {}, cuff?: THREE.Color) {
  const { d } = c;
  for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
    const x = s * d.shoulderX;
    const ua = W(`ua${L}`);
    const fa = W(`fa${L}`);
    const hand = W(`hand${L}`);
    const sY = d.shoulderY;
    const eY = sY - d.ua;
    const wY = eY - d.fa;
    // shoulder ball (cloth)
    ell(c, V(x * 0.97, sY + 0.005, 0), [d.uaR * 1.42, d.uaR * 1.38, d.uaR * 1.32], cloth, ua, [12, 9], clothOpts);
    if (sleeve === 'short') {
      cyl(c, V(x, sY, 0), V(x, sY - d.ua * 0.55, 0), d.uaR * 1.3, cloth, ua, 12, 1, clothOpts);
      caps(c, V(x, sY - 0.02, 0), V(x, eY, 0), d.uaR, skin, ua, 10, skinOpts);
      ell(c, V(x, eY, 0), [d.uaR * 0.97, d.uaR * 0.97, d.uaR * 0.97], skin, fa, [10, 8], skinOpts);
      caps(c, V(x, eY, 0), V(x, wY + 0.01, 0), d.faR, skin, fa, 10, skinOpts);
    } else {
      cyl(c, V(x, sY, 0), V(x, eY, 0), d.uaR * 1.18, cloth, ua, 12, 1, clothOpts);
      ell(c, V(x, eY, 0), [d.uaR * 1.14, d.uaR * 1.14, d.uaR * 1.14], cloth, fa, [10, 8], clothOpts);
      cyl(c, V(x, eY, 0), V(x, wY + 0.012, 0), d.faR * 1.2, cloth, fa, 12, 1.05, clothOpts);
      cyl(c, V(x, wY + 0.03, 0), V(x, wY + 0.004, 0), d.faR * 1.28, cuff ?? cloth, fa, 12, 1, clothOpts);
      caps(c, V(x, wY + 0.02, 0), V(x, wY - 0.004, 0), d.faR * 0.85, skin, hand, 8, skinOpts);
    }
    // mitten hand + thumb (thumb at the front, slightly inward)
    const [hx, hy, hz] = d.hand;
    ell(c, V(x, wY - hy * 0.9, 0), [hx, hy, hz], skin, hand, [12, 9], skinOpts);
    ell(c, V(x - s * hx * 0.35, wY - hy * 0.55, hz * 0.85), [hx * 0.55, hy * 0.5, hz * 0.42], skin, hand, [8, 6], skinOpts, [0.5, 0, 0]);
  }
}

/** Toggle pieces on the hands: pointing finger, big thumb, gloves. */
function handToggles(c: Ctx, skin: THREE.Color) {
  const { d } = c;
  const [hx, hy, hz] = d.hand;
  const wY = d.shoulderY - d.ua - d.fa;
  const x = -d.shoulderX;
  // index finger pointing down (forward when the arm is raised)
  caps(c, V(x, wY - hy * 1.3, hz * 0.45), V(x, wY - hy * 2.75, hz * 0.5), hx * 0.4, skin, W('indexR'), 8);
  // big thumb for thumbs-up: sticks out along +Z (up when the forearm points forward)
  caps(c, V(x - hx * 0.1, wY - hy * 0.55, hz * 0.6), V(x - hx * 0.1, wY - hy * 0.55, hz * 1.75), hx * 0.48, skin, W('thumbR'), 8);
  // gloves (light blue nitrile)
  const glove = col('#7EC8F2');
  for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
    const gx = s * d.shoulderX;
    ell(c, V(gx, wY - hy * 0.9, 0), [hx * 1.12, hy * 1.1, hz * 1.1], glove, W(`gloves${L}`), [12, 9]);
    cyl(c, V(gx, wY + 0.025, 0), V(gx, wY - 0.01, 0), d.faR * 1.25, glove, W(`gloves${L}`), 10);
  }
}

/** Sneakers / shoes on the foot bones. */
function shoes(c: Ctx, upper: THREE.Color, sole: THREE.Color, toe: THREE.Color | null, o: AddOpts = {}, laces?: THREE.Color) {
  const { d } = c;
  const [fw, fh, fl] = d.foot;
  for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
    const x = s * d.hipX;
    const ft = W(`ft${L}`);
    const z = d.footFwd;
    ell(c, V(x, fh * 0.2, z), [fw * 0.52, fh * 0.21, fl * 0.52], sole, ft, [14, 6]);
    ell(c, V(x, fh * 0.55, z - fl * 0.04), [fw * 0.48, fh * 0.48, fl * 0.47], upper, ft, [14, 10], o);
    if (toe) ell(c, V(x, fh * 0.42, z + fl * 0.26), [fw * 0.42, fh * 0.32, fl * 0.24], toe, ft, [10, 8]);
    if (laces) ell(c, V(x, fh * 0.92, z + fl * 0.08), [fw * 0.22, fh * 0.12, fl * 0.16], laces, ft, [8, 6]);
  }
}

/** Head: skull, ears, nose, eyes (+ toggles), brows, mouths, cheeks. */
function face(c: Ctx, skin: THREE.Color, browColor: THREE.Color, o: { blush: boolean; skinSlot?: number }) {
  const { d } = c;
  const [rx, ry, rz] = d.headR;
  const head = W('head');
  const skinO: AddOpts = { slot: o.skinSlot ?? 0 };
  // skull
  ell(c, V(0, d.headC, 0), [rx, ry, rz], skin, head, [28, 20], skinO);
  // jaw / cheeks fullness (boys: rounder lower face)
  if (!d.adult) ell(c, V(0, d.headC - ry * 0.24, rz * 0.08), [rx * 0.86, ry * 0.5, rz * 0.84], skin, head, [20, 12], skinO);
  else ell(c, V(0, d.headC - ry * 0.3, rz * 0.08), [rx * 0.88, ry * 0.66, rz * 0.9], skin, head, [20, 12], skinO);
  // neck
  cyl(c, V(0, d.shoulderY - 0.02, 0), V(0, d.headPivot + 0.05, 0), d.neckR, skin, W('neck'), 12, 1, skinO);
  // ears
  for (const s of [1, -1]) {
    const er: [number, number, number] = d.adult ? [0.016, 0.032, 0.022] : [0.02, 0.034, 0.025];
    c.b.add(unitSphere(c.S(10, 6), c.S(8, 4)), headM(d, s * Math.PI * 0.5, -0.06, 0.006, er), skin, head, skinO);
    c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), headM(d, s * Math.PI * 0.5, -0.06, 0.016, [er[0] * 0.5, er[1] * 0.6, er[2] * 0.6]), shade(skin, 0.86), head, skinO);
  }
  // nose
  const nose: [number, number, number] = d.adult ? [0.02, 0.022, 0.02] : [0.018, 0.015, 0.016];
  c.b.add(unitSphere(c.S(10, 6), c.S(8, 4)), headM(d, 0, d.noseE, d.adult ? 0.006 : 0.002, nose), shade(skin, 0.92), head, skinO);
  // eyes (open): dark ovals + white catch-lights, on the `eyes` bone (blink = squash y)
  const eyeC = col('#2B1A15');
  const white = col('#FFFFFF');
  for (const s of [1, -1]) {
    const a = s * d.eyeA;
    c.b.add(unitSphere(c.S(14, 8), c.S(10, 6)), headM(d, a, d.eyeE, 0.002, d.eye), eyeC, W('eyes'), { outline: 0 });
    c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), headM(d, a, d.eyeE, 0.002, [d.eye[0] * 0.36, d.eye[0] * 0.36, d.eye[2] * 0.6], 0, [-d.eye[0] * 0.3, d.eye[1] * 0.38, d.eye[2] * 0.75]), white, W('eyes'), { outline: 0 });
    c.b.add(unitSphere(c.S(6, 6), c.S(4, 4)), headM(d, a, d.eyeE, 0.002, [d.eye[0] * 0.18, d.eye[0] * 0.18, d.eye[2] * 0.5], 0, [d.eye[0] * 0.3, -d.eye[1] * 0.3, d.eye[2] * 0.8]), white, W('eyes'), { outline: 0 });
    // closed eyes: happy (arch) and sleep (gentle down curve)
    const R = d.eye[0] * 0.95;
    const arc = 2.3;
    const tor = new THREE.TorusGeometry(R, d.eye[0] * 0.2, c.S(5, 4), c.S(10, 6), arc);
    const fHappy = headFrame(d, a, d.eyeE - 0.06, 0.003);
    const mH = frameM(fHappy.p, fHappy.x, fHappy.y, fHappy.z).multiply(M([0, 0, 0], [0, 0, Math.PI / 2 - arc / 2]));
    c.b.add(tor, mH, eyeC, W('eyesHappy'), { outline: 0 });
    const fSleep = headFrame(d, a, d.eyeE + 0.08, 0.003);
    const mS = frameM(fSleep.p, fSleep.x, fSleep.y, fSleep.z).multiply(M([0, 0, 0], [0, 0, -Math.PI / 2 - arc / 2]));
    c.b.add(tor, mS, eyeC, W('eyesSleep'), { outline: 0 });
    tor.dispose();
    // brows
    const bl = d.adult ? 0.042 : 0.034;
    const br = d.adult ? 0.0085 : 0.0068;
    const bf = headFrame(d, a, d.browE, 0.004, -s * 0.1);
    const { g, m } = capsuleGeo(bf.p.clone().addScaledVector(bf.x, -bl / 2), bf.p.clone().addScaledVector(bf.x, bl / 2), br, c.S(6, 4), 2);
    c.b.add(g, m, browColor, W(s > 0 ? 'browL' : 'browR'), { outline: 0, slot: d.adult ? 0 : SLOT.hair });
    g.dispose();
  }
  // cheeks (blush)
  if (o.blush) {
    for (const s of [1, -1])
      c.b.add(unitSphere(c.S(10, 6), c.S(6, 4)), headM(d, s * 0.7, -0.24, 0.0, [0.024, 0.015, 0.006]), mix(skin, '#FF8D9B', 0.32), W('head'), { outline: 0, slot: SLOT.blush });
  }
  // mouth: smile arc (default)
  const mR = d.adult ? 0.03 : 0.031;
  const mArc = 2.1;
  const smile = new THREE.TorusGeometry(mR, d.adult ? 0.0048 : 0.0058, c.S(5, 4), c.S(12, 6), mArc);
  const mf = headFrame(d, 0, d.mouthE, 0.003);
  const smileM = frameM(mf.p.clone().addScaledVector(mf.y, mR * 0.62), mf.x, mf.y, mf.z).multiply(M([0, 0, 0], [0, 0, -Math.PI / 2 - mArc / 2]));
  const lip = col('#6A2B28');
  c.b.add(smile, smileM, lip, W('mouth'), { outline: 0 });
  smile.dispose();
  // open "D" mouth with teeth and tongue (laugh / talk)
  const dm = headFrame(d, 0, d.mouthE + 0.02, 0.0);
  const dMat = (s: [number, number, number], local: [number, number, number]) =>
    frameM(dm.p.clone().addScaledVector(dm.x, local[0]).addScaledVector(dm.y, local[1]).addScaledVector(dm.z, local[2]), dm.x, dm.y, dm.z, s);
  const hs = halfSphere(c.S(14, 8), c.S(6, 4));
  c.b.add(hs, dMat([0.036, 0.034, 0.012], [0, 0, 0.001]), col('#5B1D22'), W('mouthD'), { outline: 0 });
  c.b.add(unitSphere(c.S(10, 6), c.S(6, 4)), dMat([0.02, 0.011, 0.008], [0, -0.022, 0.006]), col('#EF7B86'), W('mouthD'), { outline: 0 });
  c.b.add(unitSphere(c.S(10, 6), c.S(6, 4)), dMat([0.028, 0.0055, 0.005], [0, -0.003, 0.009]), white, W('mouthD'), { outline: 0 });
  hs.dispose();
  // "O" mouth (surprise, cough)
  c.b.add(unitSphere(c.S(12, 6), c.S(8, 4)), headM(d, 0, d.mouthE, 0.002, [0.016, 0.02, 0.008]), col('#5B1D22'), W('mouthO'), { outline: 0 });
  // nose-bleed drop (toggle)
  c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), headM(d, 0.05, d.noseE - 0.1, 0.004, [0.006, 0.009, 0.004]), col('#D2232A'), W('nosebleed'), { outline: 0 });
  c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), headM(d, -0.06, d.noseE - 0.13, 0.004, [0.005, 0.007, 0.004]), col('#D2232A'), W('nosebleed'), { outline: 0 });
}

/** Glasses (frame rings), sunglasses (dark lenses) or lab goggles (toggle bone). */
function eyewear(c: Ctx, kind: 'glasses' | 'sun' | 'goggles', frame: THREE.Color, bone: number, o: AddOpts = {}) {
  const { d } = c;
  const R = kind === 'goggles' ? d.eye[1] * 1.25 : d.eye[1] * 1.12;
  const tube = kind === 'goggles' ? 0.0075 : kind === 'sun' ? 0.004 : 0.0042;
  const out = kind === 'goggles' ? 0.018 : 0.014;
  for (const s of [1, -1]) {
    const f = headFrame(d, s * d.eyeA, d.eyeE + 0.01, out);
    const tor = new THREE.TorusGeometry(R, tube, c.S(5, 4), c.S(18, 8));
    c.b.add(tor, frameM(f.p, f.x, f.y, f.z, [kind === 'sun' ? 1.12 : 1.05, kind === 'goggles' ? 0.85 : 0.9, 1]), frame, bone, o);
    tor.dispose();
    if (kind === 'sun') c.b.add(unitSphere(c.S(14, 8), c.S(10, 6)), frameM(f.p, f.x, f.y, f.z, [R * 1.1, R * 0.86, 0.008]), col('#1A2230'), bone, { ...o, outline: 0 });
    // temple arm toward the ear
    const pa = headPt(d, s * (d.eyeA + 0.32), d.eyeE + 0.03, out * 0.7).p;
    const pb = headPt(d, s * 1.45, d.eyeE + 0.05, 0.008).p;
    caps(c, pa, pb, tube * 0.9, frame, bone, 5, o);
  }
  // bridge
  const p1 = headPt(d, d.eyeA - 0.2, d.eyeE + 0.04, out).p;
  const p2 = headPt(d, -d.eyeA + 0.2, d.eyeE + 0.04, out).p;
  caps(c, p1, p2, tube * 0.9, frame, bone, 5, o);
  if (kind === 'goggles') {
    // elastic band around the back of the head only (temple to temple), so it never crosses the eyes
    const [rx, , rz] = d.headR;
    const band = new THREE.TorusGeometry(1, 0.006 / Math.max(rx, rz), c.S(4, 3), c.S(22, 8), 3.58);
    band.rotateZ(-3.36); // torus angle t maps to head azimuth a = PI/2 - t: arc covers a = 1.35 .. 2PI - 1.35
    c.b.add(band, M([0, headPt(d, 0, d.eyeE + 0.03).p.y, -0.004], [Math.PI / 2, 0, 0], [rx + 0.008, rz + 0.01, 1]), frame, bone, o);
    band.dispose();
  }
}

/* ----------------------------------------------------------------- hair */

function hairStyleGeo(c: Ctx, style: HairStyle) {
  const { d } = c;
  const P = Math.PI;
  const side = P * 0.45;
  const front = style === 'fringe' ? P * 0.36 : style === 'buzz' ? P * 0.3 : P * 0.31;
  const back = P * 0.66;
  const thetaMax = (phi: number) => {
    const cphi = Math.cos(phi);
    let t = side + (front - side) * Math.max(0, cphi) ** 1.5 + (back - side) * Math.max(0, -cphi);
    if (style === 'fringe' && cphi > 0.45) t += 0.05 * Math.abs(Math.sin(phi * 9)) * smoothstep(0.45, 0.8, cphi);
    if (style === 'side') t += 0.05 * smoothstep(0.2, 0.9, cphi) * (Math.sin(phi) > 0 ? -1 : 0.6);
    return t;
  };
  const top = style === 'buzz' ? 0.008 : style === 'tuft' ? 0.03 : 0.026;
  const thick = (v: number, phi: number) => {
    let t = top * (1 - v * v) + 0.004;
    if (style === 'side') t += 0.008 * Math.max(0, Math.sin(-phi)) * (1 - v);
    return t;
  };
  return headCap(d, thetaMax, thick, c.S(36, 12), c.S(12, 5));
}

function hair(c: Ctx, style: HairStyle, color: THREE.Color, o: AddOpts = {}) {
  const { d } = c;
  const g = hairStyleGeo(c, style);
  c.b.add(g, new THREE.Matrix4(), style === 'buzz' ? shade(color, 1.25) : color, W('head'), o);
  g.dispose();
  if (style === 'tuft') {
    // a few soft spikes at the front top
    for (const [a, e, s] of [
      [0.18, 1.0, 1],
      [-0.12, 1.05, 0.9],
      [0.0, 1.15, 0.8],
    ] as const) {
      const f = headFrame(d, a, e, 0.02);
      const cone = new THREE.ConeGeometry(0.03 * s, 0.06 * s, c.S(8, 5));
      c.b.add(cone, frameM(f.p.clone().addScaledVector(f.z, 0.012), f.x, f.z, f.y.clone().negate()), color, W('head'), o);
      cone.dispose();
    }
  }
}

/* ------------------------------------------------------------------- boys */

function buildBoy(c: Ctx, bl: BoyLook) {
  const { d } = c;
  const tpl = !!c.opts.template;
  const skin = col(SKIN_TONES[clamp(Math.round(bl.skin), 0, 4)]);
  const shirt = col(bl.shirt);
  const stripe = bl.striped ? col(bl.stripe) : shirt;
  const pants = col(PANTS_COLORS[bl.pants]);
  const hairC = col(HAIR_COLORS[bl.hair]);
  const shirtO: AddOpts = { slot: SLOT.shirt };
  const skinO: AddOpts = { slot: SLOT.skin };
  const pantsO: AddOpts = { slot: SLOT.pants };

  // --- head & face
  face(c, skin, hairC, { blush: true, skinSlot: SLOT.skin });
  if (tpl) {
    (['crop', 'fringe', 'tuft', 'side', 'buzz'] as HairStyle[]).forEach((st) => hair(c, st, hairC, { slot: SLOT.hair, variant: VARIANT[st] }));
    eyewear(c, 'glasses', col('#1E2A3B'), W('head'), { variant: VARIANT.glasses });
  } else {
    hair(c, bl.hairStyle, hairC);
    if (bl.glasses) eyewear(c, 'glasses', col(bl.glasses), W('head'));
  }

  // --- torso (T-shirt), stripes as stacked bands
  const sw = d.chestW;
  const y0 = d.hipY - 0.01;
  const prof: [number, number][] = [
    [0.0001, y0],
    [sw * 0.93, y0],
    [sw * 0.97, y0 + 0.03],
    [sw * 0.96 + bl.chub * 0.008, d.waistY + 0.02],
    [sw * 1.0 + bl.chub * 0.012, (d.waistY + d.shoulderY) / 2],
    [sw * 1.0, d.shoulderY - 0.06],
    [sw * 0.94, d.shoulderY - 0.012],
    [sw * 0.78, d.shoulderY + 0.022],
    [sw * 0.5, d.shoulderY + 0.036],
    [d.neckR + 0.006, d.shoulderY + 0.04],
  ];
  const lathe = latheGeo(prof, c.S(26, 10));
  const zs = d.chestD / sw;
  const bandH = 0.045 * (d.H / 1.3);
  const stripeFn = (p: THREE.Vector3) => {
    if (p.y > d.shoulderY - 0.02) return shirt;
    const k = Math.floor((p.y - y0) / bandH);
    return k % 2 === 1 ? stripe : shirt;
  };
  if (bl.striped || tpl) {
    // build the lathe as rings so stripes have crisp edges: duplicate per band by clipping
    addBandedLathe(c, prof, zs, y0, bandH, shirt, stripe, torsoWeights(d), d.shoulderY - 0.02);
  } else {
    c.b.add(lathe, M([0, 0, 0], [0, 0, 0], [1, 1, zs]), stripeFn, torsoWeights(d), shirtO);
  }
  lathe.dispose();
  // crew-neck collar
  const collarG = new THREE.TorusGeometry(d.neckR + 0.01, 0.011 * (d.H / 1.3), c.S(6, 4), c.S(18, 8));
  c.b.add(collarG, M([0, d.shoulderY + 0.036, 0.004], [Math.PI / 2, 0, 0], [1, 0.9, 1]), shade(shirt, 0.82), W('spine'), { slot: SLOT.collar });
  collarG.dispose();

  // --- arms
  arms(c, skin, shirt, 'short', shirtO, skinO);
  handToggles(c, skin);

  // --- pants: pelvis, thighs, knees, shins (right shin can roll up), cuffs
  ell(c, V(0, d.hipY + 0.028, 0), [d.hipW, 0.092 * (d.H / 1.3), d.chestD * 0.93], pants, W('hips'), [18, 10], pantsO);
  for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
    const x = s * d.hipX;
    caps(c, V(x, d.hipY + 0.01, 0), V(x, d.kneeY + 0.01, 0), d.thighR, pants, W(`th${L}`), 12, pantsO);
    ell(c, V(x, d.kneeY, 0.002), [d.thighR * 0.95, d.thighR * 0.95, d.thighR * 0.95], pants, W(`th${L}`), [12, 8], pantsO);
    const shinBone = L === 'R' ? W('pantShinR') : W('shL');
    caps(c, V(x, d.kneeY, 0), V(x, d.ankleY + 0.05, 0), d.shinR, pants, shinBone, 12, pantsO);
    cyl(c, V(x, d.ankleY + 0.065, 0), V(x, d.ankleY + 0.03, 0), d.shinR * 1.1, shade(pants, 0.9), shinBone, 12, 1, pantsO);
    // sock
    cyl(c, V(x, d.ankleY + 0.035, 0), V(x, d.ankleY - 0.005, 0), d.shinR * 0.78, col('#F2F2EE'), W(`ft${L}`), 10);
  }
  // rolled-up right trouser leg (bare shin + cuff roll) + scrape + bandage (toggles)
  {
    const x = -d.hipX;
    caps(c, V(x, d.kneeY - 0.005, 0), V(x, d.ankleY + 0.04, 0), d.shinR * 0.78, skin, W('skinShinR'), 10, skinO);
    const roll = new THREE.TorusGeometry(d.shinR * 1.02, 0.017, c.S(6, 4), c.S(14, 8));
    c.b.add(roll, M([x, d.kneeY + 0.03, 0], [Math.PI / 2, 0, 0]), shade(pants, 0.9), W('skinShinR'), pantsO);
    roll.dispose();
    ell(c, V(x, d.kneeY - 0.035, d.shinR * 0.74), [0.022, 0.017, 0.006], col('#D9534F'), W('scrape'), [10, 6], { outline: 0 });
    ell(c, V(x, d.kneeY - 0.035, d.shinR * 0.76), [0.034, 0.022, 0.006], col('#F6B04A'), W('bandage'), [12, 6], { outline: 0 });
    ell(c, V(x, d.kneeY - 0.035, d.shinR * 0.79), [0.013, 0.012, 0.004], col('#FFFFFF'), W('bandage'), [8, 6], { outline: 0 });
  }
  // sneakers
  shoes(c, tpl ? col('#2D8CFF') : col(bl.shoe), col('#FAFAF7'), col('#F4F4F0'), { slot: SLOT.shoe }, col('#FFFFFF'));

  // --- backpack + straps
  if (bl.backpack || tpl) {
    const pc = col(bl.backpack ?? '#2D8CFF');
    const packO: AddOpts = { slot: SLOT.pack, variant: tpl ? VARIANT.pack : 0 };
    const k = d.H / 1.3;
    const bd = 0.105 * k; // pack depth: a school bag, flush against the back
    const pz = -(d.chestD + bd / 2 + 0.004);
    const py = (d.waistY + d.shoulderY) / 2 + 0.02;
    const dark = shade(pc, 0.78);
    const box = (w: number, h: number, dp: number, r: number, at: [number, number, number], color: THREE.Color) => {
      const g = roundedBox(w * k, h * k, dp * k, r * k, 3);
      c.b.add(g, M([at[0], py + at[1] * k, pz + at[2] * k]), color, W('pack'), packO);
      g.dispose();
    };
    box(0.215, 0.285, 0.105, 0.03, [0, 0, 0], pc); // main compartment
    box(0.2, 0.09, 0.112, 0.03, [0, 0.105, 0.002], dark); // top flap
    box(0.16, 0.12, 0.04, 0.02, [0, -0.07, -0.062], dark); // front pocket
    for (const sx of [1, -1]) box(0.03, 0.15, 0.06, 0.012, [sx * 0.118, -0.06, -0.004], dark); // side bottle pockets
    const loop = new THREE.TorusGeometry(0.025 * k, 0.007, c.S(5, 4), c.S(10, 6), Math.PI);
    c.b.add(loop, M([0, py + 0.145 * k, pz + 0.01]), shade(pc, 0.7), W('pack'), packO);
    loop.dispose();
    for (const s of [1, -1]) {
      const x = s * d.chestW * 0.5;
      const pts = [
        V(x * 1.1, py + 0.08 * k, pz + 0.035),
        V(x * 1.05, d.shoulderY + 0.03, -d.chestD * 0.6),
        V(x, d.shoulderY + 0.045, 0),
        V(x * 0.95, d.shoulderY - 0.02, d.chestD * 0.95),
        V(x * 0.95, d.waistY + 0.07, d.chestD * 1.04),
      ];
      const tube = tubeGeo(pts, 0.009 * k, c.S(18, 8), c.S(5, 4));
      c.b.add(tube, M([0, 0, 0], [0, 0, 0], [1, 1, 1]), shade(pc, 0.7), W('straps'), packO);
      tube.dispose();
    }
  }

  // --- seat belt (toggle; grows along the bone's -Y) and lap belt
  {
    const beltC = col('#56606E');
    const A = V(-d.shoulderX * 0.62, d.shoulderY + 0.03, d.chestD * 0.4);
    const Bp = V(d.chestW * 0.85, d.waistY - 0.02, d.chestD * 0.9);
    const pts = [A, V(-d.shoulderX * 0.45, d.shoulderY - 0.02, d.chestD * 1.02), V(0.0, (d.shoulderY + d.waistY) / 2, d.chestD * 1.12), V(d.chestW * 0.6, d.waistY + 0.04, d.chestD * 1.08), Bp];
    const tube = tubeGeo(pts, 0.012, c.S(20, 8), c.S(5, 4));
    c.b.add(tube, M([0, 0, 0], [0, 0, 0], [1, 1, 1.0]), beltC, W('belt'), { outline: 1 });
    tube.dispose();
    ell(c, Bp.clone().add(V(0, 0.005, 0.01)), [0.022, 0.016, 0.01], col('#C9CED6'), W('belt'), [8, 6]);
    const lap = tubeGeo([V(d.hipW * 1.05, d.hipY + 0.05, 0), V(d.hipW * 0.6, d.hipY + 0.04, d.chestD * 1.15), V(-d.hipW * 0.6, d.hipY + 0.04, d.chestD * 1.15), V(-d.hipW * 1.05, d.hipY + 0.05, 0)], 0.012, c.S(16, 8), c.S(5, 4));
    c.b.add(lap, new THREE.Matrix4(), beltC, W('lapBelt'));
    lap.dispose();
  }

  // --- collar pulled over the nose (toggle)
  {
    const [rx, ry, rz] = d.headR;
    const g = gridGeo(
      c.S(16, 8),
      c.S(6, 3),
      (u, v) => {
        const phi = (u - 0.5) * 2.6;
        const e = -0.12 - v * 1.0;
        const t = 0.016 + v * 0.01;
        const dir = headDir(phi, e);
        return V((rx + t) * dir.x, d.headC + (ry + t) * dir.y, (rz + t) * dir.z);
      },
      {},
    );
    c.b.add(g, new THREE.Matrix4(), shirt, W('collar'), shirtO);
    g.dispose();
  }

  // --- lab goggles (toggle)
  eyewear(c, 'goggles', col('#2BB673'), W('goggles'));

  // --- swing seat + chains (toggle; posed by the swing clip)
  swingRig(c);
}

/** Torso lathe with alternating color bands (striped shirts; crowd template stripes). */
function addBandedLathe(c: Ctx, prof: [number, number][], zs: number, y0: number, bandH: number, a: THREE.Color, b: THREE.Color, w: WeightSpec, stripeTop: number) {
  // Resample the profile into many rings so band edges fall on ring boundaries.
  const ys: number[] = [];
  const topY = prof[prof.length - 1][1];
  for (let y = y0; y < stripeTop; y += bandH / 2) ys.push(y);
  const rOf = (y: number) => {
    for (let i = 1; i < prof.length; i++) {
      const [r0, a0] = prof[i - 1];
      const [r1, a1] = prof[i];
      if (y <= a1 && a1 > a0) return r0 + ((r1 - r0) * (y - a0)) / (a1 - a0);
    }
    return prof[prof.length - 1][0];
  };
  const seg = c.S(26, 10);
  // bottom cap
  const capPts: [number, number][] = [
    [0.0001, y0],
    [rOf(y0 + 0.0001), y0],
  ];
  c.b.add(latheGeo(capPts, seg), M([0, 0, 0], [0, 0, 0], [1, 1, zs]), a, w, { slot: SLOT.shirt });
  let k = 0;
  for (let y = y0; y < stripeTop - 1e-4; y += bandH, k++) {
    const yEnd = Math.min(stripeTop, y + bandH);
    const pts: [number, number][] = [];
    const n = 3;
    for (let i = 0; i <= n; i++) {
      const yy = y + ((yEnd - y) * i) / n;
      pts.push([rOf(yy), yy]);
    }
    const g = latheGeo(pts, seg);
    const isStripe = k % 2 === 1;
    c.b.add(g, M([0, 0, 0], [0, 0, 0], [1, 1, zs]), isStripe ? b : a, w, { slot: isStripe ? SLOT.stripe : SLOT.shirt });
    g.dispose();
  }
  // shoulders / top (plain shirt color)
  const topPts: [number, number][] = [[rOf(stripeTop), stripeTop]];
  for (const [r, y] of prof) if (y > stripeTop) topPts.push([r, y]);
  if (topPts[topPts.length - 1][1] < topY) topPts.push([prof[prof.length - 1][0], topY]);
  const tg = latheGeo(topPts, seg);
  c.b.add(tg, M([0, 0, 0], [0, 0, 0], [1, 1, zs]), a, w, { slot: SLOT.shirt });
  tg.dispose();
}

function swingRig(c: Ctx) {
  const { d } = c;
  const L = d.swingPivot - d.swingSeat;
  const chain = col('#9AA3AD');
  const seat = col('#2E3440');
  const bone = W('swing');
  for (const s of [1, -1]) cyl(c, V(s * 0.22, d.swingPivot, 0), V(s * 0.22, d.swingSeat + 0.01, 0), 0.008, chain, bone, 6);
  c.b.add(unitSphere(c.S(12, 6), c.S(6, 4)), M([0, d.swingSeat, 0], [0, 0, 0], [0.24, 0.025, 0.09]), seat, bone);
  if (L <= 0) throw new Error('swing rig');
}

/* ----------------------------------------------------------------- adults */

function buildAdult(c: Ctx, a: AdultLook) {
  const { d } = c;
  const skin = col(SKIN_TONES[clamp(a.skin, 0, 4)]);
  const cloth = col(a.cloth);
  const trousers = col(a.trousers);
  const hairC = col(a.hair);
  const skinO: AddOpts = { slot: SLOT.skin };

  face(c, skin, hairC, { blush: false, skinSlot: SLOT.skin });
  // hair (visible under caps / no headwear)
  if (a.headwear === 'none' || a.headwear === 'cap') hair(c, 'crop', hairC);
  // beard & mustache
  beard(c, a, skin, hairC);
  // headwear
  if (a.headwear === 'ghutra' || a.headwear === 'shemagh') headCloth(c, a);
  if (a.headwear === 'cap') cap(c, a);
  if (a.sunglasses) eyewear(c, 'sun', col('#20262E'), W('head'));
  else if (a.glasses) eyewear(c, 'glasses', col(a.glasses), W('head'));
  eyewear(c, 'goggles', col('#2BB673'), W('goggles'));

  const belly = a.belly;
  const cw = d.chestW;
  if (a.outfit === 'thobe') {
    const prof: [number, number][] = [
      [0.0001, d.ankleY + 0.035],
      [cw * 1.1, d.ankleY + 0.035],
      [cw * 1.07, d.kneeY],
      [cw * 1.02, d.hipY],
      [cw * (0.97 + belly * 0.12), d.waistY],
      [cw * (1.0 + belly * 0.14), d.waistY + 0.13],
      [cw * 1.02, d.shoulderY - 0.14],
      [cw * 1.0, d.shoulderY - 0.05],
      [cw * 0.9, d.shoulderY + 0.012],
      [cw * 0.62, d.shoulderY + 0.045],
      [d.neckR + 0.012, d.shoulderY + 0.055],
    ];
    const g = latheGeo(prof, c.S(30, 12));
    // subdivide vertically for smooth leg-following deformation
    const zs = d.chestD / cw;
    addSubdividedLathe(c, prof, zs, cloth, robeWeights(d), 26);
    g.dispose();
    // stand collar, placket, buttons
    cyl(c, V(0, d.shoulderY + 0.045, 0.004), V(0, d.shoulderY + 0.085, 0.006), d.neckR + 0.012, shade(cloth, 0.97), W('neck'), 16);
    const front = (y: number) => {
      // z of the robe front at height y (approx)
      const r = y > d.shoulderY - 0.05 ? cw * 0.95 : cw * 1.02;
      return r * zs;
    };
    ell(c, V(0, d.shoulderY - 0.07, front(d.shoulderY - 0.07) + 0.002), [0.016, 0.1, 0.004], shade(cloth, 0.93), W('spine'), [8, 8], { outline: 0 });
    for (const yy of [d.shoulderY - 0.03, d.shoulderY - 0.1])
      ell(c, V(0, yy, front(yy) + 0.006), [0.006, 0.006, 0.004], col('#D9C27A'), W('spine'), [6, 4], { outline: 0 });
    // white sirwal shins + shoes
    for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
      const x = s * d.hipX;
      caps(c, V(x, d.kneeY, 0), V(x, d.ankleY + 0.04, 0), d.shinR, col('#F2F1EA'), W(`sh${L}`), 10);
    }
    shoes(c, col(a.shoes), shade(col(a.shoes), 0.7), null);
    arms(c, skin, cloth, 'long', {}, skinO, shade(cloth, 0.95));
  } else {
    // shirt-style torso
    const hem = a.outfit === 'casual' ? d.hipY + 0.02 : d.waistY - 0.06;
    const prof: [number, number][] = [
      [0.0001, hem],
      [cw * 0.95, hem],
      [cw * (0.97 + belly * 0.1), d.waistY + 0.02],
      [cw * (1.0 + belly * 0.14), d.waistY + 0.14],
      [cw * 1.02, d.shoulderY - 0.14],
      [cw * 1.0, d.shoulderY - 0.05],
      [cw * 0.9, d.shoulderY + 0.012],
      [cw * 0.62, d.shoulderY + 0.045],
      [d.neckR + 0.01, d.shoulderY + 0.052],
    ];
    const zs = d.chestD / cw;
    addSubdividedLathe(c, prof, zs, cloth, torsoWeights(d), 14);
    // pelvis + legs (trousers)
    ell(c, V(0, d.hipY + 0.04, 0), [d.hipW, 0.115, d.chestD * 0.95], trousers, W('hips'), [18, 10]);
    for (const [s, L] of [[1, 'L'], [-1, 'R']] as const) {
      const x = s * d.hipX;
      caps(c, V(x, d.hipY + 0.01, 0), V(x, d.kneeY, 0), d.thighR, trousers, W(`th${L}`), 12);
      ell(c, V(x, d.kneeY, 0), [d.thighR * 0.94, d.thighR * 0.94, d.thighR * 0.94], trousers, W(`th${L}`), [12, 8]);
      caps(c, V(x, d.kneeY, 0), V(x, d.ankleY + 0.05, 0), d.shinR, trousers, W(`sh${L}`), 12);
      cyl(c, V(x, d.ankleY + 0.07, 0), V(x, d.ankleY + 0.035, 0), d.shinR * 1.1, shade(trousers, 0.92), W(`sh${L}`), 12);
      if (a.outfit === 'coverall')
        for (const yy of [d.kneeY - 0.12, d.kneeY - 0.18]) cyl(c, V(x, yy + 0.012, 0), V(x, yy - 0.012, 0), d.shinR * 1.06, col('#DCE3EA'), W(`sh${L}`), 12);
    }
    shoes(c, col(a.shoes), shade(col(a.shoes), 0.7), null);
    const front = (y: number) => (y > d.shoulderY - 0.05 ? cw * 0.95 : cw * 1.0 + belly * 0.02) * zs;
    if (a.outfit === 'uniform') {
      arms(c, skin, cloth, 'long', {}, skinO, shade(cloth, 0.9));
      // belt + buckle
      const beltG = new THREE.TorusGeometry(1, 0.018 / cw, c.S(5, 4), c.S(28, 10));
      c.b.add(beltG, M([0, d.waistY - 0.045, 0], [Math.PI / 2, 0, 0], [cw * 0.99, cw * zs * 1.02, cw]), col('#15181E'), W('hips'));
      beltG.dispose();
      ell(c, V(0, d.waistY - 0.045, cw * zs + 0.012), [0.026, 0.02, 0.008], col('#C8CDD4'), W('hips'), [8, 6]);
      // epaulettes, badge, name tag, pockets
      for (const s of [1, -1]) c.b.add(unitSphere(c.S(10, 6), c.S(6, 4)), M([s * d.shoulderX * 0.82, d.shoulderY + 0.035, 0], [0, 0, s * -0.25], [0.05, 0.012, 0.04]), shade(cloth, 0.75), W('spine'));
      ell(c, V(0.085, d.shoulderY - 0.1, front(d.shoulderY - 0.1) + 0.004), [0.02, 0.024, 0.006], col('#E5B93A'), W('spine'), [10, 8], { outline: 0 });
      ell(c, V(-0.085, d.shoulderY - 0.09, front(d.shoulderY - 0.09) + 0.004), [0.03, 0.01, 0.004], col('#F4F4F0'), W('spine'), [8, 6], { outline: 0 });
      for (const s of [1, -1]) ell(c, V(s * 0.085, d.shoulderY - 0.16, front(d.shoulderY - 0.16) + 0.003), [0.038, 0.03, 0.005], shade(cloth, 0.86), W('spine'), [8, 6], { outline: 0 });
      // shirt collar
      for (const s of [1, -1]) c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), M([s * 0.04, d.shoulderY + 0.045, 0.05], [0.5, s * 0.6, 0], [0.04, 0.012, 0.028]), shade(cloth, 1.1), W('spine'));
    } else if (a.outfit === 'coverall') {
      arms(c, skin, cloth, 'long', {}, skinO, shade(cloth, 0.85));
      ell(c, V(0, (d.waistY + d.shoulderY) / 2, front((d.waistY + d.shoulderY) / 2) + 0.002), [0.007, (d.shoulderY - d.waistY) / 2 + 0.06, 0.004], col('#C9D2DC'), W('spine'), [6, 8], { outline: 0 });
      ell(c, V(0.08, d.shoulderY - 0.13, front(d.shoulderY - 0.13) + 0.004), [0.04, 0.03, 0.005], shade(cloth, 0.82), W('spine'), [8, 6], { outline: 0 });
      for (const s of [1, -1]) c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), M([s * 0.045, d.shoulderY + 0.045, 0.05], [0.5, s * 0.6, 0], [0.045, 0.012, 0.03]), shade(cloth, 0.9), W('spine'));
    } else {
      // casual polo
      arms(c, skin, cloth, 'short', {}, skinO);
      for (const s of [1, -1]) c.b.add(unitSphere(c.S(8, 6), c.S(6, 4)), M([s * 0.042, d.shoulderY + 0.045, 0.05], [0.45, s * 0.65, 0], [0.042, 0.011, 0.03]), shade(cloth, 1.12), W('spine'));
      ell(c, V(0, d.shoulderY - 0.02, front(d.shoulderY - 0.02) + 0.001), [0.012, 0.05, 0.004], shade(cloth, 0.88), W('spine'), [6, 6], { outline: 0 });
      for (const yy of [d.shoulderY - 0.0, d.shoulderY - 0.045]) ell(c, V(0, yy, front(yy) + 0.005), [0.005, 0.005, 0.003], col('#F4F4F0'), W('spine'), [6, 4], { outline: 0 });
    }
  }
  handToggles(c, skin);

  // vests over the torso
  if (a.vest) {
    const v = col(a.vest.color);
    const top = d.shoulderY + 0.02;
    const prof: [number, number][] = [
      [cw * (1.03 + belly * 0.13), d.waistY - 0.1],
      [cw * (1.03 + belly * 0.15), d.waistY + 0.12],
      [cw * 1.06, d.shoulderY - 0.13],
      [cw * 1.04, d.shoulderY - 0.05],
      [cw * 0.94, top],
      [cw * 0.7, d.shoulderY + 0.05],
    ];
    const zs = d.chestD / cw;
    const g = latheGeo(prof, c.S(28, 10));
    c.b.add(g, M([0, 0, 0], [0, 0, 0], [1, 1, zs]), v, torsoWeights(d));
    g.dispose();
    const front = (y: number) => cw * 1.06 * zs;
    if (a.vest.reflective) {
      for (const yy of [d.waistY + 0.02, d.waistY + 0.16]) {
        const bp: [number, number][] = [
          [cw * (1.06 + belly * 0.15), yy - 0.022],
          [cw * (1.06 + belly * 0.15), yy + 0.022],
        ];
        const bg = latheGeo(bp, c.S(28, 10));
        c.b.add(bg, M([0, 0, 0], [0, 0, 0], [1, 1, zs]), col('#E9ECEF'), W('spine'));
        bg.dispose();
      }
    }
    if (a.vest.cross) {
      const y = d.shoulderY - 0.12;
      const z = front(y) + 0.006;
      ell(c, V(0.09, y, z), [0.035, 0.035, 0.005], col('#FFFFFF'), W('spine'), [14, 6], { outline: 0 });
      ell(c, V(0.09, y, z + 0.004), [0.022, 0.007, 0.003], col('#1FAE5B'), W('spine'), [8, 4], { outline: 0 });
      ell(c, V(0.09, y, z + 0.004), [0.007, 0.022, 0.003], col('#1FAE5B'), W('spine'), [8, 4], { outline: 0 });
    }
  }
}

/** Lathe split into horizontal slices so skinning bends smoothly. */
function addSubdividedLathe(c: Ctx, prof: [number, number][], zs: number, color: ColorSpec, w: WeightSpec, steps: number) {
  const pts: [number, number][] = [prof[0]];
  for (let i = 1; i < prof.length; i++) {
    const [r0, y0] = prof[i - 1];
    const [r1, y1] = prof[i];
    const n = Math.max(1, Math.round((Math.abs(y1 - y0) / 1.6) * steps));
    for (let k = 1; k <= n; k++) pts.push([r0 + ((r1 - r0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  }
  const g = latheGeo(pts, c.S(30, 12));
  c.b.add(g, M([0, 0, 0], [0, 0, 0], [1, 1, zs]), color, w);
  g.dispose();
}

function beard(c: Ctx, a: AdultLook, skin: THREE.Color, hairC: THREE.Color) {
  const { d } = c;
  const [rx, ry, rz] = d.headR;
  if (a.beard === 'none') return;
  const head = W('head');
  if (a.beard !== 'mustache') {
    const thick = a.beard === 'full' ? 0.016 : a.beard === 'short' ? 0.009 : 0.003;
    const color = a.beard === 'stubble' ? mix(skin, hairC, 0.38) : hairC;
    const g = gridGeo(
      c.S(22, 10),
      c.S(8, 4),
      (u, v) => {
        const phi = (u - 0.5) * 3.3;
        const eTop = -0.46 + 0.42 * smoothstep(0.35, 1.45, Math.abs(phi));
        const eBot = -1.3;
        const e = eTop + (eBot - eTop) * v;
        const t = thick * Math.sin(Math.min(1, v * 3 + 0.2) * Math.PI * 0.5) * (a.beard === 'full' ? 1 + 0.4 * v : 1) + 0.002;
        const dir = headDir(phi, e);
        return V((rx + t) * dir.x, d.headC + (ry + t) * dir.y, (rz + t) * dir.z);
      },
      {},
    );
    c.b.add(g, new THREE.Matrix4(), color, head);
    g.dispose();
  }
  if (a.beard !== 'stubble') {
    // mustache: two soft lobes under the nose
    for (const s of [1, -1]) c.b.add(unitSphere(c.S(10, 6), c.S(6, 4)), headM(d, s * 0.11, d.mouthE + 0.13, 0.006, [0.026, 0.011, 0.01], s * -0.25), hairC, head, { outline: 0 });
  }
}

/** Ghutra (white) or shemagh (red-white check) with optional igal. */
function headCloth(c: Ctx, a: AdultLook) {
  const { d } = c;
  const [rx, ry, rz] = d.headR;
  const white = col('#F7F6F1');
  const red = col('#C9252F');
  const isShemagh = a.headwear === 'shemagh';
  const t = 0.02;
  const band = Math.PI * 0.37;
  const cell = isShemagh ? (i: number, j: number) => ((i + j) % 2 === 0 ? red : (i % 4 === 1 && j % 2 === 1) || (j % 4 === 3 && i % 2 === 0) ? red : white) : undefined;
  // top cap
  const capG = headCap(d, () => band, (v) => t + 0.006 * (1 - v), c.S(36, 12), c.S(8, 4), cell);
  c.b.add(capG, new THREE.Matrix4(), isShemagh ? 'attr' : white, W('head'));
  capG.dispose();
  // drape: from the forehead band around the sides and back, falling to the shoulders
  const phiO = 0.92;
  const th1 = Math.PI * 0.6;
  const Rbx = d.chestW * 1.12;
  const Rbz = d.chestD * 1.3;
  const drapePt = (u: number, v: number, inset: number) => {
    const phi = phiO + u * (Math.PI * 2 - 2 * phiO);
    const cphi = Math.cos(phi);
    const headPart = 0.55;
    const tt = t - inset;
    if (v <= headPart) {
      const th = band + ((th1 - band) * v) / headPart;
      return V((rx + tt) * Math.sin(th) * Math.sin(phi), d.headC + (ry + tt) * Math.cos(th), (rz + tt) * Math.sin(th) * Math.cos(phi));
    }
    const s = (v - headPart) / (1 - headPart);
    const p0 = V((rx + tt) * Math.sin(th1) * Math.sin(phi), d.headC + (ry + tt) * Math.cos(th1), (rz + tt) * Math.sin(th1) * Math.cos(phi));
    const fFront = smoothstep(0.15, 0.62, cphi);
    const fBack = smoothstep(0.1, 0.9, -cphi);
    const yb = d.shoulderY + 0.075 - 0.2 * fFront - 0.13 * fBack;
    const p1 = V((Rbx - inset) * Math.sin(phi), yb, (Rbz - inset) * cphi);
    const ease = s * s * (3 - 2 * s);
    const p = p0.clone().lerp(p1, ease);
    // outward bulge so the cloth falls clear of the neck
    const bulge = Math.sin(s * Math.PI) * 0.025;
    p.x += Math.sin(phi) * bulge;
    p.z += cphi * bulge;
    p.y = p0.y + (p1.y - p0.y) * s;
    return p;
  };
  const nu = c.S(30, 12);
  const nv = c.S(12, 6);
  const outer = gridGeo(nu, nv, (u, v) => drapePt(u, v, 0), { cellColor: cell });
  c.b.add(outer, new THREE.Matrix4(), isShemagh ? 'attr' : white, W('head'));
  outer.dispose();
  const inner = gridGeo(nu, nv, (u, v) => drapePt(u, v, 0.004), { flip: true });
  c.b.add(inner, new THREE.Matrix4(), isShemagh ? shade(red, 0.85) : shade(white, 0.9), W('head'), { outline: 0 });
  inner.dispose();
  if (a.igal) {
    const ig = col('#17181B');
    for (const [th, k] of [
      [Math.PI * 0.28, 1],
      [Math.PI * 0.33, 1.03],
    ] as const) {
      const y = d.headC + (ry + t) * Math.cos(th) + 0.004;
      const R = Math.sin(th);
      const tor = new THREE.TorusGeometry(1, 0.012 / ((rx + t) * R), c.S(6, 4), c.S(28, 12));
      c.b.add(tor, M([0, y, -0.004], [Math.PI / 2 - 0.08, 0, 0], [(rx + t + 0.006) * R * k, (rz + t + 0.006) * R * k, (rx + t) * R]), ig, W('head'));
      tor.dispose();
    }
  }
}

function cap(c: Ctx, a: AdultLook) {
  const { d } = c;
  const [, ry, rz] = d.headR;
  const cc = col(a.capColor);
  const th = Math.PI * 0.4;
  const g = headCap(d, () => th, (v) => 0.016 + 0.01 * (1 - v), c.S(30, 12), c.S(8, 4));
  c.b.add(g, new THREE.Matrix4(), cc, W('head'));
  g.dispose();
  // visor
  const y = d.headC + (ry + 0.016) * Math.cos(th) - 0.004;
  const z = (rz + 0.016) * Math.sin(th) - 0.01;
  const visor = new THREE.CylinderGeometry(1, 1, 1, c.S(16, 8), 1, false, -Math.PI / 2, Math.PI);
  c.b.add(visor, M([0, y, z], [0.18, 0, 0], [0.085, 0.012, 0.075]), shade(cc, 0.85), W('head'));
  visor.dispose();
  // top button
  ell(c, V(0, d.headC + ry + 0.035, 0), [0.012, 0.008, 0.012], shade(cc, 0.8), W('head'), [8, 4]);
  if (a.badge) {
    const f = headFrame(d, 0, 0.62, 0.032);
    c.b.add(unitSphere(c.S(10, 6), c.S(8, 4)), frameM(f.p, f.x, f.y, f.z, [0.018, 0.02, 0.005]), col('#E5B93A'), W('head'), { outline: 0 });
  }
}

export { headPt, headFrame };
