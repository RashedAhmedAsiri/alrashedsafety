/**
 * Painted ground textures of the school grounds. Markings (class row lines, the assembly area, the
 * organizer's spot, hopscotch, pitch lines) are painted INTO the ground textures instead of being
 * separate decals, so nothing z-fights when the camera flies high over the school.
 */
import * as THREE from 'three';
import { canvasTexture } from '../../kit';
import { ASSEMBLY, CANOPY, CLASS_LINES, FIELD, GOAL, PITCH, SLIDING_GATE, WALKWAY, YARD_TEX, SCHOOL_LANDMARKS } from './layout';
import { star8, text, person } from './atlas';

type Ctx = CanvasRenderingContext2D;

/** Deterministic pseudo random in [0, 1). */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function tiles(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, step: number, base: [number, number, number], line: string, seed: number, vary = 0.035) {
  let i = 0;
  for (let y = y0; y < y1 - 0.5; y += step) {
    for (let x = x0; x < x1 - 0.5; x += step) {
      const v = 1 + (rand(seed + i++) - 0.5) * 2 * vary;
      ctx.fillStyle = `rgb(${Math.round(base[0] * v)},${Math.round(base[1] * v)},${Math.round(base[2] * v)})`;
      ctx.fillRect(x, y, Math.min(step, x1 - x), Math.min(step, y1 - y));
    }
  }
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1, step * 0.05);
  ctx.beginPath();
  for (let x = x0; x <= x1 + 0.1; x += step) {
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
  }
  for (let y = y0; y <= y1 + 0.1; y += step) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();
}

/* ------------------------------------------------------------ yard */

export const YARD_PX = 1536;
const YW = YARD_TEX.x1 - YARD_TEX.x0;
const YD = YARD_TEX.z1 - YARD_TEX.z0;
const YK = YARD_PX / YW; // px per metre
export const YARD_PY = Math.round(YD * YK);

export function yardTexture() {
  return canvasTexture('school:yard:v1', YARD_PX, YARD_PY, (ctx, w, h) => {
    const X = (x: number) => (x - YARD_TEX.x0) * YK;
    const Y = (z: number) => (z - YARD_TEX.z0) * YK;
    const M = (m: number) => m * YK;
    // base paving: warm sand tiles 0.6 m
    tiles(ctx, 0, 0, w, h, M(0.6), [233, 214, 176], 'rgba(160,128,80,0.28)', 11);
    // darker border band around the yard
    ctx.fillStyle = 'rgba(176,128,74,0.22)';
    const bw = M(0.6);
    ctx.fillRect(0, 0, w, bw);
    ctx.fillRect(0, 0, bw, Y(-10.5));
    ctx.fillRect(w - bw, 0, bw, h);
    // central walkway (gate -> entrance): rose tiles with teal edges
    ctx.fillStyle = 'rgba(214,150,110,0.32)';
    ctx.fillRect(X(WALKWAY.x0), 0, X(WALKWAY.x1) - X(WALKWAY.x0), h);
    ctx.fillStyle = '#14B8A6';
    ctx.fillRect(X(WALKWAY.x0) - M(0.05), 0, M(0.1), h);
    ctx.fillRect(X(WALKWAY.x1) - M(0.05), 0, M(0.1), h);
    // medallion in the walkway
    const mc = [X(0), Y(-22)] as const;
    star8(ctx, mc[0], mc[1], M(2.7), '#14B8A6');
    star8(ctx, mc[0], mc[1], M(2.25), '#FFF8EC');
    star8(ctx, mc[0], mc[1], M(1.6), '#2D8CFF');
    star8(ctx, mc[0], mc[1], M(1.15), '#FFF8EC');
    ctx.beginPath();
    ctx.arc(mc[0], mc[1], M(0.6), 0, Math.PI * 2);
    ctx.fillStyle = '#F7C531';
    ctx.fill();
    // soft baked shade under the canopy
    ctx.fillStyle = 'rgba(80,60,30,0.07)';
    ctx.fillRect(X(CANOPY.x0), Y(CANOPY.z0), X(CANOPY.x1) - X(CANOPY.x0), Y(CANOPY.z1) - Y(CANOPY.z0));
    // class row lines in front of the stage, with grade numbers and standing dots
    const nums = ['١', '٢', '٣', '٤', '٥', '٦'];
    const cols = ['#F0476B', '#FF8A3D', '#F7C531', '#22B573', '#2D8CFF', '#14B8A6'];
    CLASS_LINES.xs.forEach((x, i) => {
      ctx.fillStyle = '#F2C230';
      ctx.fillRect(X(x) - M(0.05), Y(CLASS_LINES.z0), M(0.1), Y(CLASS_LINES.z1) - Y(CLASS_LINES.z0));
      for (let z = CLASS_LINES.z0 + 0.3; z < CLASS_LINES.z1; z += SCHOOL_LANDMARKS.classLineSpacing) {
        ctx.beginPath();
        ctx.arc(X(x), Y(z), M(0.12), 0, Math.PI * 2);
        ctx.fill();
      }
      const bx = X(x) - M(0.38);
      const by = Y(CLASS_LINES.z0 - 0.95);
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.roundRect(bx, by, M(0.76), M(0.76), M(0.14));
      ctx.fill();
      text(ctx, nums[i], X(x), by + M(0.4), M(0.55), '#FFFFFF');
    });
    // play circle in the sunny east part
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = M(0.1);
    ctx.beginPath();
    ctx.arc(X(17.5), Y(-25), M(3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(17.5), Y(-25), M(0.25), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
    // hopscotch under the canopy edge
    const hop = [[0], [-1, 1], [0], [-1, 1], [0], [0]];
    let z = -15.2;
    const s = 0.6;
    let n = 1;
    const ar = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨'];
    const hopX = -7.0;
    for (const row of hop) {
      for (const c of row) {
        const x0 = hopX + c * (s / 2) - s / 2;
        ctx.fillStyle = ['#7CC4FA', '#F7C531', '#FF9AA2', '#B5E48C'][n % 4];
        ctx.fillRect(X(x0) + 1, Y(z - s) + 1, M(s) - 2, M(s) - 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(X(x0), Y(z - s), M(s), M(s));
        text(ctx, ar[n - 1] ?? '', X(x0 + s / 2), Y(z - s / 2) + 1, M(0.34), '#FFFFFF');
        n++;
      }
      z -= s;
    }
    // fire assembly point area: green with white border, class lines and the label (read facing south)
    const ax0 = X(ASSEMBLY.x0), ay0 = Y(ASSEMBLY.z0), ax1 = X(ASSEMBLY.x1), ay1 = Y(ASSEMBLY.z1);
    ctx.fillStyle = 'rgba(31,174,91,0.92)';
    ctx.fillRect(ax0, ay0, ax1 - ax0, ay1 - ay0);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = M(0.14);
    ctx.strokeRect(ax0 + M(0.12), ay0 + M(0.12), ax1 - ax0 - M(0.24), ay1 - ay0 - M(0.24));
    ctx.lineWidth = M(0.08);
    for (let i = 0; i < 4; i++) {
      const x = X(ASSEMBLY.x0 + 1.0 + i * 1.33);
      ctx.beginPath();
      ctx.moveTo(x, Y(ASSEMBLY.z0 + 0.5));
      ctx.lineTo(x, Y(ASSEMBLY.z1 - 1.6));
      ctx.stroke();
    }
    ctx.save();
    ctx.translate((ax0 + ax1) / 2, Y(ASSEMBLY.z1 - 0.85));
    ctx.rotate(Math.PI);
    text(ctx, 'نقطة التجمع', 0, 0, M(0.62), '#FFFFFF');
    ctx.restore();
    ctx.save();
    ctx.translate(X(ASSEMBLY.x1 - 0.7), Y(ASSEMBLY.z1 - 0.85));
    ctx.rotate(Math.PI);
    person(ctx, 0, M(0.35), M(0.7), '#FFFFFF');
    ctx.restore();
    // traffic organizer's spot: yellow square with footprints and a hatched edge
    const o = SCHOOL_LANDMARKS.organizerSpot;
    const os = M(1.1);
    const ox = X(o[0]) - os / 2;
    const oy = Y(o[2]) - os / 2;
    ctx.fillStyle = '#F7C531';
    ctx.fillRect(ox, oy, os, os);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, os, os);
    ctx.clip();
    ctx.strokeStyle = '#1E2A3B';
    ctx.lineWidth = M(0.07);
    for (let k = -os; k < os * 2; k += M(0.22)) {
      ctx.beginPath();
      ctx.moveTo(ox + k, oy);
      ctx.lineTo(ox + k - os, oy + os);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#F7C531';
    ctx.fillRect(ox + M(0.12), oy + M(0.12), os - M(0.24), os - M(0.24));
    ctx.fillStyle = '#1E2A3B';
    for (const dx of [-0.13, 0.13]) {
      ctx.beginPath();
      ctx.ellipse(X(o[0] + dx), Y(o[2]) + M(0.05), M(0.07), M(0.15), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X(o[0] + dx), Y(o[2]) + M(0.26), M(0.055), 0, Math.PI * 2);
      ctx.fill();
    }
    // sliding gate track
    ctx.fillStyle = '#7A7F87';
    ctx.fillRect(X(-4.1), Y(SLIDING_GATE.z) - M(0.05), X(12.8) - X(-4.1), M(0.1));
    // hint of wear in front of the gate
    ctx.fillStyle = 'rgba(150,120,80,0.08)';
    ctx.fillRect(X(-3), Y(-12), X(3) - X(-3), Y(-7.5) - Y(-12));
  });
}

/* ------------------------------------------------------------ football turf */

const FW = FIELD.x1 - FIELD.x0;
const FD = FIELD.z1 - FIELD.z0;
export const TURF_PX = 768;
const FK = TURF_PX / FW;
export const TURF_PY = Math.round(FD * FK);

export function turfTexture() {
  return canvasTexture('school:turf:v1', TURF_PX, TURF_PY, (ctx, w, h) => {
    const X = (x: number) => (x - FIELD.x0) * FK;
    const Y = (z: number) => (z - FIELD.z0) * FK;
    const M = (m: number) => m * FK;
    ctx.fillStyle = '#3A9446';
    ctx.fillRect(0, 0, w, h);
    // mowing stripes on the pitch
    const n = 10;
    const sd = (PITCH.z1 - PITCH.z0) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#43AA52' : '#4BB55A';
      ctx.fillRect(X(PITCH.x0), Y(PITCH.z0 + i * sd), X(PITCH.x1) - X(PITCH.x0), M(sd) + 1);
    }
    // turf speckle
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,40,0,0.07)';
      ctx.fillRect(rand(i + 7) * w, rand(i + 13) * h, 2, 2);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = M(0.12);
    const rect = (x0: number, z0: number, x1: number, z1: number) => ctx.strokeRect(X(x0), Y(z0), X(x1) - X(x0), Y(z1) - Y(z0));
    rect(PITCH.x0, PITCH.z0, PITCH.x1, PITCH.z1);
    const cz = (PITCH.z0 + PITCH.z1) / 2;
    const cx = (PITCH.x0 + PITCH.x1) / 2;
    ctx.beginPath();
    ctx.moveTo(X(PITCH.x0), Y(cz));
    ctx.lineTo(X(PITCH.x1), Y(cz));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(cx), Y(cz), M(3), 0, Math.PI * 2);
    ctx.stroke();
    const spot = (x: number, z: number) => {
      ctx.beginPath();
      ctx.arc(X(x), Y(z), M(0.16), 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    };
    spot(cx, cz);
    // penalty and goal areas at both ends
    for (const end of [PITCH.z0, PITCH.z1]) {
      const dir = end === PITCH.z0 ? 1 : -1;
      rect(cx - 6, end, cx + 6, end + dir * 5);
      rect(cx - 3.5, end, cx + 3.5, end + dir * 1.8);
      spot(cx, end + dir * 6);
      ctx.beginPath();
      ctx.arc(X(cx), Y(end + dir * 6), M(2.5), dir > 0 ? 0.25 * Math.PI : 1.25 * Math.PI, dir > 0 ? 0.75 * Math.PI : 1.75 * Math.PI);
      ctx.stroke();
      // goal line inside the goal (thicker)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(X(cx - GOAL.w / 2), Y(end) - M(0.08), M(GOAL.w), M(0.16));
    }
    // corner arcs
    for (const [x, z, a0] of [
      [PITCH.x0, PITCH.z0, 0],
      [PITCH.x1, PITCH.z0, 0.5 * Math.PI],
      [PITCH.x1, PITCH.z1, Math.PI],
      [PITCH.x0, PITCH.z1, 1.5 * Math.PI],
    ] as const) {
      ctx.beginPath();
      ctx.arc(X(x), Y(z), M(0.6), a0, a0 + Math.PI / 2);
      ctx.stroke();
    }
    // slightly worn goal mouths
    ctx.fillStyle = 'rgba(160,140,80,0.18)';
    for (const end of [PITCH.z0, PITCH.z1]) {
      ctx.beginPath();
      ctx.ellipse(X(cx), Y(end), M(2.2), M(1.3), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* ------------------------------------------------------------ paving */

/** Repeating sand paving, one texture repeat = 2.4 m (4 x 4 tiles of 0.6 m). */
export const PAVING_REPEAT_M = 2.4;
export function pavingTexture() {
  const t = canvasTexture(
    'school:paving:v1',
    256,
    256,
    (ctx, w, h) => {
      tiles(ctx, 0, 0, w, h, w / 4, [224, 206, 168], 'rgba(150,120,76,0.35)', 3, 0.04);
    },
    { repeat: [1, 1] },
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Lawn grass with soft mottling (repeat = 4 m). */
export function grassTexture() {
  const t = canvasTexture(
    'school:grass:v1',
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#76BE52';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = rand(i + 50) > 0.5 ? 'rgba(255,255,200,0.10)' : 'rgba(0,70,0,0.10)';
        const r = 2 + rand(i + 9) * 6;
        ctx.beginPath();
        ctx.arc(rand(i + 3) * w, rand(i + 5) * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    { repeat: [1, 1] },
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Net grid (goal nets and the high fence netting), alpha-tested. Repeat = 0.25 m per cell for goals. */
export function netTexture() {
  const t = canvasTexture(
    'school:net:v1',
    64,
    64,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(w, 2);
      ctx.moveTo(2, 0);
      ctx.lineTo(2, h);
      ctx.stroke();
    },
    { repeat: [1, 1] },
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Chain-link diamond mesh for the field fence. */
export function chainTexture() {
  const t = canvasTexture(
    'school:chain:v1',
    64,
    64,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w / 2, h);
      ctx.closePath();
      ctx.stroke();
    },
    { repeat: [1, 1] },
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Fence railing panel (alpha-tested): teal frame, vertical bars and a row of small diamonds near the
 * top. One repeat = RAIL_REPEAT_M metres along the fence, full railing height vertically.
 */
export const RAIL_REPEAT_M = 1.0;
export function railTexture() {
  const t = canvasTexture(
    'school:rail:v1',
    128,
    128,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const teal = '#0E9C8C';
      ctx.fillStyle = teal;
      ctx.fillRect(0, 0, w, 10);
      ctx.fillRect(0, h - 8, w, 8);
      ctx.fillRect(0, 30, w, 5);
      for (let i = 0; i < 8; i++) {
        const x = (i + 0.5) * (w / 8);
        ctx.fillRect(x - 3, 0, 6, h);
      }
      // diamonds between the top rails
      ctx.fillStyle = '#F7C531';
      for (let i = 0; i < 8; i++) {
        const x = i * (w / 8);
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x + 7, 20);
        ctx.lineTo(x, 28);
        ctx.lineTo(x - 7, 20);
        ctx.closePath();
        ctx.fill();
      }
    },
    { repeat: [1, 1] },
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
