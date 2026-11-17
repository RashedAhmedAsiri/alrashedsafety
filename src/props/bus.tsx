// OWNER: props worker. The yellow school bus: a conventional ("nose") school bus with the engine under a hood
// ahead of the windscreen, the door on the right just behind the front wheel. Origin at ground level under the
// middle, +X nose, +Z right (door side). See ./points.ts (BUS) for every local point; docs/props.md.
// Cheap to draw: the whole body + interior is ONE merged vertex-coloured mesh, all glass a second one, each door
// leaf two, each axle one; lettering, signs and the flashing lamps are a handful of small planes.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { canvasTexture } from '../world/kit';
import { FONT_FAMILY } from '../core/fonts';
import { GeoBuilder, LGEO, basic, cached, trs, vcMat } from './geo';
import { blobShadowTexture, busFrontSignTexture, plateTexture, stopTexture } from './textures';
import { BUS } from './points';

export interface BusProps {
  door?: 'open' | 'closed';
  stopArm?: boolean;
  interior?: boolean;
  /** Headlights on. */
  lights?: boolean;
  /** One side window with its upper sash slid down: [row index (0 = front), side -1 left / +1 right]. */
  openWindow?: [number, -1 | 1];
}

type V3 = [number, number, number];
type Span = [number, number];

const YEL = '#F7B80F';
const YEL_D = '#E3A409';
const BLACK = '#17191D';
const RUBBER = '#202329';
const CHROME = '#C9D1DA';
const CREAM = '#E6E0D0';
const SEAT = '#2C6FB8';
const SEAT_D = '#255E9E';
const SEAT_SHELL = '#1E4F86';
const METAL = '#5A606B';
const FLOOR = '#4A4F57';
const WELL = '#26292F';

const X0 = BUS.tailX; // -5.3
const XF = BUS.frontX; // 3.85, front wall of the passenger body
const XN = BUS.noseX; // 5.5, bumper face
const HW = BUS.width / 2; // 1.25
const FL = BUS.floor; // 0.82
const SKIRT = 0.42; // bottom edge of the body sides
const WIN_Y0 = 1.56; // window sill (bottom of the frames)
const WIN_Y1 = 2.4; // top of the frames
const SPLIT = 1.94; // the upper sash slides down from here
const WALL_TOP = 2.6; // where the rounded roof starts
const WS_Y0 = 1.7; // windscreen
const WS_Y1 = 2.48;
const AXLES = [BUS.frontAxle, BUS.rearAxle]; // 4.5, -1.6
const WR = 0.5; // wheel radius (centre at y 0.5, so the tyres stand on the ground)
const AR = 0.6; // wheel arch radius
const AY = 0.5; // arch centre height
const DOOR = BUS.doorX; // [3.0, 3.78]
const SW_Z = BUS.stairZ; // stairwell inner edge (z), the floor ends here
const SIDE_Z = (s: number) => s * (HW - 0.025);
const WELL_D = 0.5; // depth of the rear wheel housing into the body

/** Window panes on each side: one per seat row (evenly sized), plus the driver window (left) / the narrow pane by the door (right). */
function windowSpans(side: -1 | 1): { span: Span; split: boolean }[] {
  const out = BUS.rowX.map((x) => ({ span: [x - 0.32, x + 0.32] as Span, split: true }));
  out.push(side === -1 ? { span: [2.64, 3.74], split: false } : { span: [2.64, 2.9], split: false });
  return out.sort((a, b) => a.span[0] - b.span[0]);
}

/** [a, b] minus the rear wheel arch where a strip at height y (and thickness h) would cross it. */
function minusArches(a: number, b: number, y: number, h = 0.05): Span[] {
  let out: Span[] = [[a, b]];
  for (const c of AXLES) {
    const r = AR + 0.05;
    const dy = Math.max(0, y - h / 2 - AY);
    if (dy >= r) continue;
    const w = Math.sqrt(r * r - dy * dy);
    out = out.flatMap(([p, q]) => {
      if (q <= c - w || p >= c + w) return [[p, q]] as Span[];
      const res: Span[] = [];
      if (p < c - w) res.push([p, c - w]);
      if (q > c + w) res.push([c + w, q]);
      return res;
    });
  }
  return out;
}

/** Arc points of a wheel arch (left to right over the top). */
function archPts(c: number, r: number, n = 14): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([c + r * Math.cos(a), AY + r * Math.sin(a)]);
  }
  return pts;
}

/** Lower side wall (XY outline) from xa to xb with the wheel arches cut out, extruded 5 cm thick at z. */
function lowerPanel(B: GeoBuilder, xa: number, xb: number, z: number) {
  const pts: [number, number][] = [[xa, SKIRT]];
  for (const c of [...AXLES].sort((a, b) => a - b)) {
    if (c - AR <= xa || c + AR >= xb) continue;
    pts.push([c - AR, SKIRT], ...archPts(c, AR), [c + AR, SKIRT]);
  }
  pts.push([xb, SKIRT], [xb, WIN_Y0], [xa, WIN_Y0]);
  B.shape(pts, 0.05, YEL, trs([0, 0, z]));
}

/** A ring of thin boxes following a wheel arch (trim outside, housing inside). */
function archRing(B: GeoBuilder, c: number, r: number, z: number, depth: number, thick: number, color: string, n = 12) {
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - (i / n) * Math.PI;
    const a1 = Math.PI - ((i + 1) / n) * Math.PI;
    B.beam([c + r * Math.cos(a0), AY + r * Math.sin(a0), z], [c + r * Math.cos(a1), AY + r * Math.sin(a1), z], [thick, depth], color);
  }
}

/** Extrude a cross-section (z, y) along X from x0 to x1. */
function xsec(b: GeoBuilder, pts: [number, number][], x0: number, x1: number, color: string) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: 3 });
  b.add(g, color, new THREE.Matrix4().compose(new THREE.Vector3(x0, 0, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
}

/** Half roof outline (z >= 0, from the wall top to the centre), grown by `d` (negative = inward). */
function roofHalf(d: number): [number, number][] {
  const base: [number, number][] = [[1.25, 2.6], [1.245, 2.7], [1.22, 2.79], [1.165, 2.87], [1.07, 2.93], [0.9, 2.975], [0.6, 3.005], [0.0, 3.02]];
  return base.map(([z, y]) => [z + d * (z / 1.25) * 1.0, y + d]);
}
/** Closed full roof outline (both halves) at offset d, from the wall top on the left over to the right. */
function roofLine(d: number): [number, number][] {
  const h = roofHalf(d);
  return [...h.map(([z, y]) => [-z, y] as [number, number]), ...[...h].reverse().slice(1).map(([z, y]) => [z, y] as [number, number])];
}
/** A shell between two roof offsets (outer d0, inner d1), down to height yb at both sides. */
function roofShell(d0: number, d1: number, yb: number): [number, number][] {
  const o = roofLine(d0);
  const i = roofLine(d1).reverse();
  return [[o[0][0], yb], ...o, [o[o.length - 1][0], yb], [i[0][0], yb], ...i, [i[i.length - 1][0], yb]];
}

/** Black window frame (x0..x1, y0..y1) on the side wall at z, with the sash rail of a split window. */
function paneFrame(B: GeoBuilder, x0: number, x1: number, y0: number, y1: number, z: number, split: boolean) {
  const t = 0.04;
  const d = 0.08;
  B.box([(x0 + x1) / 2, y1 - t / 2, z], [x1 - x0, t, d], BLACK);
  B.box([(x0 + x1) / 2, y0 + t / 2, z], [x1 - x0, t, d], BLACK);
  B.box([x0 + t / 2, (y0 + y1) / 2, z], [t, y1 - y0, d], BLACK);
  B.box([x1 - t / 2, (y0 + y1) / 2, z], [t, y1 - y0, d], BLACK);
  if (split) {
    // the upper sash: its own frame a little proud of the wall, with two latches on its bottom rail
    const zz = z + Math.sign(z) * 0.015;
    B.box([(x0 + x1) / 2, SPLIT, zz], [x1 - x0 - 0.02, 0.05, d], BLACK);
    for (const fx of [0.28, 0.72]) B.box([x0 + (x1 - x0) * fx, SPLIT + 0.045, zz + Math.sign(z) * 0.04], [0.05, 0.03, 0.02], '#8C939E');
  }
}

/** Padded high-back bench, the hips of its passengers at x (seat surface FL + seatH); s = side, zc = bench centre. */
function bench(B: GeoBuilder, x: number, zc: number, s: number) {
  const top = FL + BUS.seatH;
  const w = 0.76;
  B.rbox([x + 0.04, top - 0.07, zc], [0.46, 0.14, w], SEAT, undefined, true); // cushion
  B.rbox([x - 0.25, top + 0.3, zc], [0.13, 0.66, w], SEAT_D, [0, 0, -0.08], true); // padded back
  B.rbox([x - 0.31, top + 0.28, zc], [0.04, 0.6, w - 0.04], SEAT_SHELL, [0, 0, -0.08], true); // back shell
  B.rbox([x - 0.22, top + 0.63, zc], [0.2, 0.08, w], SEAT_D, undefined, true); // rounded padded top
  // frame: aisle-side legs and a foot rail; the wall side hangs on the wall rail (nothing in the wheel well)
  const za = zc - s * (w / 2 - 0.04);
  B.beam([x + 0.16, FL, za], [x + 0.16, top - 0.14, za], 0.035, METAL, true);
  B.beam([x - 0.2, FL, za], [x - 0.2, top - 0.14, za], 0.035, METAL, true);
  B.box([x - 0.02, top - 0.15, za], [0.42, 0.03, 0.03], METAL);
  B.box([x - 0.02, top - 0.15, zc + s * (w / 2 - 0.03)], [0.42, 0.03, 0.03], METAL); // wall rail
}

function buildBody() {
  const B = new GeoBuilder();
  const rear = AXLES[1];

  // ---------- side walls ----------
  for (const s of [-1, 1] as const) {
    const z = SIDE_Z(s);
    const segs: Span[] = s === 1 ? [[X0, DOOR[0]], [DOOR[1], XF]] : [[X0, XF]];
    for (const [a, b] of segs) {
      lowerPanel(B, a, b, z);
      // black rub rails: under the windows, at seat level and along the floor line, broken at the arch
      for (const [y, h] of [[1.43, 0.05], [1.0, 0.05], [0.58, 0.06]] as [number, number][])
        for (const [p, q] of minusArches(a + 0.02, b - 0.02, y, h)) if (q - p > 0.05) B.box([(p + q) / 2, y, s * (HW + 0.008)], [q - p, h, 0.035], BLACK);
      // interior lining of the lower wall (above the wheel housing where it rises into the bus)
      for (const [p, q] of minusArches(a + 0.04, b - 0.04, AY, 0)) if (q - p > 0.02) B.box([(p + q) / 2, (FL + WIN_Y0) / 2, s * (HW - 0.065)], [q - p, WIN_Y0 - FL, 0.03], CREAM);
      if (a < rear && b > rear) B.box([rear, (AY + AR + 0.06 + WIN_Y0) / 2, s * (HW - 0.065)], [AR * 2 + 0.12, WIN_Y0 - AY - AR - 0.06, 0.03], CREAM);
      B.box([(a + b) / 2, WIN_Y0 + 0.02, s * (HW - 0.1)], [b - a - 0.08, 0.03, 0.1], CREAM); // inner sill ledge
    }
    // band above the windows (also the door header), outside yellow, inside cream
    B.box([(X0 + XF) / 2, (WIN_Y1 + WALL_TOP) / 2, z], [XF - X0, WALL_TOP - WIN_Y1, 0.05], YEL);
    B.box([(X0 + XF) / 2, (WIN_Y1 + WALL_TOP) / 2, s * (HW - 0.065)], [XF - X0 - 0.1, WALL_TOP - WIN_Y1, 0.03], CREAM);
    // pillars between the panes (the door posts on the right)
    const spans = windowSpans(s);
    let cur = X0;
    const pill = (a: number, b: number) => {
      const parts: Span[] = s === 1 && a < DOOR[1] && b > DOOR[0] ? [[a, DOOR[0]], [DOOR[1], b]] : [[a, b]];
      for (const [p, q] of parts) if (q - p > 0.02) B.box([(p + q) / 2, (WIN_Y0 + WIN_Y1) / 2, z], [q - p, WIN_Y1 - WIN_Y0, 0.05], YEL);
    };
    for (const { span: [a, b], split } of spans) {
      pill(cur, a);
      paneFrame(B, a, b, WIN_Y0, WIN_Y1, z, split);
      cur = b;
    }
    pill(cur, XF);
    // rear wheel arch: black trim ring outside, a closed dark housing inside (so nothing inside the bus shows)
    archRing(B, rear, AR + 0.035, s * (HW + 0.012), 0.05, 0.07, BLACK);
    archRing(B, rear, AR + 0.01, s * (HW - WELL_D / 2), WELL_D, 0.03, WELL);
    B.shape([...archPts(rear, AR + 0.02), [rear + AR + 0.02, SKIRT], [rear - AR - 0.02, SKIRT]], 0.03, WELL, trs([0, 0, s * (HW - WELL_D)]));
    B.box([rear - AR - 0.12, 0.3, s * (HW - 0.18)], [0.03, 0.42, 0.34], BLACK); // mud flaps
    B.box([rear + AR + 0.12, 0.34, s * (HW - 0.18)], [0.03, 0.3, 0.34], BLACK);
    // amber side marker lamps along the skirt
    for (const x of [X0 + 0.25, 0.9, XF - 0.15]) B.rbox([x, 0.7, s * (HW + 0.02)], [0.1, 0.06, 0.03], '#FFA41C', undefined, true);
    // amber and red clearance lamps along the top of the wall
    for (const x of [XF - 0.12, X0 + 0.12]) B.rbox([x, 2.66, s * (HW + 0.01)], [0.09, 0.05, 0.03], x > 0 ? '#FFA41C' : '#C8202A', undefined, true);
  }
  B.rbox([-3.2, 0.3, -0.95], [1.0, 0.34, 0.42], '#2A2D33', undefined, true); // fuel tank (street side, under the body)
  B.box([-3.2, 0.68, -HW - 0.005], [0.2, 0.16, 0.02], YEL_D); // fuel flap

  // ---------- underside: chassis rails, a closing plate ----------
  B.box([(X0 + XN) / 2 - 0.2, 0.36, 0], [XN - X0 - 0.6, 0.16, 1.4], BLACK);
  B.box([(X0 + XF) / 2, SKIRT + 0.01, 0], [XF - X0 - 0.1, 0.02, (HW - WELL_D) * 2], '#2B2E34');
  for (const s of [-1, 1]) for (const [p, q] of minusArches(X0 + 0.05, XF - 0.05, SKIRT + 0.05, 0.02)) B.box([(p + q) / 2, SKIRT + 0.01, s * (HW - WELL_D / 2 - 0.02)], [q - p, 0.02, WELL_D - 0.04], '#2B2E34');

  // ---------- floor ----------
  const fy = FL - 0.025;
  const [d0, d1] = DOOR;
  B.box([(X0 + XF) / 2, fy, (SW_Z - (HW - WELL_D)) / 2], [XF - X0 - 0.1, 0.05, SW_Z + HW - WELL_D], FLOOR); // aisle and inner strip
  for (const [p, q] of [[X0 + 0.05, d0], [d1, XF - 0.05]] as Span[]) B.box([(p + q) / 2, fy, (SW_Z + HW - WELL_D) / 2], [q - p, 0.05, HW - WELL_D - SW_Z], FLOOR);
  for (const s of [-1, 1]) {
    const segs: Span[] = s === 1 ? [[X0 + 0.05, d0], [d1, XF - 0.05]] : [[X0 + 0.05, XF - 0.05]];
    for (const [a, b] of segs) for (const [p, q] of minusArches(a, b, FL - 0.03, 0.02)) B.box([(p + q) / 2, fy, s * (HW - WELL_D / 2 - 0.02)], [q - p, 0.05, WELL_D - 0.06], FLOOR);
  }
  B.box([(X0 + d0) / 2, FL + 0.004, 0], [d0 - X0 - 0.3, 0.01, 0.62], '#5E636C'); // ribbed aisle runner
  for (let x = X0 + 0.4; x < d0 - 0.2; x += 0.28) B.box([x, FL + 0.011, 0], [0.04, 0.006, 0.56], '#535861');

  // ---------- doorway: stairwell, three treads, handrails ----------
  const dxc = (d0 + d1) / 2;
  const dw = d1 - d0;
  const tz: Span[] = [[SW_Z, 0.75], [0.75, 1.0], [1.0, HW - 0.01]];
  BUS.steps.forEach(([, ty], i) => {
    const [za, zb] = tz[i];
    B.box([dxc, (0.22 + ty) / 2, (za + zb) / 2], [dw, ty - 0.22, zb - za], '#30343B');
    B.box([dxc, ty + 0.004, zb - 0.025], [dw, 0.012, 0.05], '#FFD21F'); // yellow nosing
  });
  B.box([dxc, FL + 0.004, SW_Z + 0.025], [dw, 0.012, 0.05], '#FFD21F');
  for (const x of DOOR) B.box([x, (0.22 + FL) / 2, (SW_Z + HW) / 2], [0.04, FL - 0.22, HW - SW_Z], METAL); // stairwell sides
  // handrail along the rear side of the stairwell (the front side has a short grab handle)
  B.beam([d0 + 0.07, 0.31 + 0.85, HW - 0.12], [d0 + 0.07, FL + 0.75, SW_Z + 0.1], 0.035, CHROME, true);
  B.beam([d0 + 0.07, 0.31, HW - 0.12], [d0 + 0.07, 0.31 + 0.85, HW - 0.12], 0.035, CHROME, true);
  B.beam([d1 - 0.06, 0.95, HW - 0.1], [d1 - 0.06, 1.5, HW - 0.1], 0.035, CHROME, true);
  B.box([dxc, WIN_Y1 + 0.02, HW - 0.02], [dw, 0.04, 0.08], RUBBER); // header seal
  // modesty panels in front of the first benches, a stanchion by the stairwell
  const top = FL + BUS.seatH;
  for (const [x, s] of [[2.6, -1], [2.95, 1]] as [number, -1 | 1][]) {
    B.rbox([x, FL + 0.52, s * 0.8], [0.06, 1.0, 0.74], SEAT_D, undefined, true);
    B.beam([x - 0.05, FL, s * 0.45], [x - 0.05, FL + 1.0, s * 0.45], 0.035, METAL, true);
  }

  // ---------- roof, ceiling, front and rear caps ----------
  xsec(B, roofShell(0, -0.04, WALL_TOP - 0.01), X0, XF, YEL);
  xsec(B, roofShell(-0.045, -0.065, WALL_TOP - 0.01), X0 + 0.06, XF - 0.06, '#F3EFE4'); // ceiling
  for (const z of [-0.55, 0.55]) B.box([(X0 + XF) / 2, 2.9, z], [XF - X0 - 0.8, 0.03, 0.14], '#FFFFFF'); // light strips
  for (const x of [-3.4, 0.4]) {
    B.rbox([x, 3.02, 0], [0.78, 0.07, 0.78], '#E2D9BE', undefined, true); // roof hatches
    B.box([x, 3.06, 0], [0.62, 0.02, 0.62], '#C9C1A8');
  }
  const cap: [number, number][] = [[-HW, WALL_TOP - 0.02], ...roofLine(0).slice(1, -1), [HW, WALL_TOP - 0.02]];
  xsec(B, cap, XF - 0.04, XF + 0.03, YEL);
  xsec(B, cap, X0 - 0.03, X0 + 0.04, YEL);
  // black sign panels on both caps (the lettering planes are added in the component)
  for (const x of [XF + 0.035, X0 - 0.035]) B.rbox([x, BUS.roofSign[1], 0], [0.03, 0.3, 1.08], BLACK, undefined, true);

  // ---------- front wall around the windscreen ----------
  B.box([XF, (SKIRT + WS_Y0) / 2, 0], [0.08, WS_Y0 - SKIRT, BUS.width], YEL); // cowl wall (mostly behind the hood)
  B.box([XF, (WS_Y1 + WALL_TOP) / 2, 0], [0.08, WALL_TOP - WS_Y1 + 0.02, BUS.width], YEL); // header
  for (const z of [-HW + 0.07, HW - 0.07]) B.box([XF, (WS_Y0 + WS_Y1) / 2, z], [0.08, WS_Y1 - WS_Y0, 0.14], YEL); // corner posts
  B.box([XF + 0.02, (WS_Y0 + WS_Y1) / 2, 0], [0.06, WS_Y1 - WS_Y0, 0.06], BLACK); // centre post
  for (const y of [WS_Y0, WS_Y1]) B.box([XF + 0.03, y, 0], [0.04, 0.04, BUS.width - 0.2], BLACK); // rubber seals
  for (const z of [-0.6, 0.62]) B.beam([XF + 0.06, WS_Y0 + 0.04, z], [XF + 0.06, WS_Y0 + 0.36, z - 0.42], 0.025, BLACK); // wipers

  // ---------- hood, fenders, grille, lamps, bumper ----------
  const c = AXLES[0];
  for (const s of [-1, 1]) {
    // fender with its wheel arch, a black arch liner and trim
    const fen: [number, number][] = [[XF - 0.05, AY], ...archPts(c, AR), [c + AR + 0.1, AY + 0.04], [5.3, 0.72], [5.33, 1.15], [5.28, 1.33], [5.1, 1.44], [4.3, 1.5], [XF - 0.05, 1.52]];
    B.shape(fen, 0.6, YEL, trs([0, 0, s * 0.93]), 0.04);
    archRing(B, c, AR + 0.03, s * 1.235, 0.04, 0.06, BLACK);
    archRing(B, c, AR + 0.005, s * 0.92, 0.6, 0.03, WELL);
    B.box([c + AR + 0.12, 0.42, s * 1.0], [0.03, 0.3, 0.36], BLACK); // splash guard
    // headlight bezel with a big round lamp and a round amber turn lamp outboard
    B.rbox([5.37, 1.08, s * 0.95], [0.05, 0.32, 0.5], BLACK, undefined, true);
    B.cyl([5.395, 1.08, s * 0.86], [0.27, 0.03, 0.27], CHROME, [0, 0, Math.PI / 2], 18);
    B.cyl([5.41, 1.08, s * 0.86], [0.22, 0.02, 0.22], '#F6F4EC', [0, 0, Math.PI / 2], 18);
    B.cyl([5.4, 1.08, s * 1.09], [0.14, 0.03, 0.14], '#FFA41C', [0, 0, Math.PI / 2], 14);
    // crossview mirror on a stalk at the front corner of the fender
    B.beam([5.1, 1.4, s * 1.1], [5.22, 1.62, s * 1.18], 0.045, BLACK, true);
    B.beam([5.22, 1.62, s * 1.18], [5.3, 1.66, s * 1.18], 0.045, BLACK, true);
    B.sphere([5.36, 1.68, s * 1.18], [0.16, 0.26, 0.3], BLACK);
    B.sphere([5.42, 1.68, s * 1.18], [0.06, 0.2, 0.24], '#9DB4C4');
    // big flat mirrors on arms from the front corners of the body, and a small convex one under each
    B.beam([XF + 0.02, 2.36, s * (HW - 0.04)], [XF + 0.32, 2.2, s * (HW + 0.36)], 0.035, BLACK, true);
    B.beam([XF + 0.02, 1.76, s * (HW - 0.04)], [XF + 0.32, 1.66, s * (HW + 0.36)], 0.035, BLACK, true);
    B.rbox([XF + 0.34, 2.02, s * (HW + 0.38)], [0.08, 0.46, 0.24], BLACK, undefined, true);
    B.rbox([XF + 0.3, 2.02, s * (HW + 0.38)], [0.02, 0.4, 0.19], '#A9C2D2', undefined, true);
    B.sphere([XF + 0.34, 1.68, s * (HW + 0.38)], [0.1, 0.18, 0.18], BLACK);
  }
  // the hood: a raised centre over the engine, rounded edges, a little lower toward the grille
  B.shape([[XF - 0.05, 0.9], [5.24, 0.9], [5.3, 1.38], [5.22, 1.54], [5.02, 1.61], [XF - 0.05, 1.66]], 1.32, YEL, trs([0, 0, 0]), 0.06);
  B.box([4.7, 0.7, 0], [1.1, 0.4, 0.62 * 2], '#1C1E22'); // engine bay underside between the fenders
  // black grille with horizontal bars and a chrome surround
  B.rbox([5.36, 1.12, 0], [0.06, 0.48, 1.08], CHROME, undefined, true);
  B.rbox([5.385, 1.12, 0], [0.04, 0.42, 1.0], '#121418', undefined, true);
  for (let i = 0; i < 6; i++) B.box([5.41, 0.95 + i * 0.066, 0], [0.012, 0.022, 0.94], '#2E3239');
  // front bumper (black), red tow hooks
  B.rbox([5.42, 0.6, 0], [0.2, 0.26, BUS.width - 0.02], BLACK, undefined, true);
  for (const z of [-0.7, 0.7]) B.box([5.52, 0.5, z], [0.04, 0.06, 0.1], '#C8202A');

  // ---------- rear: emergency door with a window, two rear windows, lamps, bumper ----------
  const RW: Span = [1.62, 2.36];
  B.box([X0, (SKIRT + RW[0]) / 2, 0], [0.08, RW[0] - SKIRT, BUS.width], YEL);
  B.box([X0, (RW[1] + WALL_TOP) / 2, 0], [0.08, WALL_TOP - RW[1] + 0.02, BUS.width], YEL);
  const rearGlass: Span[] = [[-1.1, -0.55], [-0.36, 0.36], [0.55, 1.1]];
  for (const [a, b] of [[-HW, -1.1], [-0.55, -0.36], [0.36, 0.55], [1.1, HW]] as Span[]) B.box([X0, (RW[0] + RW[1]) / 2, (a + b) / 2], [0.08, RW[1] - RW[0], b - a], YEL);
  for (const [a, b] of rearGlass) {
    for (const y of RW) B.box([X0 - 0.03, y, (a + b) / 2], [0.03, 0.04, b - a + 0.04], BLACK);
    for (const z of [a, b]) B.box([X0 - 0.03, (RW[0] + RW[1]) / 2, z], [0.03, RW[1] - RW[0] + 0.04, 0.04], BLACK);
  }
  // door seams, hinges and the red handle
  for (const z of [-0.45, 0.45]) B.box([X0 - 0.045, (0.5 + 2.46) / 2, z], [0.02, 1.96, 0.03], BLACK);
  for (const y of [0.5, 2.46]) B.box([X0 - 0.045, y, 0], [0.02, 0.03, 0.93], BLACK);
  for (const y of [0.85, 1.9]) B.box([X0 - 0.06, y, -0.47], [0.04, 0.14, 0.05], '#3A3E46');
  B.rbox([X0 - 0.07, 1.35, 0.3], [0.06, 0.06, 0.24], '#D23A3A', undefined, true);
  for (const s of [-1, 1]) {
    B.rbox([X0 - 0.03, 1.0, s * 0.9], [0.05, 0.62, 0.3], BLACK, undefined, true);
    B.cyl([X0 - 0.06, 1.2, s * 0.9], [0.18, 0.02, 0.18], '#C8202A', [0, 0, Math.PI / 2], 14);
    B.cyl([X0 - 0.06, 1.0, s * 0.9], [0.16, 0.02, 0.16], '#FFA41C', [0, 0, Math.PI / 2], 14);
    B.cyl([X0 - 0.06, 0.8, s * 0.9], [0.12, 0.02, 0.12], '#F4F2EA', [0, 0, Math.PI / 2], 12);
  }
  B.rbox([X0 - 0.1, 0.58, 0], [0.18, 0.26, BUS.width - 0.02], BLACK, undefined, true);
  // inside: cream lining of the back wall, a red bar across the emergency door
  B.box([X0 + 0.06, (FL + RW[0]) / 2, 0], [0.02, RW[0] - FL, BUS.width - 0.14], CREAM);
  B.box([X0 + 0.06, (RW[1] + WALL_TOP) / 2, 0], [0.02, WALL_TOP - RW[1], BUS.width - 0.14], CREAM);
  B.beam([X0 + 0.1, 1.4, -0.38], [X0 + 0.1, 1.4, 0.38], 0.04, '#D23A3A', true);

  // ---------- benches ----------
  for (const x of BUS.rowX) for (const s of [-1, 1]) bench(B, x, s * (HW - 0.09 - 0.38), s);

  // ---------- driver area ----------
  const [dx, , dz] = BUS.driver;
  B.box([dx, FL + 0.18, dz], [0.26, 0.36, 0.26], METAL); // pedestal
  B.rbox([dx + 0.02, top - 0.07, dz], [0.5, 0.14, 0.52], '#2A2E36', undefined, true);
  B.rbox([dx - 0.26, top + 0.36, dz], [0.12, 0.7, 0.5], '#2A2E36', [0, 0, -0.08], true);
  B.rbox([dx - 0.31, top + 0.8, dz], [0.1, 0.18, 0.32], '#2A2E36', undefined, true); // headrest
  const [wx, wy] = BUS.steeringWheel;
  B.add(LGEO.torus, '#14161A', trs([wx, wy, dz], [0, Math.PI / 2, 0.6], [0.48, 0.48, 0.48]));
  B.beam([wx, wy, dz], [3.8, 1.38, dz], 0.07, '#14161A', true); // column
  B.rbox([3.7, 1.5, -0.36], [0.3, 0.4, 1.66], '#2E333B', undefined, true); // dashboard
  B.rbox([3.66, 1.73, dz], [0.2, 0.1, 0.56], '#171A1F', undefined, true); // instrument hood
  for (const z of [dz - 0.13, dz + 0.13]) B.cyl([3.56, 1.64, z], [0.12, 0.02, 0.12], '#E9E5D6', [0, 0, Math.PI / 2 - 0.5], 14); // gauges
  B.cyl([3.62, 1.71, 0.25], [0.08, 0.04, 0.08], '#E23B3B', undefined, 12); // door button
  B.rbox([3.35, FL + 0.38, -0.18], [0.3, 0.76, 0.16], '#2E333B', undefined, true); // door control box
  B.beam([3.35, FL + 0.76, -0.18], [3.42, FL + 1.0, -0.18], 0.03, BLACK, true);
  B.sphere([3.42, FL + 1.02, -0.18], [0.07, 0.07, 0.07], '#D23A3A');
  B.rbox([XF - 0.08, 2.54, 0], [0.06, 0.16, 0.8], BLACK, undefined, true); // passenger-view mirror
  B.rbox([XF - 0.11, 2.54, 0], [0.02, 0.12, 0.74], '#A9C2D2', undefined, true);
  B.box([XF - 0.2, 2.47, dz], [0.3, 0.02, 0.6], '#3A3E46'); // sun visor
  return B.build();
}

/** Every pane (side windows, windscreen, rear); one window's upper sash slid down when asked. */
function buildGlass(open?: [number, number]) {
  const G = new GeoBuilder();
  for (const s of [-1, 1] as const) {
    const z = SIDE_Z(s);
    windowSpans(s).forEach(({ span: [a, b], split }) => {
      const row = BUS.rowX.findIndex((x) => Math.abs(x - (a + b) / 2) < 0.05);
      const isOpen = open && s === open[1] && row === open[0];
      if (!split) {
        G.box([(a + b) / 2, (WIN_Y0 + WIN_Y1) / 2, z], [b - a - 0.02, WIN_Y1 - WIN_Y0 - 0.02, 0.012], '#FFFFFF');
        return;
      }
      G.box([(a + b) / 2, (WIN_Y0 + SPLIT) / 2, z], [b - a - 0.02, SPLIT - WIN_Y0, 0.012], '#FFFFFF');
      // the upper sash: closed it fills the top; open it sits down over the lower pane (the top is open)
      if (isOpen) G.box([(a + b) / 2, (WIN_Y0 + SPLIT) / 2 + 0.02, z + s * 0.02], [b - a - 0.04, SPLIT - WIN_Y0, 0.012], '#FFFFFF');
      else G.box([(a + b) / 2, (SPLIT + WIN_Y1) / 2, z + s * 0.015], [b - a - 0.02, WIN_Y1 - SPLIT, 0.012], '#FFFFFF');
    });
  }
  for (const s of [-1, 1]) G.box([XF + 0.01, (WS_Y0 + WS_Y1) / 2, s * 0.6], [0.012, WS_Y1 - WS_Y0, 1.08], '#FFFFFF'); // windscreen
  for (const [a, b] of [[-1.1, -0.55], [-0.36, 0.36], [0.55, 1.1]] as Span[]) G.box([X0 - 0.01, 1.99, (a + b) / 2], [0.012, 0.74, b - a], '#FFFFFF');
  return G.build();
}

/** One door leaf: hinge at the origin on the wall plane, free edge toward +x. Yellow frame, two glass panels. */
function buildLeaf() {
  const w = (DOOR[1] - DOOR[0]) / 2;
  const y0 = 0.36;
  const y1 = WIN_Y1 - 0.02;
  const P = new GeoBuilder();
  P.box([0.03, (y0 + y1) / 2, 0], [0.06, y1 - y0, 0.05], BLACK); // hinge stile
  P.box([w - 0.025, (y0 + y1) / 2, 0], [0.05, y1 - y0, 0.06], RUBBER); // rubber seal at the closing edge
  P.box([w / 2, y0 + 0.05, 0], [w, 0.1, 0.05], BLACK);
  P.box([w / 2, 1.3, 0], [w, 0.08, 0.05], BLACK);
  P.box([w / 2, y1 - 0.04, 0], [w, 0.08, 0.05], BLACK);
  P.box([w / 2, 1.42, 0.03], [w - 0.12, 0.03, 0.02], CHROME); // push bar
  const G = new GeoBuilder();
  G.box([w / 2, (y0 + 0.1 + 1.26) / 2, 0], [w - 0.08, 1.26 - y0 - 0.1, 0.012], '#FFFFFF');
  G.box([w / 2, (1.34 + y1 - 0.08) / 2, 0], [w - 0.08, y1 - 0.08 - 1.34, 0.012], '#FFFFFF');
  return { paint: P.build(), glass: G.build() };
}

const glassMat = new THREE.MeshStandardMaterial({ color: '#9CCFE6', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.26, depthWrite: false });
const glassMatDark = new THREE.MeshStandardMaterial({ color: '#4F7F9A', roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.66, depthWrite: false });

/** Both wheels of an axle (tyre, white rim with a lip, hub, lug nuts); the rear axle has duals. */
function buildWheels(dual: boolean) {
  const W = new GeoBuilder();
  const tw = dual ? 0.44 : 0.3;
  for (const s of [-1, 1]) {
    const z = s * (dual ? 0.98 : 1.02);
    const face = z + (s * tw) / 2;
    W.cyl([0, 0, z], [WR * 2, tw, WR * 2], '#1B1D22', [Math.PI / 2, 0, 0], 22);
    if (dual) W.cyl([0, 0, z], [WR * 2 + 0.01, 0.03, WR * 2 + 0.01], '#101114', [Math.PI / 2, 0, 0], 22); // groove between the duals
    W.cyl([0, 0, face + s * 0.012], [WR * 1.2, 0.02, WR * 1.2], '#D9DEE5', [Math.PI / 2, 0, 0], 18);
    W.add(LGEO.torus, '#EEF1F4', trs([0, 0, face + s * 0.014], [0, 0, 0], [WR * 1.2, WR * 1.2, 0.4]));
    W.cyl([0, 0, face + s * 0.02], [WR * 0.5, 0.04, WR * 0.5], '#8A93A0', [Math.PI / 2, 0, 0], 12);
    W.cyl([0, 0, face + s * 0.045], [WR * 0.2, 0.05, WR * 0.2], '#5E6670', [Math.PI / 2, 0, 0], 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      W.box([Math.cos(a) * WR * 0.33, Math.sin(a) * WR * 0.33, face + s * 0.045], [0.045, 0.045, 0.03], '#3A3F49');
    }
    // hand holes so the spin shows
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      W.cyl([Math.cos(a) * WR * 0.45, Math.sin(a) * WR * 0.45, face + s * 0.024], [0.09, 0.02, 0.09], '#6C737E', [Math.PI / 2, 0, 0], 10);
    }
  }
  return W.build();
}

/** Black lettering on the yellow body (no background). */
function letterTexture(key: string, text: string, px: number, w = 1024, h = 128) {
  return canvasTexture(key, w, h, (ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${px}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#121418';
    ctx.fillText(text, cw / 2, ch / 2 + px * 0.06);
  });
}

/** «مخرج طوارئ» label of the rear emergency door. */
function exitTexture() {
  return canvasTexture('bus:exit', 256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#C62828';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `700 40px ${FONT_FAMILY}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('مخرج طوارئ', w / 2, h / 2 + 3);
  });
}

const RED_OFF = '#5A1A1D';
const AMB_OFF = '#7A5212';
const NAME_X = 0.9; // centre of the side lettering (between the door and the rear wheel)

/** The bus. */
export function BusModel({ door = 'closed', stopArm = false, interior = true, lights = false, openWindow }: BusProps) {
  const body = useMemo(() => cached('bus3:body', buildBody), []);
  const glassKey = openWindow ? `${openWindow[0]}:${openWindow[1]}` : 'none';
  const glass = useMemo(() => cached(`bus3:glass:${glassKey}`, () => buildGlass(openWindow)), [glassKey, openWindow]);
  const leaf = useMemo(() => cached('bus3:leaf', buildLeaf), []);
  const wheelsF = useMemo(() => cached('bus3:wheelsF', () => buildWheels(false)), []);
  const wheelsR = useMemo(() => cached('bus3:wheelsR', () => buildWheels(true)), []);
  const mats = useMemo(() => {
    const decal = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    return {
      name: decal(letterTexture('bus3:name', 'مدرسة الراشد', 104)),
      kind: decal(letterTexture('bus3:kind', 'حافلة مدرسية', 92)),
      sign: new THREE.MeshBasicMaterial({ map: busFrontSignTexture(), toneMapped: false }),
      exit: new THREE.MeshBasicMaterial({ map: exitTexture(), toneMapped: false }),
      plate: new THREE.MeshBasicMaterial({ map: plateTexture(7), toneMapped: false }),
      stop: new THREE.MeshBasicMaterial({ map: stopTexture(false), transparent: true, side: THREE.DoubleSide, toneMapped: false, alphaTest: 0.3 }),
    };
  }, []);
  const root = useRef<THREE.Group>(null);
  const leafA = useRef<THREE.Group>(null);
  const leafB = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const wheelRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const redA = useRef<THREE.MeshBasicMaterial>(null);
  const redB = useRef<THREE.MeshBasicMaterial>(null);
  const ambA = useRef<THREE.MeshBasicMaterial>(null);
  const prev = useRef(new THREE.Vector3());
  const has = useRef(false);
  const ang = useRef(0);
  const doorK = useRef(door === 'open' ? 1 : 0);
  const armK = useRef(stopArm ? 1 : 0);
  const want = useRef({ door, stopArm });
  want.current = { door, stopArm };
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const fw = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, dt) => {
    const g = root.current;
    if (g) {
      // wheels roll with the distance travelled along the bus's forward axis
      g.getWorldPosition(tmp);
      if (has.current) {
        g.getWorldDirection(fw);
        const d = (tmp.x - prev.current.x) * fw.z - (tmp.z - prev.current.z) * fw.x;
        if (Math.abs(d) < 3) ang.current -= d / WR;
      }
      prev.current.copy(tmp);
      has.current = true;
      for (const w of wheelRefs) if (w.current) w.current.rotation.z = ang.current;
    }
    const k = Math.min(1, dt * 3.2);
    doorK.current += ((want.current.door === 'open' ? 1 : 0) - doorK.current) * k;
    armK.current += ((want.current.stopArm ? 1 : 0) - armK.current) * Math.min(1, dt * 5);
    // the two leaves fold INTO the stairwell, flat against its sides
    const th = doorK.current * (Math.PI / 2);
    if (leafA.current) leafA.current.rotation.y = th;
    if (leafB.current) leafB.current.rotation.y = -th;
    if (arm.current) arm.current.rotation.y = armK.current * Math.PI * 0.5;
    const t = st.clock.elapsedTime;
    const flash = want.current.stopArm;
    if (redA.current) redA.current.color.set(flash && Math.sin(t * 9) > 0 ? '#FF2A2A' : RED_OFF);
    if (redB.current) redB.current.color.set(flash && Math.sin(t * 9) <= 0 ? '#FF2A2A' : RED_OFF);
    if (ambA.current) ambA.current.color.set(want.current.door === 'open' && !flash ? '#FFB020' : AMB_OFF);
  });

  const hingeA: V3 = [DOOR[0], 0, HW - 0.03];
  const hingeB: V3 = [DOOR[1], 0, HW - 0.03];
  /** flashing lamps on the front and rear caps: [x, facing] */
  const caps: [number, number][] = [[XF + 0.06, Math.PI / 2], [X0 - 0.06, -Math.PI / 2]];
  const ly = BUS.roofSign[1];
  const bodyMat = vcMat(0.55, 0.02, { emissive: 0.22 });

  return (
    <group ref={root}>
      <mesh rotation-x={-Math.PI / 2} position={[0.1, 0.012, 0]} scale={[BUS.length * 1.06, BUS.width * 1.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={blobShadowTexture()} transparent depthWrite={false} opacity={0.8} />
      </mesh>
      <group ref={wheelRefs[0]} position={[AXLES[0], WR, 0]}>
        <mesh geometry={wheelsF} material={vcMat(0.8)} castShadow />
      </group>
      <group ref={wheelRefs[1]} position={[AXLES[1], WR, 0]}>
        <mesh geometry={wheelsR} material={vcMat(0.8)} castShadow />
      </group>
      <mesh geometry={body} material={bodyMat} castShadow />
      <mesh geometry={glass} material={interior ? glassMat : glassMatDark} renderOrder={2} />
      {/* door leaves */}
      <group ref={leafA} position={hingeA}>
        <mesh geometry={leaf.paint} material={bodyMat} castShadow />
        <mesh geometry={leaf.glass} material={glassMat} renderOrder={2} />
      </group>
      <group ref={leafB} position={hingeB} scale={[-1, 1, 1]}>
        <mesh geometry={leaf.paint} material={bodyMat} castShadow />
        <mesh geometry={leaf.glass} material={glassMat} renderOrder={2} />
      </group>
      {/* «مدرسة الراشد» between the upper rub rails, «حافلة مدرسية» under it, on both sides */}
      {[-1, 1].map((s) => (
        <group key={s} position={[NAME_X, 0, s * (HW + 0.03)]} rotation-y={s < 0 ? Math.PI : 0}>
          <mesh position={[0, 1.215, 0]} material={mats.name}>
            <planeGeometry args={[3.0, 0.375]} />
          </mesh>
          <mesh position={[0, 0.79, 0]} material={mats.kind}>
            <planeGeometry args={[2.2, 0.275]} />
          </mesh>
        </group>
      ))}
      {/* «حافلة مدرسية» signs on the front and rear caps */}
      <mesh position={[XF + 0.052, ly, 0]} rotation-y={Math.PI / 2} material={mats.sign}>
        <planeGeometry args={[1.02, 0.25]} />
      </mesh>
      <mesh position={[X0 - 0.052, ly, 0]} rotation-y={-Math.PI / 2} material={mats.sign}>
        <planeGeometry args={[1.02, 0.25]} />
      </mesh>
      <mesh position={[X0 - 0.06, 1.5, 0]} rotation-y={-Math.PI / 2} material={mats.exit}>
        <planeGeometry args={[0.64, 0.16]} />
      </mesh>
      {/* plates */}
      <mesh position={[XN + 0.025, 0.6, 0]} rotation-y={Math.PI / 2} material={mats.plate}>
        <planeGeometry args={[0.5, 0.2]} />
      </mesh>
      <mesh position={[X0 - 0.195, 0.6, 0]} rotation-y={-Math.PI / 2} material={mats.plate}>
        <planeGeometry args={[0.5, 0.2]} />
      </mesh>
      {/* warning lamps at the cap corners: red outer (flash with the stop arm), amber inner (lit while the door is open) */}
      {caps.map(([x, ry], i) =>
        [-1, 1].map((s) => (
          <group key={`l${i}${s}`} position={[x, ly, 0]} rotation-y={ry}>
            <mesh position={[s * 1.02, 0, -0.03]} geometry={LGEO.cyl} rotation-x={Math.PI / 2} scale={[0.24, 0.08, 0.24]} material={basic(BLACK)} />
            <mesh position={[s * 1.02, 0, 0.02]} geometry={LGEO.sphereLow} scale={[0.17, 0.17, 0.06]}>
              <meshBasicMaterial ref={s < 0 ? redA : redB} color={RED_OFF} toneMapped={false} />
            </mesh>
            <mesh position={[s * 0.73, 0, -0.03]} geometry={LGEO.cyl} rotation-x={Math.PI / 2} scale={[0.22, 0.08, 0.22]} material={basic(BLACK)} />
            <mesh position={[s * 0.73, 0, 0.02]} geometry={LGEO.sphereLow} scale={[0.15, 0.15, 0.06]}>
              {i === 0 && s < 0 ? <meshBasicMaterial ref={ambA} color={AMB_OFF} toneMapped={false} /> : <meshBasicMaterial color={AMB_OFF} toneMapped={false} />}
            </mesh>
          </group>
        )),
      )}
      {lights && [-1, 1].map((s) => <mesh key={s} position={[5.42, 1.08, s * 0.86]} geometry={LGEO.sphereLow} scale={[0.04, 0.2, 0.2]} material={basic('#FFF4C2')} />)}
      {/* stop arm on the left (street side) under the driver window, folded flat on the wall;
          it swings out 90 degrees when stopArm is on */}
      <group ref={arm} position={[BUS.stopArmX, 1.22, -HW - 0.045]}>
        <mesh geometry={LGEO.box} material={basic(BLACK)} position={[0.1, 0, 0]} scale={[0.2, 0.06, 0.03]} />
        <mesh position={[0.46, 0, -0.012]} rotation-y={Math.PI} material={mats.stop}>
          <planeGeometry args={[0.48, 0.48]} />
        </mesh>
        <mesh position={[0.46, 0, 0.012]} material={mats.stop}>
          <planeGeometry args={[0.48, 0.48]} />
        </mesh>
      </group>
    </group>
  );
}
