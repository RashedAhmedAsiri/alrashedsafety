/**
 * Materials and flat ground-rectangle helpers of the school set. Every material is created once per
 * page load and shared by all meshes of the set.
 */
import * as THREE from 'three';
import { registerWet } from '../../wet';
import { vmat } from './batch';
import { atlasTexture } from './atlas';
import { chainTexture, grassTexture, netTexture, pavingTexture, railTexture, turfTexture, yardTexture } from './textures';

export interface SchoolMats {
  dry: THREE.MeshStandardMaterial;
  wet: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  clear: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  sign: THREE.MeshStandardMaterial;
  signGlow: THREE.MeshStandardMaterial;
  alarm: THREE.MeshBasicMaterial;
  rail: THREE.MeshStandardMaterial;
  net: THREE.MeshStandardMaterial;
  chain: THREE.MeshStandardMaterial;
  paving: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  yard: THREE.MeshStandardMaterial;
  turf: THREE.MeshStandardMaterial;
}

let cache: SchoolMats | null = null;

export function schoolMats(): SchoolMats {
  if (cache) return cache;
  const wetTex = (map: THREE.Texture, rough = 0.9) => {
    const m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', map, roughness: rough });
    registerWet(m);
    return m;
  };
  const atlas = atlasTexture();
  const alpha = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ color: '#FFFFFF', map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
  const wet = vmat();
  registerWet(wet);
  cache = {
    dry: vmat(),
    wet,
    glass: Object.assign(vmat({ rough: 0.12 }), { transparent: true, opacity: 0.62, depthWrite: false }),
    clear: Object.assign(vmat({ rough: 0.05 }), { transparent: true, opacity: 0.16, depthWrite: false }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    sign: new THREE.MeshStandardMaterial({ color: '#FFFFFF', map: atlas, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    signGlow: new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      map: atlas,
      emissive: new THREE.Color('#FFFFFF'),
      emissiveMap: atlas,
      emissiveIntensity: 0.7,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    }),
    alarm: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    rail: alpha(railTexture()),
    net: alpha(netTexture()),
    chain: alpha(chainTexture()),
    paving: wetTex(pavingTexture()),
    grass: wetTex(grassTexture(), 1),
    yard: wetTex(yardTexture()),
    turf: wetTex(turfTexture(), 1),
  };
  return cache;
}

/* ------------------------------------------------------------ ground rectangles */

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Remove `cut` from every rectangle of `rects` (returns up to 4 pieces per rectangle). */
export function subtract(rects: Rect[], cut: Rect): Rect[] {
  const out: Rect[] = [];
  for (const r of rects) {
    if (cut.x1 <= r.x0 || cut.x0 >= r.x1 || cut.z1 <= r.z0 || cut.z0 >= r.z1) {
      out.push(r);
      continue;
    }
    if (cut.z0 > r.z0) out.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: cut.z0 });
    if (cut.z1 < r.z1) out.push({ x0: r.x0, z0: cut.z1, x1: r.x1, z1: r.z1 });
    const zz0 = Math.max(r.z0, cut.z0);
    const zz1 = Math.min(r.z1, cut.z1);
    if (cut.x0 > r.x0) out.push({ x0: r.x0, z0: zz0, x1: cut.x0, z1: zz1 });
    if (cut.x1 < r.x1) out.push({ x0: cut.x1, z0: zz0, x1: r.x1, z1: zz1 });
  }
  return out;
}

/** Merge geometry of many flat rectangles at height y; uv(x, z) gives the texture coordinate. */
export function rectsGeometry(rects: Rect[], y: number, uv: (x: number, z: number) => [number, number]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (const r of rects) {
    const base = pos.length / 3;
    for (const [x, z] of [
      [r.x0, r.z0],
      [r.x0, r.z1],
      [r.x1, r.z1],
      [r.x1, r.z0],
    ] as const) {
      pos.push(x, y, z);
      uvs.push(...uv(x, z));
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
