/**
 * Static geometry batching for the school grounds.
 *
 * The whole school (building, fence, canopy, benches, stage...) is thousands of simple parts. Each part
 * is pushed into a Batch, which bakes its transform and color into one merged BufferGeometry with
 * per-vertex colors, so every material costs exactly one draw call. Vertical faces near the ground get
 * a soft contact darkening (cheap baked ambient occlusion).
 *
 * Quads with UVs (signs drawn in the sign atlas) use a Batch created with { uv: true }.
 */
import * as THREE from 'three';

export type V3 = [number, number, number];
export type Col = string;

/* ------------------------------------------------------------ templates */

export interface Tpl {
  pos: Float32Array;
  nrm: Float32Array;
  uv: Float32Array | null;
  n: number;
  /** Local y range, for vertical color gradients. */
  y0: number;
  y1: number;
}

export function toTpl(g: THREE.BufferGeometry): Tpl {
  const ng = g.index ? g.toNonIndexed() : g;
  if (!ng.getAttribute('normal')) ng.computeVertexNormals();
  const pos = Float32Array.from(ng.getAttribute('position').array as ArrayLike<number>);
  const nrm = Float32Array.from(ng.getAttribute('normal').array as ArrayLike<number>);
  const uvA = ng.getAttribute('uv');
  const uv = uvA ? Float32Array.from(uvA.array as ArrayLike<number>) : null;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 1; i < pos.length; i += 3) {
    y0 = Math.min(y0, pos[i]);
    y1 = Math.max(y1, pos[i]);
  }
  return { pos, nrm, uv, n: pos.length / 3, y0, y1 };
}

function wedgeGeometry() {
  // x in [-0.5,0.5]; full height (y -0.5..0.5) at z = -0.5, zero height at z = +0.5 (slopes down toward +Z).
  const A = [-0.5, -0.5, -0.5], B = [0.5, -0.5, -0.5], C = [0.5, 0.5, -0.5], D = [-0.5, 0.5, -0.5];
  const E = [-0.5, -0.5, 0.5], F = [0.5, -0.5, 0.5];
  const tris = [A, D, C, A, C, B, A, B, F, A, F, E, D, E, F, D, F, C, A, E, D, B, C, F];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris.flat()), 3));
  g.computeVertexNormals();
  return g;
}

function triGeometry() {
  // Triangle prism, triangle in the XY plane pointing up, extruded along z (-0.5..0.5).
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0, 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

/** Rounded-ish box: a box with chamfered edges (cheap, ~44 triangles). Unit size. */
function chamferBox(r = 0.12) {
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const inner = 0.5 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = new THREE.Vector3(
      Math.max(-inner, Math.min(inner, v.x)),
      Math.max(-inner, Math.min(inner, v.y)),
      Math.max(-inner, Math.min(inner, v.z)),
    );
    const n = v.clone().sub(c);
    if (n.lengthSq() > 0) v.copy(c.add(n.normalize().multiplyScalar(r)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const ng = g.toNonIndexed();
  ng.computeVertexNormals();
  return ng;
}

export const T = {
  box: toTpl(new THREE.BoxGeometry(1, 1, 1)),
  cbox: toTpl(chamferBox()),
  cyl: toTpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 12)),
  cyl6: toTpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
  cyl8: toTpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
  cyl20: toTpl(new THREE.CylinderGeometry(0.5, 0.5, 1, 20)),
  cone: toTpl(new THREE.ConeGeometry(0.5, 1, 12)),
  sphere: toTpl(new THREE.SphereGeometry(0.5, 12, 8)),
  ico: toTpl(new THREE.IcosahedronGeometry(0.5, 1)),
  hemi: toTpl(new THREE.SphereGeometry(0.5, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2)),
  torus: toTpl(new THREE.TorusGeometry(0.5, 0.07, 5, 14)),
  disc: toTpl(new THREE.CircleGeometry(0.5, 20)),
  plane: toTpl(new THREE.PlaneGeometry(1, 1)),
  wedge: toTpl(wedgeGeometry()),
  tri: toTpl(triGeometry()),
};

/* ------------------------------------------------------------ batch */

class Grow {
  arr: Float32Array;
  len = 0;
  constructor(n = 4096) {
    this.arr = new Float32Array(n);
  }
  ensure(extra: number) {
    if (this.len + extra <= this.arr.length) return;
    let n = this.arr.length * 2;
    while (n < this.len + extra) n *= 2;
    const a = new Float32Array(n);
    a.set(this.arr.subarray(0, this.len));
    this.arr = a;
  }
  view() {
    return this.arr.slice(0, this.len);
  }
}

const colorCache = new Map<string, THREE.Color>();
export function lin(c: Col): THREE.Color {
  let k = colorCache.get(c);
  if (!k) {
    k = new THREE.Color(c);
    colorCache.set(c, k);
  }
  return k;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _nm = new THREE.Matrix3();

export interface PartOpts {
  /** Euler rotation (XYZ). */
  r?: V3;
  /** Color at the bottom of the part (vertical gradient from bottom to `c` at the top). */
  bottom?: Col;
}

export class Batch {
  private P = new Grow(1 << 16);
  private N = new Grow(1 << 16);
  private C = new Grow(1 << 16);
  private U: Grow | null;
  /** Soft darkening of vertical faces near the ground (y < aoH). */
  ao: number;
  aoH: number;
  constructor(opts: { uv?: boolean; ao?: number; aoH?: number } = {}) {
    this.U = opts.uv ? new Grow(1 << 14) : null;
    this.ao = opts.ao ?? 0.2;
    this.aoH = opts.aoH ?? 0.9;
  }

  get vertexCount() {
    return this.P.len / 3;
  }

  /** Add a template transformed by matrix m. `c` top color, `bottom` optional bottom color. */
  add(t: Tpl, m: THREE.Matrix4, c: Col, bottom?: Col, uvRect?: [number, number, number, number]) {
    const P = this.P, N = this.N, C = this.C, U = this.U;
    P.ensure(t.n * 3);
    N.ensure(t.n * 3);
    C.ensure(t.n * 3);
    if (U) U.ensure(t.n * 2);
    _nm.getNormalMatrix(m);
    const e = m.elements;
    const n = _nm.elements;
    const top = lin(c);
    const bot = bottom ? lin(bottom) : top;
    const span = t.y1 - t.y0 || 1;
    const ao = this.ao;
    const aoH = this.aoH;
    for (let i = 0; i < t.n; i++) {
      const x = t.pos[i * 3], y = t.pos[i * 3 + 1], z = t.pos[i * 3 + 2];
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      const nx0 = t.nrm[i * 3], ny0 = t.nrm[i * 3 + 1], nz0 = t.nrm[i * 3 + 2];
      let nx = n[0] * nx0 + n[3] * ny0 + n[6] * nz0;
      let ny = n[1] * nx0 + n[4] * ny0 + n[7] * nz0;
      let nz = n[2] * nx0 + n[5] * ny0 + n[8] * nz0;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      const k = (y - t.y0) / span;
      let r = bot.r + (top.r - bot.r) * k;
      let g = bot.g + (top.g - bot.g) * k;
      let b = bot.b + (top.b - bot.b) * k;
      if (ao > 0 && Math.abs(ny) < 0.6 && wy < aoH && wy > -0.2) {
        const f = 1 - ao * (1 - Math.max(0, wy) / aoH);
        r *= f;
        g *= f;
        b *= f;
      }
      const pi = P.len;
      P.arr[pi] = wx;
      P.arr[pi + 1] = wy;
      P.arr[pi + 2] = wz;
      P.len += 3;
      N.arr[pi] = nx;
      N.arr[pi + 1] = ny;
      N.arr[pi + 2] = nz;
      N.len += 3;
      C.arr[pi] = r;
      C.arr[pi + 1] = g;
      C.arr[pi + 2] = b;
      C.len += 3;
      if (U) {
        const u = t.uv ? t.uv[i * 2] : 0;
        const v = t.uv ? t.uv[i * 2 + 1] : 0;
        const ui = U.len;
        if (uvRect) {
          U.arr[ui] = uvRect[0] + u * (uvRect[2] - uvRect[0]);
          U.arr[ui + 1] = uvRect[1] + v * (uvRect[3] - uvRect[1]);
        } else {
          U.arr[ui] = u;
          U.arr[ui + 1] = v;
        }
        U.len += 2;
      }
    }
    return this;
  }

  /** Generic part: template at p with scale s and options. */
  part(t: Tpl, p: V3, s: V3, c: Col, o: PartOpts = {}) {
    const r = o.r;
    if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2]));
    else _q.identity();
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
    return this.add(t, _m, c, o.bottom);
  }

  /** Box centred at p with size s. */
  box(p: V3, s: V3, c: Col, o?: PartOpts) {
    return this.part(T.box, p, s, c, o);
  }
  /** Box given by min/max corners. */
  boxMM(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Col, o?: PartOpts) {
    return this.part(T.box, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], c, o);
  }
  /** Chamfered (soft-edged) box. */
  cbox(p: V3, s: V3, c: Col, o?: PartOpts) {
    return this.part(T.cbox, p, s, c, o);
  }
  /** Vertical cylinder: centre p, diameter d, height h. */
  cyl(p: V3, d: number, h: number, c: Col, o: PartOpts & { seg?: 6 | 8 | 12 | 20; dz?: number } = {}) {
    const t = o.seg === 6 ? T.cyl6 : o.seg === 8 ? T.cyl8 : o.seg === 20 ? T.cyl20 : T.cyl;
    return this.part(t, p, [d, h, o.dz ?? d], c, o);
  }
  /** Cylinder between two points. */
  rod(a: V3, b: V3, d: number, c: Col, seg: 6 | 8 | 12 = 8) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    _v.set(dx / len, dy / len, dz / len);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _v);
    _m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(d, len, d));
    return this.add(seg === 6 ? T.cyl6 : seg === 12 ? T.cyl : T.cyl8, _m, c);
  }
  /** Box between two points (a beam), cross-section w x h (h along world-up-ish). */
  beam(a: V3, b: V3, w: number, h: number, c: Col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
    // local x along the beam
    _q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    _m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(len, h, w));
    return this.add(T.box, _m, c);
  }
  sphere(p: V3, s: V3, c: Col, o?: PartOpts) {
    return this.part(T.sphere, p, s, c, o);
  }
  ico(p: V3, s: V3, c: Col, o?: PartOpts) {
    return this.part(T.ico, p, s, c, o);
  }
  cone(p: V3, d: number, h: number, c: Col, o?: PartOpts) {
    return this.part(T.cone, p, [d, h, d], c, o);
  }
  /** Triangle prism pointing up (+y), thickness along z (rotate with o.r). */
  tri(p: V3, s: V3, c: Col, o?: PartOpts) {
    return this.part(T.tri, p, s, c, o);
  }
  /** Wedge: full height at local -z, zero at +z. */
  wedge(p: V3, s: V3, c: Col, o?: PartOpts) {
    return this.part(T.wedge, p, s, c, o);
  }
  /** Flat disc facing +z (rotate with o.r). */
  disc(p: V3, d: number, c: Col, o?: PartOpts) {
    return this.part(T.disc, p, [d, d, 1], c, o);
  }
  /** Textured quad (needs a uv batch): centre p, size w x h, facing rotY (0 = +z). */
  quad(p: V3, w: number, h: number, rotY: number, uvRect: [number, number, number, number], c: Col = '#FFFFFF', rotX = 0) {
    _q.setFromEuler(_e.set(rotX, rotY, 0, 'YXZ'));
    _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(w, h, 1));
    return this.add(T.plane, _m, c, undefined, uvRect);
  }
  /** Add any geometry (converted once and cached by uuid). */
  geo(g: THREE.BufferGeometry, p: V3, s: V3, c: Col, o?: PartOpts) {
    let t = geoCache.get(g.uuid);
    if (!t) {
      t = toTpl(g);
      geoCache.set(g.uuid, t);
    }
    return this.part(t, p, s, c, o);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.P.view(), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.N.view(), 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.C.view(), 3));
    if (this.U) g.setAttribute('uv', new THREE.BufferAttribute(this.U.view(), 2));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

const geoCache = new Map<string, Tpl>();

/* ------------------------------------------------------------ materials */

/** Vertex-colored materials owned by the school set (shared by every mesh of the set). */
export function vmat(o: { rough?: number; metal?: number; side?: THREE.Side } = {}) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide });
}
