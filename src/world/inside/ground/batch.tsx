/**
 * Static geometry batching for the ground-floor rooms (clinic, canteen, prayer room, sports hall,
 * principal). Every static part of a room is added to a Batch (boxes, rounded boxes, cylinders,
 * spheres, custom geometries), then merged into ONE mesh per material, so a fully furnished room
 * costs a few dozen draw calls instead of hundreds. Batches are built once per room (module cache)
 * and never disposed, because rooms are revisited.
 *
 * Coordinates are the room's LOCAL frame (floor y = 0, interior centred). push()/pop() enter child
 * frames so a piece of furniture can be authored once and placed with a position and rotation.
 */
import * as THREE from 'three';
import { GEO, mat } from '../../kit';
import type { Vec3 } from '../../../core/types';

export type Col = string | THREE.Material;
export const toMat = (c: Col): THREE.Material => (typeof c === 'string' ? mat(c) : c);

/** Extra unit geometries used by the ground rooms (centred like kit GEO). */
export const XGEO = {
  /** Triangular prism (sandwich wedges, roof shapes): radius 0.5, height 1, axis Y. */
  prism: new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
  /** Octagonal cylinder for small/cheap round things. */
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  /** Low-poly sphere for fruit, balls in baskets. */
  sphereLow: new THREE.SphereGeometry(0.5, 10, 8),
  /** Torus: ring radius 0.5, tube 0.06 (rims, hula hoops), in the XY plane. */
  ring: new THREE.TorusGeometry(0.5, 0.06, 6, 24),
  /** Thin torus for basketball rims. */
  rim: new THREE.TorusGeometry(0.5, 0.04, 6, 20),
  /** Quarter torus for bananas. */
  arc: new THREE.TorusGeometry(0.5, 0.16, 6, 8, Math.PI * 0.6),
  /** Half cylinder (arch tops), axis Z, flat side down. */
  halfCyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2),
  /** Open-ended cone (lampshades, nets): radius top 0.5 -> bottom 0.5 scaled per mesh. */
  shade: new THREE.CylinderGeometry(0.3, 0.5, 1, 16, 1, true),
  /** Dome (top half sphere). */
  dome: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  /** Capsule for pillows, rolled mats, rope: radius 0.5, total length 2 along Y. */
  capsule: new THREE.CapsuleGeometry(0.5, 1, 4, 10),
};

function compose(p: Vec3, r: number | Vec3 | undefined, s: Vec3 | undefined) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  if (typeof r === 'number') q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r);
  else if (r) q.setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
  m.compose(new THREE.Vector3(p[0], p[1], p[2]), q, new THREE.Vector3(...(s ?? [1, 1, 1])));
  return m;
}

/** Keep only position/normal/uv and make sure there is an index, so anything can be merged. */
function normalise(g: THREE.BufferGeometry) {
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.index) {
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

/** Concatenate indexed geometries that all have position, normal and uv. */
export function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let nv = 0;
  let ni = 0;
  for (const g of list) {
    nv += g.attributes.position.count;
    ni += g.index!.count;
  }
  const pos = new Float32Array(nv * 3);
  const nor = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0;
  let io = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array as ArrayLike<number>, vo * 3);
    nor.set(g.attributes.normal.array as ArrayLike<number>, vo * 3);
    uv.set(g.attributes.uv.array as ArrayLike<number>, vo * 2);
    const src = g.index!.array;
    for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
    vo += c;
    io += src.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

export interface BuiltPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** UV rectangle [u0, v0, u1, v1] (v up, like three.js UVs). */
export type UVRect = [number, number, number, number];

export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];

  private get top() {
    return this.stack[this.stack.length - 1];
  }

  /** Enter a child frame at p, rotated (rotY number or Euler) and optionally scaled. */
  push(p: Vec3 = [0, 0, 0], r: number | Vec3 = 0, s?: Vec3) {
    this.stack.push(this.top.clone().multiply(compose(p, r, s)));
    return this;
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
    return this;
  }

  /** Run fn inside a child frame. */
  at(p: Vec3, r: number | Vec3, fn: () => void) {
    this.push(p, r);
    fn();
    this.pop();
  }

  /** Current frame transform of a local point (for landmarks). */
  world(p: Vec3): Vec3 {
    const v = new THREE.Vector3(...p).applyMatrix4(this.top);
    return [v.x, v.y, v.z];
  }

  add(geo: THREE.BufferGeometry, c: Col, p: Vec3, s: Vec3 = [1, 1, 1], r?: number | Vec3, uv?: UVRect) {
    const g = normalise(geo.clone());
    if (uv) {
      const a = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    }
    g.applyMatrix4(this.top.clone().multiply(compose(p, r, s)));
    const m = toMat(c);
    let list = this.parts.get(m);
    if (!list) this.parts.set(m, (list = []));
    list.push(g);
    return this;
  }

  box(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(GEO.box, c, p, s, r);
  }
  rbox(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(GEO.rbox, c, p, s, r);
  }
  /** s = [diameter x, height, diameter z]. */
  cyl(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(GEO.cyl, c, p, s, r);
  }
  cyl8(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(XGEO.cyl8, c, p, s, r);
  }
  ball(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(GEO.sphere, c, p, s, r);
  }
  ballLow(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(XGEO.sphereLow, c, p, s, r);
  }
  cone(p: Vec3, s: Vec3, c: Col, r?: number | Vec3) {
    return this.add(GEO.cone, c, p, s, r);
  }
  /** Plane facing +Z (rotate to face elsewhere); s = [w, h]. Optional atlas rect. */
  plane(p: Vec3, s: [number, number], c: Col, r?: number | Vec3, uv?: UVRect) {
    return this.add(GEO.plane, c, p, [s[0], s[1], 1], r, uv);
  }
  /** Flat plane lying on a horizontal surface at height p[1], facing up. s = [w along X, d along Z]. */
  floorPlane(p: Vec3, s: [number, number], c: Col, rotY = 0, uv?: UVRect) {
    this.push(p, rotY);
    this.add(GEO.plane, c, [0, 0, 0], [s[0], s[1], 1], [-Math.PI / 2, 0, 0], uv);
    return this.pop();
  }

  isEmpty() {
    return this.parts.size === 0;
  }

  /** Merge into one geometry per material. */
  build(): BuiltPart[] {
    const out: BuiltPart[] = [];
    for (const [material, list] of this.parts) out.push({ material, geometry: mergeAll(list) });
    return out;
  }

  /** Merge everything regardless of material (for geometry used with a runtime-chosen material). */
  buildGeometry(): THREE.BufferGeometry | null {
    const all: THREE.BufferGeometry[] = [];
    for (const list of this.parts.values()) all.push(...list);
    return all.length ? mergeAll(all) : null;
  }
}

/** Renders a built batch. */
export function BatchMeshes({ parts }: { parts: BuiltPart[] }) {
  return (
    <>
      {parts.map((pt, i) => (
        <mesh key={i} geometry={pt.geometry} material={pt.material} receiveShadow renderOrder={(pt.material as THREE.Material).transparent ? 2 : 0} />
      ))}
    </>
  );
}

/** Deterministic pseudo random in [0, 1) from an integer seed. */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Build a value once (per page) on first use. */
export function once<T>(fn: () => T): () => T {
  let v: T | undefined;
  let done = false;
  return () => {
    if (!done) {
      v = fn();
      done = true;
    }
    return v as T;
  };
}
