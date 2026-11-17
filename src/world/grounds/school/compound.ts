/**
 * The school fence (low painted wall + railing), the main gate area (piers, canopy with the name sign,
 * sliding gate leaf, guard room) and the shaded waiting area for students waiting for parents.
 * WORLD coordinates. See layout.ts for the numbers.
 */
import type { Batch, Col, V3 } from './batch';
import { T } from './batch';
import { uvOf } from './atlas';
import type { Batches } from './building';
import { COL } from './building';
import { COMPOUND, GATE, GATE_CANOPY, GUARD_ROOM, NOTCH, SLIDING_GATE, WAITING } from './layout';
import { RAIL_REPEAT_M } from './textures';
import { PC, Frame, bench } from './parts';

export interface Extra {
  rail: Batch;
  net: Batch;
  chain: Batch;
  /** Sliding gate leaf (own meshes, moved by the gateOpen flag). */
  leafDry: Batch;
  leafRail: Batch;
}

const WALL_H = 1.0;
const POST_H = 2.45;
const RAIL_TOP = 2.2;
const TH = 0.3;

/** One fence run along a center line (axis aligned), pillars every ~4 m and railing between them. */
function run(B: Batches, X: Extra, a: [number, number], b: [number, number], opts: { pillars?: boolean; endPillars?: [boolean, boolean] } = {}) {
  const alongX = a[1] === b[1];
  const len = Math.abs(alongX ? b[0] - a[0] : b[1] - a[1]);
  const sgn = alongX ? Math.sign(b[0] - a[0]) : Math.sign(b[1] - a[1]);
  const n = Math.max(1, Math.round(len / 4));
  const step = len / n;
  const at = (t: number): V3 => (alongX ? [a[0] + sgn * t, 0, a[1]] : [a[0], 0, a[1] + sgn * t]);
  const mid = at(len / 2);
  const dry = B.dry;
  const sz = (l: number, h: number, d: number): V3 => (alongX ? [l, h, d] : [d, h, l]);
  // wall: sand skirt, cream body, yellow school-zone stripe, teal cap
  dry.box([mid[0], 0.2, mid[2]], sz(len, 0.4, TH + 0.06), COL.sand);
  dry.box([mid[0], 0.65, mid[2]], sz(len, 0.5, TH), COL.wall);
  dry.box([mid[0], 0.58, mid[2]], sz(len, 0.1, TH + 0.02), '#F7C531');
  B.wet.box([mid[0], WALL_H - 0.04, mid[2]], sz(len, 0.1, TH + 0.08), COL.teal);
  // railing
  const rh = RAIL_TOP - WALL_H;
  const rot = alongX ? 0 : Math.PI / 2;
  X.rail.quad([mid[0], WALL_H + rh / 2, mid[2]], len, rh, rot, [0, 0, len / RAIL_REPEAT_M, 1]);
  dry.box([mid[0], RAIL_TOP, mid[2]], sz(len, 0.08, 0.1), COL.tealDark);
  // pillars
  const ends = opts.endPillars ?? [true, true];
  for (let i = 0; i <= n; i++) {
    if ((i === 0 && !ends[0]) || (i === n && !ends[1])) continue;
    const p = at(i * step);
    pillar(B, p[0], p[2], i === 0 || i === n);
  }
}

function pillar(B: Batches, x: number, z: number, big: boolean) {
  const w = big ? 0.55 : 0.46;
  B.dry.box([x, 0.2, z], [w + 0.1, 0.4, w + 0.1], COL.sand);
  B.dry.box([x, POST_H / 2 + 0.2, z], [w, POST_H - 0.4, w], COL.wall);
  B.dry.box([x, 1.58, z], [w + 0.02, 0.12, w + 0.02], '#F7C531');
  B.dry.box([x, POST_H - 0.1, z], [w + 0.14, 0.14, w + 0.14], COL.teal);
  B.dry.part(T.cone, [x, POST_H + 0.15, z], [w * 0.8, 0.36, w * 0.8], COL.white);
}

export function buildFence(B: Batches, X: Extra) {
  const { x0, x1, z0 } = COMPOUND;
  const xw = x0 + TH / 2; // west center line
  const xe = x1 - TH / 2;
  const zb = z0 + TH / 2; // back
  const zf = -7.5 - TH / 2; // front center line (outer face at z = -7.5)
  const zn = NOTCH.z - TH / 2; // notch back (outer face at z = -10.5)
  const xn0 = NOTCH.x0 - TH / 2; // notch west wall (outer face x = -50)
  const xn1 = NOTCH.x1 + TH / 2; // notch east wall (outer face x = -16)
  const GP = 4.9; // gate pier centre line is handled separately; the run ends at the pier
  // front: west piece, notch, middle piece to the west gate pier, east piece from the east gate pier
  run(B, X, [xw, zf], [xn0, zf]);
  run(B, X, [xn0, zf], [xn0, zn], { endPillars: [false, true] });
  run(B, X, [xn0, zn], [xn1, zn]);
  run(B, X, [xn1, zn], [xn1, zf], { endPillars: [false, true] });
  run(B, X, [xn1, zf], [-GP, zf], { endPillars: [false, false] });
  run(B, X, [GP, zf], [xe, zf], { endPillars: [false, true] });
  // east, back, west
  run(B, X, [xe, zf], [xe, zb]);
  run(B, X, [xe, zb], [xw, zb]);
  run(B, X, [xw, zb], [xw, zf]);
}

/* ------------------------------------------------------------ gate */

export function buildGate(B: Batches, X: Extra) {
  const dry = B.dry;
  const zf = -7.5 - TH / 2;
  // gate piers (x -4.9..-4.0 and 4.0..4.9), 3.2 m tall, with lanterns and small cameras
  for (const s of [-1, 1]) {
    const x = s * 4.45;
    dry.box([x, 0.2, zf], [1.0, 0.4, 0.8], COL.sand);
    dry.box([x, 1.8, zf], [0.9, 3.2, 0.7], COL.wall);
    dry.box([x, 1.1, zf], [0.92, 0.1, 0.72], '#F7C531');
    dry.box([x, 3.45, zf], [1.05, 0.2, 0.85], COL.teal);
    dry.part(T.cone, [x, 3.82, zf], [0.8, 0.55, 0.7], COL.white);
    B.glow.box([x, 2.55, -7.5 + 0.01], [0.28, 0.4, 0.04], '#FFE7A8');
    dry.box([x, 2.55, -7.5 + 0.02], [0.36, 0.5, 0.02], COL.darkMetal);
  }
  // logo panels on the wall each side of the gate (street side)
  for (const x of [-9.5, 9.5]) {
    dry.box([x, 0.6, -7.5 + 0.02], [1.9, 0.78, 0.04], COL.white);
    B.sign.quad([x, 0.6, -7.5 + 0.045], 1.8, 0.675, 0, uvOf('logo'));
  }
  // canopy over the gate: slab, fascia, two columns inside, lamps underneath
  const c = GATE_CANOPY;
  const cw = c.x1 - c.x0;
  const cz = (c.z0 + c.z1) / 2;
  const cd = c.z1 - c.z0;
  dry.box([0, c.h - 0.06, cz], [cw, 0.14, cd], COL.white);
  dry.box([0, c.h + 0.03, cz], [cw + 0.2, 0.06, cd + 0.2], COL.teal);
  B.wet.box([0, c.h + 0.08, cz], [cw + 0.3, 0.06, cd + 0.3], COL.roof);
  dry.box([0, c.h - 0.5, c.z1], [cw + 0.1, 0.95, 0.12], COL.tealDark);
  dry.box([0, c.h - 0.5, c.z1 - 0.06], [cw + 0.1, 1.0, 0.06], COL.white);
  // name sign on the front fascia (8:1 panel), logo on the inner fascia
  B.sign.quad([0, c.h - 0.5, c.z1 + 0.07], 2.4, 0.9, 0, uvOf('logo'));
  // gate lintel between the piers, directly above the sliding leaf: header beam carrying the name sign on both faces
  dry.box([0, 2.34, zf], [8.0, 0.74, 0.7], COL.tealDark);
  dry.box([0, 1.98, zf], [8.0, 0.06, 0.72], '#F7C531');
  B.sign.quad([0, 2.34, zf + 0.35 + 0.012], 5.2, 0.65, 0, uvOf('nameSign'));
  B.sign.quad([0, 2.34, zf - 0.35 - 0.012], 5.2, 0.65, Math.PI, uvOf('nameSign'));
  B.sign.quad([0, c.h - 0.5, c.z0 - 0.02], 2.4, 0.9, Math.PI, uvOf('logo'));
  for (const x of [-4.4, 4.4]) {
    dry.cyl([x, 1.7, c.z0 + 0.5], 0.3, 3.3, COL.white, { seg: 12 });
    dry.box([x, 0.16, c.z0 + 0.5], [0.55, 0.32, 0.55], COL.sand);
    dry.box([x, 3.35, c.z0 + 0.5], [0.5, 0.18, 0.5], COL.teal);
  }
  for (const x of [-2.6, 0, 2.6]) B.glow.box([x, c.h - 0.15, cz], [0.9, 0.04, 0.4], '#FFFDF2');
  // threshold: ramp from the raised sidewalk (0.15) to the compound (0), edged in yellow
  B.wet.boxMM(-4.0, 0.0, -7.9, 4.0, 0.005, -7.5, COL.sand);
  // sliding gate track and rail posts
  dry.box([0, 0.03, SLIDING_GATE.z], [12.6, 0.06, 0.16], '#7A7F87');
  dry.box([SLIDING_GATE.openX + 0.5, 1.0, SLIDING_GATE.z + 0.13], [8.6, 0.12, 0.08], COL.darkMetal);
  // gate leaf (closed position centred on x = 0, slides east)
  const L = SLIDING_GATE;
  const lz = L.z;
  const lf = X.leafDry;
  lf.box([0, 0.12, lz], [L.len, 0.2, 0.1], COL.tealDark);
  lf.box([0, 1.9, lz], [L.len, 0.2, 0.1], COL.tealDark);
  lf.box([-L.len / 2 + 0.07, L.h / 2 + 0.05, lz], [0.14, L.h + 0.1, 0.1], COL.tealDark);
  lf.box([L.len / 2 - 0.07, L.h / 2 + 0.05, lz], [0.14, L.h + 0.1, 0.1], COL.tealDark);
  lf.box([0, 1.0, lz], [0.14, L.h, 0.1], COL.tealDark);
  for (const x of [-2.5, 2.5]) lf.box([x, 0.04, lz], [0.3, 0.08, 0.14], COL.darkMetal);
  X.leafRail.quad([-L.len / 4 + 0.03, 1.0, lz], L.len / 2 - 0.2, 1.6, 0, [0, 0, (L.len / 2 - 0.2) / RAIL_REPEAT_M, 1]);
  X.leafRail.quad([L.len / 4 - 0.03, 1.0, lz], L.len / 2 - 0.2, 1.6, 0, [0, 0, (L.len / 2 - 0.2) / RAIL_REPEAT_M, 1]);
  lf.box([0, 1.95, lz], [0.4, 0.3, 0.12], '#F7C531');
  void GATE;
}

/* ------------------------------------------------------------ guard room */

export function buildGuardRoom(B: Batches) {
  const g = GUARD_ROOM;
  const dry = B.dry;
  const w = g.x1 - g.x0;
  const d = g.z1 - g.z0;
  const cx = (g.x0 + g.x1) / 2;
  const cz = (g.z0 + g.z1) / 2;
  const T2 = 0.16;
  const wall = '#E9F1F4';
  const base = '#2B5D8A';
  // floor and plinth
  dry.box([cx, 0.07, cz], [w + 0.1, 0.14, d + 0.1], COL.sand);
  B.glow.box([cx, g.h - 0.12, cz], [1.0, 0.04, 0.5], '#FFFDF2');
  // north wall (faces the compound) with door and window
  const nz = g.z0 + T2 / 2;
  const winX = -5.85;
  const winW = 1.5;
  const doorX = -7.2;
  const doorW = 0.95;
  const segs: [number, number][] = [
    [g.x0, doorX - doorW / 2],
    [doorX + doorW / 2, winX - winW / 2],
    [winX + winW / 2, g.x1],
  ];
  for (const [a, b] of segs) {
    dry.boxMM(a, 0.14, nz - T2 / 2, b, g.h, nz + T2 / 2, wall);
    dry.boxMM(a, 0.14, nz - T2 / 2 - 0.01, b, 0.8, nz + T2 / 2, base);
  }
  dry.boxMM(winX - winW / 2, 0.14, nz - T2 / 2, winX + winW / 2, 1.0, nz + T2 / 2, wall);
  dry.boxMM(winX - winW / 2, 1.0, nz - T2 / 2 - 0.01, winX + winW / 2, 1.05, nz + T2 / 2, base);
  dry.boxMM(winX - winW / 2, 2.15, nz - T2 / 2, winX + winW / 2, g.h, nz + T2 / 2, wall);
  dry.boxMM(doorX - doorW / 2, 2.15, nz - T2 / 2, doorX + doorW / 2, g.h, nz + T2 / 2, wall);
  // door leaf (slightly recessed), teal, with small glass
  dry.box([doorX, 1.07, nz + 0.01], [doorW - 0.1, 2.0, 0.06], COL.tealDark);
  B.glass.box([doorX, 1.55, nz - 0.03], [0.4, 0.5, 0.02], COL.glassTop, { bottom: COL.glassBot });
  dry.box([doorX + 0.32, 1.0, nz - 0.05], [0.05, 0.05, 0.08], COL.metal);
  // window: glass, white frame, sill, an awning, a counter shelf
  B.glass.box([winX, 1.62, nz], [winW - 0.06, 1.1, 0.03], COL.glassTop, { bottom: COL.glassBot });
  for (const [px, py, sx, sy] of [
    [winX, 2.15, winW + 0.1, 0.1],
    [winX, 1.0, winW + 0.1, 0.1],
    [winX - winW / 2, 1.6, 0.1, 1.2],
    [winX + winW / 2, 1.6, 0.1, 1.2],
    [winX, 1.6, 0.06, 1.1],
  ] as [number, number, number, number][])
    dry.box([px, py, nz - 0.02], [sx, sy, 0.14], COL.white);
  dry.box([winX, 0.99, nz - 0.2], [winW + 0.3, 0.06, 0.4], COL.white);
  dry.box([winX, 2.42, nz - 0.28], [winW + 0.5, 0.06, 0.6], COL.teal, { r: [-0.08, 0, 0] });
  B.sign.quad([winX, 2.62, nz - T2 / 2 - 0.02], 1.6, 0.4, Math.PI, uvOf('guard'));
  // south wall (facing the street, behind the fence) with a window, east wall with a gate window, west wall
  const sz = g.z1 - T2 / 2;
  dry.boxMM(g.x0, 0.14, sz - T2 / 2, g.x1, g.h, sz + T2 / 2, wall);
  B.glass.box([cx, 1.7, sz - T2 / 2 - 0.005], [1.8, 0.9, 0.03], COL.glassTop, { bottom: COL.glassBot });
  const ew = g.x1 - T2 / 2;
  dry.boxMM(ew - T2 / 2, 0.14, g.z0, ew + T2 / 2, g.h, g.z1, wall);
  dry.boxMM(ew - T2 / 2 - 0.01, 0.14, g.z0, ew + T2 / 2 + 0.01, 0.8, g.z1, base);
  B.glass.box([ew + T2 / 2 + 0.005, 1.7, cz - 0.1], [0.03, 0.9, 1.5], COL.glassTop, { bottom: COL.glassBot });
  dry.boxMM(g.x0, 0.14, g.z0, g.x0 + T2, g.h, g.z1, wall);
  dry.boxMM(g.x0 - 0.01, 0.14, g.z0, g.x0 + T2 + 0.01, 0.8, g.z1, base);
  // roof: slab with overhang, teal fascia, AC unit
  dry.box([cx, g.h + 0.06, cz], [w + 0.7, 0.16, d + 0.6], COL.white);
  dry.box([cx, g.h + 0.05, cz], [w + 0.78, 0.1, d + 0.68], COL.teal);
  B.wet.box([cx, g.h + 0.17, cz], [w + 0.5, 0.08, d + 0.4], COL.roof);
  dry.cbox([cx - 0.3, g.h + 0.5, cz + 0.3], [0.9, 0.55, 0.5], '#CBD2DA');
  dry.cyl([cx - 0.3, g.h + 0.79, cz + 0.3], 0.4, 0.04, COL.darkMetal, { seg: 12 });
  // interior: desk along the east wall, chair at the guard seat, monitor, phone, kettle, shelf, board
  const inter = new Frame(dry, [0, 0, 0], 0);
  inter.box([-4.85 - 0.5, 0.74, -9.3], [0.7, 0.05, 1.8], COL.wood);
  inter.box([-4.85 - 0.5, 0.36, -9.3], [0.62, 0.7, 1.7], '#9AA5B1');
  inter.box([-4.85 - 0.45, 1.05, -9.6], [0.05, 0.4, 0.62], '#1C2430');
  B.glow.box([-4.85 - 0.48, 1.05, -9.6], [0.02, 0.34, 0.54], '#9FE8FF');
  inter.box([-4.85 - 0.55, 0.8, -8.9], [0.2, 0.08, 0.16], COL.darkMetal);
  inter.cyl([-4.85 - 0.5, 0.88, -8.5], 0.14, 0.18, '#E23B3B', { seg: 8 });
  // chair (seat at the guard seat -6.4, -9.6 facing east toward the desk)
  inter.box([-6.0, 0.46, -9.6], [0.5, 0.06, 0.5], '#2B3440');
  inter.box([-6.25, 0.82, -9.6], [0.06, 0.7, 0.46], '#2B3440');
  inter.cyl([-6.0, 0.23, -9.6], 0.08, 0.4, COL.metal, { seg: 6 });
  inter.box([-6.0, 0.03, -9.6], [0.5, 0.06, 0.5], COL.darkMetal);
  // west wall: key cabinet, clipboard board; ceiling fan-less
  inter.box([g.x0 + T2 + 0.15, 1.5, -9.5], [0.3, 0.9, 0.9], '#B8C1CC');
  inter.box([g.x0 + T2 + 0.31, 1.5, -9.5], [0.02, 0.8, 0.8], '#4A5563');
  inter.box([g.x0 + T2 + 0.15, 0.35, -8.6], [0.3, 0.6, 0.6], COL.wood);
}

/* ------------------------------------------------------------ waiting area */

export function buildWaiting(B: Batches) {
  const w = WAITING;
  const dry = B.dry;
  const cx = (w.x0 + w.x1) / 2;
  const cz = (w.z0 + w.z1) / 2;
  const W = w.x1 - w.x0;
  const D = w.z1 - w.z0;
  // raised light platform with teal edge (0.06 high)
  B.wet.box([cx, 0.03, cz], [W - 0.1, 0.06, D - 0.1], '#EFE5D0');
  dry.box([cx, 0.035, w.z1 - 0.07], [W - 0.1, 0.07, 0.1], COL.teal);
  // posts and roof (slight slope down toward the street, teal and white shade panels)
  const posts: [number, number][] = [];
  for (const x of [w.x0 + 0.2, cx, w.x1 - 0.2]) for (const z of [w.z0 + 0.25, w.z1 - 0.25]) posts.push([x, z]);
  for (const [x, z] of posts) {
    dry.cyl([x, w.h / 2, z], 0.16, w.h, COL.white, { seg: 8 });
    dry.box([x, 0.08, z], [0.34, 0.16, 0.34], COL.sand);
  }
  const roofY = w.h + 0.06;
  const slopeRise = 0.35;
  const rl = Math.hypot(D, slopeRise);
  const ang = Math.atan2(slopeRise, D);
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const sw = W / stripes;
    const px = w.x0 + sw * (i + 0.5);
    dry.box([px, roofY + slopeRise / 2, cz], [sw - 0.02, 0.08, rl], i % 2 ? COL.white : COL.teal, { r: [ang, 0, 0] });
  }
  dry.box([cx, w.h - 0.1, w.z1], [W + 0.1, 0.18, 0.1], COL.tealDark); // south fascia (street side)
  dry.box([cx, w.h + 0.2, w.z0], [W + 0.1, 0.2, 0.1], COL.tealDark); // north fascia
  // sign: «منطقة الانتظار»
  B.sign.quad([cx, w.h + 0.45, w.z1 + 0.06], 3.2, 0.8, 0, uvOf('waiting'));
  B.sign.quad([cx, w.h + 0.45, w.z1 - 0.06], 3.2, 0.8, Math.PI, uvOf('waiting'));
  dry.box([cx - 1.6, w.h + 0.25, w.z1], [0.06, 0.4, 0.06], COL.darkMetal);
  dry.box([cx + 1.6, w.h + 0.25, w.z1], [0.06, 0.4, 0.06], COL.darkMetal);
  // benches face the street (south), a bin, a clock-less info board on the back post line
  const bz = -10.55;
  for (const x of [-14.6, -12.3, -10.05]) bench(B.wet, dry, [x, 0, bz], 0, PC.benchSeat, 1.7);
  dry.cyl([w.x1 - 0.7, 0.35, w.z0 + 0.8], 0.45, 0.7, '#4A5563', { seg: 12 });
  dry.cyl([w.x1 - 0.7, 0.72, w.z0 + 0.8], 0.5, 0.06, COL.teal, { seg: 12 });
  // lamps under the roof
  for (const x of [w.x0 + 1.5, cx + 0.8, w.x1 - 1.5]) B.glow.box([x, w.h - 0.04, cz], [0.7, 0.04, 0.3], '#FFFDF2');
  void (null as Col | null);
}
