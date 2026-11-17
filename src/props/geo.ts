/**
 * Geometry helpers for the props: a builder that merges many simple parts (boxes, rounded boxes,
 * cylinders, extruded side profiles, quads) into ONE vertex-coloured BufferGeometry, so a whole
 * vehicle or prop costs one or two draw calls. Built geometries are cached by key and never disposed.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GEO } from '../world/kit';

type V3 = [number, number, number];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();

/** Matrix from position, euler rotation and scale. */
export function trs(p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) {
  _e.set(r[0], r[1], r[2]);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), _q.clone(), new THREE.Vector3(...s));
}

/** Low-poly unit shapes used by the builder (smaller than kit GEO where it does not show). */
export const LGEO = {
  box: GEO.box,
  rbox: GEO.rbox,
  rboxLow: roundedBox(1, 1, 1, 0.12, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl20: new THREE.CylinderGeometry(0.5, 0.5, 1, 22),
  sphere: new THREE.SphereGeometry(0.5, 14, 10),
  sphereLow: new THREE.SphereGeometry(0.5, 8, 6),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  hemi: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: new THREE.TorusGeometry(0.5, 0.08, 6, 18),
};

const cylCache = new Map<number, THREE.CylinderGeometry>();
function cylSeg(n: number) {
  let g = cylCache.get(n);
  if (!g) cylCache.set(n, (g = new THREE.CylinderGeometry(0.5, 0.5, 1, n)));
  return g;
}

export function roundedBox(w: number, h: number, d: number, r: number, seg: number) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = new THREE.Vector3(
      Math.max(-inner.x, Math.min(inner.x, v.x)),
      Math.max(-inner.y, Math.min(inner.y, v.y)),
      Math.max(-inner.z, Math.min(inner.z, v.z)),
    );
    const n = v.clone().sub(c);
    if (n.lengthSq() > 0) v.copy(c.add(n.normalize().multiplyScalar(r)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Collects parts and merges them. Every part gets a `color` attribute (linear RGB), so one
 * MeshStandardMaterial({ vertexColors: true }) draws the whole thing. Keeps uv when asked.
 */
export class GeoBuilder {
  private parts: THREE.BufferGeometry[] = [];
  constructor(private keepUv = false) {}

  /** Add a geometry (cloned) transformed by m, painted `color`. */
  add(g: THREE.BufferGeometry, color: string, m: THREE.Matrix4 = new THREE.Matrix4()) {
    let c = g.index ? g.toNonIndexed() : g.clone();
    c.applyMatrix4(m);
    if (!this.keepUv) c.deleteAttribute('uv');
    else if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') c.deleteAttribute(k);
    if (!c.attributes.normal) c.computeVertexNormals();
    _c.set(color);
    const n = c.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
    }
    c.setAttribute('color', new THREE.BufferAttribute(col, 3));
    c.morphAttributes = {};
    c.clearGroups();
    this.parts.push(c);
    return this;
  }
  box(p: V3, s: V3, color: string, r?: V3) {
    return this.add(LGEO.box, color, trs(p, r, s));
  }
  rbox(p: V3, s: V3, color: string, r?: V3, low = false) {
    return this.add(low ? LGEO.rboxLow : LGEO.rbox, color, trs(p, r, s));
  }
  /** Cylinder along Y; s = [diameter x, height, diameter z]. */
  cyl(p: V3, s: V3, color: string, r?: V3, seg = 14) {
    return this.add(seg === 8 ? LGEO.cyl8 : seg === 14 ? LGEO.cyl : seg === 22 ? LGEO.cyl20 : cylSeg(seg), color, trs(p, r, s));
  }
  sphere(p: V3, s: V3, color: string, r?: V3, low = false) {
    return this.add(low ? LGEO.sphereLow : LGEO.sphere, color, trs(p, r, s));
  }
  cone(p: V3, s: V3, color: string, r?: V3) {
    return this.add(LGEO.cone, color, trs(p, r, s));
  }
  /** A box spanning from point a to point b (thickness t x t), e.g. a pillar or a rail. */
  beam(a: V3, b: V3, t: number | [number, number], color: string, round = false) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    const dir = vb.clone().sub(va).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const [tx, tz] = typeof t === 'number' ? [t, t] : t;
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(tx, len, tz));
    return this.add(round ? LGEO.cyl8 : LGEO.box, color, m);
  }
  /** Flat polygon (points in a plane) given in 3D, both faces. */
  poly(pts: V3[], color: string, thick = 0) {
    if (thick > 0) {
      // extrude along the polygon normal
      const a = new THREE.Vector3(...pts[0]);
      const n = new THREE.Vector3()
        .subVectors(new THREE.Vector3(...pts[1]), a)
        .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...pts[2]), a))
        .normalize()
        .multiplyScalar(thick / 2);
      const top = pts.map((p) => new THREE.Vector3(...p).add(n));
      const bot = pts.map((p) => new THREE.Vector3(...p).sub(n));
      const pos: number[] = [];
      const tri = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
      for (let i = 1; i < pts.length - 1; i++) {
        tri(top[0], top[i], top[i + 1]);
        tri(bot[0], bot[i + 1], bot[i]);
      }
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        tri(bot[i], bot[j], top[j]);
        tri(bot[i], top[j], top[i]);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      return this.add(g, color);
    }
    const pos: number[] = [];
    for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return this.add(g, color);
  }
  /**
   * Side profile (points in X/Y) extruded along Z, centred on z = zc, depth d. Rounded edges with
   * a small bevel (the silhouette grows by `bevel`).
   */
  profile(pts: [number, number][], d: number, color: string, zc = 0, bevel = 0.03) {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const depth = Math.max(0.001, d - bevel * 2);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
      curveSegments: 4,
    });
    g.translate(0, 0, zc - depth / 2);
    return this.add(g, color);
  }
  /** Surface of revolution around Y from (radius, y) points. */
  lathe(pts: [number, number][], color: string, p: V3 = [0, 0, 0], r?: V3, seg = 16, s?: V3) {
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    return this.add(g, color, trs(p, r, s));
  }
  /** Tube along a polyline/curve (points), radius rad. */
  tube(pts: V3[], rad: number, color: string, seg = 24, radial = 6, closed = false) {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)), closed, 'catmullrom', 0.5);
    return this.add(new THREE.TubeGeometry(curve, seg, rad, radial, closed), color);
  }
  /** Flat extruded 2D outline (points in X/Y), thickness along Z centred on z = 0. */
  shape(pts: [number, number][], thick: number, color: string, m: THREE.Matrix4 = new THREE.Matrix4(), bevel = 0) {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, thick - bevel * 2), bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 6 });
    g.translate(0, 0, -(thick - bevel * 2) / 2);
    return this.add(g, color, m);
  }
  get empty() {
    return this.parts.length === 0;
  }
  build(): THREE.BufferGeometry {
    if (!this.parts.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      return g;
    }
    const g = mergeGeometries(this.parts, false)!;
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

const geoCache = new Map<string, unknown>();
/** Build once per key (geometries live for the whole app). */
export function cached<T>(key: string, make: () => T): T {
  let v = geoCache.get(key) as T | undefined;
  if (v === undefined) {
    v = make();
    geoCache.set(key, v);
  }
  return v;
}

/* ------------------------------------------------------------------ materials */

const vcCache = new Map<string, THREE.Material>();
/** Vertex-coloured standard material (for builder geometries). */
export function vcMat(rough = 0.7, metal = 0, opts: { opacity?: number; side?: THREE.Side; emissive?: number } = {}) {
  const key = `${rough}|${metal}|${opts.opacity ?? 1}|${opts.side ?? 0}|${opts.emissive ?? 0}`;
  let m = vcCache.get(key);
  if (!m) {
    const sm = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: rough,
      metalness: metal,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    if (opts.emissive) {
      // vertex colours also drive the glow
      sm.emissive = new THREE.Color(1, 1, 1);
      sm.emissiveIntensity = opts.emissive;
      sm.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n totalEmissiveRadiance *= diffuseColor.rgb;',
        );
      };
      sm.customProgramCacheKey = () => 'vcEmissive';
    }
    m = sm;
    vcCache.set(key, m);
  }
  return m;
}

const basicCache = new Map<string, THREE.MeshBasicMaterial>();
/** Unlit material (lamps, signals, glowing icons). */
export function basic(color: string, o: { opacity?: number; map?: THREE.Texture | null; side?: THREE.Side; depthWrite?: boolean; vc?: boolean; add?: boolean } = {}) {
  const key = `${color}|${o.opacity ?? 1}|${o.map?.uuid ?? ''}|${o.side ?? 0}|${o.depthWrite ?? true}|${o.vc ?? false}|${o.add ?? false}`;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color,
      transparent: (o.opacity ?? 1) < 1 || !!o.map || !!o.add,
      opacity: o.opacity ?? 1,
      map: o.map ?? null,
      side: o.side ?? THREE.FrontSide,
      depthWrite: o.depthWrite ?? true,
      vertexColors: !!o.vc,
      toneMapped: false,
      blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    basicCache.set(key, m);
  }
  return m;
}

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
