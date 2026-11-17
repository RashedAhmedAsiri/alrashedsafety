/**
 * Alrashed's meshes, built once from primitives (lathes, capsules, rounded boxes, spheres) and merged
 * per rigid bone into one vertex-coloured geometry, so the whole robot is ~20 draw calls and shares
 * one glossy material. Built lazily on first use and shared by every Robot instance.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTexture } from '../../world/kit';
import { FONT_FAMILY } from '../../core/fonts';
import { DIM } from './rig';

export const RC = {
  white: '#F3F6F9',
  teal: '#14B8A6',
  sky: '#4FC3F7',
  joint: '#A9B4C0',
  jointDark: '#8D99A6',
  glass: '#06090D',
} as const;

/* ------------------------------------------------------------------ shape helpers */

type Piece = [THREE.BufferGeometry, string, THREE.Matrix4?];

const M = (p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));

function merge(pieces: Piece[]): THREE.BufferGeometry {
  const list = pieces.map(([g0, color, m]) => {
    let g = g0.index ? g0.toNonIndexed() : g0.clone();
    if (m) g.applyMatrix4(m);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g0.dispose();
    return g;
  });
  const out = mergeGeometries(list, false)!;
  for (const g of list) g.dispose();
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

const sphere = (r: number, ws = 22, hs = 16) => new THREE.SphereGeometry(r, ws, hs);
const capsule = (r: number, len: number, cap = 6, radial = 18) => new THREE.CapsuleGeometry(r, len, cap, radial);
const cyl = (rt: number, rb: number, h: number, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);

/** Box with rounded edges and corners of radius r. */
export function roundedBox(w: number, h: number, d: number, r: number, seg = 4) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-inner.x, Math.min(inner.x, v.x)), Math.max(-inner.y, Math.min(inner.y, v.y)), Math.max(-inner.z, Math.min(inner.z, v.z)));
    const n = v.clone().sub(c);
    if (n.lengthSq() > 0) v.copy(c.add(n.normalize().multiplyScalar(r)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Quarter ellipse from (r0, y0) to (r1, y1): starts tangent horizontally, ends vertically. */
function arcOut(r0: number, y0: number, r1: number, y1: number, n = 8) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r0 + (r1 - r0) * Math.sin(t), y0 + (y1 - y0) * (1 - Math.cos(t))));
  }
  return pts;
}
/** Quarter ellipse from (r0, y0) to (r1, y1): starts tangent vertically, ends horizontally. */
function arcIn(r0: number, y0: number, r1: number, y1: number, n = 8) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r1 + (r0 - r1) * Math.cos(t), y0 + (y1 - y0) * Math.sin(t)));
  }
  return pts;
}
const dedupe = (pts: THREE.Vector2[]) => pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 1e-6);
const spline = (pts: [number, number][], n: number) => new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(n);

/* ------------------------------------------------------------------ profiles */

/** Head shell profile (head-local, bottom at 0): a capsule with a straight band for the screen. */
export const HEAD = { R: 0.232, BAND0: 0.085, BAND1: 0.265, TOP: DIM.HEAD_H, SX: 1.12, SZ: 0.9 };
const headProfile = () =>
  dedupe([
    new THREE.Vector2(0, 0),
    ...arcOut(0.1, 0, HEAD.R, HEAD.BAND0, 9),
    ...arcIn(HEAD.R, HEAD.BAND1, 0, HEAD.TOP, 12),
  ]);

/** Torso profile (spine-local: waist pivot at 0). */
const TORSO_PTS: [number, number][] = [
  [0.0, -0.016],
  [0.13, -0.016],
  [0.168, 0.0],
  [0.19, 0.03],
  [0.205, 0.08],
  [0.215, 0.15],
  [0.22, 0.21],
  [0.218, 0.26],
  [0.205, 0.305],
  [0.18, 0.34],
  [0.14, 0.364],
  [0.08, 0.378],
  [0.0, 0.382],
];
export const TORSO_SZ = 0.76;
const torsoProfile = () => spline(TORSO_PTS, 44);
/** Torso radius at spine-local height y (for placing things on its surface). */
export function torsoRadius(y: number) {
  const pts = torsoProfile();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
  }
  return 0.2;
}

/* ------------------------------------------------------------------ parts */

export interface RobotGeo {
  head: THREE.BufferGeometry;
  screen: THREE.BufferGeometry;
  antennaBall: THREE.BufferGeometry;
  torso: THREE.BufferGeometry;
  badge: THREE.BufferGeometry;
  pelvis: THREE.BufferGeometry;
  upperArm: Record<'l' | 'r', THREE.BufferGeometry>;
  forearm: Record<'l' | 'r', THREE.BufferGeometry>;
  hand: Record<'l' | 'r', THREE.BufferGeometry>;
  thigh: THREE.BufferGeometry;
  shin: THREE.BufferGeometry;
  foot: THREE.BufferGeometry;
  /** Finger segments: origin at the joint, extending down -Y. */
  fingerA: THREE.BufferGeometry;
  fingerB: THREE.BufferGeometry;
}

/** Screen arc (radians) and vertical span (head-local). */
export const SCREEN = { THETA: 1.52, Y0: 0.094, Y1: 0.256, R: HEAD.R + 0.0035 };
export const FINGER = { R: 0.0118, A: 0.023, B: 0.019, Z: [0.031, 0.0105, -0.0105, -0.031], X: 0.002 };
export const THUMB = { R: 0.0128, A: 0.02, B: 0.017 };

let cache: RobotGeo | null = null;

export function robotGeometry(): RobotGeo {
  if (cache) return cache;
  const headScale = M([0, 0, 0], [0, 0, 0], [HEAD.SX, 1, HEAD.SZ]);
  const earX = HEAD.R * HEAD.SX;

  const head = merge([
    [new THREE.LatheGeometry(headProfile(), 48), RC.white, headScale],
    // neck (hidden mostly inside the head and torso)
    [cyl(0.072, 0.078, 0.075, 20), RC.joint, M([0, -0.02, 0])],
    // ear pods
    [cyl(0.07, 0.07, 0.034, 28), RC.teal, M([earX + 0.006, 0.175, 0], [0, 0, Math.PI / 2])],
    [cyl(0.07, 0.07, 0.034, 28), RC.teal, M([-earX - 0.006, 0.175, 0], [0, 0, Math.PI / 2])],
    [cyl(0.043, 0.047, 0.016, 24), RC.sky, M([earX + 0.027, 0.175, 0], [0, 0, Math.PI / 2])],
    [cyl(0.043, 0.047, 0.016, 24), RC.sky, M([-earX - 0.027, 0.175, 0], [0, 0, -Math.PI / 2])],
    // antenna base and stalk
    [cyl(0.026, 0.036, 0.022, 20), RC.teal, M([0, HEAD.TOP - 0.004, 0])],
    [cyl(0.0105, 0.0125, 0.06, 12), RC.joint, M([0, HEAD.TOP + 0.03, 0])],
  ]);

  const screenG = new THREE.CylinderGeometry(SCREEN.R, SCREEN.R, SCREEN.Y1 - SCREEN.Y0, 40, 1, true, -SCREEN.THETA / 2, SCREEN.THETA);
  screenG.applyMatrix4(M([0, (SCREEN.Y0 + SCREEN.Y1) / 2, 0], [0, 0, 0], [HEAD.SX, 1, HEAD.SZ]));

  const antennaBall = sphere(0.031, 20, 14);
  antennaBall.translate(0, HEAD.TOP + 0.058, 0);

  // torso: textured lathe (front at +Z); u = 0.5 at the front, v = height
  const torso = new THREE.LatheGeometry(torsoProfile(), 56, -Math.PI, Math.PI * 2);
  torso.applyMatrix4(M([0, 0, 0], [0, 0, 0], [1, 1, TORSO_SZ]));
  {
    const pos = torso.attributes.position as THREE.BufferAttribute;
    const uv = torso.attributes.uv as THREE.BufferAttribute;
    const y0 = TORSO_PTS[0][1];
    const y1 = TORSO_PTS[TORSO_PTS.length - 1][1];
    for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) - y0) / (y1 - y0));
    uv.needsUpdate = true;
  }

  // chest badge: a short cylinder whose top cap faces forward
  const badge = cyl(0.058, 0.06, 0.014, 40);
  const by = 0.238;
  badge.applyMatrix4(M([0, by, torsoRadius(by) * TORSO_SZ + 0.002], [Math.PI / 2 - 0.1, 0, 0]));

  const pelvis = merge([
    [roundedBox(0.3, 0.13, 0.228, 0.058, 4), RC.white, M([0, -0.022, 0])],
    [cyl(0.162, 0.165, 0.075, 32), RC.joint, M([0, 0.045, 0], [0, 0, 0], [1, 1, TORSO_SZ])],
    [sphere(0.058), RC.joint, M([DIM.HIP_X, DIM.HIP_DY, 0])],
    [sphere(0.058), RC.joint, M([-DIM.HIP_X, DIM.HIP_DY, 0])],
  ]);

  const upperArm = (s: 1 | -1) =>
    merge([
      [sphere(0.056), RC.joint],
      [sphere(0.074, 24, 16), RC.teal, M([s * 0.006, 0.012, 0], [0, 0, 0], [1, 0.78, 1])],
      [capsule(0.047, 0.088), RC.white, M([0, -0.088, 0])],
    ]);

  // lathe profiles go bottom -> top
  const forearmProfile = () =>
    dedupe([...arcOut(0, -0.152, 0.055, -0.118, 6), new THREE.Vector2(0.053, -0.1), new THREE.Vector2(0.046, -0.05), new THREE.Vector2(0.043, -0.012), new THREE.Vector2(0, -0.012)]);
  const forearm = () =>
    merge([
      [sphere(0.047), RC.joint],
      [new THREE.LatheGeometry(forearmProfile(), 24), RC.white],
      [cyl(0.058, 0.058, 0.03, 28), RC.sky, M([0, -0.112, 0])],
    ]);

  const hand = (s: 1 | -1) =>
    merge([
      [sphere(0.03, 16, 12), RC.joint],
      [roundedBox(0.04, 0.074, 0.09, 0.018, 4), RC.white, M([0, -0.044, 0])],
      [roundedBox(0.008, 0.042, 0.052, 0.004, 2), RC.sky, M([-s * 0.0195, -0.05, -0.004])],
    ]);

  const thigh = merge([[capsule(0.06, 0.096), RC.white, M([0, -0.1, 0])]]);

  const shinProfile = () =>
    dedupe([...arcOut(0, -0.19, 0.066, -0.15, 6), new THREE.Vector2(0.066, -0.14), new THREE.Vector2(0.056, -0.06), new THREE.Vector2(0.052, 0.0), new THREE.Vector2(0, 0.01)]);
  const shin = merge([
    [sphere(0.052), RC.joint],
    [new THREE.LatheGeometry(shinProfile(), 28), RC.white],
    [cyl(0.07, 0.07, 0.03, 28), RC.teal, M([0, -0.125, 0])],
  ]);

  const foot = merge([
    [sphere(0.046), RC.joint],
    [roundedBox(0.13, 0.1, 0.236, 0.034, 4), RC.white, M([0, -DIM.ANKLE_H + 0.02 + 0.05, 0.045])],
    [roundedBox(0.14, 0.032, 0.246, 0.014, 3), RC.teal, M([0, -DIM.ANKLE_H + 0.016, 0.045])],
  ]);

  const fingerA = merge([[capsule(FINGER.R, FINGER.A, 4, 10), RC.white, M([0, -FINGER.A / 2, 0])]]);
  const fingerB = merge([[capsule(FINGER.R, FINGER.B, 4, 10), RC.white, M([0, -FINGER.B / 2, 0])]]);

  cache = {
    head,
    screen: screenG,
    antennaBall,
    torso,
    badge,
    pelvis,
    upperArm: { l: upperArm(1), r: upperArm(-1) },
    forearm: { l: forearm(), r: forearm() },
    hand: { l: hand(1), r: hand(-1) },
    thigh,
    shin,
    foot,
    fingerA,
    fingerB,
  };
  return cache;
}

/* ------------------------------------------------------------------ materials */

let mats: { shell: THREE.MeshStandardMaterial; torso: THREE.MeshStandardMaterial; badge: THREE.Material[] } | null = null;

export function robotMaterials() {
  if (mats) return mats;
  const shell = new THREE.MeshStandardMaterial({ vertexColors: true, color: '#ffffff', roughness: 0.3, metalness: 0.02 });
  const torso = new THREE.MeshStandardMaterial({ map: torsoTexture(), roughness: 0.3, metalness: 0.02 });
  const badgeFace = new THREE.MeshStandardMaterial({ map: badgeTexture(), roughness: 0.35, emissive: '#ffffff', emissiveMap: badgeTexture(), emissiveIntensity: 0.12 });
  const badgeSide = new THREE.MeshStandardMaterial({ color: RC.teal, roughness: 0.35 });
  mats = { shell, torso, badge: [badgeSide, badgeFace, badgeSide] };
  return mats;
}

/** Torso paint: teal belt, panel lines, teal back plate with vents. */
function torsoTexture() {
  return canvasTexture('robot-torso-v2', 1024, 512, (ctx, w, h) => {
    const yOf = (y: number) => {
      const y0 = TORSO_PTS[0][1];
      const y1 = TORSO_PTS[TORSO_PTS.length - 1][1];
      return h - ((y - y0) / (y1 - y0)) * h;
    };
    const uOf = (phi: number) => ((phi + Math.PI) / (Math.PI * 2)) * w;
    ctx.fillStyle = RC.white;
    ctx.fillRect(0, 0, w, h);
    const rr = (x0: number, y0: number, x1: number, y1: number, r: number) => {
      ctx.beginPath();
      ctx.roundRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), r);
    };
    // teal belt band
    ctx.fillStyle = RC.teal;
    ctx.fillRect(0, yOf(0.038), w, yOf(-0.016) - yOf(0.038));
    ctx.fillStyle = '#0E9384';
    ctx.fillRect(0, yOf(0.038), w, 5);
    // soft panel lines
    ctx.strokeStyle = '#D9E1E8';
    ctx.lineWidth = 4;
    for (const phi of [-1.15, 1.15]) {
      ctx.beginPath();
      ctx.moveTo(uOf(phi), yOf(0.04));
      ctx.lineTo(uOf(phi), yOf(0.3));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, yOf(0.33));
    ctx.lineTo(w, yOf(0.33));
    ctx.stroke();
    // teal ring behind the badge
    // back plate (around phi = +-PI, split across the seam)
    for (const cx of [0, w]) {
      ctx.fillStyle = RC.teal;
      rr(cx - uOf(-Math.PI + 0.62), yOf(0.3), cx + uOf(-Math.PI + 0.62), yOf(0.085), 36);
      ctx.fill();
      ctx.strokeStyle = RC.sky;
      ctx.lineWidth = 12;
      for (let i = 0; i < 3; i++) {
        const y = yOf(0.25 - i * 0.045);
        ctx.beginPath();
        ctx.moveTo(cx - 56, y);
        ctx.lineTo(cx + 56, y);
        ctx.stroke();
      }
    }
  });
}

/** Round chest badge with the «الراشد» logo. */
export function badgeTexture() {
  return canvasTexture('robot-badge-v3', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = RC.teal;
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.save();
    ctx.translate(w / 2, h / 2);
    // the cylinder cap's UVs are a quarter turn off: draw rotated so the logo reads upright
    ctx.rotate(-Math.PI / 2);
    ctx.font = `700 ${Math.round(w * 0.3)}px ${FONT_FAMILY}`;
    ctx.fillStyle = RC.teal;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText('الراشد', 0, w * 0.035);
    ctx.restore();
  });
}
