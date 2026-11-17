/**
 * Reusable school-grounds parts built into Batches: a transform Frame (so a bench or a cooler can be
 * authored once in its own local frame and placed with any rotation), benches, palms in planters,
 * round shade trees, water coolers, bikes and small sign posts.
 *
 * Local frames: +Z is the "front" of a part (a bench's sitter faces +Z, a cooler's taps face +Z).
 * rotY turns the frame around world Y (0 = front faces +Z/south, PI = north, PI/2 = east, -PI/2 = west).
 */
import * as THREE from 'three';
import { Batch, T, type Col, type Tpl, type V3 } from './batch';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _l = new THREE.Matrix4();
const _w = new THREE.Matrix4();

export class Frame {
  readonly m: THREE.Matrix4;
  constructor(
    public b: Batch,
    p: V3,
    rotY = 0,
    parent?: THREE.Matrix4,
  ) {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(1, 1, 1));
    this.m = parent ? parent.clone().multiply(local) : local;
  }
  /** Same transform, other batch. */
  on(b: Batch) {
    const f = Object.create(Frame.prototype) as Frame;
    (f as { b: Batch }).b = b;
    (f as { m: THREE.Matrix4 }).m = this.m;
    return f;
  }
  child(p: V3, rotY = 0) {
    return new Frame(this.b, p, rotY, this.m);
  }
  /** World point of a local point. */
  pt(p: V3): V3 {
    _v.set(p[0], p[1], p[2]).applyMatrix4(this.m);
    return [_v.x, _v.y, _v.z];
  }
  part(t: Tpl, p: V3, s: V3, c: Col, o: { r?: V3; bottom?: Col } = {}) {
    if (o.r) _q.setFromEuler(_e.set(o.r[0], o.r[1], o.r[2]));
    else _q.identity();
    _l.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
    _w.multiplyMatrices(this.m, _l);
    this.b.add(t, _w, c, o.bottom);
    return this;
  }
  box(p: V3, s: V3, c: Col, o?: { r?: V3; bottom?: Col }) {
    return this.part(T.box, p, s, c, o);
  }
  cbox(p: V3, s: V3, c: Col, o?: { r?: V3; bottom?: Col }) {
    return this.part(T.cbox, p, s, c, o);
  }
  cyl(p: V3, d: number, h: number, c: Col, o: { r?: V3; bottom?: Col; seg?: 6 | 8 | 12 | 20 } = {}) {
    const t = o.seg === 6 ? T.cyl6 : o.seg === 8 ? T.cyl8 : o.seg === 20 ? T.cyl20 : T.cyl;
    return this.part(t, p, [d, h, d], c, o);
  }
  sphere(p: V3, s: V3, c: Col, o?: { r?: V3 }) {
    return this.part(T.sphere, p, s, c, o);
  }
  /** Rod between two local points. */
  rod(a: V3, b: V3, d: number, c: Col, seg: 6 | 8 = 6) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    _l.compose(_v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(d, len, d));
    _w.multiplyMatrices(this.m, _l);
    this.b.add(seg === 8 ? T.cyl8 : T.cyl6, _w, c);
    return this;
  }
  /** Textured quad facing local +Z (needs a uv batch). */
  quad(p: V3, w: number, h: number, uv: [number, number, number, number], rotY = 0, c: Col = '#FFFFFF') {
    _q.setFromEuler(_e.set(0, rotY, 0));
    _l.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(w, h, 1));
    _w.multiplyMatrices(this.m, _l);
    this.b.add(T.plane, _w, c, undefined, uv);
    return this;
  }
}

/* ------------------------------------------------------------ colors */

export const PC = {
  trunk: '#9A7348',
  trunkRing: '#86623B',
  leaf: '#3E9B4F',
  leaf2: '#4CAF5A',
  dates: '#C58B3A',
  planter: '#F5F1E8',
  planterBand: '#14B8A6',
  soil: '#7A5A3A',
  treeLeaf: '#4FA650',
  treeLeaf2: '#5DB85A',
  treeTrunk: '#8A6640',
  benchSeat: '#14B8A6',
  benchFrame: '#4A5563',
  steel: '#B8C1CC',
  white: '#FFFFFF',
  blue: '#2D8CFF',
  dark: '#2B3440',
};

/* ------------------------------------------------------------ parts */

/** Park bench, sitter faces local +Z. Seat top at 0.45 (seat centre at the frame origin). */
export function bench(wet: Batch, dry: Batch, p: V3, rotY: number, color: Col = PC.benchSeat, len = 1.7) {
  const f = new Frame(wet, p, rotY);
  for (let i = 0; i < 3; i++) f.cbox([0, 0.43, -0.15 + i * 0.15], [len, 0.05, 0.13], color);
  for (let i = 0; i < 2; i++) f.cbox([0, 0.66 + i * 0.16, -0.27 - i * 0.02], [len, 0.12, 0.05], color, { r: [-0.12, 0, 0] });
  const d = f.on(dry);
  for (const sx of [-len / 2 + 0.15, len / 2 - 0.15]) {
    d.box([sx, 0.2, 0], [0.06, 0.4, 0.42], PC.benchFrame);
    d.box([sx, 0.62, -0.27], [0.05, 0.44, 0.05], PC.benchFrame, { r: [-0.12, 0, 0] });
    d.box([sx, 0.6, 0.02], [0.06, 0.05, 0.36], PC.benchFrame);
  }
}

/** Palm tree in a square planter (or straight from the ground). Base at p. */
export function palm(dry: Batch, wet: Batch, p: V3, seed: number, planter = true, h?: number) {
  const f = new Frame(dry, p, seed * 1.37);
  let y0 = 0;
  if (planter) {
    f.on(wet).cbox([0, 0.3, 0], [1.3, 0.6, 1.3], PC.planter);
    f.box([0, 0.5, 0], [1.32, 0.1, 1.32], PC.planterBand);
    f.box([0, 0.605, 0], [1.1, 0.02, 1.1], PC.soil);
    y0 = 0.6;
  } else {
    f.cyl([0, 0.02, 0], 1.6, 0.04, '#B99E73', { seg: 12 });
  }
  const H = h ?? 4.3 + ((seed * 0.731) % 1) * 1.3;
  const lean = 0.05 + ((seed * 0.37) % 1) * 0.06;
  const t = f.child([0, y0, 0], 0);
  const at = (yy: number): V3 => [Math.sin(lean) * yy, yy, 0];
  t.cyl(at(H / 2), 0.34, H, PC.trunk, { r: [0, 0, -lean], seg: 8 });
  for (let i = 0; i < 6; i++) t.cyl(at((H / 6) * i + 0.35), 0.42, 0.12, PC.trunkRing, { r: [0, 0, -lean], seg: 8 });
  const top = at(H);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + seed;
    const lf = t.child(top, a);
    const droop = 0.35 + ((i * 0.37 + seed) % 1) * 0.2;
    lf.part(T.sphere, [1.08, -0.3, 0], [2.4, 0.1, 0.58], i % 2 ? PC.leaf : PC.leaf2, { r: [0, 0, -droop] });
  }
  t.sphere([top[0], top[1] - 0.12, 0], [0.62, 0.5, 0.62], PC.dates);
}

/** Round shade tree (neem / ficus look). Base at p. */
export function tree(dry: Batch, p: V3, seed: number, scale = 1) {
  const f = new Frame(dry, p, seed);
  const s = scale * (0.9 + ((seed * 0.613) % 1) * 0.25);
  f.cyl([0, 0.02, 0], 1.5 * s, 0.04, '#B99E73', { seg: 12 });
  f.cyl([0, 1.1 * s, 0], 0.3 * s, 2.2 * s, PC.treeTrunk, { seg: 8, bottom: '#6F5232' });
  f.rod([0, 1.6 * s, 0], [0.5 * s, 2.5 * s, 0.1 * s], 0.16 * s, PC.treeTrunk);
  f.rod([0, 1.7 * s, 0], [-0.4 * s, 2.6 * s, -0.2 * s], 0.15 * s, PC.treeTrunk);
  const blobs: [number, number, number, number][] = [
    [0, 3.3, 0, 2.6],
    [0.9, 2.9, 0.3, 1.8],
    [-0.9, 3.0, -0.2, 1.9],
    [0.1, 3.0, 0.9, 1.7],
    [-0.2, 2.9, -0.9, 1.7],
    [0.2, 4.1, 0.1, 1.6],
  ];
  blobs.forEach(([x, y, z, d], i) => f.part(T.ico, [x * s, y * s, z * s], [d * s, d * s * 0.85, d * s], i % 2 ? PC.treeLeaf : PC.treeLeaf2));
}

/** Low round shrub. */
export function shrub(dry: Batch, p: V3, d = 0.9, c: Col = '#5DB85A') {
  dry.part(T.ico, [p[0], p[1] + d * 0.32, p[2]], [d, d * 0.7, d], c);
}

/**
 * School water cooler (stainless body, blue tank top, two push taps), taps face local +Z.
 * Base at p. Stand point is 0.6 m in front of it.
 */
export function cooler(dry: Batch, glass: Batch, p: V3, rotY: number) {
  const f = new Frame(dry, p, rotY);
  f.box([0, 0.06, 0], [0.74, 0.12, 0.56], PC.dark);
  f.cbox([0, 0.68, 0], [0.7, 1.15, 0.52], '#D9DFE6', { bottom: '#AEB8C3' });
  f.box([0, 0.86, 0.27], [0.6, 0.36, 0.02], '#9AA5B1');
  f.box([0, 0.63, 0.29], [0.56, 0.05, 0.12], '#7D8894');
  for (const sx of [-0.15, 0.15]) {
    f.box([sx, 0.98, 0.3], [0.08, 0.06, 0.08], sx < 0 ? '#2D8CFF' : '#E23B3B');
    f.cyl([sx, 0.93, 0.32], 0.035, 0.08, PC.steel, { seg: 6 });
  }
  f.box([0, 1.27, 0], [0.74, 0.04, 0.56], PC.blue);
  f.on(glass).cyl([0, 1.55, 0], 0.42, 0.5, '#CDEBFF', { seg: 12, bottom: '#7CC0F0' });
  f.cyl([0, 1.82, 0], 0.2, 0.05, PC.blue, { seg: 12 });
}

/** Simple bicycle leaning in a rack, wheels in the local XY plane (length along local X). */
export function bike(dry: Batch, p: V3, rotY: number, frameCol: Col) {
  const f = new Frame(dry, p, rotY);
  for (const x of [-0.52, 0.52]) {
    f.part(T.torus, [x, 0.34, 0], [0.68, 0.68, 0.68], PC.dark);
    f.cyl([x, 0.34, 0], 0.08, 0.08, PC.steel, { r: [Math.PI / 2, 0, 0], seg: 6 });
  }
  f.rod([-0.52, 0.34, 0], [-0.05, 0.36, 0], 0.04, frameCol);
  f.rod([-0.05, 0.36, 0], [0.32, 0.72, 0], 0.045, frameCol);
  f.rod([-0.52, 0.34, 0], [-0.18, 0.74, 0], 0.04, frameCol);
  f.rod([-0.18, 0.74, 0], [0.32, 0.72, 0], 0.045, frameCol);
  f.rod([-0.05, 0.36, 0], [-0.18, 0.74, 0], 0.045, frameCol);
  f.rod([0.52, 0.34, 0], [0.36, 0.86, 0], 0.04, frameCol);
  f.box([-0.2, 0.8, 0], [0.22, 0.05, 0.1], PC.dark);
  f.rod([0.36, 0.86, -0.22], [0.36, 0.86, 0.22], 0.035, PC.dark);
}
