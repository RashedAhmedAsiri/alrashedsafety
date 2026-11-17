/**
 * Furniture builders shared by the ground-floor rooms. Each adds parts to a Batch in the current
 * frame: origin on the floor under the piece's centre, facing +Z (the side people use), unless noted.
 */
import { PAL, mat } from '../../kit';
import type { Vec3 } from '../../../core/types';
import { Batch, XGEO, rand, type UVRect } from './batch';
import { aoRect, aoRound } from './paint';
import type * as THREE from 'three';

export const METAL = () => mat(PAL.metal, { metal: 0.5, rough: 0.35 });
export const CHROME = () => mat('#D9DEE4', { metal: 0.7, rough: 0.25 });

/** Soft rectangular contact shadow on the floor (footprint w x d, centred). */
export function shadowRect(b: Batch, x: number, z: number, w: number, d: number, rotY = 0, y = 0.004) {
  b.floorPlane([x, y, z], [w * 1.45, d * 1.45], aoRect(), rotY);
}
/** Soft round contact shadow on the floor. */
export function shadowRound(b: Batch, x: number, z: number, r: number, y = 0.004) {
  b.floorPlane([x, y, z], [r * 2.2, r * 2.2], aoRound());
}

/** Child-size plastic school chair (seat 0.38). Faces +Z (sitter faces +Z). */
export function schoolChair(b: Batch, p: Vec3, rotY: number, color: string) {
  b.push(p, rotY);
  const leg = METAL();
  for (const [x, z] of [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]] as [number, number][]) b.cyl8([x, 0.19, z], [0.025, 0.38, 0.025], leg);
  b.rbox([0, 0.4, 0.01], [0.4, 0.04, 0.38], color);
  b.rbox([0, 0.68, -0.19], [0.4, 0.3, 0.035], color, [-0.08, 0, 0]);
  b.cyl8([-0.17, 0.53, -0.18], [0.022, 0.28, 0.022], leg);
  b.cyl8([0.17, 0.53, -0.18], [0.022, 0.28, 0.022], leg);
  shadowRect(b, 0, 0, 0.42, 0.4);
  b.pop();
}

/** Office swivel chair (seat 0.46). Faces +Z. */
export function officeChair(b: Batch, p: Vec3, rotY: number, color: string, high = false) {
  b.push(p, rotY);
  const dark = PAL.darkMetal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box([Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15], [0.05, 0.035, 0.3], dark, a);
    b.ballLow([Math.sin(a) * 0.28, 0.03, Math.cos(a) * 0.28], [0.06, 0.06, 0.06], '#2A2F36');
  }
  b.cyl8([0, 0.25, 0], [0.05, 0.36, 0.05], CHROME());
  b.rbox([0, 0.46, 0.02], [0.5, 0.09, 0.48], color);
  const bh = high ? 0.75 : 0.5;
  b.rbox([0, 0.5 + bh / 2 + 0.04, -0.24], [0.48, bh, 0.08], color, [-0.06, 0, 0]);
  b.box([0, 0.55, -0.2], [0.06, 0.12, 0.06], dark);
  if (high) {
    b.rbox([-0.27, 0.62, 0], [0.06, 0.04, 0.34], dark);
    b.rbox([0.27, 0.62, 0], [0.06, 0.04, 0.34], dark);
    b.box([-0.27, 0.54, 0.02], [0.03, 0.14, 0.03], dark);
    b.box([0.27, 0.54, 0.02], [0.03, 0.14, 0.03], dark);
  }
  shadowRound(b, 0, 0, 0.32);
  b.pop();
}

/** Potted plant: round pot + leafy cluster. size ~1 = 1.2 m tall. */
export function plant(b: Batch, p: Vec3, size = 1, pot = '#E9E1D3', seed = 1) {
  b.push(p, rand(seed) * 6);
  const s = size;
  b.cyl([0, 0.2 * s, 0], [0.42 * s, 0.4 * s, 0.42 * s], pot);
  b.cyl([0, 0.41 * s, 0], [0.44 * s, 0.04 * s, 0.44 * s], pot);
  b.cyl([0, 0.42 * s, 0], [0.38 * s, 0.02, 0.38 * s], '#6B4A2E');
  b.cyl8([0, 0.65 * s, 0], [0.05 * s, 0.5 * s, 0.05 * s], '#7A5A3A');
  const greens = ['#4FB35E', '#62C46B', '#7AD27A', '#45A456'];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand(seed + i) * 0.5;
    const h = (0.62 + rand(seed * 3 + i) * 0.5) * s;
    const r = (0.12 + rand(seed * 7 + i) * 0.14) * s;
    b.ballLow([Math.cos(a) * r, h, Math.sin(a) * r], [0.36 * s, 0.3 * s, 0.36 * s], greens[i % 4]);
  }
  b.ballLow([0, 1.05 * s, 0], [0.4 * s, 0.34 * s, 0.4 * s], greens[1]);
  shadowRound(b, 0, 0, 0.3 * s);
  b.pop();
}

/** Split AC unit on a wall; frame on the wall face (local +Z into room), p at the unit centre. */
export function acUnit(b: Batch, p: Vec3, rotY: number) {
  b.push(p, rotY);
  b.rbox([0, 0, 0.12], [1.0, 0.3, 0.24], '#F7F8F8');
  b.box([0, -0.1, 0.245], [0.86, 0.05, 0.01], '#D7DCE0');
  b.box([0, -0.135, 0.2], [0.9, 0.02, 0.06], '#C9CFD4');
  b.box([0.38, 0.06, 0.242], [0.05, 0.015, 0.005], '#56C26E');
  b.pop();
}

/** Floor-standing water cooler with a blue bottle and two taps. Faces +Z. */
export function waterCooler(b: Batch, p: Vec3, rotY: number) {
  b.push(p, rotY);
  b.rbox([0, 0.5, 0], [0.34, 1.0, 0.34], '#F2F4F5');
  b.box([0, 0.72, 0.172], [0.26, 0.22, 0.01], '#DDE3E8');
  b.box([-0.06, 0.74, 0.19], [0.04, 0.05, 0.04], PAL.safetyRed);
  b.box([0.06, 0.74, 0.19], [0.04, 0.05, 0.04], PAL.blue);
  b.box([0, 0.6, 0.15], [0.24, 0.03, 0.08], '#9AA4AE');
  b.cyl([0, 1.25, 0], [0.28, 0.45, 0.28], mat('#7CC8F2', { opacity: 0.7, rough: 0.1 }));
  b.cyl([0, 1.04, 0], [0.12, 0.06, 0.12], mat('#7CC8F2', { opacity: 0.7, rough: 0.1 }));
  b.cyl([0, 1.49, 0], [0.24, 0.04, 0.24], mat('#5FB8EC', { opacity: 0.8, rough: 0.1 }));
  shadowRect(b, 0, 0, 0.36, 0.36);
  b.pop();
}

/** Pedal / swing-lid bin. Faces +Z. */
export function bin(b: Batch, p: Vec3, color: string, lid: string, h = 0.55, r = 0.36) {
  b.push(p, 0);
  b.cyl([0, h / 2, 0], [r, h, r], color);
  b.cyl([0, h + 0.02, 0], [r + 0.02, 0.05, r + 0.02], lid);
  shadowRound(b, 0, 0, r * 0.6);
  b.pop();
}

/** Picture frame with an atlas image. Frame faces +Z, centred at p. */
export function frame(b: Batch, p: Vec3, rotY: number, w: number, h: number, atlas: THREE.Material, uv: UVRect, frameColor = '#FFFFFF', border = 0.035) {
  b.push(p, rotY);
  b.box([0, 0, 0.012], [w + border * 2, h + border * 2, 0.024], frameColor);
  b.plane([0, 0, 0.026], [w, h], atlas, 0, uv);
  b.pop();
}

/** Flat poster (no frame) on a wall. */
export function poster(b: Batch, p: Vec3, rotY: number, w: number, h: number, atlas: THREE.Material, uv: UVRect) {
  b.push(p, rotY);
  b.box([0, 0, 0.003], [w, h, 0.006], '#FFFFFF');
  b.plane([0, 0, 0.007], [w, h], atlas, 0, uv);
  b.pop();
}

/** Wall clock using an atlas clock face. */
export function wallClock(b: Batch, p: Vec3, rotY: number, atlas: THREE.Material, uv: UVRect, d = 0.36) {
  b.push(p, rotY);
  b.cyl([0, 0, 0.025], [d + 0.04, 0.05, d + 0.04], PAL.ink, [Math.PI / 2, 0, 0]);
  b.plane([0, 0, 0.052], [d, d], atlas, 0, uv);
  b.pop();
}

const BOOK_COLORS = ['#E5484D', '#2D8CFF', '#22B573', '#F7C531', '#FF8A3D', '#8B5CF6', '#14B8A6', '#F0476B', '#7CC4FA', '#1E2A3B'];

/**
 * A row of books standing on a shelf: from x0 to x1 along local X at shelf height y, depth along Z.
 * Returns the x where it stopped.
 */
export function bookRow(b: Batch, x0: number, x1: number, y: number, z: number, seed: number, colors = BOOK_COLORS, maxH = 0.28, depth = 0.2) {
  let x = x0;
  let i = 0;
  while (x < x1 - 0.03) {
    const w = 0.03 + rand(seed + i * 3.1) * 0.035;
    if (x + w > x1) break;
    const h = maxH * (0.72 + rand(seed + i * 7.7) * 0.28);
    const c = colors[Math.floor(rand(seed + i * 1.9) * colors.length)];
    const lean = i > 0 && rand(seed + i * 5.3) > 0.93 ? 0.18 : 0;
    b.box([x + w / 2, y + h / 2, z], [w, h, depth * (0.85 + rand(seed + i) * 0.15)], c, [0, 0, lean]);
    x += w + 0.004;
    i++;
  }
  return x;
}

/** Wooden open bookshelf (w wide, h tall, n shelves) with books. Faces +Z, back at z = -d/2. */
export function bookshelf(b: Batch, p: Vec3, rotY: number, w: number, h: number, n: number, seed: number, wood: string = PAL.wood, d = 0.34, fill = 0.85) {
  b.push(p, rotY);
  b.box([0, h / 2, -d / 2 + 0.01], [w, h, 0.02], mat(wood).color.clone().multiplyScalar(0.8).getStyle());
  b.box([-w / 2 + 0.02, h / 2, 0], [0.04, h, d], wood);
  b.box([w / 2 - 0.02, h / 2, 0], [0.04, h, d], wood);
  b.box([0, h - 0.02, 0], [w, 0.04, d], wood);
  b.box([0, 0.05, 0], [w, 0.1, d], wood);
  const gap = (h - 0.14) / n;
  for (let i = 0; i < n; i++) {
    const y = 0.1 + gap * i;
    if (i > 0) b.box([0, y, 0], [w - 0.06, 0.03, d - 0.02], wood);
    const end = -w / 2 + 0.05 + (w - 0.1) * (fill - rand(seed + i) * 0.25);
    bookRow(b, -w / 2 + 0.05, end, y + 0.015, 0.0, seed * 13 + i * 17, BOOK_COLORS, Math.min(0.3, gap - 0.06), d * 0.7);
  }
  shadowRect(b, 0, 0, w, d);
  b.pop();
}

/** Ceiling fan (static part: rod + hub). Blades are animated separately. */
export function fanMount(b: Batch, p: Vec3, drop = 0.45) {
  b.cyl8([p[0], p[1] - drop / 2, p[2]], [0.04, drop, 0.04], '#EDEDED');
  b.cyl([p[0], p[1] - 0.03, p[2]], [0.16, 0.06, 0.16], '#EDEDED');
}

/** Simple rug: rounded slab with a border. */
export function rug(b: Batch, p: Vec3, rotY: number, w: number, d: number, base: string, border: string, atlas?: THREE.Material, uv?: UVRect) {
  b.push(p, rotY);
  b.rbox([0, 0.006, 0], [w, 0.012, d], border);
  if (atlas && uv) b.floorPlane([0, 0.0135, 0], [w - 0.06, d - 0.06], atlas, 0, uv);
  else b.box([0, 0.0125, 0], [w - 0.16, 0.002, d - 0.16], base);
  b.pop();
}

export { XGEO };
