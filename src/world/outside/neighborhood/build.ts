/**
 * Static-geometry builder for the neighborhood set (houses, park, side road, roadworks, terrain
 * skyline). Everything that never moves is added as small parts (boxes, cylinders, ribbons...) with
 * a vertex color, then merged into one mesh per (zone, material class). The whole neighborhood costs
 * a few dozen draw calls. Built once per page load; remounting reuses the meshes.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../core/types';

/** Material classes; each becomes one shared material. */
export type Cls =
  | 'solid' // vertex colors, casts + receives shadows (walls, palms, playground)
  | 'wet' // vertex colors, wettable, casts shadows (curbs, benches, roofs, boundary wall caps)
  | 'flat' // vertex colors, wettable, ground surfaces (asphalt, sidewalks, paving), receive only
  | 'soft' // vertex colors, not wettable, ground covers (grass, rubber floor, sand), receive only
  | 'paint' // vertex colors, wettable, thin markings drawn over flat/soft surfaces
  | 'atlas' // painted atlas (windows, gates, signs, railings), alpha tested, double sided
  | 'glow' // unlit (lamp globes, sign reflectors)
  | 'far'; // distant skyline (no shadows)

export const CASTS: Record<Cls, boolean> = { solid: true, wet: true, flat: false, soft: false, paint: false, atlas: false, glow: false, far: false };

export interface UVRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** Euler [x, y, z] or a single Y rotation. */
export type Rot = Vec3 | number;

/* ------------------------------------------------------------- unit shapes */

function roundedBox(seg: number, r: number) {
  const g = new THREE.BoxGeometry(1, 1, 1, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const lim = 0.5 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-lim, Math.min(lim, v.x)), Math.max(-lim, Math.min(lim, v.y)), Math.max(-lim, Math.min(lim, v.z)));
    const n = v.clone().sub(c);
    if (n.lengthSq() > 0) v.copy(c.add(n.normalize().multiplyScalar(r)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Triangular prism: triangle in x-y (base y 0..1 at x -0.5..0.5, apex at x 0, y 1), length 1 along z. */
function prismGeo() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0, 1);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

export const U = {
  box: new THREE.BoxGeometry(1, 1, 1),
  rbox: roundedBox(1, 0.12),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl12: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cyl20: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  /** Open-ended tube (fountain basin inner wall, manhole collar). */
  tube20: new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 1, true),
  cone8: new THREE.ConeGeometry(0.5, 1, 8),
  cone12: new THREE.ConeGeometry(0.5, 1, 12),
  sphere: new THREE.SphereGeometry(0.5, 12, 8),
  sphereLo: new THREE.SphereGeometry(0.5, 8, 5),
  /** Half sphere (dome), base at y 0, radius 0.5. */
  dome: new THREE.SphereGeometry(0.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  plane: new THREE.PlaneGeometry(1, 1),
  /** Plane lying flat, facing +Y. */
  floor: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  /** Circle lying flat, facing +Y, radius 0.5. */
  disc: new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2),
  prism: prismGeo(),
  torus: new THREE.TorusGeometry(0.5, 0.06, 6, 20),
};

/* ----------------------------------------------------------------- builder */

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const colorCache = new Map<string, THREE.Color>();
const col = (hex: string) => {
  let c = colorCache.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    colorCache.set(hex, c);
  }
  return c;
};

export function matrixOf(p: Vec3, s: Vec3, r?: Rot) {
  if (r === undefined) tmpQ.identity();
  else if (typeof r === 'number') tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r);
  else tmpQ.setFromEuler(tmpE.set(r[0], r[1], r[2]));
  return new THREE.Matrix4().compose(tmpP.set(p[0], p[1], p[2]), tmpQ.clone(), tmpS.set(s[0], s[1], s[2]));
}

/** Deterministic pseudo random in [0, 1). */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class Builder {
  private parts = new Map<string, THREE.BufferGeometry[]>();
  private frames: THREE.Matrix4[] = [new THREE.Matrix4()];
  zone = 'main';

  /** Run fn with a local frame (translation + Y rotation) pushed on the stack. */
  frame(p: Vec3, rotY: number, fn: () => void) {
    const top = this.frames[this.frames.length - 1];
    this.frames.push(top.clone().multiply(matrixOf(p, [1, 1, 1], rotY)));
    try {
      fn();
    } finally {
      this.frames.pop();
    }
  }

  inZone(zone: string, fn: () => void) {
    const prev = this.zone;
    this.zone = zone;
    try {
      fn();
    } finally {
      this.zone = prev;
    }
  }

  /** Add a geometry (cloned) with a local matrix and a flat color. */
  add(cls: Cls, geo: THREE.BufferGeometry, m: THREE.Matrix4, color: string, uv?: UVRect) {
    let g = geo.index ? geo.clone() : geo.clone();
    if (!g.index) {
      const n = g.attributes.position.count;
      const idx = new Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(idx);
    }
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (uv) {
      const a = g.attributes.uv as THREE.BufferAttribute;
      const out = new Float32Array(a.count * 2);
      for (let i = 0; i < a.count; i++) {
        out[i * 2] = uv.u0 + a.getX(i) * (uv.u1 - uv.u0);
        out[i * 2 + 1] = uv.v0 + a.getY(i) * (uv.v1 - uv.v0);
      }
      g.setAttribute('uv', new THREE.BufferAttribute(out, 2));
    }
    const full = this.frames[this.frames.length - 1].clone().multiply(m);
    g.applyMatrix4(full);
    const c = col(color);
    const n = g.attributes.position.count;
    const ca = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      ca[i * 3] = c.r;
      ca[i * 3 + 1] = c.g;
      ca[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    if (g.index && g.index.array instanceof Uint16Array) g.setIndex(Array.from(g.index.array));
    const key = `${this.zone}|${cls}`;
    let list = this.parts.get(key);
    if (!list) this.parts.set(key, (list = []));
    list.push(g);
  }

  box(cls: Cls, p: Vec3, s: Vec3, color: string, r?: Rot) {
    this.add(cls, U.box, matrixOf(p, s, r), color);
  }
  rbox(cls: Cls, p: Vec3, s: Vec3, color: string, r?: Rot) {
    this.add(cls, U.rbox, matrixOf(p, s, r), color);
  }
  /** Box given by its min/max corners (axis aligned). */
  aabb(cls: Cls, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string) {
    this.box(cls, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], color);
  }
  /** Cylinder centred at p, s = [diameter x, height, diameter z]. */
  cyl(cls: Cls, p: Vec3, s: Vec3, color: string, r?: Rot, seg: 6 | 8 | 12 | 20 = 12) {
    const g = seg === 6 ? U.cyl6 : seg === 8 ? U.cyl8 : seg === 20 ? U.cyl20 : U.cyl12;
    this.add(cls, g, matrixOf(p, s, r), color);
  }
  /** Cylinder between two points (poles, chains, rails). */
  rod(cls: Cls, a: Vec3, b: Vec3, d: number, color: string, seg: 6 | 8 | 12 = 6) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const mid = va.add(vb).multiplyScalar(0.5);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(d, len, d));
    this.add(cls, seg === 6 ? U.cyl6 : seg === 8 ? U.cyl8 : U.cyl12, m, color);
  }
  ball(cls: Cls, p: Vec3, s: Vec3, color: string, r?: Rot, lo = false) {
    this.add(cls, lo ? U.sphereLo : U.sphere, matrixOf(p, s, r), color);
  }
  cone(cls: Cls, p: Vec3, s: Vec3, color: string, r?: Rot, seg: 8 | 12 = 12) {
    this.add(cls, seg === 8 ? U.cone8 : U.cone12, matrixOf(p, s, r), color);
  }
  /** Flat rectangle at height y (facing up). */
  rect(cls: Cls, x0: number, x1: number, z0: number, z1: number, y: number, color: string) {
    this.add(cls, U.floor, matrixOf([(x0 + x1) / 2, y, (z0 + z1) / 2], [Math.abs(x1 - x0), 1, Math.abs(z1 - z0)]), color);
  }
  /** Textured upright quad from the atlas, centre p, size w x h, facing +Z rotated by rotY. */
  decal(p: Vec3, w: number, h: number, uv: UVRect, rotY = 0, color = '#FFFFFF', r?: Vec3) {
    this.add('atlas', U.plane, matrixOf(p, [w, h, 1], r ?? rotY), color, uv);
  }
  /** Textured quad lying flat (facing +Y). */
  floorDecal(p: Vec3, w: number, d: number, uv: UVRect, rotY = 0, color = '#FFFFFF') {
    this.add('atlas', U.floor, matrixOf(p, [w, 1, d], rotY), color, uv);
  }

  /** Merge everything into meshes keyed `${zone}|${cls}`. */
  build(): { zone: string; cls: Cls; geometry: THREE.BufferGeometry }[] {
    const out: { zone: string; cls: Cls; geometry: THREE.BufferGeometry }[] = [];
    for (const [key, list] of this.parts) {
      const [zone, cls] = key.split('|') as [string, Cls];
      // merge in batches so a single index buffer stays reasonable
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out.push({ zone, cls, geometry: merged });
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
    return out;
  }
}

/** An indexed grid surface: xs columns, zs rows, height y(x, z). Faces up. */
export function gridSurface(xs: number[], zs: number[], y: (x: number, z: number) => number, uvScale = 1) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < zs.length; j++)
    for (let i = 0; i < xs.length; i++) {
      pos.push(xs[i], y(xs[i], zs[j]), zs[j]);
      uv.push(xs[i] * uvScale, zs[j] * uvScale);
    }
  const W = xs.length;
  for (let j = 0; j < zs.length - 1; j++)
    for (let i = 0; i < W - 1; i++) {
      const a = j * W + i;
      const b = a + 1;
      const c = a + W;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Flat shape (outline + optional holes) lying at height y, facing up. Points are [x, z]. */
export function flatShape(outline: [number, number][], holes: [number, number][][] = [], y = 0) {
  const s = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ShapeGeometry(s, 6);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Rounded rectangle outline (points [x, z]) centred at (cx, cz). */
export function roundRect(cx: number, cz: number, w: number, d: number, r: number, seg = 6): [number, number][] {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [cx + w / 2 - r, cz + d / 2 - r, 0],
    [cx - w / 2 + r, cz + d / 2 - r, Math.PI / 2],
    [cx - w / 2 + r, cz - d / 2 + r, Math.PI],
    [cx + w / 2 - r, cz - d / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [x, z, a0] of corners)
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r]);
    }
  return pts;
}

/** Circle outline points [x, z]. */
export function circle(cx: number, cz: number, r: number, seg = 24): [number, number][] {
  return Array.from({ length: seg }, (_, i) => {
    const a = (i / seg) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r] as [number, number];
  });
}

export const IDENTITY = new THREE.Matrix4();
void tmpM;
