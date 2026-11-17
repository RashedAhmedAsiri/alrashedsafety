/**
 * The school building exterior (x -36..24, z -74..-38): two floors, roof parapet with Najdi-style
 * triangle crenellations, water tanks and AC units on the roof, a shaded arcade along the yard facade,
 * the main entrance portal with a pointed arch, the building name and a clock, windows on both floors,
 * corridor-end exit doors, and the big classroom window (x = 14) the opening camera flies into, with a
 * small furnished "diorama" of the classroom behind its glass.
 */
import * as THREE from 'three';
import type { Batch, Col, V3 } from './batch';
import { ARCADE_COLS_LEFT, ARCADE_COLS_RIGHT, ARCADE_COL_Z, BLD } from './layout';
import { uvOf } from './atlas';

export interface Batches {
  dry: Batch;
  wet: Batch;
  glass: Batch;
  glow: Batch;
  sign: Batch;
  signGlow: Batch;
  alarm: Batch;
  clear: Batch;
}

export const COL = {
  wall: '#F4E8D4',
  wallShade: '#EADCC4',
  sand: '#DFC59B',
  portal: '#E6CFA6',
  teal: '#14B8A6',
  tealDark: '#0E8C7E',
  blue: '#2D8CFF',
  white: '#FFFFFF',
  roof: '#DAD5CC',
  glassTop: '#DDF3FF',
  glassBot: '#5B9AC6',
  metal: '#B8C1CC',
  darkMetal: '#4A5563',
  wood: '#C98F5A',
  tile: '#E9E3D6',
};

/* ------------------------------------------------------------ faces */

export type Face = 'S' | 'N' | 'E' | 'W';
const FACE_ROT: Record<Face, number> = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };

/** World point on a facade: u along the facade (x for S/N, z for E/W), y up, d outward from the wall. */
export function fp(face: Face, u: number, y: number, d: number): V3 {
  switch (face) {
    case 'S':
      return [u, y, BLD.z1 + d];
    case 'N':
      return [u, y, BLD.z0 - d];
    case 'E':
      return [BLD.x1 + d, y, u];
    case 'W':
      return [BLD.x0 - d, y, u];
  }
}
function fsz(face: Face, w: number, h: number, d: number): V3 {
  return face === 'S' || face === 'N' ? [w, h, d] : [d, h, w];
}
/** Box on a facade: centre (u, y), size w x h, from depth d0 outward by dd. */
export function fbox(b: Batch, face: Face, u: number, y: number, w: number, h: number, d0: number, dd: number, c: Col, bottom?: Col) {
  b.box(fp(face, u, y, d0 + dd / 2), fsz(face, w, h, dd), c, bottom ? { bottom } : undefined);
}
/** Sign quad on a facade. */
export function fsign(b: Batch, face: Face, u: number, y: number, w: number, h: number, d: number, key: Parameters<typeof uvOf>[0]) {
  b.quad(fp(face, u, y, d), w, h, FACE_ROT[face], uvOf(key));
}

/* ------------------------------------------------------------ elements */

export function windowAt(B: Batches, face: Face, u: number, y0: number, w: number, h: number, o: { hood?: boolean; mullions?: number; frame?: Col; transom?: boolean } = {}) {
  const y1 = y0 + h;
  const f = 0.09;
  const fc = o.frame ?? COL.white;
  fbox(B.glass, face, u, y0 + h / 2, w, h, 0, 0.04, COL.glassTop, COL.glassBot);
  fbox(B.dry, face, u, y1 - f / 2, w + f, f, 0, 0.1, fc);
  fbox(B.dry, face, u, y0 + f / 2, w + f, f, 0, 0.1, fc);
  fbox(B.dry, face, u - w / 2, y0 + h / 2, f, h, 0, 0.1, fc);
  fbox(B.dry, face, u + w / 2, y0 + h / 2, f, h, 0, 0.1, fc);
  const m = o.mullions ?? 1;
  for (let k = 1; k <= m; k++) fbox(B.dry, face, u - w / 2 + (k * w) / (m + 1), y0 + h / 2, 0.06, h, 0, 0.08, fc);
  if (o.transom !== false) fbox(B.dry, face, u, y0 + h * 0.7, w, 0.06, 0, 0.08, fc);
  fbox(B.wet, face, u, y0 - 0.06, w + 0.3, 0.12, 0, 0.2, COL.sand);
  if (o.hood) fbox(B.dry, face, u, y1 + 0.17, w + 0.4, 0.1, 0, 0.38, COL.teal);
}

export function doubleDoor(B: Batches, face: Face, u: number, w: number, h: number, d0 = 0) {
  fbox(B.dry, face, u - w / 2 - 0.08, h / 2, 0.16, h + 0.1, d0, 0.12, COL.tealDark);
  fbox(B.dry, face, u + w / 2 + 0.08, h / 2, 0.16, h + 0.1, d0, 0.12, COL.tealDark);
  fbox(B.dry, face, u, h + 0.08, w + 0.32, 0.16, d0, 0.12, COL.tealDark);
  for (const s of [-1, 1]) {
    const cu = u + (s * w) / 4;
    fbox(B.glass, face, cu, h / 2, w / 2 - 0.06, h - 0.04, d0, 0.04, COL.glassTop, COL.glassBot);
    fbox(B.dry, face, cu, h - 0.06, w / 2 - 0.04, 0.12, d0, 0.07, COL.white);
    fbox(B.dry, face, cu, 0.12, w / 2 - 0.04, 0.24, d0, 0.07, COL.white);
    fbox(B.dry, face, cu - (s * w) / 4 + s * 0.04, h / 2, 0.08, h, d0, 0.07, COL.white);
    fbox(B.dry, face, cu + (s * w) / 4 - s * 0.03, h / 2, 0.06, h, d0, 0.07, COL.white);
    // push bar
    fbox(B.dry, face, cu, h * 0.45, w / 2 - 0.3, 0.06, d0 + 0.07, 0.06, COL.metal);
  }
}

export function exitSign(B: Batches, face: Face, u: number, y: number, d0 = 0, scale = 1) {
  fbox(B.dry, face, u, y, 0.76 * scale, 0.4 * scale, d0, 0.06, COL.white);
  fsign(B.signGlow, face, u, y, 0.7 * scale, 0.35 * scale, d0 + 0.065, 'exit');
}

function alarmBeacon(B: Batches, p: V3, rotY: number) {
  // red dome on a small white base, facing outward
  const dir = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  B.dry.box([p[0] - dir.x * 0.02, p[1], p[2] - dir.z * 0.02], [0.28, 0.28, 0.28].map((v, i) => (i === 1 ? v : Math.abs(dir.getComponent(i === 0 ? 2 : 0)) > 0.5 ? v : 0.04)) as V3, COL.white);
  B.alarm.part(
    // hemisphere template via sphere scaled flat along the facing axis
    (B.alarm as unknown as { _hemi?: never }) && (null as never) ? (null as never) : SPHERE_TPL(),
    [p[0] + dir.x * 0.04, p[1], p[2] + dir.z * 0.04],
    [Math.abs(dir.x) > 0.5 ? 0.16 : 0.22, 0.22, Math.abs(dir.z) > 0.5 ? 0.16 : 0.22],
    '#FF3B3B',
  );
}
import { T } from './batch';
const SPHERE_TPL = () => T.sphere;

/* ------------------------------------------------------------ arch geometries */

/** Unit arcade arch panel: x -0.5..0.5, y 0..1, z -0.5..0.5; elliptical opening up to y = 0.7. */
const ARCH_PANEL = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.5, 0);
  s.lineTo(0.5, 1);
  s.lineTo(-0.5, 1);
  s.lineTo(-0.5, 0);
  const n = 14;
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    s.lineTo(Math.cos(a) * 0.5, Math.sin(a) * 0.7);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -0.5);
  return g;
})();

/** Pointed arch outline points (two-centred), from left spring to right spring, through the apex. */
function pointedArch(cx: number, half: number, spring: number, apex: number, n = 10): [number, number][] {
  // centre of the left arc on the spring line at cx - half + R, passing through the apex
  const rise = apex - spring;
  const R = (half * half + rise * rise) / (2 * half);
  const lc = cx - half + R;
  const pts: [number, number][] = [];
  const aTop = Math.acos((cx - lc) / R);
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * (Math.PI - aTop);
    pts.push([lc + Math.cos(a) * R, spring + Math.sin(a) * R]);
  }
  const rc = cx + half - R;
  for (let i = n - 1; i >= 0; i--) {
    const a = Math.PI - (i / n) * (Math.PI - aTop);
    pts.push([rc - Math.cos(a) * R, spring + Math.sin(a) * R]);
  }
  return pts;
}

const PORTAL_ARCH = { cx: -3, half: 3, spring: 4.0, apex: 6.5 };

/** Portal front slab: rectangle with a pointed-arch notch, extruded 1 m (z 0..1). */
const PORTAL_FRONT = (() => {
  const { x0, x1, top } = BLD.portal;
  const { cx, half, spring, apex } = PORTAL_ARCH;
  const s = new THREE.Shape();
  s.moveTo(x0, 0);
  s.lineTo(cx - half, 0);
  s.lineTo(cx - half, spring);
  for (const [x, y] of pointedArch(cx, half, spring, apex).slice(1, -1)) s.lineTo(x, y);
  s.lineTo(cx + half, spring);
  s.lineTo(cx + half, 0);
  s.lineTo(x1, 0);
  s.lineTo(x1, top);
  s.lineTo(x0, top);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 1 });
})();

/** Teal band following the arch (U-shaped band), extruded 0.08. */
const PORTAL_BAND = (() => {
  const { cx, half, spring, apex } = PORTAL_ARCH;
  const t = 0.32;
  const outer = pointedArch(cx, half + t, spring, apex + t * 1.25);
  const inner = pointedArch(cx, half, spring, apex);
  const s = new THREE.Shape();
  s.moveTo(cx - half - t, 0);
  for (const [x, y] of outer) s.lineTo(x, y);
  s.lineTo(cx + half + t, 0);
  s.lineTo(cx + half, 0);
  for (const [x, y] of [...inner].reverse()) s.lineTo(x, y);
  s.lineTo(cx - half, 0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 1 });
})();

/* ------------------------------------------------------------ build */

export function buildBuilding(B: Batches) {
  const { x0, x1, z0, z1 } = BLD;
  const RH = 7.9;
  const dry = B.dry;
  const RZ = -43.4; // back wall of the classroom-window recess
  const recess = { x0: 9, x1: 19, y1: 3.4 };
  const cw = BLD.classWindow;

  /* masses */
  dry.boxMM(x0, 0, z0, x1, RH, RZ, COL.wall);
  dry.boxMM(x0, 0, RZ, recess.x0, RH, z1, COL.wall);
  dry.boxMM(recess.x1, 0, RZ, x1, RH, z1, COL.wall);
  dry.boxMM(recess.x0, recess.y1, RZ, recess.x1, RH, z1, COL.wall);
  // front wall of the recess with the big window opening
  const fw0 = z1 - 0.45;
  dry.boxMM(recess.x0, 0, fw0, cw.x0, recess.y1, z1, COL.wall);
  dry.boxMM(cw.x1, 0, fw0, recess.x1, recess.y1, z1, COL.wall);
  dry.boxMM(cw.x0, 0, fw0, cw.x1, cw.y0, z1, COL.wall);
  dry.boxMM(cw.x0, cw.y1, fw0, cw.x1, recess.y1, z1, COL.wall);
  /* the classroom diorama behind the big window */
  dry.boxMM(recess.x0, -0.05, RZ, recess.x1, 0.0, fw0, COL.tile);
  dry.boxMM(recess.x0 + 0.01, 0, RZ, recess.x1 - 0.01, 1.1, fw0, '#DCE9E4'); // lower wall band (hidden under desks mostly)
  B.sign.quad([(recess.x0 + recess.x1) / 2, recess.y1 / 2, RZ + 0.012], recess.x1 - recess.x0, recess.y1, 0, uvOf('interior'));
  for (const gx of [11.5, 14, 16.5]) B.glow.box([gx, recess.y1 - 0.02, -42.0], [1.2, 0.03, 0.6], '#FFFDF2');
  const chairCols = ['#2D8CFF', '#F7C531', '#22B573', '#FF8A3D', '#F0476B', '#14B8A6'];
  let ci = 0;
  for (const dz of [-42.55, -41.35]) {
    for (const dx of [10.4, 11.1, 12.8, 13.5, 15.2, 15.9, 17.6]) {
      dry.box([dx, 0.7, dz], [0.66, 0.05, 0.46], COL.wood);
      dry.box([dx, 0.62, dz - 0.05], [0.6, 0.12, 0.34], '#E8E2D6');
      for (const sx of [-0.28, 0.28]) dry.box([dx + sx, 0.34, dz], [0.04, 0.68, 0.4], COL.darkMetal);
      const c = chairCols[ci++ % chairCols.length];
      dry.box([dx, 0.42, dz + 0.42], [0.4, 0.05, 0.38], c);
      dry.box([dx, 0.66, dz + 0.6], [0.4, 0.36, 0.04], c);
      for (const sx of [-0.16, 0.16]) dry.box([dx + sx, 0.2, dz + 0.42], [0.03, 0.4, 0.3], COL.darkMetal);
      if (ci % 3 === 0) dry.cbox([dx, 0.62, dz + 0.68], [0.3, 0.36, 0.14], chairCols[(ci + 2) % chairCols.length]);
    }
  }
  // the big window: frame, transom, clear glass
  const cwm = (cw.x0 + cw.x1) / 2;
  const cwh = cw.y1 - cw.y0;
  fbox(dry, 'S', cwm, cw.y1 + 0.06, cw.x1 - cw.x0 + 0.24, 0.12, 0, 0.12, COL.white);
  fbox(dry, 'S', cwm, cw.y0 - 0.06, cw.x1 - cw.x0 + 0.3, 0.12, 0, 0.24, COL.sand);
  fbox(dry, 'S', cw.x0 - 0.06, cw.y0 + cwh / 2, 0.12, cwh + 0.24, 0, 0.12, COL.white);
  fbox(dry, 'S', cw.x1 + 0.06, cw.y0 + cwh / 2, 0.12, cwh + 0.24, 0, 0.12, COL.white);
  dry.box([cwm, cw.y0 + cwh * 0.78, z1 - 0.2], [cw.x1 - cw.x0, 0.06, 0.06], COL.white);
  B.clear.box([cwm, cw.y0 + cwh / 2, z1 - 0.22], [cw.x1 - cw.x0, cwh, 0.02], '#CFEFFF');

  /* roof slab and parapet */
  B.wet.boxMM(x0, RH, z0, x1, 8.05, z1, COL.roof);
  const PT = 0.25;
  const ph0 = 8.05;
  const ph1 = BLD.parapetTop;
  dry.boxMM(x0, ph0, z0, x1, ph1, z0 + PT, COL.wall);
  dry.boxMM(x0, ph0, z1 - PT, x1, ph1, z1, COL.wall);
  dry.boxMM(x0, ph0, z0 + PT, x0 + PT, ph1, z1 - PT, COL.wall);
  dry.boxMM(x1 - PT, ph0, z0 + PT, x1, ph1, z1 - PT, COL.wall);
  // coping
  B.wet.boxMM(x0 - 0.06, ph1, z0 - 0.06, x1 + 0.06, ph1 + 0.08, z0 + PT + 0.04, COL.white);
  B.wet.boxMM(x0 - 0.06, ph1, z1 - PT - 0.04, x1 + 0.06, ph1 + 0.08, z1 + 0.06, COL.white);
  B.wet.boxMM(x0 - 0.06, ph1, z0 + PT, x0 + PT + 0.04, ph1 + 0.08, z1 - PT, COL.white);
  B.wet.boxMM(x1 - PT - 0.04, ph1, z0 + PT, x1 + 0.06, ph1 + 0.08, z1 - PT, COL.white);
  // teal stripe on the parapet and Najdi triangles on top
  for (const face of ['S', 'N'] as Face[]) {
    fbox(dry, face, (x0 + x1) / 2, 8.4, x1 - x0, 0.16, 0, 0.03, COL.teal);
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 0.9) {
      const z = face === 'S' ? z1 - PT / 2 : z0 + PT / 2;
      dry.tri([x, ph1 + 0.08 + 0.2, z], [0.44, 0.4, 0.16], COL.teal);
    }
  }
  for (const face of ['E', 'W'] as Face[]) {
    fbox(dry, face, (z0 + z1) / 2, 8.4, z1 - z0, 0.16, 0, 0.03, COL.teal);
    for (let z = z0 + 0.6; z < z1 - 0.4; z += 0.9) {
      const x = face === 'E' ? x1 - PT / 2 : x0 + PT / 2;
      dry.tri([x, ph1 + 0.08 + 0.2, z], [0.44, 0.4, 0.16], COL.teal, { r: [0, Math.PI / 2, 0] });
    }
  }

  /* plinth, floor band, diamond band, corner pilasters */
  for (const face of ['S', 'N', 'E', 'W'] as Face[]) {
    const [a, b] = face === 'S' || face === 'N' ? [x0, x1] : [z0, z1];
    fbox(B.wet, face, (a + b) / 2, 0.22, b - a, 0.44, 0, 0.06, COL.sand);
    if (face !== 'S') fbox(dry, face, (a + b) / 2, 4.0, b - a, 0.24, 0, 0.05, COL.teal);
    // diamond band below the roof line
    let k = 0;
    for (let u = a + 0.9; u < b - 0.6; u += 0.55) {
      if (face === 'S' && u > BLD.portal.x0 - 0.3 && u < BLD.portal.x1 + 0.3) continue;
      const c = k++ % 2 ? COL.blue : COL.teal;
      const p = fp(face, u, 7.4, 0.02);
      if (face === 'S' || face === 'N') dry.box(p, [0.22, 0.22, 0.04], c, { r: [0, 0, Math.PI / 4] });
      else dry.box(p, [0.04, 0.22, 0.22], c, { r: [Math.PI / 4, 0, 0] });
    }
    fbox(dry, face, (a + b) / 2, 7.08, b - a, 0.06, 0, 0.03, COL.sand);
    fbox(dry, face, (a + b) / 2, 7.72, b - a, 0.06, 0, 0.03, COL.sand);
  }
  for (const [cx, cz] of [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
  ]) {
    const sx = cx === x0 ? 1 : -1;
    const sz = cz === z0 ? 1 : -1;
    dry.boxMM(cx - sx * 0.12, 0, cz - sz * 0.12, cx + sx * 0.62, 9.35, cz + sz * 0.62, COL.sand);
    dry.boxMM(cx - sx * 0.2, 9.35, cz - sz * 0.2, cx + sx * 0.7, 9.55, cz + sz * 0.7, COL.teal);
    dry.tri([cx + sx * 0.25, 9.55 + 0.25, cz + sz * 0.25], [0.6, 0.5, 0.6], COL.white, { r: [0, Math.PI / 4, 0] });
  }

  /* arcade along the yard facade */
  const colZ = ARCADE_COL_Z;
  const az1 = BLD.arcadeZ;
  const spans: [number, number][] = [];
  for (const cols of [ARCADE_COLS_LEFT, ARCADE_COLS_RIGHT]) {
    cols.forEach((x, i) => {
      dry.cyl([x, 1.85, colZ], 0.42, 3.7, COL.white, { seg: 12 });
      dry.box([x, 0.16, colZ], [0.62, 0.32, 0.62], COL.sand);
      dry.box([x, 3.56, colZ], [0.6, 0.18, 0.6], COL.teal);
      if (i > 0) spans.push([cols[i - 1], x]);
    });
  }
  for (const [a, b] of spans) {
    dry.geo(ARCH_PANEL, [(a + b) / 2, 2.35, colZ], [b - a, 1.35, 0.36], COL.wall);
    B.glow.cyl([(a + b) / 2, 3.69, (z1 + colZ) / 2], 0.34, 0.02, '#FFF3D0', { seg: 12 });
  }
  for (const [a, b] of [
    [x0, BLD.portal.x0],
    [BLD.portal.x1, x1],
  ]) {
    dry.boxMM(a, 3.7, z1, b, 4.0, az1, COL.wall);
    dry.boxMM(a, 3.64, az1 - 0.02, b, 4.06, az1 + 0.1, COL.teal);
    B.wet.boxMM(a, 4.0, z1, b, 4.07, az1, COL.roof);
  }
  // ground floor windows under the arcade (centred in each span)
  for (const [a, b] of spans) {
    const m = (a + b) / 2;
    if (m > 12.5 && m < 15.5) continue; // the classroom window
    windowAt(B, 'S', m, 0.9, Math.min(2.6, b - a - 1.1), 1.85, { mullions: 1 });
  }
  // first floor south windows
  for (const u of [-33, -29, -25, -21, -17, -13, 6.5, 10.5, 14.5, 18.5, 22]) windowAt(B, 'S', u, 4.85, 2.4, 1.6, { hood: true });

  /* main entrance portal */
  const P = BLD.portal;
  const pz = -38.2;
  const { cx, half, spring, apex } = PORTAL_ARCH;
  dry.boxMM(P.x0, 0, z1, cx - half, P.top, pz, COL.portal);
  dry.boxMM(cx + half, 0, z1, P.x1, P.top, pz, COL.portal);
  dry.boxMM(cx - half, apex + 0.1, z1, cx + half, P.top, pz, COL.portal);
  dry.geo(PORTAL_FRONT, [0, 0, pz], [1, 1, 1], COL.portal);
  dry.geo(PORTAL_BAND, [0, 0, P.z], [1, 1, 1], COL.teal);
  // light teal panel on the door wall, doors, side lights, transom, exit sign, star medallion
  dry.boxMM(cx - half, 0, z1, cx + half, apex + 0.1, z1 + 0.03, '#CFEDE8');
  doubleDoor(B, 'S', cx, 2.6, 2.7, 0.03);
  for (const s of [-1, 1]) {
    fbox(B.glass, 'S', cx + s * 2.05, 1.35, 1.0, 2.7, 0.03, 0.04, COL.glassTop, COL.glassBot);
    fbox(dry, 'S', cx + s * 2.6, 1.4, 0.1, 2.8, 0.03, 0.1, COL.tealDark);
  }
  exitSign(B, 'S', cx, 3.1, 0.04, 1.15);
  fbox(B.glass, 'S', cx, 3.85, 4.9, 0.9, 0.03, 0.04, COL.glassTop, COL.glassBot);
  fbox(dry, 'S', cx, 3.38, 5.2, 0.1, 0.03, 0.1, COL.tealDark);
  fbox(dry, 'S', cx, 4.34, 5.2, 0.1, 0.03, 0.1, COL.tealDark);
  for (let i = -2; i <= 2; i++) fbox(dry, 'S', cx + i * 1.0, 3.85, 0.06, 0.9, 0.03, 0.08, COL.tealDark);
  fsign(B.sign, 'S', cx, 5.35, 1.5, 1.5, 0.04, 'star');
  // front face: clock, name sign, bands, coping and triangles
  const fz = P.z - z1; // depth of the portal front face from the S wall plane
  fsign(B.sign, 'S', cx, 7.45, 1.3, 1.3, fz + 0.015, 'clock');
  dry.box([cx, 7.45, P.z + 0.02], [1.42, 1.42, 0.04], COL.teal, { r: [0, 0, Math.PI / 4] });
  fsign(B.sign, 'S', cx, 7.45, 1.3, 1.3, fz + 0.045, 'clock');
  fbox(dry, 'S', cx, 8.8, 9.3, 1.36, fz, 0.06, COL.tealDark);
  fsign(B.sign, 'S', cx, 8.8, 9.0, 1.125, fz + 0.065, 'nameSign');
  fbox(dry, 'S', cx, 9.85, P.x1 - P.x0, 0.18, fz, 0.04, COL.teal);
  B.wet.boxMM(P.x0 - 0.08, P.top, pz - 0.08 - 1.8, P.x1 + 0.08, P.top + 0.1, P.z + 0.08, COL.white);
  for (let x = P.x0 + 0.45; x < P.x1 - 0.3; x += 0.75) dry.tri([x, P.top + 0.1 + 0.23, P.z - 0.12], [0.46, 0.46, 0.16], COL.teal);
  fbox(B.wet, 'S', (P.x0 + P.x1) / 2, 0.22, P.x1 - P.x0, 0.44, fz, 0.06, COL.sand);
  // portal side pilasters with lanterns
  for (const x of [P.x0 + 0.5, P.x1 - 0.5]) {
    dry.box([x, 5.0, P.z + 0.06], [0.7, 10.0, 0.12], COL.sand);
    dry.box([x, 2.75, P.z + 0.22], [0.26, 0.4, 0.2], COL.darkMetal);
    B.glow.box([x, 2.75, P.z + 0.33], [0.18, 0.3, 0.04], '#FFE7A8');
    dry.box([x, 2.98, P.z + 0.22], [0.32, 0.06, 0.26], COL.darkMetal);
  }
  alarmBeacon(B, [P.x0 + 0.5, 3.45, P.z + 0.12], 0);
  alarmBeacon(B, [P.x1 - 0.5, 3.45, P.z + 0.12], 0);

  /* corridor-end doors (east toward the field, west) */
  for (const face of ['E', 'W'] as Face[]) {
    doubleDoor(B, face, -55, 2.4, 2.7, 0);
    fbox(dry, face, -55, 3.3, 3.4, 0.14, 0, 1.3, COL.teal);
    fbox(B.wet, face, -55, 3.38, 3.4, 0.03, 0, 1.3, COL.roof);
    exitSign(B, face, -55, 3.0, 0.02, 1.0);
    windowAt(B, face, -55, 4.85, 2.2, 1.6, { hood: true });
    const s = face === 'E' ? 1 : -1;
    alarmBeacon(B, fp(face, -53.2, 3.0, 0.12), (s * Math.PI) / 2);
  }
  /* east facade windows */
  for (const z of [-71, -67, -63, -59, -51, -47, -43]) {
    windowAt(B, 'E', z, 0.9, 2.2, 1.8, {});
    windowAt(B, 'E', z, 4.85, 2.2, 1.6, { hood: true });
  }
  /* west facade: clinic / computer lab windows, sports hall high windows with fins */
  for (const z of [-51, -47, -43]) {
    windowAt(B, 'W', z, 0.9, 2.2, 1.8, {});
    windowAt(B, 'W', z, 4.85, 2.2, 1.6, { hood: true });
  }
  for (const z of [-70.5, -66, -61.5]) windowAt(B, 'W', z, 5.3, 3.2, 1.9, { mullions: 2, hood: true });
  for (const z of [-72.6, -68.25, -63.75, -59.4]) fbox(dry, 'W', z, 3.95, 0.5, 7.9, 0, 0.12, COL.sand);
  /* north facade */
  for (const x of [-33, -28.5, -19.5, -15]) windowAt(B, 'N', x, 5.3, 3.2, 1.9, { mullions: 2, hood: true });
  for (const x of [-35.0, -30.75, -26.25, -21.75, -17.25, -12.9]) fbox(dry, 'N', x, 3.95, 0.5, 7.9, 0, 0.12, COL.sand);
  // sports hall equipment door
  fbox(dry, 'N', -24, 1.45, 2.6, 2.9, 0, 0.08, COL.tealDark);
  for (let i = 0; i < 9; i++) fbox(dry, 'N', -24, 0.2 + i * 0.3, 2.4, 0.04, 0.08, 0.03, '#0B7A6E');
  for (const x of [-10, -6, -1, 3, 7, 21]) windowAt(B, 'N', x, 0.9, 2.2, 1.8, {});
  for (const x of [-10, -6, -2, 2, 6, 21]) windowAt(B, 'N', x, 4.85, 2.2, 1.6, { hood: true });
  windowAt(B, 'N', 14, 2.4, 1.8, 3.9, { mullions: 1, hood: true }); // stair landing window

  /* rooftop: stair headroom, lift room, tanks, AC units, vents, spouts */
  const R0 = 8.05;
  dry.boxMM(10, R0, -70, 17, 10.9, -63, COL.wall);
  B.wet.boxMM(9.9, 10.9, -70.1, 17.1, 11.0, -62.9, COL.white);
  dry.boxMM(10, 10.6, -63.03, 17, 10.75, -62.98, COL.teal);
  dry.boxMM(12.9, R0, -63.06, 14.1, R0 + 2.15, -62.98, COL.tealDark);
  dry.boxMM(17, R0, -70, 19.6, 10.4, -66.4, COL.wallShade);
  B.wet.boxMM(16.95, 10.4, -70.05, 19.65, 10.48, -66.35, COL.white);
  const tank = (x: number, z: number, c: Col, lid: Col) => {
    for (const [dx, dz] of [
      [-0.55, -0.55],
      [0.55, -0.55],
      [-0.55, 0.55],
      [0.55, 0.55],
    ])
      dry.box([x + dx, R0 + 0.3, z + dz], [0.08, 0.6, 0.08], COL.darkMetal);
    dry.box([x, R0 + 0.62, z], [1.4, 0.06, 1.4], COL.darkMetal);
    dry.cyl([x, R0 + 0.65 + 0.85, z], 1.35, 1.7, c, { seg: 20 });
    dry.cyl([x, R0 + 0.65 + 1.74, z], 0.7, 0.12, lid, { seg: 12 });
  };
  tank(-31.5, -70.5, '#FFFFFF', COL.blue);
  tank(-29.3, -70.5, '#FFFFFF', COL.blue);
  tank(-27.1, -70.5, '#E9F4FF', COL.blue);
  tank(-24.9, -70.5, '#FFFFFF', COL.blue);
  tank(13.5, -66.5, '#FFFFFF', COL.teal);
  const ac = (x: number, z: number) => {
    dry.cbox([x, R0 + 0.62, z], [2.1, 1.1, 1.2], '#CBD2DA');
    for (const dx of [-0.5, 0.5]) {
      dry.cyl([x + dx, R0 + 1.18, z], 0.72, 0.04, COL.darkMetal, { seg: 12 });
      dry.box([x + dx, R0 + 1.21, z], [0.6, 0.02, 0.05], COL.metal);
    }
    dry.box([x, R0 + 0.6, z + 0.61], [1.8, 0.7, 0.02], '#9AA5B1');
  };
  for (const x of [-28, -21, -14, -7, 0, 7, 21]) ac(x, -48.5);
  for (const x of [-6, 0, 6]) ac(x, -66);
  for (const [x, z] of [
    [-18, -58],
    [-2, -56],
    [4, -60],
    [22, -60],
    [-33, -45],
  ])
    dry.cyl([x, R0 + 0.35, z], 0.3, 0.7, COL.metal, { seg: 8 });
  for (let x = x0 + 5; x < x1 - 2; x += 10) {
    fbox(dry, 'N', x, R0 + 0.12, 0.16, 0.14, 0, 0.55, COL.darkMetal);
  }
  for (let z = z0 + 6; z < z1 - 2; z += 10) {
    fbox(dry, 'E', z, R0 + 0.12, 0.16, 0.14, 0, 0.55, COL.darkMetal);
    fbox(dry, 'W', z, R0 + 0.12, 0.16, 0.14, 0, 0.55, COL.darkMetal);
  }
}
