/**
 * Static geometry batching for the first-floor rooms (set-first). Adapted from the set-core batcher:
 * hundreds of simple parts merge into ONE vertex-colored geometry; posters and signs merge into one
 * sticker atlas. A whole furnished room costs a handful of draw calls.
 */
import * as THREE from 'three';
import { canvasTexture } from '../../kit';

export type V3 = [number, number, number];

/* ------------------------------------------------------------------ templates */

const toNonIndexed = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  // keep only position + normal (+uv), colors are added when merging
  return n;
};

const TEMPLATES = {
  box: toNonIndexed(new THREE.BoxGeometry(1, 1, 1)),
  cyl: toNonIndexed(new THREE.CylinderGeometry(0.5, 0.5, 1, 18)),
  cylLo: toNonIndexed(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
  sphere: toNonIndexed(new THREE.SphereGeometry(0.5, 16, 12)),
  sphereLo: toNonIndexed(new THREE.SphereGeometry(0.5, 10, 7)),
  hemi: toNonIndexed(new THREE.SphereGeometry(0.5, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2)),
  cone: toNonIndexed(new THREE.ConeGeometry(0.5, 1, 16)),
  plane: toNonIndexed(new THREE.PlaneGeometry(1, 1)),
  disc: toNonIndexed(new THREE.CircleGeometry(0.5, 24)),
  torus: toNonIndexed(new THREE.TorusGeometry(0.5, 0.08, 8, 28)),
  /** Wedge: right triangle prism. Cross-section in the YZ plane: (y0,z0)-(y0,z1)-(y1,z0) i.e. slope down toward +Z. */
  wedge: toNonIndexed(wedgeGeometry()),
};
export type Shape = keyof typeof TEMPLATES;

function wedgeGeometry() {
  // Unit wedge: x in [-0.5,0.5], y in [-0.5,0.5], z in [-0.5,0.5]; full height at z=-0.5, zero at z=+0.5.
  // Shape space (sx, sy); after rotateY(+90deg): extrude z -> world x, sx -> world -z, sy -> y.
  const s = new THREE.Shape();
  s.moveTo(0.5, -0.5);
  s.lineTo(-0.5, -0.5);
  s.lineTo(0.5, 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

const rboxCache = new Map<string, THREE.BufferGeometry>();

/**
 * Rounded box with a real-world bevel radius (does not stretch when sizes differ) and analytic normals,
 * so even a 1-segment bevel shades as a soft rounded edge.
 */
export function roundedBox(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  r = Math.max(0.002, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}|${seg}`;
  const hit = rboxCache.get(key);
  if (hit) return hit;
  const n = seg * 2 + 1;
  const g = new THREE.BoxGeometry(2, 2, 2, n, n, n);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const half = [w / 2, h / 2, d / 2];
  const inner = half.map((v) => v - r);
  // grid value t in [-1,1] at index i = (t+1)/2*n
  const remap = (t: number, axis: number) => {
    const i = Math.round(((t + 1) / 2) * n);
    if (i <= seg) {
      const th = (i / seg) * (Math.PI / 2);
      return -inner[axis] - r * Math.cos(th);
    }
    const j = n - i; // mirrored index
    const th = (j / seg) * (Math.PI / 2);
    return inner[axis] + r * Math.cos(th);
  };
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    v.set(remap(pos.getX(k), 0), remap(pos.getY(k), 1), remap(pos.getZ(k), 2));
    c.set(
      Math.max(-inner[0], Math.min(inner[0], v.x)),
      Math.max(-inner[1], Math.min(inner[1], v.y)),
      Math.max(-inner[2], Math.min(inner[2], v.z)),
    );
    const dv = v.clone().sub(c);
    const len = dv.length();
    if (len > 1e-6) {
      dv.multiplyScalar(1 / len);
      v.copy(c).addScaledVector(dv, r);
      nor.setXYZ(k, dv.x, dv.y, dv.z);
    }
    pos.setXYZ(k, v.x, v.y, v.z);
  }
  const out = g.toNonIndexed();
  rboxCache.set(key, out);
  return out;
}

/* ------------------------------------------------------------------ batch */

interface Chunk {
  geo: THREE.BufferGeometry;
  m: THREE.Matrix4;
  color: THREE.Color;
}

const tmpColor = new THREE.Color();
const colorCache = new Map<string, THREE.Color>();
function col(c: string) {
  let k = colorCache.get(c);
  if (!k) {
    k = new THREE.Color(c);
    colorCache.set(c, k);
  }
  return k;
}

const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const vPos = new THREE.Vector3();
const vScl = new THREE.Vector3();

function compose(p: V3, r: V3 | number | undefined, s: V3): THREE.Matrix4 {
  if (typeof r === 'number') euler.set(0, r, 0);
  else if (r) euler.set(r[0], r[1], r[2]);
  else euler.set(0, 0, 0);
  quat.setFromEuler(euler);
  return new THREE.Matrix4().compose(vPos.set(p[0], p[1], p[2]), quat, vScl.set(s[0], s[1], s[2]));
}

/** A sticker: a textured quad whose picture is drawn into the shared atlas. Faces +Z unless rotated. */
export interface Sticker {
  /** Unique id inside the atlas (also used to dedupe identical drawings). */
  id: string;
  w: number;
  h: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Pixels per metre (default 260). */
  ppm?: number;
  /** Transparent background allowed (cut-out pictures). */
  m: THREE.Matrix4;
}

export class Batch {
  chunks: Chunk[] = [];
  stickers: Sticker[] = [];
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];

  private get top() {
    return this.stack[this.stack.length - 1];
  }

  /** Run `fn` with an extra local transform (position, rotation as Y angle or Euler, optional scale). */
  at(p: V3, r: V3 | number | undefined, fn: () => void, s: V3 = [1, 1, 1]) {
    this.stack.push(this.top.clone().multiply(compose(p, r, s)));
    try {
      fn();
    } finally {
      this.stack.pop();
    }
  }

  add(shape: Shape | THREE.BufferGeometry, p: V3, s: V3, c: string, r?: V3 | number) {
    const geo = typeof shape === 'string' ? TEMPLATES[shape] : shape;
    this.chunks.push({ geo, m: this.top.clone().multiply(compose(p, r, s)), color: col(c) });
  }

  box(p: V3, s: V3, c: string, r?: V3 | number) {
    this.add('box', p, s, c, r);
  }
  /** Rounded box with bevel radius `rad` metres. */
  rbox(p: V3, s: V3, c: string, rad = 0.03, r?: V3 | number, seg = 1) {
    this.add(roundedBox(s[0], s[1], s[2], rad, seg), p, [1, 1, 1], c, r);
  }
  /** Cylinder: s = [diameter x, height, diameter z]. */
  cyl(p: V3, s: V3, c: string, r?: V3 | number, lo = false) {
    this.add(lo ? 'cylLo' : 'cyl', p, s, c, r);
  }
  ball(p: V3, s: V3, c: string, r?: V3 | number, lo = false) {
    this.add(lo ? 'sphereLo' : 'sphere', p, s, c, r);
  }
  hemi(p: V3, s: V3, c: string, r?: V3 | number) {
    this.add('hemi', p, s, c, r);
  }
  cone(p: V3, s: V3, c: string, r?: V3 | number) {
    this.add('cone', p, s, c, r);
  }
  /** Flat colored quad, facing +Z unless rotated. s = [w, h]. */
  quad(p: V3, s: [number, number], c: string, r?: V3 | number) {
    this.add('plane', p, [s[0], s[1], 1], c, r);
  }
  disc(p: V3, d: number, c: string, r?: V3 | number) {
    this.add('disc', p, [d, d, 1], c, r);
  }
  torus(p: V3, d: number, c: string, r?: V3 | number, thick = 1) {
    this.add('torus', p, [d, d, d * thick], c, r);
  }
  wedge(p: V3, s: V3, c: string, r?: V3 | number) {
    this.add('wedge', p, s, c, r);
  }

  /** Textured quad (poster, sign, picture) of w x h metres facing +Z unless rotated. */
  sticker(id: string, p: V3, w: number, h: number, draw: Sticker['draw'], r?: V3 | number, ppm?: number) {
    this.stickers.push({ id, w, h, draw, ppm, m: this.top.clone().multiply(compose(p, r, [w, h, 1])) });
  }

  /** Merge all chunks into one geometry with per-vertex colors. */
  build(): THREE.BufferGeometry {
    let count = 0;
    for (const c of this.chunks) count += c.geo.attributes.position.count;
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const colr = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    let o = 0;
    for (const c of this.chunks) {
      const P = c.geo.attributes.position as THREE.BufferAttribute;
      const N = c.geo.attributes.normal as THREE.BufferAttribute;
      nm.getNormalMatrix(c.m);
      const det = c.m.determinant();
      tmpColor.copy(c.color);
      const flip = det < 0;
      for (let i = 0; i < P.count; i++) {
        // keep triangle winding when a transform mirrors
        const src = flip ? i - (i % 3) + (2 - (i % 3)) : i;
        v.fromBufferAttribute(P, src).applyMatrix4(c.m);
        pos[o * 3] = v.x;
        pos[o * 3 + 1] = v.y;
        pos[o * 3 + 2] = v.z;
        v.fromBufferAttribute(N, src).applyMatrix3(nm).normalize();
        nor[o * 3] = v.x;
        nor[o * 3 + 1] = v.y;
        nor[o * 3 + 2] = v.z;
        colr[o * 3] = tmpColor.r;
        colr[o * 3 + 1] = tmpColor.g;
        colr[o * 3 + 2] = tmpColor.b;
        o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }

  /**
   * Build the sticker atlas: one canvas texture (cached by `atlasKey`) and one merged quad geometry.
   * Returns null when there are no stickers.
   */
  buildStickers(atlasKey: string, maxW = 2048): { geo: THREE.BufferGeometry; tex: THREE.CanvasTexture } | null {
    if (!this.stickers.length) return null;
    // unique drawings
    const uniq = new Map<string, Sticker>();
    for (const s of this.stickers) if (!uniq.has(s.id)) uniq.set(s.id, s);
    const pad = 3;
    let scale = 1;
    let cells = new Map<string, { x: number; y: number; w: number; h: number }>();
    let W = maxW;
    let H = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      cells = new Map();
      const items = [...uniq.values()].map((s) => {
        const ppm = (s.ppm ?? 260) * scale;
        return { s, w: Math.max(8, Math.round(s.w * ppm)), h: Math.max(8, Math.round(s.h * ppm)) };
      });
      items.sort((a, b) => b.h - a.h);
      let x = 0;
      let y = 0;
      let rowH = 0;
      for (const it of items) {
        const cw = Math.min(it.w, W - pad * 2);
        if (x + cw + pad * 2 > W) {
          x = 0;
          y += rowH;
          rowH = 0;
        }
        cells.set(it.s.id, { x: x + pad, y: y + pad, w: cw, h: it.h });
        x += cw + pad * 2;
        rowH = Math.max(rowH, it.h + pad * 2);
      }
      H = y + rowH;
      if (H <= maxW) break;
      scale *= 0.8;
    }
    H = Math.ceil(H / 16) * 16;
    const drawAll = (ctx: CanvasRenderingContext2D) => {
      for (const s of uniq.values()) {
        const c = cells.get(s.id)!;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.beginPath();
        ctx.rect(0, 0, c.w, c.h);
        ctx.clip();
        s.draw(ctx, c.w, c.h);
        ctx.restore();
      }
    };
    const tex = canvasTexture(atlasKey, W, H, drawAll);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    // quads
    const n = this.stickers.length * 6;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const corners: [number, number][] = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ];
    const v = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    let o = 0;
    for (const s of this.stickers) {
      const c = cells.get(s.id)!;
      const u0 = c.x / W;
      const u1 = (c.x + c.w) / W;
      const vTop = 1 - c.y / H;
      const vBot = 1 - (c.y + c.h) / H;
      nm.getNormalMatrix(s.m);
      const nrm = new THREE.Vector3(0, 0, 1).applyMatrix3(nm).normalize();
      for (const [cx, cy] of corners) {
        v.set(cx, cy, 0).applyMatrix4(s.m);
        pos.set([v.x, v.y, v.z], o * 3);
        nor.set([nrm.x, nrm.y, nrm.z], o * 3);
        uv.set([cx < 0 ? u0 : u1, cy < 0 ? vBot : vTop], o * 2);
        o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere();
    return { geo: g, tex };
  }
}

/* ------------------------------------------------------------------ materials */

const matCache = new Map<string, THREE.Material>();

/** Shared vertex-colored standard material. */
export function vcMat(rough = 0.78, metal = 0): THREE.MeshStandardMaterial {
  const key = `vc|${rough}|${metal}`;
  let m = matCache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
    matCache.set(key, m);
  }
  return m;
}

/** Shared vertex-colored unlit material (glowing things). */
export function vcGlowMat(key = 'default'): THREE.MeshBasicMaterial {
  const k = `vcglow|${key}`;
  let m = matCache.get(k) as THREE.MeshBasicMaterial | undefined;
  if (!m) {
    m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    matCache.set(k, m);
  }
  return m;
}

/** Material for a sticker atlas. */
export function stickerMat(tex: THREE.Texture, glowing = false): THREE.Material {
  const key = `st|${tex.uuid}|${glowing}`;
  let m = matCache.get(key);
  if (!m) {
    m = glowing
      ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true, alphaTest: 0.05 })
      : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, transparent: true, alphaTest: 0.05, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    matCache.set(key, m);
  }
  return m;
}
