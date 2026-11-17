/**
 * One painted texture atlas for every sign face, pictogram and road decal of the street set, so all
 * of them merge into a single draw call. Cells are on a 128 px grid of a 2048 x 1024 canvas.
 * All text is Arabic; pictograms carry no Latin letters.
 */
import * as THREE from 'three';
import { canvasText, canvasTexture, PAL } from '../../kit';
import { LOCATIONS } from '../../../core/locations';
import type { UVRect } from './build';

const W = 2048;
const H = 1024;
const G = 128;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
interface Cell {
  col: number;
  row: number;
  w: number;
  h: number;
  draw: Draw;
}

/* ---------------------------------------------------------------- helpers */

const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const poly = (ctx: CanvasRenderingContext2D, pts: [number, number][]) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};

/** Road-sign style person pictogram. (cx, foot) = bottom centre, h = height. */
function person(ctx: CanvasRenderingContext2D, cx: number, foot: number, h: number, color: string, pose: 'walk' | 'stand' | 'stride' = 'walk', dir = 1) {
  const r = h * 0.11;
  const lw = h * 0.12;
  const headY = foot - h + r;
  const neckY = headY + r * 1.5;
  const hipY = foot - h * 0.45;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx + (pose === 'stand' ? 0 : dir * h * 0.03), headY, r, 0, Math.PI * 2);
  ctx.fill();
  const lean = pose === 'stand' ? 0 : dir * h * 0.04;
  // body
  ctx.beginPath();
  ctx.moveTo(cx + lean, neckY);
  ctx.lineTo(cx, hipY);
  ctx.stroke();
  if (pose === 'stand') {
    ctx.beginPath();
    ctx.moveTo(cx - h * 0.06, hipY);
    ctx.lineTo(cx - h * 0.07, foot - lw / 2);
    ctx.moveTo(cx + h * 0.06, hipY);
    ctx.lineTo(cx + h * 0.07, foot - lw / 2);
    ctx.moveTo(cx + lean, neckY + lw * 0.3);
    ctx.lineTo(cx - h * 0.13, hipY + h * 0.02);
    ctx.moveTo(cx + lean, neckY + lw * 0.3);
    ctx.lineTo(cx + h * 0.13, hipY + h * 0.02);
    ctx.stroke();
  } else {
    const s = pose === 'stride' ? 1.25 : 1;
    ctx.beginPath();
    // front leg (knee bent forward)
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx + dir * h * 0.1 * s, hipY + h * 0.2);
    ctx.lineTo(cx + dir * h * 0.2 * s, foot - lw / 2);
    // back leg
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx - dir * h * 0.06 * s, hipY + h * 0.22);
    ctx.lineTo(cx - dir * h * 0.2 * s, foot - lw / 2);
    // arms
    ctx.moveTo(cx + lean, neckY + lw * 0.3);
    ctx.lineTo(cx + dir * h * 0.12 * s, hipY - h * 0.08);
    ctx.lineTo(cx + dir * h * 0.2 * s, hipY + h * 0.02);
    ctx.moveTo(cx + lean, neckY + lw * 0.3);
    ctx.lineTo(cx - dir * h * 0.1 * s, hipY - h * 0.06);
    ctx.lineTo(cx - dir * h * 0.16 * s, hipY + h * 0.06);
    ctx.stroke();
  }
  ctx.restore();
}

/** Side view bus pictogram. */
function busIcon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, body: string, glass: string) {
  ctx.fillStyle = body;
  rr(ctx, x, y, w, h * 0.82, h * 0.16);
  ctx.fill();
  ctx.fillStyle = glass;
  const n = 4;
  const ww = (w * 0.72) / n;
  for (let i = 0; i < n; i++) {
    rr(ctx, x + w * 0.06 + i * ww * 1.05, y + h * 0.12, ww * 0.85, h * 0.3, h * 0.05);
    ctx.fill();
  }
  // windscreen at the front (right)
  rr(ctx, x + w * 0.84, y + h * 0.12, w * 0.11, h * 0.4, h * 0.05);
  ctx.fill();
  ctx.fillStyle = glass;
  for (const wx of [x + w * 0.22, x + w * 0.78]) {
    ctx.beginPath();
    ctx.arc(wx, y + h * 0.82, h * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = body;
  for (const wx of [x + w * 0.22, x + w * 0.78]) {
    ctx.beginPath();
    ctx.arc(wx, y + h * 0.82, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Side view car pictogram. */
function carIcon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, body: string, hole: string) {
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.75);
  ctx.lineTo(x, y + h * 0.48);
  ctx.quadraticCurveTo(x + w * 0.02, y + h * 0.4, x + w * 0.16, y + h * 0.38);
  ctx.lineTo(x + w * 0.3, y + h * 0.08);
  ctx.lineTo(x + w * 0.7, y + h * 0.08);
  ctx.lineTo(x + w * 0.86, y + h * 0.38);
  ctx.quadraticCurveTo(x + w, y + h * 0.42, x + w, y + h * 0.55);
  ctx.lineTo(x + w, y + h * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hole;
  poly(ctx, [
    [x + w * 0.33, y + h * 0.16],
    [x + w * 0.48, y + h * 0.16],
    [x + w * 0.48, y + h * 0.36],
    [x + w * 0.24, y + h * 0.36],
  ]);
  ctx.fill();
  poly(ctx, [
    [x + w * 0.52, y + h * 0.16],
    [x + w * 0.67, y + h * 0.16],
    [x + w * 0.76, y + h * 0.36],
    [x + w * 0.52, y + h * 0.36],
  ]);
  ctx.fill();
  for (const wx of [x + w * 0.24, x + w * 0.76]) {
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(wx, y + h * 0.77, h * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(wx, y + h * 0.77, h * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function digitsAr(n: number) {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

/** Eight-point star outline (Islamic geometric motif). */
function star8(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    const rad = i % 2 ? r * 0.72 : r;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/* ------------------------------------------------------------------ cells */

const ZONE_GREEN = '#C6E436';
const SIGN_BLUE = '#1F6FD1';
const BACK_GREY = '#8F99A6';

const CELLS = {
  /* row 0..1 */
  schoolZone: {
    col: 0, row: 0, w: 2, h: 2,
    draw: (c, w, h) => {
      // Pentagon (house shape), fluorescent yellow-green with black border, two children.
      const m = 10;
      const pts: [number, number][] = [
        [w / 2, m],
        [w - m, h * 0.36],
        [w - m, h - m],
        [m, h - m],
        [m, h * 0.36],
      ];
      c.fillStyle = '#1E2A3B';
      poly(c, pts);
      c.fill();
      c.fillStyle = ZONE_GREEN;
      poly(c, [
        [w / 2, m + 16],
        [w - m - 12, h * 0.38],
        [w - m - 12, h - m - 12],
        [m + 12, h - m - 12],
        [m + 12, h * 0.38],
      ]);
      c.fill();
      person(c, w * 0.6, h * 0.86, h * 0.5, '#1E2A3B', 'walk', -1);
      person(c, w * 0.38, h * 0.86, h * 0.38, '#1E2A3B', 'walk', -1);
      // joined hands
      c.strokeStyle = '#1E2A3B';
      c.lineWidth = 9;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w * 0.45, h * 0.62);
      c.lineTo(w * 0.54, h * 0.6);
      c.stroke();
    },
  },
  speed30: {
    col: 2, row: 0, w: 2, h: 2,
    draw: (c, w, h) => {
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = PAL.safetyRed;
      c.lineWidth = 30;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 22, 0, Math.PI * 2);
      c.stroke();
      canvasText(c, '٣٠', w / 2, h / 2 + 6, 120, '#1E2A3B');
    },
  },
  pedCross: {
    col: 4, row: 0, w: 2, h: 2,
    draw: (c, w, h) => {
      const s = w / 2;
      c.fillStyle = '#1E2A3B';
      poly(c, [
        [s, 6],
        [w - 6, s],
        [s, h - 6],
        [6, s],
      ]);
      c.fill();
      c.fillStyle = PAL.yellow;
      poly(c, [
        [s, 22],
        [w - 22, s],
        [s, h - 22],
        [22, s],
      ]);
      c.fill();
      // zebra under the walker
      c.fillStyle = '#1E2A3B';
      for (let i = 0; i < 4; i++) c.fillRect(s - 52 + i * 28, h * 0.68, 16, 22);
      person(c, s, h * 0.66, h * 0.42, '#1E2A3B', 'walk', -1);
    },
  },
  parkingSign: {
    col: 6, row: 0, w: 2, h: 2,
    draw: (c, w, h) => {
      c.fillStyle = '#FFFFFF';
      rr(c, 4, 4, w - 8, h - 8, 22);
      c.fill();
      c.fillStyle = SIGN_BLUE;
      rr(c, 12, 12, w - 24, h - 24, 18);
      c.fill();
      carIcon(c, w * 0.16, h * 0.14, w * 0.68, h * 0.44, '#FFFFFF', SIGN_BLUE);
      canvasText(c, LOCATIONS.parking.name, w / 2, h * 0.76, 46, '#FFFFFF');
    },
  },
  shelterMap: {
    col: 8, row: 0, w: 2, h: 2,
    draw: (c, w, h) => {
      // Cartoon route map: school (teal), street, crossing, bus, dotted walking route. No text.
      c.fillStyle = '#FFF8EC';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#E4CB9B';
      c.fillRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#69B34C';
      c.fillRect(14, h * 0.66, w * 0.4, h * 0.3);
      c.fillStyle = '#3B4049';
      c.fillRect(8, h * 0.48, w - 16, h * 0.14);
      c.fillStyle = '#FFFFFF';
      for (let i = 0; i < 5; i++) c.fillRect(w * 0.4 + i * 9, h * 0.49, 5, h * 0.12);
      c.fillStyle = PAL.teal;
      rr(c, w * 0.18, h * 0.12, w * 0.5, h * 0.24, 8);
      c.fill();
      c.fillStyle = '#FFFFFF';
      for (let i = 0; i < 4; i++) c.fillRect(w * 0.22 + i * 28, h * 0.17, 16, 14);
      busIcon(c, w * 0.62, h * 0.36, w * 0.28, h * 0.1, PAL.yellow, '#3B4049');
      c.strokeStyle = PAL.safetyRed;
      c.lineWidth = 5;
      c.setLineDash([8, 8]);
      c.beginPath();
      c.moveTo(w * 0.74, h * 0.46);
      c.lineTo(w * 0.46, h * 0.44);
      c.lineTo(w * 0.44, h * 0.37);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = PAL.safetyRed;
      c.beginPath();
      c.arc(w * 0.74, h * 0.45, 9, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#1E2A3B';
      c.lineWidth = 6;
      c.strokeRect(5, 5, w - 10, h - 10);
    },
  },
  lightning: {
    col: 10, row: 0, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#1E2A3B';
      poly(c, [
        [w / 2, 6],
        [w - 6, h - 10],
        [6, h - 10],
      ]);
      c.fill();
      c.fillStyle = PAL.yellow;
      poly(c, [
        [w / 2, 20],
        [w - 18, h - 17],
        [18, h - 17],
      ]);
      c.fill();
      c.fillStyle = '#1E2A3B';
      poly(c, [
        [w * 0.55, h * 0.3],
        [w * 0.4, h * 0.62],
        [w * 0.52, h * 0.62],
        [w * 0.44, h * 0.86],
        [w * 0.64, h * 0.54],
        [w * 0.52, h * 0.54],
      ]);
      c.fill();
    },
  },
  grate: {
    col: 11, row: 0, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#4A5563';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#5E6977';
      c.fillRect(6, 6, w - 12, h - 12);
      c.fillStyle = '#15191E';
      for (let i = 0; i < 7; i++) c.fillRect(16 + i * 14.5, 16, 7, h - 32);
    },
  },
  redMan: {
    col: 12, row: 0, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#140808';
      c.fillRect(0, 0, w, h);
      person(c, w / 2, h - 12, h - 24, '#FF3B30', 'stand');
    },
  },
  greenMan: {
    col: 13, row: 0, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#06140A';
      c.fillRect(0, 0, w, h);
      person(c, w / 2, h - 12, h - 24, '#2BE36B', 'stride', -1);
    },
  },
  footprints: {
    col: 14, row: 0, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = PAL.yellow;
      for (const [x, y, rot] of [
        [w * 0.32, h * 0.5, -0.12],
        [w * 0.68, h * 0.5, 0.12],
      ] as const) {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.beginPath();
        c.ellipse(0, 6, 15, 30, 0, 0, Math.PI * 2);
        c.fill();
        for (let t = 0; t < 4; t++) {
          c.beginPath();
          c.arc(-11 + t * 7.5, -32 + Math.abs(t - 1.2) * 2.5, 4.4 - t * 0.5, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    },
  },
  organizer: {
    col: 15, row: 0, w: 1, h: 1,
    draw: (c, w, h) => {
      // Yellow standing circle with a little person in a vest (traffic organizer spot).
      c.strokeStyle = PAL.yellow;
      c.lineWidth = 10;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 8, 0, Math.PI * 2);
      c.stroke();
      person(c, w / 2, h * 0.8, h * 0.58, PAL.yellow, 'stand');
    },
  },
  silCircle: { col: 10, row: 1, w: 1, h: 1, draw: (c, w, h) => { c.fillStyle = BACK_GREY; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2); c.fill(); } },
  silPentagon: {
    col: 11, row: 1, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = BACK_GREY;
      poly(c, [
        [w / 2, 5],
        [w - 5, h * 0.36],
        [w - 5, h - 5],
        [5, h - 5],
        [5, h * 0.36],
      ]);
      c.fill();
    },
  },
  silDiamond: {
    col: 12, row: 1, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = BACK_GREY;
      poly(c, [
        [w / 2, 3],
        [w - 3, h / 2],
        [w / 2, h - 3],
        [3, h / 2],
      ]);
      c.fill();
    },
  },
  silRect: { col: 13, row: 1, w: 1, h: 1, draw: (c, w, h) => { c.fillStyle = BACK_GREY; c.fillRect(0, 0, w, h); } },
  waitLamp: {
    col: 14, row: 1, w: 1, h: 1,
    draw: (c, w, h) => {
      // push-button "wait" lamp face: a little hourglass on dark
      c.fillStyle = '#1B1F26';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#FFB020';
      poly(c, [
        [w * 0.3, h * 0.22],
        [w * 0.7, h * 0.22],
        [w * 0.5, h * 0.5],
      ]);
      c.fill();
      poly(c, [
        [w * 0.5, h * 0.5],
        [w * 0.7, h * 0.78],
        [w * 0.3, h * 0.78],
      ]);
      c.fill();
    },
  },
  mosqueStar: {
    col: 15, row: 1, w: 1, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#F5F1E8';
      c.fillRect(0, 0, w, h);
      c.fillStyle = PAL.mosqueGreen;
      star8(c, w / 2, h / 2, w * 0.42);
      c.fill();
      c.fillStyle = '#F5F1E8';
      star8(c, w / 2, h / 2, w * 0.26);
      c.fill();
    },
  },
  /* row 2 */
  schoolZonePlate: {
    col: 0, row: 2, w: 4, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#1E2A3B';
      rr(c, 3, 3, w - 6, h - 6, 16);
      c.fill();
      c.fillStyle = ZONE_GREEN;
      rr(c, 12, 12, w - 24, h - 24, 10);
      c.fill();
      canvasText(c, 'منطقة مدرسية', w / 2, h / 2 + 4, 64, '#1E2A3B');
    },
  },
  pickupSign: {
    col: 4, row: 2, w: 4, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#FFFFFF';
      rr(c, 3, 3, w - 6, h - 6, 16);
      c.fill();
      c.fillStyle = PAL.teal;
      rr(c, 10, 10, w - 20, h - 20, 12);
      c.fill();
      canvasText(c, LOCATIONS.pickup_lane.name, w * 0.42, h / 2 + 4, 56, '#FFFFFF');
      carIcon(c, w * 0.78, h * 0.22, w * 0.17, h * 0.58, '#FFFFFF', PAL.teal);
    },
  },
  num1: { col: 8, row: 2, w: 1, h: 1, draw: (c, w, h) => numberBoard(c, w, h, 1) },
  num2: { col: 9, row: 2, w: 1, h: 1, draw: (c, w, h) => numberBoard(c, w, h, 2) },
  num3: { col: 10, row: 2, w: 1, h: 1, draw: (c, w, h) => numberBoard(c, w, h, 3) },
  num4: { col: 11, row: 2, w: 1, h: 1, draw: (c, w, h) => numberBoard(c, w, h, 4) },
  num5: { col: 12, row: 2, w: 1, h: 1, draw: (c, w, h) => numberBoard(c, w, h, 5) },
  road1: { col: 13, row: 2, w: 1, h: 1, draw: (c, w, h) => canvasText(c, digitsAr(1), w / 2, h / 2 + 6, 120, '#FFFFFF') },
  road2: { col: 14, row: 2, w: 1, h: 1, draw: (c, w, h) => canvasText(c, digitsAr(2), w / 2, h / 2 + 6, 120, '#FFFFFF') },
  road3: { col: 15, row: 2, w: 1, h: 1, draw: (c, w, h) => canvasText(c, digitsAr(3), w / 2, h / 2 + 6, 120, '#FFFFFF') },
  road4: { col: 8, row: 3, w: 1, h: 1, draw: (c, w, h) => canvasText(c, digitsAr(4), w / 2, h / 2 + 6, 120, '#FFFFFF') },
  road5: { col: 9, row: 3, w: 1, h: 1, draw: (c, w, h) => canvasText(c, digitsAr(5), w / 2, h / 2 + 6, 120, '#FFFFFF') },
  /* rows 3..5 */
  busStop: {
    col: 0, row: 3, w: 2, h: 3,
    draw: (c, w, h) => {
      c.fillStyle = '#FFFFFF';
      rr(c, 4, 4, w - 8, h - 8, 22);
      c.fill();
      c.fillStyle = SIGN_BLUE;
      rr(c, 12, 12, w - 24, h - 24, 16);
      c.fill();
      c.fillStyle = '#FFFFFF';
      rr(c, 30, 34, w - 60, h * 0.42, 14);
      c.fill();
      busIcon(c, 44, 70, w - 88, h * 0.28, PAL.yellow, '#1E2A3B');
      canvasText(c, LOCATIONS.bus_stop.name, w / 2, h * 0.72, 40, '#FFFFFF');
      // little walking child under the text
      person(c, w / 2, h * 0.94, h * 0.13, '#FFFFFF', 'walk', -1);
    },
  },
  mosqueDoor: {
    col: 2, row: 3, w: 2, h: 3,
    draw: (c, w, h) => {
      // Arched double door, carved wood with green frame.
      c.fillStyle = PAL.mosqueGreen;
      c.beginPath();
      c.moveTo(8, h - 4);
      c.lineTo(8, h * 0.36);
      c.arc(w / 2, h * 0.36, w / 2 - 8, Math.PI, 0);
      c.lineTo(w - 8, h - 4);
      c.closePath();
      c.fill();
      c.fillStyle = PAL.woodDark;
      c.beginPath();
      c.moveTo(24, h - 4);
      c.lineTo(24, h * 0.38);
      c.arc(w / 2, h * 0.38, w / 2 - 24, Math.PI, 0);
      c.lineTo(w - 24, h - 4);
      c.closePath();
      c.fill();
      c.strokeStyle = '#C98F5A';
      c.lineWidth = 4;
      for (const x0 of [30, w / 2 + 4]) {
        for (let j = 0; j < 4; j++) {
          star8(c, x0 + (w / 2 - 34) / 2, h * 0.5 + j * 46, 16);
          c.stroke();
        }
      }
      c.fillStyle = '#1E2A3B';
      c.fillRect(w / 2 - 2, h * 0.3, 4, h * 0.7);
      c.fillStyle = PAL.amber;
      c.beginPath();
      c.arc(w / 2 - 12, h * 0.68, 5, 0, Math.PI * 2);
      c.arc(w / 2 + 12, h * 0.68, 5, 0, Math.PI * 2);
      c.fill();
    },
  },
  mosqueWindow: {
    col: 4, row: 3, w: 1, h: 2,
    draw: (c, w, h) => {
      c.fillStyle = PAL.mosqueGreen;
      c.beginPath();
      c.moveTo(6, h - 6);
      c.lineTo(6, h * 0.3);
      c.arc(w / 2, h * 0.3, w / 2 - 6, Math.PI, 0);
      c.lineTo(w - 6, h - 6);
      c.closePath();
      c.fill();
      c.fillStyle = '#9FD3E8';
      c.beginPath();
      c.moveTo(16, h - 16);
      c.lineTo(16, h * 0.31);
      c.arc(w / 2, h * 0.31, w / 2 - 16, Math.PI, 0);
      c.lineTo(w - 16, h - 16);
      c.closePath();
      c.fill();
      // lattice (mashrabiya)
      c.save();
      c.clip();
      c.strokeStyle = '#F5F1E8';
      c.lineWidth = 3;
      for (let i = -10; i < 20; i++) {
        c.beginPath();
        c.moveTo(i * 16, 0);
        c.lineTo(i * 16 + h, h);
        c.moveTo(i * 16 + h, 0);
        c.lineTo(i * 16, h);
        c.stroke();
      }
      c.restore();
    },
  },
  buttonFace: {
    col: 5, row: 3, w: 1, h: 2,
    draw: (c, w, h) => {
      c.fillStyle = PAL.yellow;
      rr(c, 4, 4, w - 8, h - 8, 14);
      c.fill();
      // walking man pictogram on top, hand + arrow pressing below (the 3D button sits at ~60%)
      c.fillStyle = '#1E2A3B';
      rr(c, 18, 18, w - 36, h * 0.3, 10);
      c.fill();
      person(c, w / 2, h * 0.32, h * 0.22, '#FFFFFF', 'walk', -1);
      // hand pictogram (palm with finger pointing at the button)
      c.fillStyle = '#1E2A3B';
      rr(c, w * 0.36, h * 0.82, w * 0.28, h * 0.1, 8);
      c.fill();
      rr(c, w * 0.44, h * 0.74, w * 0.1, h * 0.1, 5);
      c.fill();
      c.strokeStyle = '#1E2A3B';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(w / 2, h * 0.6, w * 0.26, 0, Math.PI * 2);
      c.stroke();
    },
  },
  pattern: {
    col: 6, row: 3, w: 2, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = '#F5F1E8';
      c.fillRect(0, 0, w, h);
      c.fillStyle = PAL.mosqueGreen;
      for (let i = 0; i < 4; i++) {
        star8(c, 32 + i * 64, h / 2, 26);
        c.fill();
      }
      c.fillStyle = '#F5F1E8';
      for (let i = 0; i < 4; i++) {
        star8(c, 32 + i * 64, h / 2, 13);
        c.fill();
      }
      c.fillStyle = '#C9B59A';
      c.fillRect(0, 0, w, 8);
      c.fillRect(0, h - 8, w, 8);
    },
  },
  roadBus: {
    col: 6, row: 4, w: 2, h: 1,
    draw: (c, w, h) => {
      busIcon(c, 18, 18, w - 36, h - 30, PAL.laneYellow, 'rgba(0,0,0,0)');
    },
  },
  roadKids: {
    col: 10, row: 3, w: 2, h: 2,
    draw: (c, w, h) => {
      // the word "school" painted on the approach lane, stretched along the road like real road text
      // (the old two-children pictogram read as a figure lying on the road from above)
      c.save();
      c.translate(w / 2, h * 0.5);
      c.scale(1, 2.1);
      canvasText(c, 'مدرسة', 0, 0, w * 0.3, '#FFFFFF', 800);
      c.restore();
    },
  },
  cabinetDoor: {
    col: 12, row: 3, w: 1, h: 2,
    draw: (c, w, h) => {
      c.fillStyle = '#9DB0A6';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#7E9188';
      c.lineWidth = 4;
      c.strokeRect(10, 10, w - 20, h - 20);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = '#6F8279';
        c.fillRect(30, h * 0.66 + i * 9, w - 60, 4);
      }
      c.fillStyle = '#1E2A3B';
      poly(c, [
        [w / 2, 30],
        [w - 26, 104],
        [26, 104],
      ]);
      c.fill();
      c.fillStyle = PAL.yellow;
      poly(c, [
        [w / 2, 42],
        [w - 36, 98],
        [36, 98],
      ]);
      c.fill();
      c.fillStyle = '#1E2A3B';
      poly(c, [
        [w * 0.56, 52],
        [w * 0.42, 80],
        [w * 0.52, 80],
        [w * 0.45, 96],
        [w * 0.62, 72],
        [w * 0.52, 72],
      ]);
      c.fill();
      c.fillStyle = '#5F6B66';
      c.fillRect(w - 26, h * 0.45, 8, 30);
    },
  },
  mosqueName: {
    col: 0, row: 6, w: 4, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = PAL.mosqueGreen;
      rr(c, 3, 3, w - 6, h - 6, 14);
      c.fill();
      c.strokeStyle = '#E7C873';
      c.lineWidth = 6;
      rr(c, 12, 12, w - 24, h - 24, 10);
      c.stroke();
      canvasText(c, LOCATIONS.mosque.name, w / 2, h / 2 + 4, 62, '#FFFFFF');
    },
  },
  tactile: {
    col: 13, row: 3, w: 1, h: 1,
    draw: (c, w, h) => {
      // yellow tactile paving with raised dots
      c.fillStyle = '#F2C230';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#D9A91C';
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          c.beginPath();
          c.arc(16 + i * 32, 16 + j * 32, 8, 0, Math.PI * 2);
          c.fill();
        }
    },
  },
  busStopStrip: {
    col: 4, row: 6, w: 4, h: 1,
    draw: (c, w, h) => {
      c.fillStyle = SIGN_BLUE;
      c.fillRect(0, 0, w, h);
      canvasText(c, LOCATIONS.bus_stop.name, w * 0.4, h / 2 + 4, 58, '#FFFFFF');
      busIcon(c, w * 0.74, h * 0.2, w * 0.2, h * 0.56, PAL.yellow, '#1E2A3B');
    },
  },
  manhole: {
    col: 8, row: 5, w: 1, h: 1,
    draw: (c, w, h) => {
      // round cast-iron manhole cover with a radial grip pattern
      c.fillStyle = '#3A4048';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#59616C';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 12, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#3A4048';
      c.lineWidth = 4;
      for (let r = 14; r < w / 2 - 14; r += 12) {
        c.beginPath();
        c.arc(w / 2, h / 2, r, 0, Math.PI * 2);
        c.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        c.beginPath();
        c.moveTo(w / 2 + Math.cos(a) * (w / 2 - 14), h / 2 + Math.sin(a) * (w / 2 - 14));
        c.lineTo(w / 2 - Math.cos(a) * (w / 2 - 14), h / 2 - Math.sin(a) * (w / 2 - 14));
        c.stroke();
      }
    },
  },
  arrow: {
    col: 14, row: 3, w: 1, h: 2,
    draw: (c, w, h) => {
      // straight road arrow pointing up (canvas top)
      c.fillStyle = '#FFFFFF';
      poly(c, [
        [w / 2, 8],
        [w - 14, h * 0.36],
        [w * 0.64, h * 0.36],
        [w * 0.64, h - 8],
        [w * 0.36, h - 8],
        [w * 0.36, h * 0.36],
        [14, h * 0.36],
      ]);
      c.fill();
    },
  },
} satisfies Record<string, Cell>;

function numberBoard(c: CanvasRenderingContext2D, w: number, h: number, n: number) {
  c.fillStyle = '#FFFFFF';
  c.beginPath();
  c.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = PAL.teal;
  c.lineWidth = 12;
  c.beginPath();
  c.arc(w / 2, h / 2, w / 2 - 12, 0, Math.PI * 2);
  c.stroke();
  canvasText(c, digitsAr(n), w / 2, h / 2 + 5, 84, '#1E2A3B');
}

export type AtlasCell = keyof typeof CELLS;

/** UV rectangle of a cell, inset a little against mipmap bleeding. */
export function cellUV(name: AtlasCell): UVRect {
  const cell = CELLS[name] as Cell;
  const pad = 2.5;
  const x0 = cell.col * G + pad;
  const x1 = (cell.col + cell.w) * G - pad;
  const y0 = cell.row * G + pad;
  const y1 = (cell.row + cell.h) * G - pad;
  return { u0: x0 / W, u1: x1 / W, v0: 1 - y1 / H, v1: 1 - y0 / H };
}

let atlasTex: THREE.CanvasTexture | null = null;

/** The atlas texture (cached; drawn again once the Arabic font has loaded). */
export function streetAtlas(): THREE.CanvasTexture {
  if (atlasTex) return atlasTex;
  atlasTex = canvasTexture('street-atlas-v1', W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H);
    for (const cell of Object.values(CELLS) as Cell[]) {
      ctx.save();
      ctx.translate(cell.col * G, cell.row * G);
      ctx.beginPath();
      ctx.rect(0, 0, cell.w * G, cell.h * G);
      ctx.clip();
      cell.draw(ctx, cell.w * G, cell.h * G);
      ctx.restore();
    }
  });
  atlasTex.anisotropy = 8;
  return atlasTex;
}
