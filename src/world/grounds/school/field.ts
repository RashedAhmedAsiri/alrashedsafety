/**
 * The football field: high chain-link netting with an entrance gap on the yard side, two goals with nets,
 * a team bench under a shade roof, a water cooler, corner flags, floodlights, balls and cones.
 */
import type { Batch, V3 } from './batch';
import { uvOf } from './atlas';
import type { Batches } from './building';
import { COL } from './building';
import type { Extra } from './compound';
import { DUGOUT, FIELD, FIELD_GAP, GOAL, PITCH, SCHOOL_LANDMARKS } from './layout';
import { PC, Frame, bench, cooler } from './parts';

const NET_H = 5.0;
const CELL = 0.5;

function netPanel(X: Extra, from: [number, number], to: [number, number], h: number) {
  const alongX = from[1] === to[1];
  const len = Math.abs(alongX ? to[0] - from[0] : to[1] - from[1]);
  if (len < 0.05) return;
  const mid: V3 = [(from[0] + to[0]) / 2, h / 2 + 0.45, (from[1] + to[1]) / 2];
  X.chain.quad(mid, len, h - 0.45, alongX ? 0 : Math.PI / 2, [0, 0, len / CELL, (h - 0.45) / CELL]);
}

function fenceLine(B: Batches, X: Extra, from: [number, number], to: [number, number], h: number, gap?: [number, number]) {
  const alongX = from[1] === to[1];
  const len = Math.abs(alongX ? to[0] - from[0] : to[1] - from[1]);
  const sgn = Math.sign(alongX ? to[0] - from[0] : to[1] - from[1]);
  const pt = (t: number): [number, number] => (alongX ? [from[0] + sgn * t, from[1]] : [from[0], from[1] + sgn * t]);
  const n = Math.max(1, Math.round(len / 4));
  const dry = B.dry;
  const sz = (l: number, hh: number, d: number): V3 => (alongX ? [l, hh, d] : [d, hh, l]);
  const segs: [[number, number], [number, number]][] = [];
  if (gap) {
    const a = alongX ? gap[0] : gap[0];
    // gap is given in world coordinates of the running axis
    const t0 = (alongX ? a - from[0] : a - from[1]) * sgn;
    const t1 = (alongX ? gap[1] - from[0] : gap[1] - from[1]) * sgn;
    const lo = Math.min(t0, t1);
    const hi = Math.max(t0, t1);
    segs.push([pt(0), pt(lo)], [pt(hi), pt(len)]);
  } else segs.push([from, to]);
  for (const [a, b] of segs) netPanel(X, a, b, h);
  // kick board and top rail
  for (const [a, b] of segs) {
    const l = Math.abs(alongX ? b[0] - a[0] : b[1] - a[1]);
    if (l < 0.05) continue;
    const m: V3 = [(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2];
    dry.box([m[0], 0.22, m[2]], sz(l, 0.44, 0.1), COL.teal);
    dry.box([m[0], 0.46, m[2]], sz(l, 0.06, 0.14), COL.white);
    dry.box([m[0], h + 0.0, m[2]], sz(l, 0.08, 0.08), COL.darkMetal);
  }
  for (let i = 0; i <= n; i++) {
    const [x, z] = pt((len * i) / n);
    if (gap) {
      const v = alongX ? x : z;
      if (v > Math.min(gap[0], gap[1]) + 0.01 && v < Math.max(gap[0], gap[1]) - 0.01) continue;
    }
    dry.cyl([x, h / 2, z], 0.12, h, COL.darkMetal, { seg: 6 });
  }
}

/** Goal at world position (centre of the goal line) opening toward dir (+1 = +z, -1 = -z). */
function goal(B: Batches, X: Extra, cx: number, gz: number, dir: 1 | -1) {
  const { w, h, depth } = GOAL;
  const dry = B.dry;
  const back = gz - dir * depth;
  const r = 0.06;
  const white = '#FFFFFF';
  for (const sx of [-1, 1]) {
    const x = cx + (sx * w) / 2;
    dry.cyl([x, h / 2, gz], r * 2, h, white, { seg: 8 });
    dry.cyl([x, h * 0.45, back], r * 1.4, h * 0.9, '#D6DCE3', { seg: 6 });
    dry.rod([x, h, gz], [x, h * 0.9, back], r * 1.3, '#D6DCE3', 6);
  }
  dry.rod([cx - w / 2, h, gz], [cx + w / 2, h, gz], r * 2, white, 8);
  dry.rod([cx - w / 2, h * 0.9, back], [cx + w / 2, h * 0.9, back], r * 1.3, '#D6DCE3', 6);
  // nets
  const c = 0.25;
  const nb: Batch = X.net;
  const mz = (gz + back) / 2;
  nb.quad([cx, h * 0.45, back], w, h * 0.9, 0, [0, 0, w / c, (h * 0.9) / c]);
  for (const sx of [-1, 1]) nb.quad([cx + (sx * w) / 2, h * 0.5, mz], depth, h * 0.95, Math.PI / 2, [0, 0, depth / c, (h * 0.95) / c]);
  nb.quad([cx, h * 0.95, mz], w, depth, 0, [0, 0, w / c, depth / c], '#FFFFFF', -Math.PI / 2 + dir * 0.1);
  // goal-line: ground anchors
  dry.box([cx, 0.03, back], [w + 0.2, 0.06, 0.06], '#9AA5B1');
}

function floodlight(B: Batches, x: number, z: number, facing: number) {
  const dry = B.dry;
  dry.cyl([x, 4.8, z], 0.22, 9.6, '#8A94A0', { seg: 8 });
  dry.cyl([x, 0.12, z], 0.7, 0.24, COL.sand, { seg: 8 });
  const f = new Frame(dry, [x, 9.6, z], facing);
  f.box([0, 0.0, 0.0], [3.0, 0.14, 0.2], COL.darkMetal);
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 3; i++) {
      const px = -1.0 + i * 1.0;
      const py = 0.35 + r * 0.55;
      f.box([px, py, 0.1], [0.86, 0.46, 0.2], '#4A5563');
      f.on(B.glow).box([px, py, 0.22], [0.74, 0.36, 0.04], '#FFF6D6');
    }
}

function cornerFlag(B: Batches, x: number, z: number) {
  B.dry.cyl([x, 0.75, z], 0.04, 1.5, '#FFFFFF', { seg: 6 });
  B.dry.box([x + 0.18, 1.35, z], [0.36, 0.22, 0.02], '#F7C531');
}

export function buildField(B: Batches, X: Extra) {
  const dry = B.dry;
  const f = FIELD;
  // netting around the field: west with the entrance gap, high netting behind the goals
  fenceLine(B, X, [f.x0 + 0.2, f.z0 + 0.2], [f.x0 + 0.2, f.z1 - 0.2], NET_H, [FIELD_GAP.z0, FIELD_GAP.z1]);
  fenceLine(B, X, [f.x1 - 0.2, f.z0 + 0.2], [f.x1 - 0.2, f.z1 - 0.2], NET_H);
  fenceLine(B, X, [f.x0 + 0.2, f.z0 + 0.2], [f.x1 - 0.2, f.z0 + 0.2], 6.5);
  fenceLine(B, X, [f.x0 + 0.2, f.z1 - 0.2], [f.x1 - 0.2, f.z1 - 0.2], 6.5);
  // entrance arch with the field sign (west side, facing the yard)
  const ex = f.x0 + 0.2;
  const ez = (FIELD_GAP.z0 + FIELD_GAP.z1) / 2;
  for (const z of [FIELD_GAP.z0 - 0.05, FIELD_GAP.z1 + 0.05]) {
    dry.cyl([ex, 1.5, z], 0.2, 3.0, COL.white, { seg: 8 });
    dry.box([ex, 0.1, z], [0.5, 0.2, 0.5], COL.sand);
  }
  dry.box([ex, 3.05, ez], [0.28, 0.28, FIELD_GAP.z1 - FIELD_GAP.z0 + 0.5], COL.teal);
  dry.box([ex - 0.14, 3.65, ez], [0.08, 0.84, 2.8], COL.white);
  B.sign.quad([ex - 0.19, 3.65, ez], 2.6, 0.65, -Math.PI / 2, uvOf('field'));
  B.sign.quad([ex + 0.0 + 0.05, 3.65, ez], 2.6, 0.65, Math.PI / 2, uvOf('field'));
  // goals
  const cx = (PITCH.x0 + PITCH.x1) / 2;
  goal(B, X, cx, SCHOOL_LANDMARKS.goalNorth[2], 1);
  goal(B, X, cx, SCHOOL_LANDMARKS.goalSouth[2], -1);
  // no-hanging signs on posts beside each goal, facing the pitch
  for (const [gz, dir] of [
    [SCHOOL_LANDMARKS.goalNorth[2], 1],
    [SCHOOL_LANDMARKS.goalSouth[2], -1],
  ] as const) {
    const sx = cx - GOAL.w / 2 - 1.3;
    const sz = gz + dir * 0.6;
    dry.cyl([sx, 0.95, sz], 0.07, 1.9, COL.darkMetal, { seg: 6 });
    dry.box([sx, 1.9, sz], [0.56, 0.56, 0.03], COL.white);
    B.sign.quad([sx, 1.9, sz + dir * 0.02], 0.5, 0.5, dir > 0 ? 0 : Math.PI, uvOf('noHang'));
  }
  // team bench under a shade roof against the west netting
  const d = DUGOUT;
  const dc = (d.z0 + d.z1) / 2;
  const dl = d.z1 - d.z0;
  bench(B.wet, dry, SCHOOL_LANDMARKS.teamBench, Math.PI / 2, '#F7C531', 6.6);
  dry.box([d.x0 + 0.12, 1.2, dc], [0.08, 2.4, dl], COL.tealDark);
  dry.box([d.x0 + 0.08, 1.2, dc], [0.04, 2.3, dl - 0.2], '#0E8C7E');
  for (const z of [d.z0 + 0.1, dc, d.z1 - 0.1]) {
    dry.cyl([d.x1, 1.2, z], 0.12, 2.4, COL.white, { seg: 8 });
    dry.box([(d.x0 + d.x1) / 2, 2.43, z], [d.x1 - d.x0 + 0.5, 0.12, 0.14], COL.darkMetal);
  }
  const roofW = d.x1 - d.x0 + 0.7;
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const sl = dl / stripes;
    dry.box([(d.x0 + d.x1) / 2 + 0.05, 2.56 - 0.03 * 0, d.z0 + sl * (i + 0.5)], [roofW, 0.07, sl - 0.02], i % 2 ? COL.white : COL.teal, { r: [0, 0, -0.06] });
  }
  cooler(dry, B.glass, SCHOOL_LANDMARKS.fieldCooler, Math.PI / 2);
  // floodlights at the four corners (just inside the netting)
  floodlight(B, f.x0 + 1.2, f.z0 + 1.2, 0);
  floodlight(B, f.x1 - 1.2, f.z0 + 1.2, 0);
  floodlight(B, f.x0 + 1.2, f.z1 - 1.2, Math.PI);
  floodlight(B, f.x1 - 1.2, f.z1 - 1.2, Math.PI);
  // corner flags
  for (const [x, z] of [
    [PITCH.x0, PITCH.z0],
    [PITCH.x1, PITCH.z0],
    [PITCH.x0, PITCH.z1],
    [PITCH.x1, PITCH.z1],
  ])
    cornerFlag(B, x, z);
  // balls and cones
  const ball = (x: number, z: number) => {
    dry.sphere([x, 0.11, z], [0.22, 0.22, 0.22], '#FFFFFF');
    dry.sphere([x + 0.04, 0.17, z + 0.06], [0.09, 0.05, 0.09], '#1E2A3B');
  };
  ball(cx + 0.0, (PITCH.z0 + PITCH.z1) / 2);
  ball(cx - 2.4, PITCH.z1 - 3);
  ball(cx + 3.1, PITCH.z0 + 4);
  for (let i = 0; i < 6; i++) dry.cone([PITCH.x0 + 3 + i * 1.2, 0.15, -30], 0.26, 0.3, '#FF8A3D');
  for (let i = 0; i < 6; i++) dry.cone([PITCH.x1 - 3 - i * 1.2, 0.15, -24], 0.26, 0.3, '#F7C531');
  // a ball net bag at the bench end
  dry.cyl([27.2, 0.45, -22.2], 0.5, 0.9, '#E8E2D6', { seg: 8 });
  void PC;
}
