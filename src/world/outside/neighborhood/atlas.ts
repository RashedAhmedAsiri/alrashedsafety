/**
 * One painted atlas for the neighborhood set: villa windows, doors, iron gates and railings, AC
 * grilles, house number plates, the roadworks warning sign and the park gate sign. All text is
 * Arabic (location names come from src/core/locations.ts). 1024 x 512 canvas, 128 px grid.
 */
import * as THREE from 'three';
import { canvasText, canvasTexture } from '../../kit';
import { LOCATIONS } from '../../../core/locations';
import type { UVRect } from './build';

const W = 1024;
const H = 512;
const G = 128;

export type CellName =
  | 'winArch'
  | 'winShut'
  | 'door'
  | 'glassDoor'
  | 'gate'
  | 'rail'
  | 'warn'
  | 'grille'
  | 'roadSign'
  | 'parkSign'
  | 'plate1'
  | 'plate2'
  | 'plate3'
  | 'plate4'
  | 'plate5'
  | 'plate6'
  | 'garageDoor'
  | 'cover'
  | 'stripes';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
const CELLS: Record<CellName, { col: number; row: number; w: number; h: number; draw: Draw }> = {
  winArch: { col: 0, row: 0, w: 1, h: 1, draw: drawWinArch },
  winShut: { col: 1, row: 0, w: 1, h: 1, draw: drawWinShut },
  door: { col: 2, row: 0, w: 1, h: 1, draw: drawDoor },
  glassDoor: { col: 3, row: 0, w: 1, h: 1, draw: drawGlassDoor },
  gate: { col: 4, row: 0, w: 2, h: 1, draw: drawGate },
  rail: { col: 6, row: 0, w: 1, h: 1, draw: drawRail },
  warn: { col: 7, row: 0, w: 1, h: 1, draw: drawWarn },
  grille: { col: 0, row: 1, w: 1, h: 1, draw: drawGrille },
  roadSign: { col: 1, row: 1, w: 2, h: 1, draw: drawRoadSign },
  parkSign: { col: 3, row: 1, w: 3, h: 1, draw: (c, w, h) => drawPlaque(c, w, h, LOCATIONS.park.name, '#1F8F5F', '#FFFFFF') },
  plate1: { col: 0, row: 2, w: 1, h: 1, draw: (c, w, h) => drawNumber(c, w, h, '١') },
  plate2: { col: 1, row: 2, w: 1, h: 1, draw: (c, w, h) => drawNumber(c, w, h, '٢') },
  plate3: { col: 2, row: 2, w: 1, h: 1, draw: (c, w, h) => drawNumber(c, w, h, '٣', true) },
  plate4: { col: 3, row: 2, w: 1, h: 1, draw: (c, w, h) => drawNumber(c, w, h, '٤') },
  plate5: { col: 4, row: 2, w: 1, h: 1, draw: (c, w, h) => drawNumber(c, w, h, '٥') },
  plate6: { col: 5, row: 2, w: 1, h: 1, draw: (c, w, h) => drawNumber(c, w, h, '٦') },
  garageDoor: { col: 6, row: 2, w: 1, h: 1, draw: drawGarage },
  cover: { col: 7, row: 2, w: 1, h: 1, draw: drawCover },
  stripes: { col: 0, row: 3, w: 4, h: 1, draw: drawStripes },
};

export function cellUV(name: CellName): UVRect {
  const c = CELLS[name];
  const pad = 0.5; // half a texel inwards against bleeding
  return {
    u0: (c.col * G + pad) / W,
    u1: ((c.col + c.w) * G - pad) / W,
    v1: 1 - (c.row * G + pad) / H,
    v0: 1 - ((c.row + c.h) * G - pad) / H,
  };
}

/* ------------------------------------------------------------------ cells */

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Arched villa window: white frame, sky-blue glass with a soft glint, mullion cross, sill. */
function drawWinArch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F5F1E8';
  ctx.beginPath();
  ctx.moveTo(10, h - 8);
  ctx.lineTo(10, 50);
  ctx.arc(w / 2, 50, w / 2 - 10, Math.PI, 0);
  ctx.lineTo(w - 10, h - 8);
  ctx.closePath();
  ctx.fill();
  const gx = 20;
  const gy = 18;
  ctx.fillStyle = '#9CCBE6';
  ctx.beginPath();
  ctx.moveTo(gx, h - 18);
  ctx.lineTo(gx, 52);
  ctx.arc(w / 2, 52, w / 2 - gx, Math.PI, 0);
  ctx.lineTo(w - gx, h - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(gx + 6, h - 24);
  ctx.lineTo(gx + 6, 58);
  ctx.lineTo(gx + 30, 40);
  ctx.lineTo(gx + 30, h - 24);
  ctx.fill();
  ctx.strokeStyle = '#F5F1E8';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(w / 2, gy + 6);
  ctx.lineTo(w / 2, h - 14);
  ctx.moveTo(gx, 70);
  ctx.lineTo(w - gx, 70);
  ctx.stroke();
  ctx.fillStyle = '#D8CBB2';
  ctx.fillRect(4, h - 14, w - 8, 10);
}

/** Rectangular window with two louvred shutters. */
function drawWinShut(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F5F1E8';
  ctx.fillRect(22, 6, w - 44, h - 16);
  ctx.fillStyle = '#9CCBE6';
  ctx.fillRect(30, 14, w - 60, h - 34);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(34, h - 22);
  ctx.lineTo(34, 60);
  ctx.lineTo(60, 18);
  ctx.lineTo(60, h - 22);
  ctx.fill();
  ctx.strokeStyle = '#F5F1E8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, 14);
  ctx.lineTo(w / 2, h - 20);
  ctx.stroke();
  for (const x of [0, w - 22]) {
    ctx.fillStyle = '#B9936B';
    ctx.fillRect(x, 4, 22, h - 12);
    ctx.strokeStyle = '#9B7650';
    ctx.lineWidth = 3;
    for (let y = 12; y < h - 12; y += 11) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + 20, y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#D8CBB2';
  ctx.fillRect(14, h - 10, w - 28, 8);
}

/** Wooden double door with an arched fanlight and brass handles (tinted by vertex colour). */
function drawDoor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F5F1E8';
  ctx.fillRect(6, 4, w - 12, h - 4);
  ctx.fillStyle = '#E2E2E2';
  ctx.fillRect(14, 30, w / 2 - 15, h - 30);
  ctx.fillRect(w / 2 + 1, 30, w / 2 - 15, h - 30);
  ctx.fillStyle = '#9CCBE6';
  ctx.beginPath();
  ctx.moveTo(14, 30);
  ctx.arc(w / 2, 30, w / 2 - 14, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9A9A9A';
  ctx.lineWidth = 3;
  for (const x of [20, w / 2 + 7]) {
    rr(ctx, x, 40, w / 2 - 33, 34, 4);
    ctx.stroke();
    rr(ctx, x, 82, w / 2 - 33, 34, 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#E7C873';
  ctx.beginPath();
  ctx.arc(w / 2 - 9, h * 0.62, 4, 0, 7);
  ctx.arc(w / 2 + 9, h * 0.62, 4, 0, 7);
  ctx.fill();
}

/** Tall glass balcony door. */
function drawGlassDoor(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F5F1E8';
  ctx.fillRect(8, 4, w - 16, h - 4);
  ctx.fillStyle = '#9CCBE6';
  ctx.fillRect(16, 12, w / 2 - 19, h - 20);
  ctx.fillRect(w / 2 + 3, 12, w / 2 - 19, h - 20);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(20, h - 24);
  ctx.lineTo(20, 60);
  ctx.lineTo(44, 20);
  ctx.lineTo(44, h - 24);
  ctx.fill();
  ctx.fillStyle = '#C9B59A';
  ctx.fillRect(w / 2 - 12, h * 0.5, 4, 14);
  ctx.fillRect(w / 2 + 8, h * 0.5, 4, 14);
}

/** Ornamental metal gate: bars, scrolls and a rounded top, white on transparent (tinted by vertex colour). */
function drawGate(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const leaf = (x0: number, x1: number) => {
    ctx.strokeRect(x0 + 3, 8, x1 - x0 - 6, h - 12);
    ctx.lineWidth = 3.2;
    for (let x = x0 + 12; x < x1 - 8; x += 11) {
      ctx.beginPath();
      ctx.moveTo(x, 26);
      ctx.lineTo(x, h - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 26);
      ctx.lineTo(x - 2.6, 18);
      ctx.lineTo(x + 2.6, 18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 + 3, 40);
    ctx.lineTo(x1 - 3, 40);
    ctx.moveTo(x0 + 3, h - 26);
    ctx.lineTo(x1 - 3, h - 26);
    ctx.stroke();
    const cx = (x0 + x1) / 2;
    ctx.beginPath();
    ctx.arc(cx, 72, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 10, 72, 8, 0, Math.PI * 2);
    ctx.arc(cx + 10, 72, 8, 0, Math.PI * 2);
    ctx.stroke();
  };
  leaf(0, w / 2 - 2);
  leaf(w / 2 + 2, w);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, 8);
  ctx.lineTo(w / 2, h - 4);
  ctx.stroke();
}

/** Garage / roller door: horizontal slats. */
function drawGarage(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#E8E2D4';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#B7AE9B';
  ctx.lineWidth = 3;
  for (let y = 8; y < h; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8F8672';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
}

/** Short railing panel (for wall tops and balconies): white on transparent. */
function drawRail(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(w, 22);
  ctx.moveTo(0, h - 10);
  ctx.lineTo(w, h - 10);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let x = 8; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, h - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x - 4, 22);
    ctx.lineTo(x + 4, 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 3;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, 64, 12, Math.PI, 0);
    ctx.stroke();
  }
}

/** Triangular warning sign with a person digging (workers). Red border, white field, black figure. */
function drawWarn(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const tri = (inset: number, color: string, r: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(w / 2, inset + 2);
    ctx.lineTo(w - inset - 2, h - inset - 8);
    ctx.lineTo(inset + 2, h - inset - 8);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = r;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fill();
  };
  tri(4, '#D7263D', 10);
  tri(17, '#FFFFFF', 6);
  ctx.fillStyle = '#1E2A3B';
  ctx.strokeStyle = '#1E2A3B';
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  // head
  ctx.beginPath();
  ctx.arc(52, 58, 7, 0, 7);
  ctx.fill();
  // body bent over, arm to shovel, legs
  ctx.beginPath();
  ctx.moveTo(54, 66);
  ctx.lineTo(62, 82);
  ctx.lineTo(54, 98);
  ctx.moveTo(62, 82);
  ctx.lineTo(70, 100);
  ctx.moveTo(56, 70);
  ctx.lineTo(74, 82);
  ctx.stroke();
  // shovel
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(74, 82);
  ctx.lineTo(88, 100);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(86, 98);
  ctx.lineTo(96, 100);
  ctx.lineTo(92, 108);
  ctx.closePath();
  ctx.fill();
  // heap
  ctx.beginPath();
  ctx.moveTo(30, 108);
  ctx.quadraticCurveTo(44, 96, 58, 108);
  ctx.closePath();
  ctx.fill();
}

/** AC unit fan grille (circle in a rounded square). */
function drawGrille(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#EEF1F4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#C8D0D8';
  ctx.fillRect(0, h - 10, w, 10);
  ctx.fillStyle = '#586271';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 2, 44, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#9AA6B4';
  ctx.lineWidth = 3;
  for (const r of [14, 28, 40]) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 2, r, 0, 7);
    ctx.stroke();
  }
  for (let a = 0; a < 6; a++) {
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2 - 2);
    ctx.lineTo(w / 2 + Math.cos(a * 1.047) * 42, h / 2 - 2 + Math.sin(a * 1.047) * 42);
    ctx.stroke();
  }
}

/** Manhole cover top: iron disc with a cross-hatch relief. */
function drawCover(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#4C525B';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 3, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#2F343B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 12, 0, 7);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 14 - 40, 22);
    ctx.lineTo(w / 2 + i * 14 + 40, h - 22);
    ctx.moveTo(w / 2 + i * 14 + 40, 22);
    ctx.lineTo(w / 2 + i * 14 - 40, h - 22);
    ctx.stroke();
  }
}

/** Warning plate under the roadworks triangle: «خطر» big in red, «أعمال طرق» under it. */
function drawRoadSign(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F2C230';
  rr(ctx, 2, 2, w - 4, h - 4, 14);
  ctx.fill();
  ctx.strokeStyle = '#22262B';
  ctx.lineWidth = 4;
  rr(ctx, 9, 9, w - 18, h - 18, 10);
  ctx.stroke();
  canvasText(ctx, 'خطر', w / 2, h * 0.36, 58, '#C8102E', 900);
  canvasText(ctx, 'أعمال طرق', w / 2, h * 0.73, 40, '#22262B', 800);
}

/** Barricade rail: orange and white diagonal stripes (drawn 4:1, shown on rails about 6:1). */
function drawStripes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#F7F4EC';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#F26B1D';
  const step = h * 0.9;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + step / 2, h);
    ctx.lineTo(x + step / 2 + h * 0.8, 0);
    ctx.lineTo(x + h * 0.8, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#5A5F68';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
}

function drawPlaque(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, bg: string, fg: string) {
  ctx.fillStyle = bg;
  rr(ctx, 2, 2, w - 4, h - 4, 14);
  ctx.fill();
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  rr(ctx, 9, 9, w - 18, h - 18, 10);
  ctx.stroke();
  canvasText(ctx, text, w / 2, h / 2 + 3, Math.min(70, (w - 40) / (text.length * 0.55)), fg, 800);
}

function drawNumber(ctx: CanvasRenderingContext2D, w: number, h: number, n: string, mine = false) {
  ctx.fillStyle = mine ? '#14B8A6' : '#2D4A6B';
  rr(ctx, 4, 20, w - 8, h - 40, 14);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  rr(ctx, 11, 27, w - 22, h - 54, 9);
  ctx.stroke();
  canvasText(ctx, n, w / 2, h / 2 + 3, 62, '#FFFFFF', 800);
}

/* ------------------------------------------------------------------- atlas */

let tex: THREE.CanvasTexture | null = null;

export function neighborhoodAtlas(): THREE.CanvasTexture {
  if (tex) return tex;
  tex = canvasTexture('neighborhood-atlas-v2', W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    for (const c of Object.values(CELLS)) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(c.col * G, c.row * G, c.w * G, c.h * G);
      ctx.clip();
      ctx.translate(c.col * G, c.row * G);
      c.draw(ctx, c.w * G, c.h * G);
      ctx.restore();
    }
  });
  tex.generateMipmaps = true;
  return tex;
}
