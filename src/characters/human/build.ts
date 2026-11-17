/**
 * Low-level geometry helpers for the human builder: a mesh accumulator that merges many
 * primitives into ONE skinned BufferGeometry with vertex colors (one draw call per person),
 * plus primitive generators (ellipsoids, capsules between points, lathes, parametric surfaces).
 */
import * as THREE from 'three';

export type Influence = [bone: number, weight: number];
export type WeightSpec = number | ((p: THREE.Vector3) => Influence[]);
export type ColorSpec = THREE.Color | 'attr' | ((p: THREE.Vector3, i: number) => THREE.Color);

export interface AddOpts {
  /** Crowd palette slot (0 = fixed color). */
  slot?: number;
  /** Crowd variant id (0 = always present). */
  variant?: number;
  /** 1 = gets the outline hull, 0 = no outline (face features). */
  outline?: number;
}

const colorCache = new Map<string, THREE.Color>();
/** Linear-space color from a CSS hex (cached; do not mutate). */
export function col(hex: string): THREE.Color {
  let c = colorCache.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    colorCache.set(hex, c);
  }
  return c;
}
export function mix(a: string | THREE.Color, b: string | THREE.Color, t: number): THREE.Color {
  const ca = typeof a === 'string' ? col(a) : a;
  const cb = typeof b === 'string' ? col(b) : b;
  return ca.clone().lerp(cb, t);
}
export function shade(a: string | THREE.Color, k: number): THREE.Color {
  const c = (typeof a === 'string' ? col(a) : a).clone();
  return c.multiplyScalar(k);
}

export class MeshBuilder {
  P: number[] = [];
  N: number[] = [];
  C: number[] = [];
  SI: number[] = [];
  SW: number[] = [];
  SV: number[] = [];
  OL: number[] = [];
  I: number[] = [];
  count = 0;
  private v = new THREE.Vector3();
  private n = new THREE.Vector3();
  private nm = new THREE.Matrix3();

  add(g: THREE.BufferGeometry, m: THREE.Matrix4, color: ColorSpec, w: WeightSpec, o: AddOpts = {}) {
    const pos = g.attributes.position as THREE.BufferAttribute;
    if (!g.attributes.normal) g.computeVertexNormals();
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const gc = g.attributes.color as THREE.BufferAttribute | undefined;
    this.nm.getNormalMatrix(m);
    const base = this.count;
    const v = this.v;
    const n = this.n;
    const tmpC = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      n.fromBufferAttribute(nor, i).applyMatrix3(this.nm).normalize();
      this.P.push(v.x, v.y, v.z);
      this.N.push(n.x, n.y, n.z);
      let c: THREE.Color;
      if (color === 'attr') c = gc ? tmpC.fromBufferAttribute(gc, i) : tmpC.set(1, 1, 1);
      else if (typeof color === 'function') c = color(v, i);
      else c = color;
      this.C.push(c.r, c.g, c.b);
      const inf = typeof w === 'number' ? ([[w, 1]] as Influence[]) : top4(w(v));
      for (let k = 0; k < 4; k++) {
        this.SI.push(inf[k] ? inf[k][0] : 0);
        this.SW.push(inf[k] ? inf[k][1] : 0);
      }
      this.SV.push(o.slot ?? 0, o.variant ?? 0);
      this.OL.push(o.outline ?? 1);
    }
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) this.I.push(base + idx[i]);
    } else {
      for (let i = 0; i < pos.count; i++) this.I.push(base + i);
    }
    this.count += pos.count;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.SI, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.SW, 4));
    g.setAttribute('aSV', new THREE.Float32BufferAttribute(this.SV, 2));
    g.setAttribute('aOutline', new THREE.Float32BufferAttribute(this.OL, 1));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingSphere();
    return g;
  }
}

function top4(inf: Influence[]): Influence[] {
  const s = inf.filter((x) => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = s.reduce((a, b) => a + b[1], 0) || 1;
  return s.map(([b, w]) => [b, w / sum] as Influence);
}

/* ------------------------------------------------------------- math helpers */

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
/** Matrix from position, Euler rotation and scale. */
export function M(p: THREE.Vector3 | [number, number, number], r: [number, number, number] = [0, 0, 0], s: number | [number, number, number] = 1): THREE.Matrix4 {
  const pos = Array.isArray(p) ? V(p[0], p[1], p[2]) : p;
  _q.setFromEuler(_e.set(r[0], r[1], r[2]));
  if (typeof s === 'number') _s.set(s, s, s);
  else _s.set(s[0], s[1], s[2]);
  return new THREE.Matrix4().compose(pos, _q, _s);
}

/** Matrix from an orthonormal frame (columns x, y, z), position and scale. */
export function frameM(p: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, s: [number, number, number] = [1, 1, 1]) {
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.scale(V(s[0], s[1], s[2]));
  m.setPosition(p);
  return m;
}

/** Maps the Y axis of a unit primitive (centred, spanning y -0.5..0.5) onto the segment a->b. */
export function segM(a: THREE.Vector3, b: THREE.Vector3, sx: number, sz: number, stretch = true): THREE.Matrix4 {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(sx, stretch ? len : 1, sz));
}

/* ---------------------------------------------------------------- primitives */

const sphereCache = new Map<string, THREE.SphereGeometry>();
export function unitSphere(ws = 16, hs = 12): THREE.SphereGeometry {
  const k = `${ws}x${hs}`;
  let g = sphereCache.get(k);
  if (!g) {
    g = new THREE.SphereGeometry(1, ws, hs);
    sphereCache.set(k, g);
  }
  return g;
}

/** Lower half of a unit sphere (open at the top): a "D" shaped mouth when flattened. */
export const halfSphere = (ws = 16, hs = 6) => new THREE.SphereGeometry(1, ws, hs, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

const cylCache = new Map<string, THREE.CylinderGeometry>();
/** Cylinder radius 1, height 1 (y -0.5..0.5), optionally tapered (top radius rt). */
export function unitCyl(radial = 12, rt = 1, open = false): THREE.CylinderGeometry {
  const k = `${radial}|${rt}|${open}`;
  let g = cylCache.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, 1, 1, radial, 1, open);
    cylCache.set(k, g);
  }
  return g;
}

/** Capsule of radius r between a and b. */
export function capsuleGeo(a: THREE.Vector3, b: THREE.Vector3, r: number, radial = 10, cap = 4): { g: THREE.BufferGeometry; m: THREE.Matrix4 } {
  const len = Math.max(1e-4, a.distanceTo(b));
  const g = new THREE.CapsuleGeometry(r, len, cap, radial);
  return { g, m: segM(a, b, 1, 1, false) };
}

/** Lathe around Y from [radius, y] points (bottom to top), squashed in z by zs. */
export function latheGeo(pts: [number, number][], seg = 24): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );
}

/**
 * Parametric grid surface. fn(u, v) with u, v in 0..1 returns a point. wrapU closes the surface in u.
 * Winding is chosen so the surface faces "outward" when v runs top->bottom and u runs around
 * counter-clockwise seen from above (azimuth from +Z toward +X). Set flip to reverse.
 * cellColor (optional) gives each grid cell its own color (the geometry is then non-indexed).
 */
export function gridGeo(
  nu: number,
  nv: number,
  fn: (u: number, v: number) => THREE.Vector3,
  opts: { wrapU?: boolean; flip?: boolean; cellColor?: (i: number, j: number) => THREE.Color } = {},
): THREE.BufferGeometry {
  const cols = opts.wrapU ? nu : nu + 1;
  const pos: number[] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j <= nv; j++) {
      const p = fn(i / nu, j / nv);
      pos.push(p.x, p.y, p.z);
    }
  const idx: number[] = [];
  const id = (i: number, j: number) => (i % cols) * (nv + 1) + j;
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = id(i, j);
      const b = id(i, j + 1);
      const c = id(i + 1, j);
      const d = id(i + 1, j + 1);
      if (!opts.flip) idx.push(a, b, c, c, b, d);
      else idx.push(a, c, b, c, d, b);
    }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (opts.cellColor) {
    const ni = g.toNonIndexed();
    const cnt = ni.attributes.position.count;
    const colors = new Float32Array(cnt * 3);
    for (let t = 0; t < cnt / 3; t++) {
      const cell = Math.floor(t / 2);
      const i = Math.floor(cell / nv);
      const j = cell % nv;
      const c = opts.cellColor(i, j);
      for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (t * 3 + k) * 3);
    }
    ni.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.dispose();
    g = ni;
  }
  return g;
}

/** Tube along a smooth curve through points. */
export function tubeGeo(points: THREE.Vector3[], r: number, seg = 16, radial = 6): THREE.TubeGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, radial, false);
}
