/**
 * Static-geometry builder for the street set.
 *
 * Everything that never moves (roads, sidewalks, curbs, paint, poles, palms, shelters, the mosque...)
 * is described as parts and merged into a few big vertex-colored meshes: one per material class and
 * per x-chunk of the street (so frustum culling still works). The whole street costs a few dozen draw
 * calls instead of thousands. Built once per page load and kept (outdoor parts unmount when the
 * active location goes indoors; remounting reuses the merged result).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../../core/types';

/** Material classes. Each becomes one material shared by every chunk. */
export type Cls =
  | 'solid' // vertex colors, casts shadows (poles, palms, walls, sign backs)
  | 'wet' // vertex colors, wettable, casts shadows (curbs, benches, roofs, bumps)
  | 'flat' // vertex colors, wettable, ground-level road surfaces, receive only
  | 'paint' // vertex colors, wettable, road/sidewalk paint drawn over 'flat' and 'tiles'
  | 'tiles' // sidewalk paving with a world-space tile texture, wettable, receive only
  | 'atlas' // the painted sign/decal atlas (alpha tested)
  | 'glow'; // unlit vertex colors (reflectors, lamp lenses in daylight)

export const CLASSES: Cls[] = ['flat', 'tiles', 'paint', 'wet', 'solid', 'atlas', 'glow'];
export const CASTS: Record<Cls, boolean> = { solid: true, wet: true, flat: false, paint: false, tiles: false, atlas: true, glow: false };

/** Chunk boundaries along x (world metres). Parts go to the chunk of their centre. */
const CHUNK_EDGES = [-95, -55, -15, 25, 65];
const chunkOf = (x: number) => {
  let i = 0;
  while (i < CHUNK_EDGES.length && x >= CHUNK_EDGES[i]) i++;
  return i;
};

/** Texture-atlas rectangle in UV space. */
export interface UVRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

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

/** A ramp/hump prism: profile in x-y, extruded along z (centred, length 1). */
function prism(profile: [number, number][]) {
  // profile: points left to right along the top (x, y); bottom is y = 0. Builds top strips + ends.
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const push = (x: number, y: number, z: number) => {
    pos.push(x, y, z);
    uv.push(x + 0.5, z + 0.5);
    return pos.length / 3 - 1;
  };
  for (let i = 0; i < profile.length - 1; i++) {
    const [x0, y0] = profile[i];
    const [x1, y1] = profile[i + 1];
    const a = push(x0, y0, -0.5);
    const b = push(x1, y1, -0.5);
    const c = push(x1, y1, 0.5);
    const d = push(x0, y0, 0.5);
    idx.push(a, d, c, a, c, b);
  }
  // end caps (z = +0.5 and z = -0.5)
  for (const z of [0.5, -0.5]) {
    const base = pos.length / 3;
    for (const [x, y] of profile) push(x, y, z);
    const b0 = push(profile[0][0], 0, z);
    const b1 = push(profile[profile.length - 1][0], 0, z);
    for (let i = 0; i < profile.length - 1; i++) {
      // quad (top_i, top_i+1, bottom) as a fan towards the bottom edge
      if (z > 0) idx.push(base + i, b0, base + i + 1);
      else idx.push(base + i, base + i + 1, b0);
    }
    if (z > 0) idx.push(base + profile.length - 1, b0, b1);
    else idx.push(base + profile.length - 1, b1, b0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Flat polygon in the x-z plane (facing up), from a 2D outline (x, z) listed counter-clockwise seen from above. */
export function flatShape(pts: [number, number][]) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** Unit geometries (centred, size 1). Indexed, with position/normal/uv. */
export const U = {
  box: new THREE.BoxGeometry(1, 1, 1),
  rbox: roundedBox(1, 0.12),
  rbox2: roundedBox(2, 0.18),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl12: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cyl20: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cone8: new THREE.ConeGeometry(0.5, 1, 8),
  cone12: new THREE.ConeGeometry(0.5, 1, 12),
  sphere: new THREE.SphereGeometry(0.5, 12, 8),
  sphereLo: new THREE.SphereGeometry(0.5, 8, 5),
  hemi: new THREE.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  /** Plane facing +Z. */
  plane: new THREE.PlaneGeometry(1, 1),
  /** Plane facing +Y (ground decal). */
  floor: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  /** Torus ring lying flat (radius 0.5, tube 0.06). */
  ring: new THREE.TorusGeometry(0.5, 0.06, 6, 20).rotateX(Math.PI / 2),
  /** Half-cylinder arch top (for arched windows/gates), axis along z, flat side down. */
  halfCyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2),
  /** Speed bump half-round profile: x length 1, height 1 (scale y), z length 1. */
  bump: prism(
    Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * Math.PI;
      return [-0.5 * Math.cos(a), Math.sin(a)] as [number, number];
    }),
  ),
  /** Raised crossing table: ramp 1 m up to 0.15, flat 5 m, ramp down (absolute metres in x and y). */
  hump: prism([
    [-3.5, 0],
    [-2.5, 0.15],
    [2.5, 0.15],
    [3.5, 0],
  ]),
};

/* ----------------------------------------------------------------- builder */

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();

export interface PartOpts {
  /** Euler rotation (radians). */
  r?: Vec3;
  /** Atlas rectangle for 'atlas' parts (maps the geometry's 0..1 uv into it). */
  uv?: UVRect;
  /** World-space uv (metres per texture repeat) for 'tiles'. */
  worldUV?: number;
}

export class Builder {
  private buckets = new Map<string, THREE.BufferGeometry[]>();
  tris = 0;

  /** Add a unit geometry scaled by s, rotated by r, centred at p. */
  add(cls: Cls, geo: THREE.BufferGeometry, p: Vec3, s: Vec3, color: string, o: PartOpts = {}) {
    tmpE.set(o.r?.[0] ?? 0, o.r?.[1] ?? 0, o.r?.[2] ?? 0);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(new THREE.Vector3(...p), tmpQ, new THREE.Vector3(...s));
    this.addMatrix(cls, geo, tmpM, color, o);
  }

  /** Add a geometry under an arbitrary matrix (use with group transforms). */
  addMatrix(cls: Cls, geo: THREE.BufferGeometry, m: THREE.Matrix4, color: string, o: PartOpts = {}) {
    const g = geo.clone();
    g.applyMatrix4(m);
    // Negative-determinant matrices flip winding; avoid them (we never mirror).
    const n = g.attributes.position.count;
    tmpC.set(color);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = tmpC.r;
      col[i * 3 + 1] = tmpC.g;
      col[i * 3 + 2] = tmpC.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (o.uv) {
      const uv = g.attributes.uv as THREE.BufferAttribute;
      const { u0, v0, u1, v1 } = o.uv;
      for (let i = 0; i < n; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    if (o.worldUV) {
      const uv = g.attributes.uv as THREE.BufferAttribute;
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < n; i++) uv.setXY(i, pos.getX(i) / o.worldUV, -pos.getZ(i) / o.worldUV);
    }
    if (!g.index) {
      const idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    this.tris += (g.index ? g.index.count : n) / 3;
    const key = `${cls}|${chunkOf(m.elements[12])}`;
    let list = this.buckets.get(key);
    if (!list) this.buckets.set(key, (list = []));
    list.push(g);
  }

  /** Axis-aligned box from min/max corners. */
  boxMinMax(cls: Cls, min: Vec3, max: Vec3, color: string, o: PartOpts = {}) {
    this.add(cls, U.box, [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], [max[0] - min[0], max[1] - min[1], max[2] - min[2]], color, o);
  }

  /** Flat rectangle facing up at height y (x0..x1, z0..z1). */
  rect(cls: Cls, x0: number, x1: number, z0: number, z1: number, y: number, color: string, o: PartOpts = {}) {
    this.add(cls, U.floor, [(x0 + x1) / 2, y, (z0 + z1) / 2], [x1 - x0, 1, z1 - z0], color, o);
  }

  /** Merge everything. Returns one geometry per (class, chunk). */
  build(): { cls: Cls; geometry: THREE.BufferGeometry }[] {
    const out: { cls: Cls; geometry: THREE.BufferGeometry }[] = [];
    for (const [key, list] of this.buckets) {
      const cls = key.split('|')[0] as Cls;
      // Normalise attribute sets (some shapes have no normals yet).
      for (const g of list) {
        if (!g.attributes.normal) g.computeVertexNormals();
        for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
        g.morphAttributes = {};
        g.clearGroups();
      }
      const merged = mergeGeometries(list, false);
      if (!merged) {
        console.error('street: merge failed for', key);
        continue;
      }
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out.push({ cls, geometry: merged });
      for (const g of list) g.dispose();
    }
    this.buckets.clear();
    return out;
  }
}

/** A tiny transform stack for composing grouped parts (local frames like a sign or a shelter). */
export class Frame {
  m: THREE.Matrix4;
  constructor(
    private b: Builder,
    p: Vec3 = [0, 0, 0],
    rotY = 0,
    parent?: Frame,
  ) {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1));
    this.m = parent ? parent.m.clone().multiply(local) : local;
  }
  child(p: Vec3, rotY = 0) {
    return new Frame(this.b, p, rotY, this);
  }
  /** World position of a local point. */
  at(p: Vec3): Vec3 {
    const v = new THREE.Vector3(...p).applyMatrix4(this.m);
    return [v.x, v.y, v.z];
  }
  add(cls: Cls, geo: THREE.BufferGeometry, p: Vec3, s: Vec3, color: string, o: PartOpts = {}) {
    tmpE.set(o.r?.[0] ?? 0, o.r?.[1] ?? 0, o.r?.[2] ?? 0);
    tmpQ.setFromEuler(tmpE);
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...p), tmpQ, new THREE.Vector3(...s));
    this.b.addMatrix(cls, geo, this.m.clone().multiply(local), color, o);
  }
  box(cls: Cls, p: Vec3, s: Vec3, color: string, o: PartOpts = {}) {
    this.add(cls, U.box, p, s, color, o);
  }
}
