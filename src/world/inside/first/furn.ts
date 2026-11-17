/** Furniture and small props shared by the first-floor rooms. All builders push into a Batch at the local origin. */
import * as THREE from 'three';
import type { Batch } from './batch';
import { drawClockFace } from './draw';

export const METAL = '#8E99A8';
export const BOOK_COLS = ['#E5484D', '#2D8CFF', '#22B573', '#F5C518', '#8B5CF6', '#FF8A3D', '#14B8A6', '#FF6FA8', '#1E5FA8', '#C94F2D'];

/** Wall-mounted split AC (on the wall, +Z out of the wall). */
export function acUnit(b: Batch) {
  b.rbox([0, 0, 0.13], [1.0, 0.3, 0.24], '#FFFFFF', 0.06, undefined, 2);
  b.box([0, -0.1, 0.25], [0.86, 0.04, 0.012], '#C9D2DC');
  b.box([0, -0.13, 0.22], [0.86, 0.012, 0.05], '#9AA6B2');
  b.box([0.38, 0.06, 0.252], [0.04, 0.015, 0.004], '#22B573');
}

/** Wall clock disc + face sticker (hands are a separate animated component). Local: centre on the wall, +Z out. */
export function wallClock(b: Batch, d = 0.46) {
  b.cyl([0, 0, 0.02], [d, 0.04, d], '#2B8CBE', [Math.PI / 2, 0, 0]);
  b.sticker('clock-face', [0, 0, 0.042], d * 0.92, d * 0.92, drawClockFace, 0, 620);
}

export function pottedPlant(b: Batch, h = 1.4, pot = '#E07A3F') {
  b.rbox([0, 0.22, 0], [0.5, 0.44, 0.5], pot, 0.06);
  b.box([0, 0.44, 0], [0.42, 0.02, 0.42], '#6B4A2B');
  b.cyl([0, 0.44 + h * 0.3, 0], [0.05, h * 0.6, 0.05], '#7A5A3A');
  const leaves = [
    [0, 1, 0, 0.62],
    [0.2, 0.82, 0.1, 0.5],
    [-0.18, 0.78, -0.08, 0.48],
    [0.05, 0.62, -0.2, 0.42],
    [-0.12, 0.58, 0.18, 0.4],
  ];
  leaves.forEach(([x, y, z, s], i) => b.ball([x, 0.44 + h * (y as number) * 0.85, z], [s, s * 0.8, s], i % 2 ? '#3E9B4F' : '#4CB25E'));
}

/** Swivel chair on wheels. Seat centre at origin, the child faces -Z. */
export function swivelChair(b: Batch, color: string) {
  b.rbox([0, 0.46, 0], [0.42, 0.06, 0.4], color, 0.025);
  b.rbox([0, 0.72, 0.19], [0.4, 0.3, 0.05], color, 0.03, [-0.08, 0, 0]);
  b.cyl([0, 0.26, 0.02], [0.05, 0.4, 0.05], '#4A5563', undefined, true);
  b.cyl([0, 0.46, 0.17], [0.03, 0.12, 0.03], '#4A5563', undefined, true);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box([Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14], [0.04, 0.025, 0.3], '#2B2F36', a);
    b.ball([Math.sin(a) * 0.27, 0.035, Math.cos(a) * 0.27], [0.06, 0.06, 0.06], '#1E2228', undefined, true);
  }
}

/** Plain student chair, child faces -Z (seat top 0.43). */
export function schoolChair(b: Batch, color: string) {
  b.rbox([0, 0.4, 0], [0.38, 0.035, 0.36], color, 0.014);
  b.rbox([0, 0.66, 0.175], [0.36, 0.22, 0.03], color, 0.012, [-0.08, 0, 0]);
  for (const sx of [-1, 1]) {
    b.cyl([sx * 0.16, 0.2, -0.15], [0.024, 0.4, 0.024], METAL, undefined, true);
    b.cyl([sx * 0.16, 0.39, 0.155], [0.024, 0.78, 0.024], METAL, undefined, true);
  }
}

/** Round stool (seat height h). */
export function stool(b: Batch, color: string, h = 0.45) {
  b.cyl([0, h - 0.02, 0], [0.34, 0.045, 0.34], color);
  b.cyl([0, h - 0.045, 0], [0.3, 0.02, 0.3], '#2B2F36', undefined, true);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    b.cyl([Math.sin(a) * 0.1, h / 2 - 0.02, Math.cos(a) * 0.1], [0.024, h - 0.04, 0.024], METAL, [Math.cos(a) * 0.12, 0, -Math.sin(a) * 0.12], true);
  }
  b.torus([0, h * 0.4, 0], 0.22, METAL, [Math.PI / 2, 0, 0], 0.4);
}

export function fireExtinguisher(b: Batch) {
  // on the wall, +Z out, centre height 0.35 above origin
  b.cyl([0, 0.3, 0.1], [0.16, 0.5, 0.16], '#E23B3B');
  b.cyl([0, 0.22, 0.1], [0.165, 0.18, 0.165], '#FFFFFF');
  b.cyl([0, 0.6, 0.1], [0.07, 0.1, 0.07], '#222');
  b.box([0.04, 0.68, 0.1], [0.12, 0.025, 0.03], '#222');
  b.box([0, 0.3, 0.02], [0.2, 0.5, 0.03], '#B8C1CC');
  b.box([0, 0.46, 0.18], [0.2, 0.03, 0.02], '#2B2F36');
}

/** A row of colourful standing books along +x from x0 to x1 (spine facing +z), shelf surface at y, depth d. */
export function bookRow(b: Batch, x0: number, x1: number, y: number, z: number, d: number, seed: number, hMin = 0.22, hMax = 0.34) {
  let x = x0;
  let i = seed;
  while (x < x1 - 0.06) {
    const bw = 0.035 + ((i * 7) % 4) * 0.012;
    const bh = hMin + (((i * 5) % 5) / 4) * (hMax - hMin);
    const lean = i % 11 === 4 ? 0.22 : 0;
    if (i % 17 === 9) {
      x += 0.13; // a gap
    } else {
      b.box([x + bw / 2, y + bh / 2, z], [bw, bh, d], BOOK_COLS[(i * 3) % BOOK_COLS.length], [0, 0, lean]);
      // a lighter page-block stripe on the spine for charm
      if (i % 3 === 0) b.box([x + bw / 2, y + bh * 0.7, z + d / 2 + 0.002], [bw * 0.9, 0.012, 0.002], '#FFF8EC');
      x += bw + 0.004 + (lean ? 0.06 : 0);
    }
    i++;
  }
}

/** Low open bookshelf. Back at z = 0, front +Z, width w, height h, `tiers` shelves of books. */
export function lowShelf(b: Batch, w: number, h: number, depth: number, tiers: number, seed = 0, color = '#F1DDB8', trim = '#D9C39A') {
  b.box([0, h / 2, 0.015], [w, h, 0.03], trim); // back panel
  for (const sx of [-1, 1]) b.box([sx * (w / 2 - 0.015), h / 2, depth / 2], [0.03, h, depth], color);
  b.box([0, 0.04, depth / 2], [w - 0.06, 0.08, depth - 0.02], '#C9A878'); // kick base
  const th = (h - 0.08) / tiers;
  for (let t = 0; t < tiers; t++) {
    const y0 = 0.08 + t * th;
    b.box([0, y0, depth / 2], [w - 0.06, 0.025, depth], color);
    bookRow(b, -w / 2 + 0.05, w / 2 - 0.05, y0 + 0.0125, depth / 2 + 0.01, depth - 0.1, seed + t * 5, th * 0.5, th * 0.82);
  }
  b.rbox([0, h + 0.012, depth / 2], [w + 0.04, 0.03, depth + 0.04], '#C98F5A', 0.012);
}

let _star: THREE.BufferGeometry | null = null;
/** Flat 5-point star geometry (unit size, faces +Z, 0.03 thick). */
export function starGeo(): THREE.BufferGeometry {
  if (_star) return _star;
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.22 : 0.5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) sh.lineTo(x, y);
    else sh.moveTo(x, y);
  }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
  g.translate(0, 0, -0.02);
  _star = g.index ? g.toNonIndexed() : g;
  _star.computeVertexNormals();
  return _star;
}

/** Test tube (standing at origin) with coloured liquid. */
export function testTube(b: Batch, color: string, fill = 0.7, h = 0.16) {
  b.cyl([0, h * fill * 0.5, 0], [0.024, h * fill, 0.024], color, undefined, true);
  b.cyl([0, h * fill + (h * (1 - fill)) / 2, 0], [0.026, h * (1 - fill), 0.026], '#EAF6FB', undefined, true);
  b.ball([0, 0, 0], [0.026, 0.02, 0.026], '#EAF6FB', undefined, true);
}

/** Beaker with coloured liquid (standing at origin). */
export function beaker(b: Batch, color: string, r = 0.1, h = 0.14, fill = 0.65) {
  b.cyl([0, h * fill * 0.5, 0], [r * 1.9, h * fill, r * 1.9], color, undefined, true);
  b.cyl([0, h * fill + (h * (1 - fill)) / 2, 0], [r * 2, h * (1 - fill), r * 2], '#EAF6FB', undefined, true);
  b.cyl([0, h * fill + 0.002, 0], [r * 1.92, 0.006, r * 1.92], '#FFFFFF', undefined, true);
  b.torus([0, h, 0], r * 2.04, '#CFE9F2', [Math.PI / 2, 0, 0], 0.5);
}

/** Round-tip children's scissors lying flat at origin, handle toward +Z. */
export function roundScissors(b: Batch, handle: string, rot = 0) {
  b.at([0, 0, 0], rot, () => {
    b.box([-0.012, 0.008, -0.06], [0.014, 0.008, 0.12], '#C7CED6', [0, 0.08, 0]);
    b.box([0.012, 0.012, -0.06], [0.014, 0.008, 0.12], '#B8C1CC', [0, -0.08, 0]);
    b.ball([0, 0.012, -0.12], [0.02, 0.012, 0.02], '#C7CED6', undefined, true);
    b.torus([-0.025, 0.012, 0.045], 0.05, handle, [Math.PI / 2, 0, 0], 0.5);
    b.torus([0.025, 0.012, 0.045], 0.05, handle, [Math.PI / 2, 0, 0], 0.5);
  });
}
