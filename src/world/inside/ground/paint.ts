/**
 * Canvas painting helpers for the ground-floor rooms: per-room texture atlases (all posters and
 * signs of a room in one texture, so they merge into one draw call), soft "baked AO" shadow
 * materials, and small drawing primitives (rounded rects, pictogram people, hands, drops).
 */
import * as THREE from 'three';
import { canvasTexture, canvasText, mat, PAL } from '../../kit';
import { FONT_FAMILY } from '../../../core/fonts';
import type { UVRect } from './batch';

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export interface AtlasRegion {
  name: string;
  w: number;
  h: number;
  /** Background that also fills the padding around the region (prevents mip bleeding). */
  bg?: string;
  draw: Draw;
}

export interface Atlas {
  tex: THREE.CanvasTexture;
  rect: (name: string) => UVRect;
  /** Lit paper-like material. */
  mat: THREE.MeshStandardMaterial;
  /** Self-lit material (screens, exit signs) using the same texture. */
  glow: (intensity?: number) => THREE.Material;
}

const PAD = 6;

/** Shelf-pack regions into one canvas texture of the given width. */
export function makeAtlas(key: string, width: number, regions: AtlasRegion[]): Atlas {
  const sorted = [...regions].sort((a, b) => b.h - a.h);
  const placed = new Map<string, { x: number; y: number; r: AtlasRegion }>();
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const r of sorted) {
    const w = r.w + PAD * 2;
    const h = r.h + PAD * 2;
    if (x + w > width) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    placed.set(r.name, { x: x + PAD, y: y + PAD, r });
    x += w;
    shelf = Math.max(shelf, h);
  }
  const used = y + shelf;
  let H = 64;
  while (H < used) H *= 2;
  const tex = canvasTexture(`ground-atlas:${key}`, width, H, (ctx) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, H);
    for (const { x: px, y: py, r } of placed.values()) {
      if (r.bg) {
        ctx.fillStyle = r.bg;
        ctx.fillRect(px - PAD, py - PAD, r.w + PAD * 2, r.h + PAD * 2);
      }
      ctx.save();
      ctx.translate(px, py);
      ctx.beginPath();
      ctx.rect(0, 0, r.w, r.h);
      ctx.clip();
      ctx.direction = 'rtl';
      r.draw(ctx, r.w, r.h);
      ctx.restore();
    }
  });
  tex.anisotropy = 8;
  const rect = (name: string): UVRect => {
    const p = placed.get(name);
    if (!p) throw new Error(`atlas ${key}: no region ${name}`);
    return [p.x / width, 1 - (p.y + p.r.h) / H, (p.x + p.r.w) / width, 1 - p.y / H];
  };
  const glowCache = new Map<number, THREE.Material>();
  return {
    tex,
    rect,
    mat: mat('#FFFFFF', { map: tex, rough: 0.85 }),
    glow: (intensity = 1) => {
      let m = glowCache.get(intensity);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(intensity, intensity, intensity) });
        glowCache.set(intensity, m);
      }
      return m;
    },
  };
}

/* ------------------------------------------------------------------ soft baked shadows */

const shadowMats = new Map<string, THREE.Material>();
function shadowMat(key: string, draw: Draw, size = 128) {
  let m = shadowMats.get(key);
  if (!m) {
    const tex = canvasTexture(`ground-ao:${key}`, size, size, draw);
    m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: '#3B3226', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    shadowMats.set(key, m);
  }
  return m;
}

/** Round soft contact shadow (alpha in the texture). */
export const aoRound = () =>
  shadowMat('round', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

/** Rectangular soft contact shadow; the plane should be ~1.25x the footprint. */
export const aoRect = () =>
  shadowMat('rect', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Blur via shadowBlur (canvas filter is missing on older iPad Safari): draw the rect far
    // off-canvas and let only its blurred shadow land in view.
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = w * 0.09;
    ctx.shadowOffsetX = w * 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(w * 0.16 - w * 4, h * 0.16, w * 0.68, h * 0.68);
    ctx.restore();
  });

/** Vertical gradient for where walls meet the floor (dark at the bottom edge of the plane). */
export const aoFoot = () =>
  shadowMat(
    'foot',
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.38)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    64,
  );

/* ------------------------------------------------------------------ drawing primitives */

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string, lw: number) {
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Arabic text that shrinks to fit maxW. */
export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, color: string, maxW?: number, weight = 700) {
  let size = px;
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  if (maxW) {
    while (ctx.measureText(s).width > maxW && size > 8) {
      size -= 2;
      ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    }
  }
  canvasText(ctx, s, x, y, size, color, weight);
}

/** Simple pictogram person (head + rounded body), feet at (x, y), height h. */
export function person(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color: string, pose: 'stand' | 'run' | 'stretch' = 'stand') {
  const head = h * 0.13;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.11;
  const hipY = y - h * 0.42;
  const neckY = y - h * 0.74;
  circle(ctx, x, y - h + head, head, color);
  ctx.beginPath();
  ctx.moveTo(x, neckY);
  ctx.lineTo(x, hipY);
  ctx.stroke();
  ctx.beginPath();
  if (pose === 'run') {
    ctx.moveTo(x, hipY);
    ctx.lineTo(x - h * 0.2, y - h * 0.2);
    ctx.lineTo(x - h * 0.12, y);
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + h * 0.18, y - h * 0.15);
    ctx.lineTo(x + h * 0.3, y - h * 0.08);
    ctx.moveTo(x, neckY + h * 0.04);
    ctx.lineTo(x - h * 0.2, neckY + h * 0.16);
    ctx.moveTo(x, neckY + h * 0.04);
    ctx.lineTo(x + h * 0.18, neckY - h * 0.06);
  } else if (pose === 'stretch') {
    ctx.moveTo(x, hipY);
    ctx.lineTo(x - h * 0.16, y);
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + h * 0.16, y);
    ctx.moveTo(x, neckY + h * 0.03);
    ctx.lineTo(x - h * 0.22, neckY - h * 0.22);
    ctx.moveTo(x, neckY + h * 0.03);
    ctx.lineTo(x + h * 0.22, neckY - h * 0.22);
  } else {
    ctx.moveTo(x, hipY);
    ctx.lineTo(x - h * 0.09, y);
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + h * 0.09, y);
    ctx.moveTo(x, neckY + h * 0.04);
    ctx.lineTo(x - h * 0.15, hipY + h * 0.02);
    ctx.moveTo(x, neckY + h * 0.04);
    ctx.lineTo(x + h * 0.15, hipY + h * 0.02);
  }
  ctx.stroke();
}

/** Cartoon hand (palm + 4 fingers + thumb) pointing up, centred at (x, y), size s. */
export function hand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, mirror = false) {
  ctx.save();
  ctx.translate(x, y);
  if (mirror) ctx.scale(-1, 1);
  ctx.fillStyle = color;
  fillRR(ctx, -s * 0.3, -s * 0.1, s * 0.6, s * 0.5, s * 0.16, color);
  for (let i = 0; i < 4; i++) fillRR(ctx, -s * 0.3 + i * s * 0.155, -s * 0.48 + Math.abs(i - 1.5) * s * 0.05, s * 0.13, s * 0.48, s * 0.065, color);
  ctx.save();
  ctx.translate(s * 0.28, s * 0.12);
  ctx.rotate(-0.7);
  fillRR(ctx, -s * 0.06, -s * 0.28, s * 0.13, s * 0.32, s * 0.065, color);
  ctx.restore();
  ctx.restore();
}

/** Water drop, tip up, centred at (x, y). */
export function drop(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 0.1, x + s * 0.7, y + s * 0.6, x, y + s * 0.6);
  ctx.bezierCurveTo(x - s * 0.7, y + s * 0.6, x - s * 0.7, y - s * 0.1, x, y - s);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Plus / cross symbol. */
export function cross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  const t = s * 0.34;
  fillRR(ctx, x - t / 2, y - s / 2, t, s, t * 0.2, color);
  fillRR(ctx, x - s / 2, y - t / 2, s, t, t * 0.2, color);
}

/** Five-point star. */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Eastern Arabic digits for numbers on signs and clocks. */
export const arDigits = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);

/** Wall clock face (used in several rooms). */
export const drawClock: Draw = (ctx, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  circle(ctx, cx, cy, r, PAL.ink);
  circle(ctx, cx, cy, r * 0.9, '#FFFFFF');
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    text(ctx, arDigits(i), cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7 + r * 0.02, r * 0.2, PAL.ink);
  }
  ctx.strokeStyle = PAL.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(-Math.PI / 2 + 0.5) * r * 0.42, cy + Math.sin(-Math.PI / 2 + 0.5) * r * 0.42);
  ctx.stroke();
  ctx.lineWidth = r * 0.045;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(Math.PI * 0.95) * r * 0.62, cy + Math.sin(Math.PI * 0.95) * r * 0.62);
  ctx.stroke();
  circle(ctx, cx, cy, r * 0.06, PAL.red);
};

/** Green exit sign: running person through a door + «مخرج». */
export const drawExit: Draw = (ctx, w, h) => {
  fillRR(ctx, 0, 0, w, h, h * 0.12, PAL.exitGreen);
  strokeRR(ctx, 4, 4, w - 8, h - 8, h * 0.1, '#FFFFFF', 4);
  // door frame on the left, runner heading into it
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(w * 0.08, h * 0.18, w * 0.14, h * 0.66);
  ctx.fillStyle = PAL.exitGreen;
  ctx.fillRect(w * 0.1, h * 0.22, w * 0.1, h * 0.62);
  person(ctx, w * 0.36, h * 0.84, h * 0.66, '#FFFFFF', 'run');
  text(ctx, 'مخرج', w * 0.7, h * 0.54, h * 0.5, '#FFFFFF', w * 0.5);
};
